<#
.TAKES a pg_dump (custom format) backup of the cyberrisk database.
.SYNOPSIS
    .\scripts\backup_db.ps1                        # local pg_dump (postgres/postgres@localhost:5432)
    $env:PG_CONTAINER='db'; .\scripts\backup_db.ps1 # via docker exec into a container named "db"
.DESCRIPTION
    Env vars (all optional): PG_CONTAINER, PG_USER, PG_PASSWORD, PG_DATABASE,
    PGHOST, PGPORT, BACKUP_DIR, RETENTION_DAYS.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$backupDir  = if ($env:BACKUP_DIR)  { $env:BACKUP_DIR }  else { Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'database\backups' }
$retention  = if ($env:RETENTION_DAYS) { [int]$env:RETENTION_DAYS } else { 14 }
$pgUser     = if ($env:PG_USER)     { $env:PG_USER }     else { 'postgres' }
$pgPass     = if ($env:PG_PASSWORD) { $env:PG_PASSWORD } else { 'postgres' }
$pgDb       = if ($env:PG_DATABASE) { $env:PG_DATABASE } else { 'cyberrisk' }
$pgHost     = if ($env:PGHOST)      { $env:PGHOST }      else { 'localhost' }
$pgPort     = if ($env:PGPORT)      { $env:PGPORT }      else { '5432' }

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$file  = Join-Path $backupDir "cyberrisk_$stamp.dump"

if ($env:PG_CONTAINER) {
    Write-Host "Backing up via container '$($env:PG_CONTAINER)' -> $file"
    docker exec -e PGPASSWORD=$pgPass $env:PG_CONTAINER `
        pg_dump -U $pgUser -h localhost -d $pgDb -Fc -f /tmp/cyberrisk.dump
    docker cp "$($env:PG_CONTAINER):/tmp/cyberrisk.dump" $file
    docker exec $env:PG_CONTAINER rm -f /tmp/cyberrisk.dump
} else {
    Write-Host "Backing up $pgHost`:$pgPort/$pgDb -> $file"
    $env:PGPASSWORD = $pgPass
    & pg_dump -U $pgUser -h $pgHost -p $pgPort -d $pgDb -Fc -f $file
    Remove-Item Env:\PGPASSWORD -ErrorAction Ignore
}

$size = [math]::Round((Get-Item $file).Length / 1KB, 1)
Write-Host "Backup size: ${size} KB"

# Retention: prune backups older than RETENTION_DAYS
$cutoff = (Get-Date).AddDays(-$retention)
Get-ChildItem $backupDir -Filter 'cyberrisk_*.dump' |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    Remove-Item -Force

Write-Host "Done: $file"