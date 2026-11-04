$ErrorActionPreference = 'Stop'
$repo = 'emonak71-sketch/EMBRODERY-STATMENT'
$keyDirectory = Join-Path $env:USERPROFILE '.tauri'
$keyPath = Join-Path $keyDirectory 'embroidery-statement.key'
$publicKeyPath = "$keyPath.pub"

function Refresh-UserPath {
  $paths = @(
    (Join-Path $env:ProgramFiles 'GitHub CLI'),
    (Join-Path $env:ProgramFiles 'nodejs'),
    (Join-Path $env:APPDATA 'npm')
  )
  foreach ($path in $paths) {
    if ((Test-Path $path) -and ($env:Path -notlike "*$path*")) {
      $env:Path = $path + ';' + $env:Path
    }
  }
}

Write-Host ''
Write-Host 'EMBROIDERY STATEMENT — ONE-TIME SECURE UPDATER SETUP'
Write-Host 'The signing key is created on this PC. The private key is sent directly to GitHub Actions Secrets over HTTPS.'
Write-Host 'The private key and passphrase are never printed or committed.'
Write-Host ''

Refresh-UserPath
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) { throw 'Node.js is missing and winget is unavailable. Install Node.js LTS, then run this setup again.' }
  Write-Host 'Installing Node.js LTS...'
  & $winget.Source install --id OpenJS.NodeJS.LTS --exact --silent --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { throw 'Node.js installation failed.' }
  Refresh-UserPath
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'Node.js was installed but npx is not available yet. Restart Windows, then double-click this setup again.'
}

$ghCommand = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghCommand) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) { throw 'GitHub CLI is missing and winget is unavailable. Install GitHub CLI from https://cli.github.com/, then run this setup again.' }
  Write-Host 'Installing GitHub CLI...'
  & $winget.Source install --id GitHub.cli --exact --silent --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI installation failed.' }
  Refresh-UserPath
  $ghCommand = Get-Command gh -ErrorAction SilentlyContinue
}
if (-not $ghCommand) { throw 'GitHub CLI was installed but could not be located. Restart Windows and run this setup again.' }

Write-Host 'Checking GitHub login...'
& $ghCommand.Source auth status --hostname github.com
if ($LASTEXITCODE -ne 0) {
  Write-Host 'A browser window will open. Sign in to the GitHub account that owns the Embroidery Statement repository.'
  & $ghCommand.Source auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw 'GitHub sign-in was not completed.' }
}
& $ghCommand.Source auth status --hostname github.com
if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI is not authenticated.' }

$repoName = & $ghCommand.Source repo view $repo --json nameWithOwner --jq '.nameWithOwner'
if ($LASTEXITCODE -ne 0 -or $repoName.Trim() -ne $repo) {
  throw "The signed-in GitHub account cannot access $repo."
}

