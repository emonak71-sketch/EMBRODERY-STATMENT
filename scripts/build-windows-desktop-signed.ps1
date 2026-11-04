$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$keyDirectory = Join-Path $env:USERPROFILE '.tauri'
$keyPath = Join-Path $keyDirectory 'embroidery-statement.key'
$publicKeyPath = "$keyPath.pub"

if (-not (Test-Path $keyPath)) { throw "Private key not found: $keyPath. Run scripts/generate-tauri-signing-key.ps1 first." }
if (-not (Test-Path $publicKeyPath)) { throw "Public key not found: $publicKeyPath." }

$publicKey = [System.IO.File]::ReadAllText($publicKeyPath).Trim()
$privateKey = [System.IO.File]::ReadAllText($keyPath)
if (-not $publicKey.StartsWith('untrusted comment:') -or -not $publicKey.Contains('RW')) {
  throw 'The public key file does not look like a Tauri updater public key.'
}
if ([string]::IsNullOrWhiteSpace($privateKey)) { throw 'The Tauri private key file is empty.' }

$securePassword = Read-Host 'Enter the Tauri signing-key passphrase' -AsSecureString
if ($securePassword.Length -eq 0) { throw 'The signing-key passphrase cannot be blank.' }
$password = [System.Net.NetworkCredential]::new('', $securePassword).Password

Push-Location $repoRoot
try {
  $env:EMBROIDERY_UPDATE_PUBLIC_KEY = $publicKey
  $env:TAURI_SIGNING_PRIVATE_KEY = $privateKey
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $password

  Write-Host 'Preparing the local signed updater configuration...'
  & node scripts/prepare-local-signed-build.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Local signed-build configuration failed.' }

  Write-Host 'Building the signed Windows installer. This is the step that creates your EXE.'
  & npm run desktop:build
  if ($LASTEXITCODE -ne 0) { throw 'Tauri signed Windows build failed.' }

  Write-Host 'SUCCESS: signed Windows installer build completed.'
  Write-Host 'Output: src-tauri/target/release/bundle/nsis/'
}
finally {
  $env:EMBROIDERY_UPDATE_PUBLIC_KEY = $null
  $env:TAURI_SIGNING_PRIVATE_KEY = $null
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $null
  $privateKey = $null
  $password = $null
  $securePassword.Dispose()
  Pop-Location
}
