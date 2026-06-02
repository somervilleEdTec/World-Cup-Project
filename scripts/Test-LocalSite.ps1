<#
.SYNOPSIS
  Install, test, and smoke-check World Cup Boys on your Windows machine.

.DESCRIPTION
  Default mode runs npm install, migrations, unit/integration tests, a production
  build, then starts the API briefly to hit /api/health and a minimal auth flow.

  Use -Mode Serve for a built app on http://localhost:8787 (API + static UI).
  Use -Mode Dev for Vite on :5173 plus API on :8787 (hot reload).

.PARAMETER Mode
  Automated — CI-style checks then exit (default)
  Serve     — build and keep server running; opens browser
  Dev       — Vite dev server + API; opens browser

.PARAMETER SkipInstall
  Skip npm install (faster re-runs when dependencies are already installed).

.PARAMETER NoBrowser
  Do not open a browser window.

.PARAMETER Port
  API port (default 8787). Set PORT in .env to match.

.EXAMPLE
  .\scripts\Test-LocalSite.ps1

.EXAMPLE
  .\scripts\Test-LocalSite.ps1 -Mode Serve

.EXAMPLE
  .\scripts\Test-LocalSite.ps1 -Mode Dev -SkipInstall
#>
[CmdletBinding()]
param(
  [ValidateSet('Automated', 'Serve', 'Dev')]
  [string] $Mode = 'Automated',

  [switch] $SkipInstall,

  [switch] $NoBrowser,

  [int] $Port = 8787
)

$ErrorActionPreference = 'Stop'

function Write-Step([string] $Message) {
  Write-Host ''
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string] $Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name. Install Node.js LTS from https://nodejs.org/"
  }
}

function Invoke-Npm {
  param([Parameter(Mandatory)][string[]] $Command)

  Write-Host "  npm $($Command -join ' ')" -ForegroundColor DarkGray
  $proc = Start-Process `
    -FilePath 'npm' `
    -ArgumentList $Command `
    -WorkingDirectory $RepoRoot `
    -Wait `
    -PassThru `
    -NoNewWindow
  if ($proc.ExitCode -ne 0) {
    throw "npm $($Command -join ' ') failed with exit code $($proc.ExitCode)"
  }
}

function Wait-ForHealth([string] $Url, [int] $TimeoutSeconds = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -eq 200) {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  return $false
}

function Stop-ProcessTree([System.Diagnostics.Process] $Process) {
  if (-not $Process -or $Process.HasExited) { return }
  try {
    # taskkill ends child processes started by npm on Windows
    & taskkill /PID $Process.Id /T /F 2>$null | Out-Null
  } catch {
    try { $Process.Kill($true) } catch { }
  }
}