# Read only public variable text and secret NAMES; GitHub never returns secret values.
$remotePublic = (& $ghCommand.Source variable get EMBROIDERY_UPDATE_PUBLIC_KEY --repo $repo 2>$null) -join "`n"
$remotePublicExists = ($LASTEXITCODE -eq 0) -and -not [string]::IsNullOrWhiteSpace($remotePublic)
$existingSecrets = @(& $ghCommand.Source secret list --repo $repo)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect existing GitHub Actions secret names.' }
$remotePrivateExists = [bool]($existingSecrets | Where-Object { ($_ -split '\s+')[0] -eq 'TAURI_SIGNING_PRIVATE_KEY' })
$remotePasswordExists = [bool]($existingSecrets | Where-Object { ($_ -split '\s+')[0] -eq 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD' })

$localPrivateExists = Test-Path $keyPath
$localPublicExists = Test-Path $publicKeyPath
if ($localPrivateExists -xor $localPublicExists) {
  throw 'Only one local signing-key file exists. Restore both original key files before continuing.'
}
$localKeyExists = $localPrivateExists -and $localPublicExists

if (-not $localKeyExists -and ($remotePublicExists -or $remotePrivateExists -or $remotePasswordExists)) {
  throw 'A signing key is already configured in GitHub, but its matching local key is missing. Restore the original .key and .pub files; do not generate a replacement key.'
}
if ($localKeyExists -and $remotePublicExists) {
  $localPublic = [System.IO.File]::ReadAllText($publicKeyPath).Trim()
  if ($localPublic -ne $remotePublic.Trim()) {
    throw 'The local public key does not match the key already configured in GitHub. I stopped to protect existing installations.'
  }
}
if ($localKeyExists -and -not $remotePublicExists -and ($remotePrivateExists -or $remotePasswordExists)) {
  throw 'GitHub already has updater secrets but no readable public-key variable. I stopped rather than overwrite an unknown signing setup.'
}

if (-not $localKeyExists) {
  New-Item -ItemType Directory -Path $keyDirectory -Force | Out-Null
  Write-Host ''
  Write-Host 'No previous updater key was found locally or in GitHub.'
  Write-Host 'Tauri will ask you to enter a strong passphrase twice. Save it in your password manager.'
  & npx --yes @tauri-apps/cli@2 signer generate -w $keyPath
  if ($LASTEXITCODE -ne 0) { throw 'Tauri signing-key generation failed.' }
}

if (-not (Test-Path $keyPath)) { throw "Private key file not found: $keyPath" }
if (-not (Test-Path $publicKeyPath)) { throw "Public key file not found: $publicKeyPath" }

$publicKey = [System.IO.File]::ReadAllText($publicKeyPath).Trim()
$privateKey = [System.IO.File]::ReadAllText($keyPath)
if (-not $publicKey.StartsWith('untrusted comment:') -or -not $publicKey.Contains('RW')) {
  throw 'The public key file does not look like a Tauri updater public key.'
}
if ([string]::IsNullOrWhiteSpace($privateKey)) { throw 'The private key file is empty.' }

$securePassword = Read-Host 'Enter the same passphrase used to create the Tauri key' -AsSecureString
if ($securePassword.Length -eq 0) { throw 'The signing-key passphrase cannot be blank.' }
$password = [System.Net.NetworkCredential]::new('', $securePassword).Password

# Verify the key/password pair before uploading any signing material.
$probePath = Join-Path $env:TEMP ("embroidery-updater-key-check-" + [guid]::NewGuid().ToString('N') + '.txt')
try {
  [System.IO.File]::WriteAllText($probePath, 'Embroidery Statement updater signing-key verification')
  & npx --yes @tauri-apps/cli@2 signer sign --private-key-path $keyPath --password $password $probePath
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$probePath.sig")) {
    throw 'The passphrase did not unlock the Tauri key. Nothing was uploaded. Run setup again and enter the correct passphrase.'
  }
}
finally {
  Remove-Item $probePath -Force -ErrorAction SilentlyContinue
  Remove-Item "$probePath.sig" -Force -ErrorAction SilentlyContinue
}

function Set-GitHubSecretFromText([string]$Name, [string]$Value) {
  $start = New-Object System.Diagnostics.ProcessStartInfo
  $start.FileName = $ghCommand.Source
  $start.Arguments = "secret set $Name --repo $repo"
  $start.UseShellExecute = $false
  $start.RedirectStandardInput = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $process = [System.Diagnostics.Process]::Start($start)
  $process.StandardInput.Write($Value)
  $process.StandardInput.Close()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) { throw "GitHub Actions secret $Name could not be configured. $stderr $stdout" }
  Write-Host "Configured GitHub Actions secret: $Name"
}

Write-Host 'Saving the public key as a GitHub Actions repository variable...'
& $ghCommand.Source variable set EMBROIDERY_UPDATE_PUBLIC_KEY --repo $repo --body $publicKey
if ($LASTEXITCODE -ne 0) { throw 'Could not set EMBROIDERY_UPDATE_PUBLIC_KEY.' }

Set-GitHubSecretFromText 'TAURI_SIGNING_PRIVATE_KEY' $privateKey
Set-GitHubSecretFromText 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD' $password

$privateKey = $null
$password = $null
$securePassword.Dispose()

$secretNames = @(& $ghCommand.Source secret list --repo $repo)
if ($LASTEXITCODE -ne 0) { throw 'Could not verify GitHub Actions secrets.' }
if (-not ($secretNames | Where-Object { ($_ -split '\s+')[0] -eq 'TAURI_SIGNING_PRIVATE_KEY' }) -or
    -not ($secretNames | Where-Object { ($_ -split '\s+')[0] -eq 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD' })) {
  throw 'GitHub Actions signing secrets were not both found after upload.'
}
$verifyPublic = (& $ghCommand.Source variable get EMBROIDERY_UPDATE_PUBLIC_KEY --repo $repo) -join "`n"
if ($LASTEXITCODE -ne 0 -or $verifyPublic.Trim() -ne $publicKey) {
  throw 'GitHub Actions public-key variable verification failed.'
}

Write-Host ''
Write-Host 'SUCCESS: the signed updater key is configured and verified in GitHub Actions.'
Write-Host "Private key remains on this PC: $keyPath"
Write-Host 'Keep the .key file and passphrase backed up securely. Never delete them or share them in chat.'
Write-Host 'You do not need to run this setup again for future app updates.'
