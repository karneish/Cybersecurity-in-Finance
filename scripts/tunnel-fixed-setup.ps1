# CyberRisk Quantifier -- one-time setup for a PERMANENT free URL.
#
# Turns the random trycloudflare URL into a single reusable link by:
#   1. creating a named Cloudflare tunnel (stable identity), and
#   2. giving it a hostname (default: cyberrisk.is-a.dev via the free
#      is-a.dev subdomain service, zero cost).
#
# Run this ONCE (interactive):
#   powershell -ExecutionPolicy Bypass -File scripts\tunnel-fixed-setup.ps1
#
# It will:
#   * open your browser for a one-time Cloudflare login (free, no card)
#   * create the named tunnel + ingress config in ~\.cloudflared\
#   * print the exact JSON/PR text to register your is-a.dev subdomain
#
# After this wizard, if you want to check readiness without changing anything:
#   powershell -ExecutionPolicy Bypass -File scripts\tunnel-fixed-setup.ps1 -CheckOnly
#
# Once your is-a.dev PR is merged, the daily command is the same as before:
#   powershell -ExecutionPolicy Bypass -File scripts\serve-free.ps1
#   -> ALWAYS the same URL.

param(
    [string]$TunnelName = "cyberrisk",
    [string]$Hostname = "cyberrisk.is-a.dev",
    [int]$Port = 3000,
    [string]$ConfigDir = "",
    [string]$LogDir = "",
    [switch]$CheckOnly,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok([string]$msg)    { Write-Host $msg -ForegroundColor Green }
function Write-Warn([string]$msg)  { Write-Host $msg -ForegroundColor Yellow }
function Write-Err([string]$msg)   { Write-Host $msg -ForegroundColor Red }

# ─── 0. cloudflared: locate or fetch ───────────────────────────────────────
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

if (-not $ConfigDir) { $ConfigDir = Join-Path $HOME ".cloudflared" }
New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
if (-not $LogDir) { $LogDir = Join-Path $env:TEMP "cyberrisk-tunnel" }
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# ─── 1. Cloudflare login (one time) ────────────────────────────────────────
Write-Step "[1/5] Cloudflare account login"
$certFile = Join-Path $ConfigDir "cert.pem"
if (-not (Test-Path -LiteralPath $certFile)) {
    if ($CheckOnly) {
        Write-Err "Not logged in yet (missing $certFile). Run the wizard WITHOUT -CheckOnly to sign in."
        exit 1
    }
    Write-Warn "No login found. Opening your browser -- please sign in / create a FREE Cloudflare account (no card needed) and click Allow."
    & $cloudflared tunnel login --no-autoupdate
    if (-not (Test-Path -LiteralPath $certFile)) {
        Write-Err "Login did not complete. Re-run this wizard and complete the browser step."
        exit 1
    }
}
Write-Ok "Logged in to Cloudflare."

# ─── 2. Create the named tunnel (idempotent) ───────────────────────────────
Write-Step "[2/5] Named tunnel '$TunnelName'"
$tunnelId = $null
$listTxt = (& $cloudflared tunnel list --no-autoupdate 2>&1) -join "`n"
if ($listTxt -match [regex]::Escape($TunnelName)) {
    $m = [regex]::Match($listTxt, "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s+$([regex]::Escape($TunnelName))\b")
    if ($m.Success) { $tunnelId = $m.Groups[1].Value }
    Write-Ok "Tunnel '$TunnelName' already exists (id $tunnelId)."
} else {
    if ($CheckOnly) {
        Write-Warn "Tunnel '$TunnelName' does not exist yet. Run the wizard without -CheckOnly to create it."
        exit 1
    }
    $createTxt = (& $cloudflared tunnel create $TunnelName --no-autoupdate 2>&1) -join "`n"
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

if (-not $tunnelId) {
    Write-Err "Could not determine the tunnel id for '$TunnelName'."
    exit 1
}

# ─── 3. Write ingress config ───────────────────────────────────────────────
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
if ($shouldWrite) {
    if (Test-Path -LiteralPath $configFile) { Copy-Item $configFile "$configFile.bak" -Force }
    Set-Content -Path $configFile -Value $yaml -Encoding UTF8
    Write-Ok "Wrote $configFile"
}
Write-Ok "ingress: $Hostname -> http://localhost:$Port"

if ($CheckOnly) {
    Write-Warn "Check-only: no further changes made."
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