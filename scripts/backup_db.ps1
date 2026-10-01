<#
.SYNOPSIS
    Takes a pg_dump (custom format) backup of the cyberrisk database.

.DESCRIPTION
    Runs against the local PostgreSQL instance that scripts/dev.ps1 uses. If
    PG_PASSWORD / PG_USER / PG_DATABASE are not set in the environment, they are
    read from DATABASE_URL in the repo's .env file so this script needs no
    arguments in the normal case.

    Env vars (all optional, all override .env): PG_USER, PG_PASSWORD,
    PG_DATABASE, PGHOST, PGPORT, BACKUP_DIR, RETENTION_DAYS.

.EXAMPLE
    .\scripts\backup_db.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

# Fall back to .env so the defaults always match the running stack.
$envFile = Join-Path $repoRoot '.env'
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*#' -or -not $line.Contains('=')) { continue }
        $k, $v = $line -split '=', 2
        $k = $k.Trim()
        if ($k -and -not [Environment]::GetEnvironmentVariable($k)) {
            [Environment]::SetEnvironmentVariable($k, $v.Trim())
        }
    }
}

$backupDir = if ($env:BACKUP_DIR)  { $env:BACKUP_DIR }  else { Join-Path $repoRoot 'database\backups' }
$retention = if ($env:RETENTION_DAYS) { [int]$env:RETENTION_DAYS } else { 14 }
$pgUser    = if ($env:PG_USER)     { $env:PG_USER }     else { 'postgres' }
$pgDb      = if ($env:PG_DATABASE) { $env:PG_DATABASE } else { 'cyberrisk' }
$pgHost    = if ($env:PGHOST)      { $env:PGHOST }      else { 'localhost' }
$pgPort    = if ($env:PGPORT)      { $env:PGPORT }      else { '5432' }

# Prefer explicit PG_PASSWORD; otherwise scrape it out of DATABASE_URL.
$pgPass = if ($env:PG_PASSWORD) { $env:PG_PASSWORD } else { $null }
if (-not $pgPass -and $env:DATABASE_URL -match '://[^:@/]+:([^@]+)@') { $pgPass = $Matches[1] }
if (-not $pgPass) { $pgPass = 'postgres' }
if ($env:DATABASE_URL -match '@([^:/?]+):(\d+)') {
    if (-not $env:PGHOST)   { $pgHost = $Matches[1] }
    if (-not $env:PGPORT)   { $pgPort = $Matches[2] }
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    throw "pg_dump not found on PATH. Install the PostgreSQL client tools."
}

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$file  = Join-Path $backupDir "cyberrisk_$stamp.dump"

Write-Host "Backing up ${pgHost}:${pgPort}/${pgDb} -> $file"
$env:PGPASSWORD = $pgPass
try {
    & pg_dump -U $pgUser -h $pgHost -p $pgPort -d $pgDb -Fc -f $file
    if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction Ignore
}

$size = [math]::Round((Get-Item $file).Length / 1KB, 1)
Write-Host "Backup size: ${size} KB"

# Retention: prune backups older than RETENTION_DAYS
$cutoff = (Get-Date).AddDays(-$retention)
Get-ChildItem $backupDir -Filter 'cyberrisk_*.dump' -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    Remove-Item -Force

Write-Host "Done: $file"