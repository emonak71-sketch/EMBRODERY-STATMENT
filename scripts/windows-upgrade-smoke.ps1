$ErrorActionPreference = 'Stop'

$previousInstallerUrl = $env:PREVIOUS_INSTALLER_URL
$expectedPreviousHash = ($env:PREVIOUS_INSTALLER_SHA256 ?? '').ToLowerInvariant()
$currentVersion = [string](Get-Content 'package.json' -Raw | ConvertFrom-Json).version
if ($currentVersion -notmatch '^\d+\.\d+\.\d+$') { throw "Invalid current app version: $currentVersion" }
if (-not $previousInstallerUrl -or -not $expectedPreviousHash) {
  throw 'Previous installer URL and SHA-256 must be supplied by the release workflow.'
}

$tempRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { $env:TEMP }
$previousInstaller = Join-Path $tempRoot 'Embroidery.Statement_1.0.1_x64-setup.exe'
Invoke-WebRequest -Uri $previousInstallerUrl -OutFile $previousInstaller
$actualPreviousHash = (Get-FileHash -Path $previousInstaller -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualPreviousHash -ne $expectedPreviousHash) {
  throw "Previous 1.0.1 installer integrity check failed. Expected $expectedPreviousHash, received $actualPreviousHash."
}

$uninstallRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'
function Get-EmbroideryInstallEntry {
  Get-ChildItem -Path $uninstallRoot -ErrorAction SilentlyContinue |
    ForEach-Object { Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue } |
    Where-Object { $_.DisplayName -eq 'Embroidery Statement' } |
    Select-Object -First 1
}
function Get-UninstallerPath($entry) {
  if (-not $entry -or -not $entry.UninstallString) { return $null }
  if ($entry.UninstallString -match '"([^"]+)"') { return $Matches[1] }
  return ($entry.UninstallString -split '\s+')[0]
}

