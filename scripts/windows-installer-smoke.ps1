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

# Tauri's Windows app_config_dir is under %APPDATA%/<application identifier>.
# The installer/uninstaller must leave this user data intact.
$appConfigDirectory = Join-Path $env:APPDATA 'com.embroidery.statement'
New-Item -ItemType Directory -Force -Path $appConfigDirectory | Out-Null
$preservationFile = Join-Path $appConfigDirectory 'installer-data-preservation-smoke.txt'
'keep-existing-user-data' | Set-Content -Path $preservationFile -Encoding UTF8

$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Embroidery Statement.lnk'
if (-not (Test-Path $desktopShortcut)) { throw 'Desktop shortcut was not created by the silent installer.' }
$startMenuRoot = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$startMenuShortcut = Get-ChildItem -Path $startMenuRoot -Filter 'Embroidery Statement.lnk' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $startMenuShortcut) { throw 'Start Menu shortcut was not created by the installer.' }

try {
  Write-Host 'Launching the installed desktop application...'
  $first = Start-Process -FilePath $appExe -PassThru
  Start-Sleep -Seconds 8
  $first.Refresh()
  if ($first.HasExited) { throw 'The installed desktop process exited unexpectedly during startup.' }

  # Tauri's Windows autostart backend uses Dynamic mode: on elevated CI
  # runners it may register HKLM; on normal users' PCs it falls back to HKCU.
  $runPaths = @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run'
  )
  $autostartEntry = $null
  $autostartHive = $null
  foreach ($runPath in $runPaths) {
    $runKey = Get-ItemProperty -Path $runPath -ErrorAction SilentlyContinue
    if ($runKey) {
      $candidate = $runKey.PSObject.Properties | Where-Object {
        $_.Name -eq 'Embroidery Statement' -and [string]$_.Value -match [regex]::Escape($appExe)
      } | Select-Object -First 1
      if ($candidate) { $autostartEntry = $candidate; $autostartHive = $runPath; break }
    }
  }
  if (-not $autostartEntry) {
    $diagnostics = foreach ($runPath in $runPaths) {
      $runKey = Get-ItemProperty -Path $runPath -ErrorAction SilentlyContinue
      if ($runKey) {
        $runKey.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } |
          ForEach-Object { "$($_.Name)=$($_.Value)" }
      }
    }
    $debugPath = Join-Path $env:TEMP 'EmbroideryStatement-autostart-diagnostic.txt'
    $debug = if (Test-Path $debugPath) { Get-Content $debugPath -Raw } else { 'No app diagnostic file was written.' }
    throw "First installed launch did not register Windows sign-in autostart in HKCU or HKLM. Registry values: $($diagnostics -join '; '). App diagnostic: $debug"
  }
  Write-Host "PASS: Windows sign-in autostart registered in $autostartHive ($($autostartEntry.Name))."

  Write-Host 'Sending WM_CLOSE to verify close-to-tray behavior...'
  Add-Type -Namespace EmbroideryWin32 -Name NativeMethods -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("user32.dll", SetLastError = true)]
public static extern bool PostMessage(System.IntPtr hWnd, uint msg, System.IntPtr wParam, System.IntPtr lParam);
'@
  $first.Refresh()
  if ($first.MainWindowHandle -eq [IntPtr]::Zero) { throw 'Main application window handle is unavailable for close-to-tray smoke test.' }
  [EmbroideryWin32.NativeMethods]::PostMessage($first.MainWindowHandle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
  Start-Sleep -Seconds 3
  $first.Refresh()
  if ($first.HasExited) { throw 'Closing the main window terminated the process instead of hiding it to tray.' }

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

  # Native Windows toasts are tested only after the NSIS installer has installed the app.
  Write-Host 'Stopping the app before the isolated Windows notification test...'
  Get-Process -Name 'embroidery-statement' -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  Write-Host 'Dispatching a native Windows toast from the installed application...'
  $notificationTest = Start-Process -FilePath $appExe -ArgumentList @('--test-notification', '--exit-after-test-notification') -Wait -PassThru
  if ($notificationTest.ExitCode -ne 0) {
    throw "Native Windows notification dispatch failed with exit code $($notificationTest.ExitCode)."
  }
  Write-Host 'PASS: installed app submitted a native Windows notification request.'

  Write-Host 'PASS: install, shortcuts, autostart, launch, close-to-tray, single-instance and notification dispatch.'
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
if (Test-Path $desktopShortcut) { throw 'Desktop shortcut remains after uninstall.' }
if ($startMenuShortcut -and (Test-Path $startMenuShortcut.FullName)) { throw 'Start Menu shortcut remains after uninstall.' }
if (-not (Test-Path $preservationFile)) { throw 'User application data was deleted during uninstall.' }
Remove-Item -Path $preservationFile -Force
foreach ($runPath in $runPaths) {
  $runKey = Get-ItemProperty -Path $runPath -ErrorAction SilentlyContinue
  if ($runKey -and $runKey.PSObject.Properties['Embroidery Statement']) {
    throw "Autostart registry entry was left behind after uninstall: $runPath"
  }
}
Write-Host 'PASS: silent installation, desktop/Start Menu shortcuts, autostart, close-to-tray, single-instance, uninstall and autostart cleanup.'
