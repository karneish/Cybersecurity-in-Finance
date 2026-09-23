# CyberRisk Quantifier -- one-time setup for a PERMANENT free URL.
#
# Turns the random trycloudflare URL into a single reusable link by:
#   1. creating a named Cloudflare tunnel (stable identity), and
#   2. giving it a hostname (default: cyberrisk.is-a.dev via the free
#      is-a.dev subdomain service, zero cost).
#
# TWO SETUP MODES:
#
#   A) ZONE-LESS (recommended if you have NO domain on Cloudflare):
#      Create a FREE Cloudflare API token with a single permission:
#        Account -> Cloudflare Tunnel -> Edit        (accounts only, NO DNS)
#      then run:
#        powershell -ExecutionPolicy Bypass -File scripts\tunnel-fixed-setup.ps1 `
#          -ApiToken "YOUR-TOKEN"
#      No cloudflared login / no domain needed -- everything goes through the
#      Cloudflare API (remotely-managed tunnel). You can REVOKE the API token
#      in the dashboard afterwards; only the saved run-token is kept on disk.
#
#   B) WITH A ZONE (classic): you own at least one Cloudflare zone/domain.
#        powershell -ExecutionPolicy Bypass -File scripts\tunnel-fixed-setup.ps1
#      This opens the browser for a one-time cloudflared login and builds a
#      locally-managed tunnel with config.yml.
#
# Either way the wizard prints the exact JSON/PR text you need to register your
# is-a.dev subdomain, and serve-free.ps1 afterwards gives the SAME URL every run.
#
# Check readiness without changing anything:
#   powershell -ExecutionPolicy Bypass -File scripts\tunnel-fixed-setup.ps1 -CheckOnly

param(
    [string]$TunnelName = "cyberrisk",
    [string]$Hostname = "cyberrisk.is-a.dev",
    [int]$Port = 3000,
    [string]$ConfigDir = "",
    [string]$LogDir = "",
    [string]$ApiToken = "",
    [switch]$CheckOnly,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok([string]$msg)    { Write-Host $msg -ForegroundColor Green }
function Write-Warn([string]$msg)  { Write-Host $msg -ForegroundColor Yellow }
function Write-Err([string]$msg)   { Write-Host $msg -ForegroundColor Red }

if (-not $ConfigDir) { $ConfigDir = Join-Path $HOME ".cloudflared" }
New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
if (-not $LogDir) { $LogDir = Join-Path $env:TEMP "cyberrisk-tunnel" }
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$tokenFile = Join-Path $ConfigDir "$TunnelName.token"
$hostnameFile = Join-Path $ConfigDir "hostname.txt"

# ─── Cloudflare API helper (zone-less mode) ────────────────────────────────
function Invoke-CF {
    param([string]$Method, [string]$Path, $Body = $null)
    $uri = "https://api.cloudflare.com/client/v4$Path"
    $params = @{
        Method      = $Method
        Uri         = $uri
        Headers     = $apiHeaders
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 8)
        $params.ContentType = "application/json"
    }
    try {
        return Invoke-RestMethod @params
    } catch {
        $msg = $_.Exception.Message
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $payload = $reader.ReadToEnd()
                if ($payload) {
                    $j = $payload | ConvertFrom-Json
                    if ($j.errors -and $j.errors.Count -gt 0) { $msg = ($j.errors | ForEach-Object { $_.message }) -join "; " }
                    else { $msg = $payload }
                }
            }
        } catch { }
        throw "Cloudflare API $Method $Path failed: $msg"
    }
}

# ─── 0. cloudflared: locate or fetch (still needed to RUN the tunnel) ───────
Write-Step "[0/5] Locating cloudflared"
$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
    $installDir = Join-Path $env:TEMP "cloudflared"
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
    $cloudflared = Join-Path $installDir "cloudflared.exe"
    if (-not (Test-Path -LiteralPath $cloudflared)) {
        Write-Step "   not installed -- downloading official Windows binary"
        $exeUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        Invoke-WebRequest -Uri $exeUrl -OutFile $cloudflared -UseBasicParsing
        Write-Ok "   downloaded to $cloudflared"
    }
}
Write-Ok "Using: $cloudflared"

$tunnelId = $null