$marker = Join-Path (Join-Path $env:APPDATA 'com.embroidery.statement') 'upgrade-preservation-smoke.txt'
$oldUninstaller = $null
$newUninstaller = $null
$appProcess = $null
try {
  Write-Host 'Installing the published 1.0.1 release as the upgrade baseline...'
  $oldInstall = Start-Process -FilePath $previousInstaller -ArgumentList '/S' -Wait -PassThru
  if ($oldInstall.ExitCode -ne 0) { throw "The 1.0.1 installer exited with code $($oldInstall.ExitCode)." }

  $oldEntry = Get-EmbroideryInstallEntry
  if (-not $oldEntry) { throw 'The 1.0.1 application was not registered after installation.' }
  if ($oldEntry.DisplayVersion -and $oldEntry.DisplayVersion -notlike '1.0.1*') {
    throw "Expected installed baseline 1.0.1, found $($oldEntry.DisplayVersion)."
  }
  $oldUninstaller = Get-UninstallerPath $oldEntry
  if (-not $oldUninstaller -or -not (Test-Path $oldUninstaller)) {
    throw "Could not locate the 1.0.1 uninstaller: $($oldEntry.UninstallString)"
  }
  $oldInstallDirectory = Split-Path -Parent $oldUninstaller
  $oldAppExe = Join-Path $oldInstallDirectory 'embroidery-statement.exe'
  if (-not (Test-Path $oldAppExe)) { throw "The 1.0.1 executable was not found: $oldAppExe" }

  Write-Host 'Creating a user-data marker outside the installation directory...'
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $marker) | Out-Null
  'keep-existing-user-data-across-upgrade' | Set-Content -Path $marker -Encoding UTF8

  $newInstaller = Get-ChildItem 'src-tauri/target/release/bundle/nsis' -Filter '*.exe' |
    Where-Object { $_.Name -notmatch 'uninstall' } |
    Select-Object -First 1
  if (-not $newInstaller) { throw "The new $currentVersion NSIS installer was not generated." }

  Write-Host "Installing $currentVersion over the existing 1.0.1 installation..."
  $newInstall = Start-Process -FilePath $newInstaller.FullName -ArgumentList '/S' -Wait -PassThru
  if ($newInstall.ExitCode -ne 0) { throw "The $currentVersion installer exited with code $($newInstall.ExitCode)." }

  $newEntry = Get-EmbroideryInstallEntry
  if (-not $newEntry) { throw "The application is not registered after the $currentVersion upgrade." }
  $newUninstaller = Get-UninstallerPath $newEntry
  if (-not $newUninstaller -or -not (Test-Path $newUninstaller)) {
    throw "Could not locate the $currentVersion uninstaller: $($newEntry.UninstallString)"
  }
  $newInstallDirectory = Split-Path -Parent $newUninstaller
  $newAppExe = Join-Path $newInstallDirectory 'embroidery-statement.exe'
  if (-not (Test-Path $newAppExe)) { throw "The upgraded application executable was not found: $newAppExe" }
  if ($oldAppExe -ine $newAppExe) {
    throw "The upgrade changed the installation path. Old: $oldAppExe; new: $newAppExe"
  }

  $versionCandidates = @(
    [string]$newEntry.DisplayVersion,
    [string](Get-Item $newAppExe).VersionInfo.ProductVersion,
    [string](Get-Item $newAppExe).VersionInfo.FileVersion
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  $currentVersionPattern = '^' + [regex]::Escape($currentVersion) + '(?:\.|$)'
  if (-not ($versionCandidates | Where-Object { $_ -match $currentVersionPattern })) {
    throw "The installed application does not report version $currentVersion. Detected: $($versionCandidates -join ', ')"
  }

  if (-not (Test-Path $marker)) { throw 'The existing per-user application data was not preserved by the upgrade.' }

  $manifest = Get-Content 'latest.json' -Raw | ConvertFrom-Json
  if ($manifest.version -ne $currentVersion) { throw "Updater manifest version is not $currentVersion`: $($manifest.version)" }
  $platform = $manifest.platforms.'windows-x86_64'
  if (-not $platform.signature -or -not $platform.url -or $platform.url -notlike "*/v$currentVersion/*") {
    throw "The $currentVersion updater manifest is missing its signed installer URL or signature."
  }
  $signaturePath = $newInstaller.FullName + '.sig'
  if (-not (Test-Path $signaturePath) -or (Get-Item $signaturePath).Length -eq 0) {
    throw "The new $currentVersion updater signature file is missing or empty."
  }

  Write-Host 'Launching the upgraded application to check startup stability...'
  $appProcess = Start-Process -FilePath $newAppExe -PassThru
  Start-Sleep -Seconds 8
  $appProcess.Refresh()
  if ($appProcess.HasExited) { throw 'The upgraded application exited unexpectedly during startup.' }
  Write-Host "PASS: 1.0.1 -> $currentVersion in-place installation, version, updater manifest, signature presence, startup and user-data preservation."
}
finally {
  if ($appProcess -and -not $appProcess.HasExited) {
    Stop-Process -Id $appProcess.Id -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
  $finalEntry = Get-EmbroideryInstallEntry
  $finalUninstaller = Get-UninstallerPath $finalEntry
  if ($finalUninstaller -and (Test-Path $finalUninstaller)) {
    Write-Host 'Removing the CI-only installation...'
    $uninstall = Start-Process -FilePath $finalUninstaller -ArgumentList '/S' -Wait -PassThru
    if ($uninstall.ExitCode -ne 0) { throw "CI cleanup uninstaller exited with code $($uninstall.ExitCode)." }
  }
  if (-not (Test-Path $marker)) {
    throw 'The user-data marker was removed during the upgrade or CI cleanup.'
  }
  Remove-Item -Path $marker -Force
  if (Test-Path $previousInstaller) { Remove-Item -Path $previousInstaller -Force }
}
