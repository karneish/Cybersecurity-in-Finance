# Docker disk/RAM slimming for the SCRO stack.
#
# Scoped SAFE cleanup only — touches nothing that belongs to other projects:
#   * `docker builder prune -af`  -> removes the global BuildKit cache (~4.6 GB).
#   * `docker image prune -f`     -> removes dangling <none> images only.
#   * Volumes and tagged images   -> left untouched.
#
# Also reports the WSL2 memory cap setting (edit %USERPROFILE%\.wslconfig and
# run `wsl --shutdown`, then re-open Docker Desktop, to apply a new cap).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/slim_docker.ps1
# or:
#   make slim

$ErrorActionPreference = 'Stop'

Write-Host '=== SCRO Docker slimming ===' -ForegroundColor Cyan
Write-Host ''

function Show-Df {
  docker system df
  Write-Host ''
}

Write-Host 'BEFORE' -ForegroundColor Yellow
Show-Df

Write-Host '=> Pruning BuildKit build cache (deletes no image/volume/data)...' -ForegroundColor Yellow
docker builder prune -af

Write-Host ''
Write-Host '=> Removing dangling images only...' -ForegroundColor Yellow
docker image prune -f

Write-Host ''
Write-Host 'AFTER' -ForegroundColor Yellow
Show-Df

Write-Host '=> WSL2 memory cap currently set to:' -ForegroundColor Yellow
$wslconfig = "$env:USERPROFILE\.wslconfig"
if (Test-Path -LiteralPath $wslconfig) {
  (Select-String -LiteralPath $wslconfig -Pattern '^\s*memory=').Line
} else {
  Write-Host '  (no .wslconfig found — Docker Desktop default applies)'
}
Write-Host ''
Write-Host 'Tip: to lower the cap, edit %USERPROFILE%\.wslconfig' -ForegroundColor Cyan
Write-Host '     (e.g. "memory=4GB"), then run  wsl --shutdown  and reopen Docker Desktop.' -ForegroundColor Cyan
Write-Host 'Tip: when not demoing, stop the stack to free RAM:  docker compose stop' -ForegroundColor Cyan