if ($ApiToken) {
    # ─── 1a. ZONE-LESS: authenticate + find account via API ─────────────────
    Write-Step "[1/5] Authenticating via API token (zone-less mode)"
    $apiHeaders = @{ Authorization = "Bearer $ApiToken" }
    $accounts = (Invoke-CF GET "/accounts").result
    if (-not $accounts) { Write-Err "Token is valid but no accounts found."; exit 1 }
    $accountId = $accounts[0].id
    Write-Ok "Account: $($accounts[0].name) (id $accountId)"

    # ─── 2a. Find or create the named tunnel (remotely-managed) ────────────
    Write-Step "[2/5] Named tunnel '$TunnelName'"
    $tunnels = (Invoke-CF GET "/accounts/$accountId/cfd_tunnel").result
    $existing = @($tunnels | Where-Object { $_.name -eq $TunnelName } | Select-Object -First 1)
    if ($existing.Count -gt 0) {
        $tunnelId = $existing[0].id
        Write-Ok "Tunnel '$TunnelName' already exists (id $tunnelId)."
    } elseif ($CheckOnly) {
        Write-Warn "Tunnel '$TunnelName' does not exist yet. Run without -CheckOnly to create it."
        exit 1
    } else {
        Write-Step "   creating tunnel '$TunnelName'"
        $secretBytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($secretBytes)
        $created = (Invoke-CF POST "/accounts/$accountId/cfd_tunnel" @{
            name         = $TunnelName
            config_src   = "cloudflare"
            tunnel_secret = [Convert]::ToBase64String($secretBytes)
        }).result
        $tunnelId = $created.id
        Write-Ok "Tunnel '$TunnelName' created with id $tunnelId."
    }

    if (-not $tunnelId) { Write-Err "Could not determine the tunnel id."; exit 1 }

    # ─── 3a. Ingress config + run token via API ─────────────────────────────
    Write-Step "[3/5] Ingress -> $Hostname -> http://localhost:$Port"
    if (-not $CheckOnly) {
        (Invoke-CF PUT "/accounts/$accountId/cfd_tunnel/$tunnelId/configurations" @{
            config = @{
                ingress = @(
                    @{ hostname = $Hostname; service = "http://localhost:$Port" },
                    @{ service = "http_status:404" }
                )
            }
        }) | Out-Null
        Write-Ok "Ingress configured: $Hostname -> http://localhost:$Port"

        $tokResp = Invoke-CF GET "/accounts/$accountId/cfd_tunnel/$tunnelId/token"
        $runToken = $tokResp.result
        if (-not $runToken -is [string] -or -not $runToken) {
            $runToken = ($tokResp.result | ConvertTo-Json -Depth 5)
        }
        Set-Content -LiteralPath $tokenFile -Value $runToken -NoNewline
        Set-Content -LiteralPath $hostnameFile -Value $Hostname -NoNewline
        Write-Ok "Run token saved to $tokenFile (private -- not in git)."
        Write-Warn "SECURITY: you can now REVOKE the API token in Cloudflare -> My Profile -> API Tokens. Only this run-token is needed from now on."
    }
} else {
    # ─── 1b. WITH ZONE: classic cloudflared login ──────────────────────────
    Write-Step "[1/5] Cloudflare account login"
    $certFile = Join-Path $ConfigDir "cert.pem"
    if (-not (Test-Path -LiteralPath $certFile)) {
        if ($CheckOnly) {
            Write-Err "Not logged in yet (missing $certFile). Run the wizard without -CheckOnly to sign in."
            exit 1
        }
        Write-Warn "No login found. Opening your browser -- please sign in / create a FREE Cloudflare account (no card needed), select a zone, and click Allow."
        & $cloudflared --no-autoupdate tunnel login
        if (-not (Test-Path -LiteralPath $certFile)) {
            Write-Err "Login did not complete. Re-run this wizard and complete the browser step."
            exit 1
        }
    }
    Write-Ok "Logged in to Cloudflare."

    # ─── 2b. Create the named tunnel (locally-managed, idempotent) ─────────
    Write-Step "[2/5] Named tunnel '$TunnelName'"
    $listTxt = (& $cloudflared --no-autoupdate tunnel list 2>&1) -join "`n"
    if ($listTxt -match [regex]::Escape($TunnelName)) {
        $m = [regex]::Match($listTxt, "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s+$([regex]::Escape($TunnelName))\b")
        if ($m.Success) { $tunnelId = $m.Groups[1].Value }
        Write-Ok "Tunnel '$TunnelName' already exists (id $tunnelId)."
    } else {
        if ($CheckOnly) {
            Write-Warn "Tunnel '$TunnelName' does not exist yet. Run the wizard without -CheckOnly to create it."
            exit 1
        }
        $createTxt = (& $cloudflared --no-autoupdate tunnel create $TunnelName 2>&1) -join "`n"
        $m = [regex]::Match($createTxt, "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})")
        if ($m.Success) {
            $tunnelId = $m.Groups[1].Value
            Write-Ok "Tunnel '$TunnelName' created with id $tunnelId."
        } else {
            Write-Err "Could not create tunnel. Output was:"
            Write-Err $createTxt
            exit 1
        }
    }

    if (-not $tunnelId) { Write-Err "Could not determine the tunnel id for '$TunnelName'."; exit 1 }

    # ─── 3b. Write ingress config.yml ──────────────────────────────────────
    Write-Step "[3/5] Ingress config -> $Hostname -> http://localhost:$Port"
    $configFile = Join-Path $ConfigDir "config.yml"
    $credsPath = (Join-Path $ConfigDir "$tunnelId.json").Replace("\", "/")
    $yaml = @"
tunnel: $TunnelName
credentials-file: $credsPath
ingress:
  - hostname: $Hostname
    service: http://localhost:$Port
  - service: http_status:404
"@

    $shouldWrite = $true
    if ((Test-Path -LiteralPath $configFile) -and -not $Force) {
        $cfg = Get-Content $configFile -Raw
        if ($cfg -match [regex]::Escape($TunnelName)) {
            Write-Ok "config.yml already routes tunnel '$TunnelName'. Good (use -Force to rewrite as '$Hostname')."
            $shouldWrite = $false
        } else {
            Write-Warn "config.yml exists but does not mention tunnel '$TunnelName'; rewriting it."
            Copy-Item $configFile "$configFile.bak" -Force
        }
    }
    if ($shouldWrite -and -not $CheckOnly) {
        if (Test-Path -LiteralPath $configFile) { Copy-Item $configFile "$configFile.bak" -Force }
        Set-Content -Path $configFile -Value $yaml -Encoding UTF8
        Write-Ok "Wrote $configFile"
    }
    Write-Ok "ingress: $Hostname -> http://localhost:$Port"
}

if ($CheckOnly) {
    Write-Warn "Check-only: no changes made."
    Write-Ok "Your permanent URL will be: https://$Hostname"
    Write-Warn "(DNS for $Hostname still needs to point at $tunnelId.cfargotunnel.com -- see the PR step below.)"
    exit 0
}

# ─── 4. is-a.dev registration ──────────────────────────────────────────────
Write-Step "[4/5] Register your free subdomain on is-a.dev"
$isadDef = "cyberrisk"
$jsonBlock = @"
{
  "owner": {
    "username": "<YOUR-GITHUB-USERNAME>"
  },
  "records": {
    "CNAME": "$tunnelId.cfargotunnel.com"
  }
}
"@

Write-Ok "  Your permanent URL:  https://$Hostname"
Write-Ok "  Point this CNAME at:  $tunnelId.cfargotunnel.com"
Write-Ok ""
Write-Warn "  STEPS (do these yourself, in a normal browser):"
Write-Ok "    1. Go to https://github.com/is-a-dev/register  (logged in as your GitHub user)"
Write-Ok "    2. Fork the repo, then in your fork open the 'domains' folder"
Write-Ok "    3. Create a new file named:  $isadDef.json   (paste the JSON below)"
Write-Ok "    4. Open a Pull Request and wait for it to be merged (keep the site reachable!)"
Write-Ok "    5. Merged = few minutes, then your URL works forever."
Write-Ok ""
Write-Ok "  Paste EXACTLY this as $isadDef.json:"
Write-Host ""
Write-Host $jsonBlock -ForegroundColor Green
Write-Host ""
Write-Warn "  Fill <YOUR-GITHUB-USERNAME> with your real GitHub username first."
Write-Warn "  Do NOT tick 'proxied' / keep it off. CNAME cannot be combined with other records."
Write-Warn "  (If maintainers reject the CNAME target, fallback: register the same file on us.kg.)"

# ─── 5. Ready ──────────────────────────────────────────────────────────────
Write-Step "[5/5] Almost done"
Write-Ok "  While the PR is being reviewed, keep the app reachable:"
Write-Ok "    1. docker compose up -d --build"
Write-Ok "    2. powershell -ExecutionPolicy Bypass -File scripts\serve-free.ps1"
Write-Ok ""
Write-Ok "  After the PR merges, your permanent link (same every time):"
Write-Ok "     https://$Hostname"
Write-Ok ""
Write-Warn "  Verify DNS once merged:  Resolve-DnsName $Hostname"
Write-Err "  Reminder: the site is online only while your PC + Docker + tunnel are running."