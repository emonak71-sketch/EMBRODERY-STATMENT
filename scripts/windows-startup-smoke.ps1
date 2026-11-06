param([Parameter(Mandatory=$true)][string]$ExePath)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $ExePath)) { throw "Application not found: $ExePath" }
$previousProfile = $env:WEBVIEW2_USER_DATA_FOLDER
$profile = Join-Path $env:RUNNER_TEMP ('startup-' + [guid]::NewGuid().ToString('N'))
try {
  $env:WEBVIEW2_USER_DATA_FOLDER = $profile
  $app = Start-Process -FilePath (Resolve-Path $ExePath) -ArgumentList '--startup-smoke' -PassThru
  if (-not $app.WaitForExit(45000)) {
    Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue
    throw 'Cold startup timed out before the React UI became ready.'
  }
  if ($app.ExitCode -ne 0) { throw "React cold startup failed with exit code $($app.ExitCode)." }
  Write-Host 'PASS: fresh WebView profile rendered the React UI without manual refresh.'
} finally {
  $env:WEBVIEW2_USER_DATA_FOLDER = $previousProfile
}
