# .vscode/new-project.ps1
# One-click new project scaffold (folders + starter files + .vscode template)
# Usage (in VS Code terminal): powershell -ExecutionPolicy Bypass -File .\.vscode\new-project.ps1 "ProjectName"

param(
  [Parameter(Mandatory=$true)]
  [string]$ProjectName
)

$ErrorActionPreference = "Stop"

# ---------- CONFIG ----------
$rootDir = "D:\My_Extensions"  # where new projects live
$vsTemplateDir = "D:\My_Extensions\_TEMPLATE_VSCODE"  # <-- create this once

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

## Folders
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

Write-Host "Project scaffold created ✅" -ForegroundColor Green
Write-Host "Open it in VS Code: code `"$projDir`"" -ForegroundColor DarkGray
