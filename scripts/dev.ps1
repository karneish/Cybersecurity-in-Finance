<#
.SYNOPSIS
    Starts the CyberRisk Quantifier stack natively (no Docker).

.DESCRIPTION
    Replaces the old `docker compose up`. Runs the same ten uvicorn processes
    plus the Vite dev server directly on this machine:

        auth-service 8081 · asset-service 8082 · vulnerability-service 8083
        control-service 8084 · ingestion-service 8085 · notification-service 8086
        risk-engine 8090 · investment-optimizer 8091 · ai-service 8092
        api-gateway 8080 (public) · frontend 3000

    Ports match .env.example exactly, and Vite proxies /ws -> :8086, so nothing
    else needs configuring for local development.

    Requires PostgreSQL and Redis to already be running on this machine — the
    script checks and tells you how to start them if not.

.PARAMETER Stop
    Kill everything a previous run left behind and exit.

.PARAMETER NoFrontend
    Backend only; skip the Vite dev server.

.PARAMETER SkipInstall
    Do not run `pip install -r requirements.txt` first.

.EXAMPLE
    pwsh -File scripts/dev.ps1
    pwsh -File scripts/dev.ps1 -Stop
#>
[CmdletBinding()]
param(
    [switch]$Stop,
    [switch]$NoFrontend,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$StateDir = Join-Path $RepoRoot '.dev'
$LogDir = Join-Path $StateDir 'logs'
$PidFile = Join-Path $StateDir 'pids.json'

$FrontendPort = 3000

# name -> port. api-gateway is last: it is the public entry point and we want the
# upstreams answering before it starts routing traffic.
$Services = [ordered]@{
    'auth-service'           = 8081
    'asset-service'          = 8082
    'vulnerability-service'  = 8083
    'control-service'        = 8084
    'ingestion-service'      = 8085
    'notification-service'   = 8086
    'risk-engine'            = 8090
    'investment-optimizer'   = 8091
    'ai-service'             = 8092
    'api-gateway'            = 8080
}

# Each service's Python package is uniquely named (they used to all be called
# `app`, which is fine as ten separate processes but ambiguous the moment they
# share one interpreter -- see deploy/render/serve_all.py). Kept in sync by
# deploy/tools/rename_package.py.
$Packages = @{
    'auth-service'           = 'authapp'
    'asset-service'          = 'assetapp'
    'vulnerability-service'  = 'vulnapp'
    'control-service'        = 'controlapp'
    'ingestion-service'      = 'ingestapp'
    'notification-service'   = 'notifyapp'
    'risk-engine'            = 'riskapp'
    'investment-optimizer'   = 'investapp'
    'ai-service'             = 'aiapp'
    'api-gateway'            = 'gwapp'
}

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    $msg" -ForegroundColor Yellow }
function Die($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# ─── stop ────────────────────────────────────────────────────────────────
function Stop-Stack {
    if (-not (Test-Path $PidFile)) { Write-Host 'Nothing to stop (no .dev/pids.json).' -ForegroundColor Yellow; return }
    $map = Get-Content $PidFile -Raw | ConvertFrom-Json
    $names = $map.PSObject.Properties.Name
    Write-Step "Stopping $($names.Count) process(es)"
    foreach ($prop in $map.PSObject.Properties) {
        $procId = [int]$prop.Value
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
            # uvicorn spawns no children, but kill the whole tree to be safe.
            & taskkill /PID $procId /T /F 2>&1 | Out-Null
            Write-Ok "stopped $($prop.Name) (pid $procId)"
        }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    Write-Ok 'stack stopped'
}

if ($Stop) { Stop-Stack; exit 0 }

# Any leftovers from a crashed run would hold ports hostage.
if (Test-Path $PidFile) { Write-Step 'Found processes from a previous run'; Stop-Stack }

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# ─── load .env into the process environment ───────────────────────────────
$envFile = Join-Path $RepoRoot '.env'
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*#' -or -not $line.Contains('=')) { continue }
        $key, $value = $line -split '=', 2
        $key = $key.Trim()
        # Only set what the caller has not already exported.
        if ($key -and -not [Environment]::GetEnvironmentVariable($key)) {
            # VITE_* are Vercel BUILD-TIME variables and must NOT reach the Vite
            # dev server. Vite reads them straight out of the process
            # environment, so exporting one here silently overrides the
            # client.ts `|| '/api'` fallback and every request 404s at the
            # gateway ("No upstream route for /auth/login"). Locally the Vite
            # proxy in vite.config.ts maps /api -> :8080 and /ws -> :8086.
            if ($key -like 'VITE_*') {
                Write-Warn2 "  ignoring $key (Vercel-only; local dev uses the Vite proxy)"
                continue
            }
            [Environment]::SetEnvironmentVariable($key, $value.Trim())
        }
    }
    Write-Ok 'loaded .env'
}
else {
    Write-Warn2 'No .env found — falling back to built-in defaults. Copy .env.example to .env.'
}

