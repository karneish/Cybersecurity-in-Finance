# SCRO end-to-end smoke test.
# Run with the full stack up (docker compose up --build), then:
#   powershell -ExecutionPolicy Bypass -File scripts\smoke_sacro.ps1
#
# Verifies: login -> national summary -> sector compliance -> drill ->
#           national budget optimize -> TPRM cascade -> audit verify -> WS alive.

param(
    [string]$Base = "http://localhost:8080/api",
    [string]$WsUrl = "http://localhost:8086",
    [string]$Username = "scro_regulator",
    [string]$Password = "Scro@2026!",
    [string]$Email = "regulator@scro.gov.in"
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

# ─── 1. Login (or register on first run) ────────────────────────────────
Step "Login" {
    $loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
    try {
        $resp = Invoke-RestMethod -Method Post -Uri "$Base/auth/login" -ContentType "application/json" -Body $loginBody
        $script:token = $resp.token
    } catch {
        $regBody = @{
            username = $Username
            email = $Email
            password = $Password
            fullName = "SCRO Regulator"
            role = "ANALYST"
        } | ConvertTo-Json
        Invoke-RestMethod -Method Post -Uri "$Base/auth/register" -ContentType "application/json" -Body $regBody | Out-Null
        $resp = Invoke-RestMethod -Method Post -Uri "$Base/auth/login" -ContentType "application/json" -Body $loginBody
        $script:token = $resp.token
    }
    Assert-Truthy $script:token "auth token"
    Pass "Authenticated as $Username"
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

# ─── Summary ────────────────────────────────────────────────────────────
Write-Host "`n========================================"
Write-Host "PASSED: $passed  FAILED: $failed"
Write-Host "========================================"
if ($failed -gt 0) { exit 1 }
Write-Host "SMOKE TEST OK"
exit 0