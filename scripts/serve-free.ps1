# CyberRisk Quantifier -- free public tunnel from your PC (Cloudflare).
#
# Exposes the locally running app over the internet WITHOUT making your PC a
# server, opening router ports, signing up, or paying anything.
#
# The Docker stack (frontend nginx on port 3000) is the single public door:
#   https://<random>.trycloudflare.com
#       -> /       React SPA
#       -> /api/*  api-gateway -> all microservices
#       -> /ws     STOMP WebSocket feed
#
# Usage:
#   # app online + waiting for you to press Ctrl+C to take it down:
#   powershell -ExecutionPolicy Bypass -File scripts\serve-free.ps1
#
#   # (automation) exit after N seconds:
#   powershell -ExecutionPolicy Bypass -File scripts\serve-free.ps1 -MaxSeconds 300
#
# No services are installed, nothing starts on boot, and your OS/settings are
# untouched. Closing the terminal (or Ctrl+C) takes the site offline and your
# PC is exactly as it was before.

param(
    [int]$Port = 3000,
    [int]$MaxSeconds = 0,
    [string]$LogDir = ""
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok([string]$msg)    { Write-Host $msg -ForegroundColor Green }
function Write-Warn([string]$msg)  { Write-Host $msg -ForegroundColor Yellow }
function Write-Err([string]$msg)   { Write-Host $msg -ForegroundColor Red }

# ─── 1. Must-have: stack is up ─────────────────────────────────────────────
Write-Step "[1/4] Checking the local app on port $Port"
if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)) {
    Write-Err "Nothing is listening on http://localhost:$Port -- start the stack first:"
    Write-Err "   docker compose up -d --build"
    exit 1
}
Write-Ok "App is reachable at http://localhost:$Port"

# ─── 2. cloudflared: locate or fetch ───────────────────────────────────────
Write-Step "[2/4] Locating cloudflared"
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

# ─── 3. Bring the tunnel up ────────────────────────────────────────────────
Write-Step "[3/4] Starting Cloudflare tunnel -> http://localhost:$Port"
if (-not $LogDir) { $LogDir = Join-Path $env:TEMP "cyberrisk-tunnel" }
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$logOut = Join-Path $LogDir "cloudflared.out.log"
$logErr = Join-Path $LogDir "cloudflared.err.log"

$proc = Start-Process `
    -FilePath $cloudflared `
    -ArgumentList @("tunnel", "--url", "http://localhost:$Port", "--no-autoupdate") `
    -RedirectStandardOutput $logOut `
    -RedirectStandardError $logErr `
    -PassThru -WindowStyle Hidden

$url = $null
$deadline = (Get-Date).AddMinutes(2)
while ((Get-Date) -lt $deadline) {
    if ($proc.HasExited) { break }
    Start-Sleep -Seconds 1
    $combined = ""
    if (Test-Path -LiteralPath $logOut) { $combined += Get-Content $logOut -Raw }
    if (Test-Path -LiteralPath $logErr) { $combined += Get-Content $logErr -Raw }
    $m = [regex]::Match($combined, "https://[a-z0-9\-]+\.trycloudflare\.com")
    if ($m.Success) { $url = $m.Value; break }
}

if (-not $url) {
    Write-Err "Could not obtain a tunnel URL. Last logs:"
    if (Test-Path -LiteralPath $logErr) { Get-Content $logErr -Tail 15 | ForEach-Object { Write-Err "   $_" } }
    if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
    exit 1
}

Write-Ok ""
Write-Ok "  ================================================================"
Write-Ok "  Your app is LIVE at:"
Write-Ok "  $url"
Write-Ok "  (login with scro_regulator / Scro@2026!)"
Write-Ok "  ================================================================"
Write-Ok ""

$urlFile = Join-Path $LogDir "tunnel-url.txt"
Set-Content -Path $urlFile -Value $url
Write-Ok "URL also saved to: $urlFile"

# ─── 4. Stay alive until Ctrl+C (or -MaxSeconds) ───────────────────────────
Write-Step "[4/4] Tunnel active. Press Ctrl+C here to take the site offline."
try {
    if ($MaxSeconds -gt 0) {
        Start-Sleep -Seconds $MaxSeconds
    } else {
        # Keep running with the tab open; Ctrl+C in this window ends it.
        $cancel = $false
        [Console]::CancelKeyPress.Add({
            param($sender, $e)
            $script:cancel = $true
            $e.Cancel = $true
        })
        while (-not $script:cancel) {
            if ($proc.HasExited) { break }
            Start-Sleep -Seconds 2
        }
    }
} finally {
    if (-not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force
        $proc.WaitForExit()
    }
    Write-Ok "Tunnel closed. Your PC is back to normal -- nothing running, nothing changed."
}