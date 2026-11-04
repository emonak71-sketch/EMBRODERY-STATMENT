$ErrorActionPreference = 'Stop'
$keyDirectory = Join-Path $env:USERPROFILE '.tauri'
$keyPath = Join-Path $keyDirectory 'embroidery-statement.key'
$publicKeyPath = "$keyPath.pub"

if ((Test-Path $keyPath) -or (Test-Path $publicKeyPath)) {
  throw "A signing key already exists at $keyPath. Back it up securely; do not overwrite it."
}
New-Item -ItemType Directory -Path $keyDirectory -Force | Out-Null

Write-Host 'Tauri will ask you to enter a strong passphrase. Store it in a password manager.'
Write-Host 'The private key will be written only to your Windows user profile.'
npx --yes @tauri-apps/cli@2 signer generate -w $keyPath
if ($LASTEXITCODE -ne 0) { throw 'Tauri signing-key generation failed.' }
if (-not (Test-Path $keyPath)) { throw 'Tauri private key was not generated.' }
if (-not (Test-Path $publicKeyPath)) { throw 'Tauri public key was not generated.' }

Write-Host ''
Write-Host 'PUBLIC KEY (safe to add as GitHub Actions repository variable EMBROIDERY_UPDATE_PUBLIC_KEY):'
Get-Content -Path $publicKeyPath -Raw
Write-Host ''
Write-Host "PRIVATE KEY: $keyPath"
Write-Host 'Do NOT paste the private key into chat, commit it, or upload it as a repository file.'
Write-Host 'Add its complete file contents to GitHub Actions secret TAURI_SIGNING_PRIVATE_KEY.'
Write-Host 'Add the passphrase you entered to GitHub Actions secret TAURI_SIGNING_PRIVATE_KEY_PASSWORD.'