function Start-NpmBackground([string] $ScriptName, [hashtable] $ExtraEnv = @{}) {
  $envBlock = @{}
  foreach ($key in $ExtraEnv.Keys) {
    $envBlock[$key] = $ExtraEnv[$key]
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'cmd.exe'
  $psi.Arguments = "/c npm run $ScriptName"
  $psi.WorkingDirectory = $RepoRoot
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true

  foreach ($key in $envBlock.Keys) {
    $psi.Environment[$key] = [string] $envBlock[$key]
  }

  if ($env:PORT) {
    $psi.Environment['PORT'] = $env:PORT
  } else {
    $psi.Environment['PORT'] = [string] $Port
  }

  $proc = [System.Diagnostics.Process]::Start($psi)
  return $proc
}

function Invoke-SmokeApi([string] $BaseUrl) {
  Write-Step "API smoke test ($BaseUrl)"

  $health = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get
  if (-not $health.ok) {
    throw 'Health check returned ok=false'
  }
  Write-Host '  /api/health OK' -ForegroundColor Green

  $suffix = [Guid]::NewGuid().ToString('N').Substring(0, 8)
  $email = "ps-smoke-$suffix@example.com"
  $password = 'SmokeTest1!'
  $displayName = 'PowerShell Smoke'

  $registerBody = @{ email = $email; password = $password; displayName = $displayName } | ConvertTo-Json
  $register = Invoke-RestMethod -Uri "$BaseUrl/api/auth/register" -Method Post -Body $registerBody -ContentType 'application/json'
  if (-not $register.user.email) {
    throw 'Register did not return user.email'
  }
  Write-Host "  /api/auth/register OK ($email)" -ForegroundColor Green

  $loginBody = @{ email = $email; password = $password } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType 'application/json'
  $token = $login.token
  if (-not $token) {
    throw 'Login did not return a token'
  }
  Write-Host '  /api/auth/login OK' -ForegroundColor Green

  $headers = @{ Authorization = "Bearer $token" }
  $state = Invoke-RestMethod -Uri "$BaseUrl/api/predictions/state" -Method Get -Headers $headers
  if ($null -eq $state.committedPicks) {
    throw 'Prediction state missing committedPicks'
  }
  Write-Host '  /api/predictions/state OK' -ForegroundColor Green

  $leaderboard = Invoke-RestMethod -Uri "$BaseUrl/api/leaderboard" -Method Get
  if ($leaderboard -isnot [Array]) {
    throw 'Leaderboard response was not an array'
  }
  Write-Host '  /api/leaderboard OK' -ForegroundColor Green
}

# --- main ---

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $RepoRoot
Write-Host "Repository: $RepoRoot" -ForegroundColor DarkGray

Assert-Command node
Assert-Command npm

$nodeVersion = (node -v)
Write-Host "Node $nodeVersion"

if (-not (Test-Path (Join-Path $RepoRoot '.env')) -and (Test-Path (Join-Path $RepoRoot '.env.example'))) {
  Write-Host 'No .env file — copying .env.example to .env (edit FOOTBALL_DATA_TOKEN if needed).' -ForegroundColor Yellow
  Copy-Item (Join-Path $RepoRoot '.env.example') (Join-Path $RepoRoot '.env')
}

if ($env:PORT) {
  $Port = [int] $env:PORT
}

$apiBase = "http://localhost:$Port"

if (-not $SkipInstall) {
  Write-Step 'npm install'
  Invoke-Npm -Command install
} else {
  Write-Step 'Skipping npm install'
}

Write-Step 'Database migrate'
Invoke-Npm -Command run, migrate

if ($Mode -eq 'Automated') {
  Write-Step 'Unit and integration tests'
  Invoke-Npm -Command test

  Write-Step 'Production build'
  Invoke-Npm -Command run, build

  Write-Step "Starting API on $apiBase (temporary)"
  $serverProc = Start-NpmBackground -ScriptName 'server'
  try {
    if (-not (Wait-ForHealth "$apiBase/api/health")) {
      throw "API did not become healthy at $apiBase/api/health within 60 seconds."
    }
    Invoke-SmokeApi -BaseUrl $apiBase

    if (-not $NoBrowser) {
      Write-Host ''
      Write-Host 'Opening built site in browser (5 seconds)…' -ForegroundColor DarkGray
      Start-Sleep -Seconds 2
      Start-Process "$apiBase/login"
    }

    Write-Host ''
    Write-Host 'All automated checks passed.' -ForegroundColor Green
    Write-Host "Manual check: open $apiBase/login and register a real account." -ForegroundColor DarkGray
  } finally {
    Write-Step 'Stopping temporary API process'
    Stop-ProcessTree $serverProc
  }
  exit 0
}

if ($Mode -eq 'Serve') {
  Write-Step 'Production build'
  Invoke-Npm -Command run, build

  Write-Step "Starting API + built UI on $apiBase"
  Write-Host 'Press Ctrl+C in this window to stop the server.' -ForegroundColor Yellow

  if (-not $NoBrowser) {
    Start-Job -ScriptBlock {
      param($Url)
      Start-Sleep -Seconds 3
      Start-Process $Url
    } -ArgumentList "$apiBase/login" | Out-Null
  }

  $env:PORT = [string] $Port
  Invoke-Npm -Command run, server
  exit $LASTEXITCODE
}

if ($Mode -eq 'Dev') {
  Write-Step "Starting API on $apiBase and Vite on http://localhost:5173"
  $serverProc = Start-NpmBackground -ScriptName 'server'
  $devProc = Start-NpmBackground -ScriptName 'dev'

  try {
    if (-not (Wait-ForHealth "$apiBase/api/health")) {
      throw "API did not become healthy at $apiBase/api/health"
    }
    Write-Host 'API is up.' -ForegroundColor Green
    Write-Host 'Vite dev server starting (usually http://localhost:5173)…' -ForegroundColor Green

    if (-not $NoBrowser) {
      Start-Sleep -Seconds 2
      Start-Process 'http://localhost:5173/login'
    }

    Write-Host ''
    Write-Host 'Dev servers running. Press Enter here to stop both.' -ForegroundColor Yellow
    [void] (Read-Host)
  } finally {
    Write-Step 'Stopping dev processes'
    Stop-ProcessTree $devProc
    Stop-ProcessTree $serverProc
  }
  exit 0
}
