[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PidFile = Join-Path $Workspace '.auto-sync\watcher.pid'

if (-not (Test-Path $PidFile)) {
    Write-Host 'No auto-sync watcher is recorded as running.'
    exit 0
}

$watcherPid = (Get-Content $PidFile -Raw).Trim()
$process = Get-Process -Id $watcherPid -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $watcherPid
    Write-Host "Stopped auto-sync watcher (PID $watcherPid)."
} else {
    Write-Host "Removed stale auto-sync watcher PID file ($watcherPid)."
}
Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
