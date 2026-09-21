# SCRO end-to-end smoke test.
# Run with the full stack up (docker compose up --build), then:
#   powershell -ExecutionPolicy Bypass -File scripts\smoke_sacro.ps1
#
# Verifies: login -> national summary -> sector compliance -> drill ->
#           national budget optimize -> TPRM cascade -> audit verify ->
#           WS alive -> full API surface (assets/vulns/controls/ingestion/
#           alerts/insights/AI/investment/scenario simulate).

param(
    [string]$Base = "http://localhost:8080/api",
    [string]$WsUrl = "http://localhost:8086",
    [string]$Username = "scro_regulator",
    [string]$Password = "Scro@2026!"
)

$ErrorActionPreference = "Stop"
$failed = 0
$passed = 0
$token = $null

function Pass([string]$msg) { Write-Host "[PASS] $msg" -ForegroundColor Green; $script:passed++ }
function Fail([string]$msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; $script:failed++ }

function Step([string]$name, [scriptblock]$body) {
    Write-Host "`n== $name" -ForegroundColor Cyan
    try { & $body } catch { Fail "$name threw: $($_.Exception.Message)" }
}

function Assert-Truthy($value, [string]$label) {
    if ($null -eq $value -or $value -eq "" -or $value -eq 0) { throw "$label is empty/falsy" }
}

# ─── 1. Login as the seeded regulator persona (CISO) ──────────────────────
Step "Login" {
    $loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Post -Uri "$Base/auth/login" -ContentType "application/json" -Body $loginBody
    $script:token = $resp.token
    Assert-Truthy $script:token "auth token"
    Pass "Authenticated as $Username ($($resp.user.role))"
}

$headers = @{ Authorization = "Bearer $script:token" }

# ─── 2. National summary ────────────────────────────────────────────────
Step "National summary" {
    $body = Invoke-RestMethod -Method Get -Uri "$Base/risk/national/summary" -Headers $headers
    Assert-Truthy $body.totalEalInr "totalEalInr"
    Pass "National EAL = $($body.totalEalInr) (SRI $($body.sovereignRiskIndex))"
}

# ─── 3. Sector compliance ───────────────────────────────────────────────
Step "Sector compliance (BANKING)" {
    $body = Invoke-RestMethod -Method Get -Uri "$Base/risk/compliance/BANKING" -Headers $headers
    Assert-Truthy $body.mappedRequirements.Count "mapped requirements"
    Pass "BANKING mapped to $($body.regulators -join ', ') ($($body.mappedRequirements.Count) requirements)"
}

# ─── 4. Run a drill ─────────────────────────────────────────────────────
Step "Run drill (RANSOMWARE x BANKING)" {
    $drillBody = @{
        name = "Smoke Drill - Ransomware Banking"
        scenarioKey = "RANSOMWARE"
        impactScope = "SECTOR"
        sector = "BANKING"
    } | ConvertTo-Json
    $body = Invoke-RestMethod -Method Post -Uri "$Base/risk/exercises" -Headers $headers -ContentType "application/json" -Body $drillBody
    Assert-Truthy $body.exerciseId "exerciseId"
    if ($body.simulatedEal -le $body.baselineEal) { throw "drill simulated EAL did not increase" }
    Pass "Drill $($body.scenarioKey): $($body.baselineEal) -> $($body.simulatedEal) (surge $($body.projectedSurgePercent)%)"
}

# ─── 5. National budget optimize ────────────────────────────────────────
Step "National budget optimize" {
    $optBody = @{ budgetInr = 50000000; timeHorizonYears = 3 } | ConvertTo-Json
    $body = Invoke-RestMethod -Method Post -Uri "$Base/investment/national/optimize" -Headers $headers -ContentType "application/json" -Body $optBody
    Assert-Truthy $body.sectors.Count "sector allocations"
    Pass "Allocated $($body.totalAllocated) across $($body.sectorCount) sectors; ROSI $($body.portfolioRosi)%"
}

# ─── 6. TPRM cascade ────────────────────────────────────────────────────
Step "TPRM vendor cascade" {
    $vendors = Invoke-RestMethod -Method Get -Uri "$Base/risk/tprm/vendors" -Headers $headers
    Assert-Truthy $vendors.Count "vendor list"
    $vid = $vendors[0].vendorId
    $cascade = Invoke-RestMethod -Method Get -Uri "$Base/risk/tprm/cascade/$vid" -Headers $headers
    Assert-Truthy $cascade.assets.Count "cascade assets"
    Pass "Vendor $($cascade.name): EAL exposure $($cascade.cascadedEalExposureInr), $($cascade.directAssetCount) direct assets"
}

# ─── 7. Audit chain verify ──────────────────────────────────────────────
Step "Audit chain verify" {
    $body = Invoke-RestMethod -Method Get -Uri "$Base/risk/audit/verify" -Headers $headers
    if ($body.status -ne "INTACT" -or $body.tampered -ne $false) { throw "audit chain not intact" }
    Pass "Audit chain INTACT ($($body.checked) entries checked)"
}