# ─── preflight ───────────────────────────────────────────────────────────
Write-Step 'Checking prerequisites'

$python = $null
foreach ($candidate in @('python', 'python3', 'py')) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($cmd) { $python = $cmd.Source; break }
}
if (-not $python) { Die 'Python not found on PATH. Install Python 3.12+ and retry.' }

$pyVersion = & $python -c "import sys; print('%d.%d' % sys.version_info[:2])"
Write-Ok "python $pyVersion ($python)"
if ([version]$pyVersion -lt [version]'3.11') { Die "Python 3.12+ required (found $pyVersion)." }

function Test-TcpPort($port, $what) {
    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $task = $client.ConnectAsync('127.0.0.1', $port)
        if ($task.Wait(1500) -and $client.Connected) { $client.Close(); return $true }
        $client.Close(); return $false
    } catch { return $false }
}

# Redis — strongly recommended but not fatal. The gateway's rate limiter and
# circuit breaker fail open (see gateway_routes.py), so the app stays usable
# without it; what degrades is live event delivery.
$degraded = @()
$redisPort = 6379
if ($env:REDIS_URL -match ':(\d+)$') { $redisPort = [int]$Matches[1] }
if (Test-TcpPort $redisPort 'redis') {
    Write-Ok "redis reachable on $redisPort"
} else {
    $degraded += 'redis'
    Write-Warn2 "Redis is NOT reachable on port $redisPort."
    Write-Warn2 "  The stack will still start, but: live /ws updates will never arrive"
    Write-Warn2 "  (notification-service's Redis bridge retries silently), and"
    Write-Warn2 "  POST /api/ingestion/events will 500. Install Redis (Memurai on"
    Write-Warn2 "  Windows, or 'sudo apt install redis-server' inside WSL), or point"
    Write-Warn2 "  REDIS_URL at a hosted instance in .env, then restart."
}

# PostgreSQL — required. Parse the port out of DATABASE_URL.
$pgPort = 5432
if ($env:DATABASE_URL -match '@[^:/?]+:(\d+)') { $pgPort = [int]$Matches[1] }
if (Test-TcpPort $pgPort 'postgres') {
    Write-Ok "postgres reachable on $pgPort"
} else {
    Die "PostgreSQL is not reachable on port $pgPort. Start it, or point DATABASE_URL at another instance in .env."
}

# ─── dependencies ────────────────────────────────────────────────────────
if (-not $SkipInstall) {
    Write-Step 'Installing Python dependencies'
    & $python -m pip install --quiet --upgrade pip
    if ($LASTEXITCODE -ne 0) { Die 'pip upgrade failed.' }
    & $python -m pip install --quiet -r (Join-Path $RepoRoot 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { Die 'pip install -r requirements.txt failed.' }
    & $python -m pip install --quiet (Join-Path $RepoRoot 'services/common')
    if ($LASTEXITCODE -ne 0) { Die 'pip install ./services/common failed.' }
    Write-Ok 'dependencies installed'
}

# Fail now, not ten times over in the log files.
& $python -c "import uvicorn, fastapi, cybercommon, psycopg2, redis" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Die 'Required packages are missing. Re-run without -SkipInstall.' }

# ─── migrations ──────────────────────────────────────────────────────────
Write-Step 'Running database migrations + seed'
Push-Location $RepoRoot
try {
    & $python (Join-Path $RepoRoot 'database/migrate_and_seed.py')
    if ($LASTEXITCODE -ne 0) { Die 'database/migrate_and_seed.py failed — see the traceback above.' }
} finally { Pop-Location }
Write-Ok 'database ready'

# ─── launch ──────────────────────────────────────────────────────────────
Write-Step 'Starting backend services'
$procs = [ordered]@{}

foreach ($entry in $Services.GetEnumerator()) {
    $name = $entry.Key
    $port = $entry.Value
    $log = Join-Path $LogDir "$name.log"
    $err = Join-Path $LogDir "$name.err.log"
    if (Test-Path $log) { Remove-Item $log -Force }

    $args = @(
        '-m', 'uvicorn', "$($Packages[$name]).main:app",
        '--host', '127.0.0.1',
        '--port', "$port",
        '--app-dir', "services/$name",
        '--log-level', 'info'
    )
    $proc = Start-Process -FilePath $python -ArgumentList $args `
        -WorkingDirectory $RepoRoot -PassThru -NoNewWindow `
        -RedirectStandardOutput $log -RedirectStandardError $err
    $procs[$name] = $proc.Id
    Write-Ok "$name -> 127.0.0.1:$port (pid $($proc.Id))"
}

