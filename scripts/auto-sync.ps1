[CmdletBinding()]
param(
    [switch]$Publish,
    [switch]$ValidateOnly,
    [ValidateRange(2, 300)]
    [int]$DebounceSeconds = 8
)

$ErrorActionPreference = 'Stop'
$Workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$StateDirectory = Join-Path $Workspace '.auto-sync'
$PidFile = Join-Path $StateDirectory 'watcher.pid'
$SignalFile = Join-Path $StateDirectory 'last-change.utc'
$Git = Join-Path $Workspace '.tools\git\cmd\git.exe'
$AllowedFiles = @('package.json', 'package-lock.json', 'Dockerfile', 'eslint.config.js')
$AllowedRoots = @('frontend/', 'backend/', 'database/', 'test/')
$script:IgnoredBaseline = @{}

function Write-Status([string]$Message) {
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
}

function Invoke-Git([string[]]$Arguments) {
    & $Git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')"
    }
}

function Get-WorkingChanges {
    $raw = & $Git status --porcelain=v1
    if ($LASTEXITCODE -ne 0) { throw 'Unable to read Git status.' }
    return @($raw | Where-Object { $_ -and $_.Length -ge 4 } | ForEach-Object { $_.Substring(3).Trim() })
}

function Get-PathFingerprint([string]$Path) {
    $fullPath = Join-Path $Workspace $Path
    if (-not (Test-Path -LiteralPath $fullPath)) { return '<missing>' }
    if ((Get-Item -LiteralPath $fullPath).PSIsContainer) { return '<directory>' }
    return (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash
}

function Test-AllowedPath([string]$Path) {
    $normal = $Path.Replace('\', '/')
    if ($AllowedFiles -contains $normal) { return $true }
    return $AllowedRoots | Where-Object { $normal.StartsWith($_, [System.StringComparison]::OrdinalIgnoreCase) }
}

function Assert-Preconditions {
    if (-not (Test-Path $Git)) { throw "Bundled Git was not found at $Git." }
    $branch = (& $Git branch --show-current).Trim()
    if ($branch -ne 'main') { throw "Auto-sync only runs on main. Current branch: '$branch'." }
    if (-not ((& $Git remote).Contains('origin'))) { throw 'Git remote origin is required.' }
}

function Assert-CleanStart {
    $changes = @(Get-WorkingChanges)
    & $Git diff --cached --quiet
    if ($LASTEXITCODE -eq 1) {
        throw 'Refusing to start with staged changes. Commit or unstage them first.'
    }
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the Git index.' }

    $sourceChanges = @($changes | Where-Object { Test-AllowedPath $_ })
    if ($sourceChanges.Count -gt 0) {
        throw "Refusing to start with existing source changes. Commit, stash, or discard them first: $($sourceChanges -join ', ')"
    }

    $ignored = @($changes | Where-Object { -not (Test-AllowedPath $_) })
    foreach ($path in $ignored) { $script:IgnoredBaseline[$path] = Get-PathFingerprint $path }
    if ($ignored.Count -gt 0) {
        Write-Status "Preserving unrelated pre-existing changes (never staged by auto-sync): $($ignored -join ', ')"
    }
}

function Invoke-Validation {
    Write-Status 'Running lint and tests...'
    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) { throw 'Validation failed. Nothing was committed or pushed.' }
}

function Invoke-PublishCycle {
    $changes = @(Get-WorkingChanges)
    if ($changes.Count -eq 0) { return }

    $unsafe = @($changes | Where-Object {
        if (Test-AllowedPath $_) { return $false }
        return (-not $script:IgnoredBaseline.ContainsKey($_)) -or
            ((Get-PathFingerprint $_) -ne $script:IgnoredBaseline[$_])
    })
    if ($unsafe.Count -gt 0) {
        throw "Refusing to publish non-source or unexpected paths: $($unsafe -join ', ')"
    }

    $changes = @($changes | Where-Object { Test-AllowedPath $_ })
    if ($changes.Count -eq 0) { return }

    Invoke-Validation

    if (-not $Publish) {
        Write-Status 'Validation passed. Publishing is disabled; no commit or push was made.'
        return
    }

    & $Git diff --cached --quiet
    if ($LASTEXITCODE -eq 1) {
        throw 'Refusing to alter an existing staged change. Review it manually, then restart the watcher from a clean tree.'
    }
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the Git index.' }

    Write-Status 'Checking origin/main before publishing...'
    Invoke-Git @('fetch', 'origin', 'main')
    $remoteAhead = [int]((& $Git rev-list --count 'HEAD..origin/main').Trim())
    if ($remoteAhead -gt 0) {
        throw "origin/main has $remoteAhead commit(s) not present locally. Pull/rebase manually; no commit or push was made."
    }

    # Stage only the allow-listed paths captured at the start of this cycle.
    Invoke-Git (@('add', '--') + $changes)
    & $Git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Status 'No stageable source changes remain.'
        return
    }
    if ($LASTEXITCODE -ne 1) { throw 'Unable to inspect staged changes.' }

    $message = "chore(auto-sync): publish validated changes $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')"
    Invoke-Git @('commit', '-m', $message)
    Invoke-Git @('push', 'origin', 'main')
    Write-Status 'Published to origin/main. GitHub Actions will validate it; Render deploys after those checks pass.'
}

