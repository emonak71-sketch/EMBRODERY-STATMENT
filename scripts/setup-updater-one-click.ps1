$ErrorActionPreference = 'Stop'
$repo = 'emonak71-sketch/EMBRODERY-STATMENT'
$keyDirectory = Join-Path $env:USERPROFILE '.tauri'
$keyPath = Join-Path $keyDirectory 'embroidery-statement.key'
$publicKeyPath = "$keyPath.pub"

Write-Host ''
Write-Host 'EMBROIDERY STATEMENT — ONE-TIME UPDATER SIGNING SETUP'
Write-Host 'This creates the signing key on this PC and uploads it directly to GitHub Actions.'
Write-Host 'The private key and passphrase will not be printed or committed.'
Write-Host ''

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'Node.js / npx is required. Install Node.js LTS, then double-click this setup file again.'
}

$ghCommand = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghCommand) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw 'GitHub CLI is missing and winget is unavailable. Install GitHub CLI from https://cli.github.com/, then run this setup again.'
  }
  Write-Host 'Installing GitHub CLI...'
  & $winget.Source install --id GitHub.cli --exact --silent --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI installation failed.' }
  $ghInstallPath = Join-Path $env:ProgramFiles 'GitHub CLI'
  if (Test-Path (Join-Path $ghInstallPath 'gh.exe')) {
    $env:Path = $ghInstallPath + ';' + $env:Path
  }
  $ghCommand = Get-Command gh -ErrorAction SilentlyContinue
}
if (-not $ghCommand) { throw 'GitHub CLI was installed but could not be located. Close this window, reopen it, and run setup again.' }

Write-Host 'Checking GitHub login...'
& $ghCommand.Source auth status --hostname github.com
if ($LASTEXITCODE -ne 0) {
  Write-Host 'A browser window will open. Sign in to the GitHub account that owns the repository.'
  & $ghCommand.Source auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI sign-in was not completed.' }
}
& $ghCommand.Source auth status --hostname github.com
if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI is not authenticated.' }

$repoName = & $ghCommand.Source repo view $repo --json nameWithOwner --jq '.nameWithOwner'
if ($LASTEXITCODE -ne 0 -or $repoName.Trim() -ne $repo) {
  throw "The signed-in GitHub account cannot access $repo."
}

if (-not (Test-Path $keyPath) -and -not (Test-Path $publicKeyPath)) {
  New-Item -ItemType Directory -Path $keyDirectory -Force | Out-Null
  Write-Host ''
  Write-Host 'Create a strong signing-key passphrase and store it in your password manager.'
  Write-Host 'You will be asked for the same passphrase once more before uploading the secret.'
  & npx --yes @tauri-apps/cli@2 signer generate -w $keyPath
  if ($LASTEXITCODE -ne 0) { throw 'Tauri signing-key generation failed.' }
}

if (-not (Test-Path $keyPath)) { throw "Private key file not found: $keyPath" }
if (-not (Test-Path $publicKeyPath)) { throw "Public key file not found: $publicKeyPath" }

$publicKey = [System.IO.File]::ReadAllText($publicKeyPath).Trim()
if (-not $publicKey.StartsWith('untrusted comment:') -or -not $publicKey.Contains('RW')) {
  throw 'The public key file does not look like a Tauri updater public key.'
}

Write-Host 'Saving the public key as a GitHub Actions repository variable...'
& $ghCommand.Source variable set EMBROIDERY_UPDATE_PUBLIC_KEY --repo $repo --body $publicKey
if ($LASTEXITCODE -ne 0) { throw 'Could not set EMBROIDERY_UPDATE_PUBLIC_KEY.' }

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
  if ($process.ExitCode -ne 0) {
    throw "GitHub Actions secret $Name could not be configured. $stderr $stdout"
  }
  Write-Host "Configured GitHub Actions secret: $Name"
}

$privateKey = [System.IO.File]::ReadAllText($keyPath)
Set-GitHubSecretFromText 'TAURI_SIGNING_PRIVATE_KEY' $privateKey

$securePassword = Read-Host 'Enter the same passphrase used to create the Tauri key' -AsSecureString
if ($securePassword.Length -eq 0) { throw 'The signing-key passphrase cannot be blank.' }
$password = [System.Net.NetworkCredential]::new('', $securePassword).Password
Set-GitHubSecretFromText 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD' $password

$privateKey = $null
$password = $null
$securePassword.Dispose()

$secretNames = & $ghCommand.Source secret list --repo $repo
if ($LASTEXITCODE -ne 0) { throw 'Could not verify GitHub Actions secrets.' }
if ($secretNames -notmatch 'TAURI_SIGNING_PRIVATE_KEY' -or $secretNames -notmatch 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD') {
  throw 'GitHub Actions signing secrets were not both found after upload.'
}

Write-Host ''
Write-Host 'SUCCESS: the Tauri updater signing key is configured in GitHub Actions.'
Write-Host "Private key remains on this PC: $keyPath"
Write-Host 'Back up the .key file and passphrase securely. Never delete them or share them in chat.'
Write-Host 'The next signed release can now be built by GitHub Actions.'