# Persist backend PIDs BEFORE touching the frontend. If the frontend fails to
# start, an unwritten PID file would leave ten services running with no way to
# stop them via -Stop.
$procs | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8

$frontendProc = $null
if (-not $NoFrontend) {
    Write-Step 'Starting Vite dev server'
    # Get-Command resolves `npm` to npm.ps1 (the PowerShell shim), which
    # Start-Process cannot launch — "%1 is not a valid Win32 application".
    # npm.cmd is the real batch wrapper and is what Start-Process needs.
    $npmCmd = @(
        (Get-Command npm.cmd -ErrorAction SilentlyContinue),
        (Get-Command npm.exe -ErrorAction SilentlyContinue)
    ) | Where-Object { $_ } | Select-Object -First 1
    if (-not $npmCmd) {
        $npmAny = Get-Command npm -ErrorAction SilentlyContinue
        if ($npmAny) { $npmCmd = $npmAny }
    }
    if (-not $npmCmd) {
        Write-Warn2 'npm not found on PATH - skipping the frontend. Backend is still running.'
    } else {
        try {
            $frontendDir = Join-Path $RepoRoot 'frontend'
            $viteLog = Join-Path $LogDir 'frontend.log'
            $frontendProc = Start-Process -FilePath $npmCmd.Source -ArgumentList @('run', 'dev') `
                -WorkingDirectory $frontendDir -PassThru -NoNewWindow `
                -RedirectStandardOutput $viteLog -RedirectStandardError (Join-Path $LogDir 'frontend.err.log')
            $procs['frontend'] = $frontendProc.Id
            $procs | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8
            Write-Ok "frontend -> http://localhost:$FrontendPort (pid $($frontendProc.Id))"
        } catch {
            Write-Warn2 "Could not start the Vite dev server: $($_.Exception.Message)"
            Write-Warn2 "  The backend is still running. Start the frontend yourself with:"
            Write-Warn2 "    cd '$RepoRoot\frontend'; npm run dev"
        }
    }
}

# ─── wait for health ─────────────────────────────────────────────────────
Write-Step 'Waiting for services to report healthy'
$deadline = (Get-Date).AddSeconds(120)
$unhealthy = @()
foreach ($entry in $Services.GetEnumerator()) {
    $name = $entry.Key
    $port = $entry.Value
    $ok = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health" -TimeoutSec 3 -UseBasicParsing
            if ($resp.StatusCode -eq 200) { $ok = $true; break }
        } catch { Start-Sleep -Milliseconds 700 }
    }
    if ($ok) { Write-Ok "$name healthy" } else { Write-Warn2 "$name did NOT become healthy - see .dev/logs/$name.err.log"; $unhealthy += $name }
}

Write-Host ''
Write-Host '  Stack is up.' -ForegroundColor Green
Write-Host "    API      http://localhost:8080/api" -ForegroundColor Gray
Write-Host "    Docs     http://localhost:8080/docs" -ForegroundColor Gray
Write-Host "    Health   http://localhost:8080/health" -ForegroundColor Gray
if ($frontendProc) { Write-Host "    Frontend http://localhost:$FrontendPort" -ForegroundColor Gray }
Write-Host "    Logs     $LogDir" -ForegroundColor Gray
Write-Host ''
Write-Host '  Press Ctrl+C to stop.' -ForegroundColor Yellow
Write-Host ''

if ($unhealthy.Count -gt 0) {
    Write-Warn2 "Not healthy: $($unhealthy -join ', ')"
}
if ($degraded.Count -gt 0) {
    Write-Warn2 "Degraded (missing: $($degraded -join ', ')) - see the warnings above."
}

# ─── supervise: block until Ctrl+C, then tear everything down ────────────
try {
    while ($true) {
        Start-Sleep -Seconds 3
        $dead = @()
        foreach ($name in $procs.Keys) {
            $procId = [int]$procs[$name]
            if (-not (Get-Process -Id $procId -ErrorAction SilentlyContinue)) { $dead += $name }
        }
        if ($dead.Count -gt 0) {
            Write-Warn2 "process(es) exited: $($dead -join ', ') - stopping the rest"
            break
        }
    }
}
finally {
    Write-Host ''
    Stop-Stack
}