function Test-WatchedPath([string]$FullPath) {
    $relative = $FullPath.Substring($Workspace.Length).TrimStart('\', '/').Replace('\', '/')
    return (Test-AllowedPath $relative)
}

Assert-Preconditions

if ($ValidateOnly) {
    Invoke-Validation
    Write-Status 'Validation completed; no files were staged, committed, or pushed.'
    exit 0
}

if (-not (Test-Path $StateDirectory)) { New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null }
if (Test-Path $PidFile) {
    $existingPid = (Get-Content $PidFile -Raw).Trim()
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
        throw "An auto-sync watcher is already running (PID $existingPid). Use the 'Auto-sync: stop' VS Code task first."
    }
    Remove-Item $PidFile -Force
}

Assert-CleanStart
Set-Content -Path $PidFile -Value $PID -NoNewline
Set-Content -Path $SignalFile -Value '' -NoNewline

$watcher = [System.IO.FileSystemWatcher]::new($Workspace, '*')
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, Size'
$signalAction = {
    $path = $Event.SourceEventArgs.FullPath
    $root = $Event.MessageData.Workspace
    $relative = $path.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
    $allowed = $Event.MessageData.AllowedFiles -contains $relative
    if (-not $allowed) {
        foreach ($prefix in $Event.MessageData.AllowedRoots) {
            if ($relative.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) { $allowed = $true; break }
        }
    }
    if ($allowed) {
        [System.IO.File]::WriteAllText($Event.MessageData.SignalFile, [DateTime]::UtcNow.ToString('o'))
    }
}
$messageData = @{ Workspace = $Workspace; AllowedFiles = $AllowedFiles; AllowedRoots = $AllowedRoots; SignalFile = $SignalFile }
$subscriptions = @(
    Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $signalAction -MessageData $messageData,
    Register-ObjectEvent -InputObject $watcher -EventName Created -Action $signalAction -MessageData $messageData,
    Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $signalAction -MessageData $messageData
)
$watcher.EnableRaisingEvents = $true
Write-Status "Watching source files with a $DebounceSeconds-second debounce. Publishing: $Publish."

try {
    while ($true) {
        Start-Sleep -Seconds 1
        $value = (Get-Content $SignalFile -Raw -ErrorAction SilentlyContinue).Trim()
        if (-not $value) { continue }
        $changedAt = [DateTime]::Parse($value, [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::RoundtripKind)
        if (([DateTime]::UtcNow - $changedAt).TotalSeconds -lt $DebounceSeconds) { continue }
        Set-Content -Path $SignalFile -Value '' -NoNewline
        try { Invoke-PublishCycle } catch { Write-Error $_; Write-Status 'Watcher remains active; fix the issue and save an allowed source file to retry.' }
    }
}
finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    $subscriptions | ForEach-Object { Unregister-Event -SubscriptionId $_.Id -ErrorAction SilentlyContinue }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}