# ─── 8. WebSocket endpoint alive ────────────────────────────────────────
Step "WebSocket endpoint reachable" {
    $socket = New-Object System.Net.Sockets.TcpClient
    try {
        $socket.Connect("localhost", 8086)
        if (-not $socket.Connected) { throw "connection failed" }
        Pass "WebSocket endpoint reachable (port 8086)"
    } finally { $socket.Dispose() }
}

# ─── 9. Asset / vulnerability / control surface ─────────────────────────
Step "Asset + vuln + control surface" {
    $a = Invoke-RestMethod -Method Get -Uri "$Base/assets" -Headers $headers
    Assert-Truthy $a.data.Count "assets"
    $v = Invoke-RestMethod -Method Get -Uri "$Base/vulnerabilities?page=1&size=20" -Headers $headers
    Assert-Truthy $v.total "vuln total"
    Assert-Truthy $v.data.Count "vuln page data"
    Invoke-RestMethod -Method Get -Uri "$Base/vulnerabilities/stats" -Headers $headers | Out-Null
    $c = Invoke-RestMethod -Method Get -Uri "$Base/controls" -Headers $headers
    Invoke-RestMethod -Method Get -Uri "$Base/controls/effectiveness" -Headers $headers | Out-Null
    Pass "assets=$($a.data.Count) vulnsTotal=$($v.total) vulns=$($v.data.Count) controls=$($c.Count)"
}

# ─── 10. Ingestion + alerts surface ─────────────────────────────────────
Step "Ingestion + alerts surface" {
    $ev = Invoke-RestMethod -Method Get -Uri "$Base/ingestion/events" -Headers $headers
    Invoke-RestMethod -Method Get -Uri "$Base/ingestion/stats" -Headers $headers | Out-Null
    $rules = Invoke-RestMethod -Method Get -Uri "$Base/alerts/rules" -Headers $headers
    $events = Invoke-RestMethod -Method Get -Uri "$Base/alerts/events" -Headers $headers
    $hc = Invoke-RestMethod -Method Get -Uri "$Base/alerts/health-check" -Headers $headers
    Assert-Truthy $hc.supported_metrics.Count "health-check supported metrics"
    Pass "ingestionEvents=$($ev.Count) rules=$($rules.Count) alertEvents=$($events.Count) metrics=$($hc.supported_metrics.Count)"
}

# ─── 11. Insights + simulation surface ──────────────────────────────────
Step "Insights + simulations" {
    Invoke-RestMethod -Method Get -Uri "$Base/risk/loss-distribution?simulations=1000" -Headers $headers | Out-Null
    Invoke-RestMethod -Method Get -Uri "$Base/risk/graph" -Headers $headers | Out-Null
    Invoke-RestMethod -Method Get -Uri "$Base/risk/attack-path" -Headers $headers | Out-Null
    $snapshots = Invoke-RestMethod -Method Get -Uri "$Base/risk/snapshots" -Headers $headers
    $ds = Invoke-RestMethod -Method Get -Uri "$Base/risk/data-sources" -Headers $headers
    Assert-Truthy $ds.Count "data sources"
    Pass "loss-distribution + graph + attack-path + $($snapshots.Count) snapshots + $($ds.Count) data sources"
}

# ─── 12. Scenario simulate + AI + investment ────────────────────────────
Step "Scenario simulate + AI + investment" {
    $simBody = @{
        changes = @(
            @{ type = "add_control"; control_type = "MFA"; value = 0.85 }
        )
    } | ConvertTo-Json -Depth 5
    $sim = Invoke-RestMethod -Method Post -Uri "$Base/risk/scenario/simulate" -Headers $headers -ContentType "application/json" -Body $simBody
    Assert-Truthy $sim.simulatedEal "simulated EAL"
    $recs = Invoke-RestMethod -Method Post -Uri "$Base/ai/recommend" -Headers $headers -ContentType "application/json" -Body (@{ context = "Q3 national cyber posture"; focusArea = "identity" } | ConvertTo-Json)
    Invoke-RestMethod -Method Post -Uri "$Base/ai/summarize" -Headers $headers -ContentType "application/json" -Body (@{ audience = "executive" } | ConvertTo-Json) | Out-Null
    Invoke-RestMethod -Method Get -Uri "$Base/investment/rosi" -Headers $headers | Out-Null
    Pass "sim EAL=$($sim.simulatedEal) AI recs=$($recs.Count)"
}

# ─── Summary ────────────────────────────────────────────────────────────
Write-Host "`n========================================"
Write-Host "PASSED: $passed  FAILED: $failed"
Write-Host "========================================"
if ($failed -gt 0) { exit 1 }
Write-Host "SMOKE TEST OK"
exit 0