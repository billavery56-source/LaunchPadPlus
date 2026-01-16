# .vscode/new-project.ps1
# One-click: scaffold project + init git + create PUBLIC GitHub repo + push
# Usage: powershell -ExecutionPolicy Bypass -File .\.vscode\new-project.ps1 "ProjectName"
# Requires: Git installed, GitHub CLI installed, and `gh auth login` done once.

param(
  [Parameter(Mandatory=$true)]
  [string]$ProjectName
)

$ErrorActionPreference = "Stop"

# ---------- CONFIG ----------
$rootDir = "D:\My_Extensions"                     # where new projects live
$vsTemplateDir = "D:\My_Extensions\_TEMPLATE_VSCODE" # create this once
$githubOwner = "billavery56-source"               # your GitHub owner/org
$visibility = "public"                            # fixed to public

# ---------- Helpers ----------
function Exec($cmd) {
  Write-Host ">> $cmd" -ForegroundColor DarkGray
  Invoke-Expression $cmd
}

function Get-GhPath {
  $cmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $p = Join-Path $env:ProgramFiles "GitHub CLI\gh.exe"
  if (Test-Path $p) { return $p }

  return $null
}

# ---------- Paths ----------
$projDir = Join-Path $rootDir $ProjectName
$vsDir = Join-Path $projDir ".vscode"

Write-Host "Creating project: $projDir" -ForegroundColor Cyan

if (Test-Path $projDir) {
  throw "Folder already exists: $projDir"
}

# ---------- Create folders ----------
New-Item -ItemType Directory -Path $projDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $projDir "scripts") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $projDir "styles") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $projDir "icons") | Out-Null
New-Item -ItemType Directory -Path $vsDir | Out-Null

# ---------- Copy VS Code template ----------
if (Test-Path $vsTemplateDir) {
  Copy-Item -Path (Join-Path $vsTemplateDir "*") -Destination $vsDir -Recurse -Force
  Write-Host "Copied .vscode template from $vsTemplateDir" -ForegroundColor Green
} else {
  Write-Host "No VS template found at $vsTemplateDir (skipping copy)." -ForegroundColor Yellow
}

# ---------- Starter files ----------
@"
node_modules/
dist/
build/
Backups/
.DS_Store
Thumbs.db
"@ | Set-Content -Path (Join-Path $projDir ".gitignore") -Encoding UTF8

@"
# $ProjectName

Starter scaffold created by one-click script.

Folders:
- scripts/
- styles/
- icons/
- .vscode/
"@ | Set-Content -Path (Join-Path $projDir "README.md") -Encoding UTF8

@"
{
  "manifest_version": 3,
  "name": "$ProjectName",
  "version": "1.0.0",
  "description": "New Tab extension scaffold",
  "permissions": ["storage"],
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "$ProjectName"
  }
}
"@ | Set-Content -Path (Join-Path $projDir "manifest.json") -Encoding UTF8

@"
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>$ProjectName</title>
</head>
<body>
  <h1>$ProjectName</h1>
  <p>Scaffold new tab page.</p>
</body>
</html>
"@ | Set-Content -Path (Join-Path $projDir "newtab.html") -Encoding UTF8

@"
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>$ProjectName</title>
  <style>body{font-family:system-ui;margin:0;padding:12px;}</style>
</head>
<body>
  <b>$ProjectName</b>
  <div style="opacity:.7;font-size:12px;">Popup scaffold</div>
</body>
</html>
"@ | Set-Content -Path (Join-Path $projDir "popup.html") -Encoding UTF8

# ---------- Git init + first commit ----------
Push-Location $projDir

Exec "git init"
Exec "git branch -M main"
Exec "git add ."
Exec "git commit -m `"Initial scaffold`""

# ---------- GitHub repo create + push (PUBLIC) ----------
$gh = Get-GhPath
if (-not $gh) {
  Write-Host "GitHub CLI (gh) not found. Repo not created automatically." -ForegroundColor Yellow
  Write-Host "Install: winget install --id GitHub.cli -e" -ForegroundColor DarkGray
  Write-Host "Then run once: gh auth login" -ForegroundColor DarkGray
  Pop-Location
  exit 0
}

# Confirm auth
try {
  & $gh auth status | Out-Null
} catch {
  Write-Host "gh is installed but not logged in. Run: gh auth login" -ForegroundColor Yellow
  Pop-Location
  exit 0
}

$repoFull = "$githubOwner/$ProjectName"
Write-Host "Creating GitHub repo: $repoFull (PUBLIC)..." -ForegroundColor Cyan

# This both creates the repo and pushes it
& $gh repo create $repoFull --public --source=. --remote=origin --push

Write-Host "Done ✅ Repo created + pushed: $repoFull" -ForegroundColor Green
Pop-Location

Write-Host "Open in VS Code: code `"$projDir`"" -ForegroundColor DarkGray
