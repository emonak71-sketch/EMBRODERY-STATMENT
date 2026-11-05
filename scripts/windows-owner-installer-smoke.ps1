$ErrorActionPreference = 'Stop'
$installerDirectory = Join-Path $PWD 'src-tauri/target/release/bundle/nsis'
$installer = Get-ChildItem -Path $installerDirectory -Filter '*.exe' |
  Where-Object { $_.Name -match 'Owner' -and $_.Name -notmatch 'uninstall' } |
  Select-Object -First 1
if (-not $installer) { throw "Owner NSIS installer not found in $installerDirectory" }

Write-Host "Installing $($installer.Name) silently..."
$install = Start-Process -FilePath $installer.FullName -ArgumentList '/S' -Wait -PassThru
if ($install.ExitCode -ne 0) { throw "Owner NSIS installer exited with code $($install.ExitCode)" }

$uninstallRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'
$entry = Get-ChildItem -Path $uninstallRoot -ErrorAction SilentlyContinue |
  ForEach-Object { Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue } |
  Where-Object { $_.DisplayName -eq 'Embroidery Statement Owner Control Center' } |
  Select-Object -First 1
if (-not $entry) { throw 'Owner Control Center was not registered in the current-user uninstall registry.' }

$uninstallerPath = $null
if ($entry.UninstallString -match '"([^"]+)"') { $uninstallerPath = $Matches[1] }
elseif ($entry.UninstallString) { $uninstallerPath = ($entry.UninstallString -split '\s+')[0] }
if (-not $uninstallerPath -or -not (Test-Path $uninstallerPath)) { throw 'Owner uninstaller could not be located.' }
$installDirectory = Split-Path -Parent $uninstallerPath
$appExe = Join-Path $installDirectory 'embroidery-statement.exe'
if (-not (Test-Path $appExe)) { throw "Owner application EXE not found: $appExe" }

$appConfigDirectory = Join-Path $env:APPDATA 'com.embroidery.statement.owner'
New-Item -ItemType Directory -Force -Path $appConfigDirectory | Out-Null
$preservationFile = Join-Path $appConfigDirectory 'owner-installer-data-preservation-smoke.txt'
'keep-owner-user-data' | Set-Content -Path $preservationFile -Encoding UTF8

try {
  $process = Start-Process -FilePath $appExe -PassThru
  Start-Sleep -Seconds 8
  $process.Refresh()
  if ($process.HasExited) { throw 'Owner Control Center exited unexpectedly during startup.' }
  Get-Process -Name 'embroidery-statement' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  $notificationTest = Start-Process -FilePath $appExe -ArgumentList @('--test-notification','--exit-after-test-notification') -Wait -PassThru
  if ($notificationTest.ExitCode -ne 0) { throw "Owner native notification test failed with code $($notificationTest.ExitCode)." }
  Write-Host 'PASS: Owner Control Center installed, launched and dispatched a native notification.'
}
finally {
  Get-Process -Name 'embroidery-statement' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  if (Test-Path $uninstallerPath) {
    $uninstall = Start-Process -FilePath $uninstallerPath -ArgumentList '/S' -Wait -PassThru
    if ($uninstall.ExitCode -ne 0) { throw "Owner uninstaller exited with code $($uninstall.ExitCode)" }
  }
}
if (Test-Path $appExe) { throw 'Owner application files remain after uninstall.' }
if (-not (Test-Path $preservationFile)) { throw 'Owner application data was deleted during uninstall.' }
Remove-Item -Path $preservationFile -Force
Write-Host 'PASS: Owner Control Center uninstall preserved its separate application data.'
