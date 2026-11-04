$ErrorActionPreference = 'Stop'
$installerDirectory = Join-Path $PWD 'src-tauri/target/release/bundle/nsis'
$installer = Get-ChildItem -Path $installerDirectory -Filter '*.exe' | Select-Object -First 1
if (-not $installer) { throw "NSIS installer not found in $installerDirectory" }

Write-Host "Installing $($installer.Name) silently..."
$install = Start-Process -FilePath $installer.FullName -ArgumentList '/S' -Wait -PassThru
if ($install.ExitCode -ne 0) { throw "NSIS installer exited with code $($install.ExitCode)" }

$uninstallRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'
$entry = Get-ChildItem -Path $uninstallRoot -ErrorAction SilentlyContinue |
  ForEach-Object { Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue } |
  Where-Object { $_.DisplayName -eq 'Embroidery Statement' } |
  Select-Object -First 1

if (-not $entry) { throw 'Installed application was not registered in the current-user uninstall registry.' }
$uninstallerPath = $null
if ($entry.UninstallString -match '"([^"]+)"') { $uninstallerPath = $Matches[1] }
elseif ($entry.UninstallString) { $uninstallerPath = ($entry.UninstallString -split '\s+')[0] }
if (-not $uninstallerPath -or -not (Test-Path $uninstallerPath)) {
  throw "Cannot locate the installed uninstaller: $($entry.UninstallString)"
}
$installDirectory = Split-Path -Parent $uninstallerPath
$appExe = Join-Path $installDirectory 'embroidery-statement.exe'
if (-not (Test-Path $appExe)) { throw "Installed application EXE not found: $appExe" }

$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Embroidery Statement.lnk'
if (-not (Test-Path $desktopShortcut)) { throw 'Desktop shortcut was not created by the silent installer.' }

try {
  Write-Host 'Launching the installed desktop application...'
  $first = Start-Process -FilePath $appExe -PassThru
  Start-Sleep -Seconds 8
  $first.Refresh()
  if ($first.HasExited) { throw 'The installed desktop process exited unexpectedly during startup.' }

  Write-Host 'Launching a second instance to verify single-instance handling...'
  $second = Start-Process -FilePath $appExe -PassThru
  Start-Sleep -Seconds 5
  $second.Refresh()
  $instances = @(Get-Process -Name 'embroidery-statement' -ErrorAction SilentlyContinue)
  if ($instances.Count -gt 1) {
    throw "Single-instance check failed: $($instances.Count) processes are running."
  }
  if (-not $first.HasExited -and $instances.Count -ne 1) {
    throw "Expected exactly one running application process; found $($instances.Count)."
  }
  Write-Host 'PASS: installed app launches and only one instance remains.'
}
finally {
  Get-Process -Name 'embroidery-statement' -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  Write-Host 'Uninstalling the test installation...'
  if (Test-Path $uninstallerPath) {
    $uninstall = Start-Process -FilePath $uninstallerPath -ArgumentList '/S' -Wait -PassThru
    if ($uninstall.ExitCode -ne 0) { throw "Uninstaller exited with code $($uninstall.ExitCode)" }
  }
}
if (Test-Path $appExe) { throw 'Application files remain after uninstall.' }
Write-Host 'PASS: silent installation, desktop shortcut, app startup, single-instance and uninstall.'
