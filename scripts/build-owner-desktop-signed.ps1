$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$keyDirectory = Join-Path $env:USERPROFILE '.tauri'
$keyPath = Join-Path $keyDirectory 'embroidery-statement.key'
$publicKeyPath = "$keyPath.pub"

if (-not (Test-Path $keyPath)) { throw "Private key not found: $keyPath." }
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
  $env:EMBROIDERY_OWNER_BUILD = '1'
  $env:EMBROIDERY_UPDATE_PUBLIC_KEY = $publicKey
  $env:TAURI_SIGNING_PRIVATE_KEY = $privateKey
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $password

  Write-Host 'Preparing the local Owner updater configuration...'
  & node scripts/prepare-local-signed-build.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Owner signed-build configuration failed.' }

  Write-Host 'Building the signed Owner Control Center installer...'
  & npm run desktop:owner:build
  if ($LASTEXITCODE -ne 0) { throw 'Owner signed Windows build failed.' }

  Write-Host 'SUCCESS: signed Owner installer build completed.'
  Write-Host 'Output: src-tauri/target/release/bundle/nsis/'
  Write-Host 'Keep the matching .exe.sig file. It is required for the update manifest.'
}
finally {
  $env:EMBROIDERY_OWNER_BUILD = $null
  $env:EMBROIDERY_UPDATE_PUBLIC_KEY = $null
  $env:TAURI_SIGNING_PRIVATE_KEY = $null
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $null
  $privateKey = $null
  $password = $null
  $securePassword.Dispose()
  Pop-Location
}
