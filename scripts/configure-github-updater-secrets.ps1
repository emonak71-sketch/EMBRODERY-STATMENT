$ErrorActionPreference = 'Stop'
$repo = 'emonak71-sketch/EMBRODERY-STATMENT'
$keyPath = Join-Path $env:USERPROFILE '.tauri\embroidery-statement.key'
$publicKeyPath = "$keyPath.pub"

if (-not (Test-Path $keyPath)) { throw "Private key not found: $keyPath. Generate it first with scripts/generate-tauri-signing-key.ps1." }
if (-not (Test-Path $publicKeyPath)) { throw "Public key not found: $publicKeyPath." }

$ghCommand = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghCommand) { throw 'GitHub CLI (gh) is required. Install it from https://cli.github.com/ and run gh auth login.' }
& $ghCommand.Source auth status --hostname github.com
if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI is not authenticated. Run gh auth login and retry.' }

$repoName = & $ghCommand.Source repo view $repo --json nameWithOwner --jq '.nameWithOwner'
if ($LASTEXITCODE -ne 0 -or $repoName.Trim() -ne $repo) { throw "Cannot access repository $repo with the current GitHub account." }

$publicKey = [System.IO.File]::ReadAllText($publicKeyPath).Trim()
if (-not $publicKey.StartsWith('untrusted comment:') -or -not $publicKey.Contains('RW')) {
  throw 'The public key file does not look like a Tauri updater public key.'
}

Write-Host 'Uploading the public updater key as a repository Actions variable...'
& $ghCommand.Source variable set EMBROIDERY_UPDATE_PUBLIC_KEY --repo $repo --body $publicKey
if ($LASTEXITCODE -ne 0) { throw 'Failed to set EMBROIDERY_UPDATE_PUBLIC_KEY.' }

function Set-GitHubSecretFromText([string]$Name, [string]$Value) {
  $start = [System.Diagnostics.ProcessStartInfo]::new()
  $start.FileName = $ghCommand.Source
  $start.UseShellExecute = $false
  $start.RedirectStandardInput = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $start.ArgumentList.Add('secret')
  $start.ArgumentList.Add('set')
  $start.ArgumentList.Add($Name)
  $start.ArgumentList.Add('--repo')
  $start.ArgumentList.Add($repo)

  $process = [System.Diagnostics.Process]::Start($start)
  $process.StandardInput.Write($Value)
  $process.StandardInput.Close()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) {
    throw "GitHub secret $Name could not be set. $stderr $stdout"
  }
  Write-Host "Configured Actions secret: $Name"
}

Write-Host 'Uploading the private key directly through stdin (it will not be printed)...'
$privateKey = [System.IO.File]::ReadAllText($keyPath)
Set-GitHubSecretFromText 'TAURI_SIGNING_PRIVATE_KEY' $privateKey

$securePassword = Read-Host 'Enter the passphrase used when generating the Tauri key' -AsSecureString
if ($securePassword.Length -eq 0) { throw 'The signing-key passphrase cannot be blank.' }
$password = [System.Net.NetworkCredential]::new('', $securePassword).Password
Set-GitHubSecretFromText 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD' $password

$privateKey = $null
$password = $null
$securePassword.Dispose()
Write-Host ''
Write-Host 'SUCCESS: updater public key variable and both private signing secrets are configured.'
Write-Host 'The private key and passphrase were sent to GitHub Actions over stdin and were not printed.'
Write-Host 'Next: run the Windows Desktop release workflow only after this development PR is reviewed and merged.'
