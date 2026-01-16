# .vscode/git-auto-save.ps1
# One-click: init git (if needed) -> add -> commit -> push
# Run from project root in VS Code task.

$ErrorActionPreference = "Stop"

Write-Host "LaunchPadPlus Git Auto Save..." -ForegroundColor Cyan

# ---------- CONFIG ----------
# Set this once. Example:
# $repoUrl = "https://github.com/billavery56-source/LaunchPadPlus.git"
$repoUrl = ""  # <-- PUT YOUR REPO URL HERE

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# ---- Fix "dubious ownership" by marking this repo as safe ----
try {
  $repoPath = (Resolve-Path ".").Path
  $repoPathForward = $repoPath -replace '\\','/'
  git config --global --add safe.directory "$repoPathForward" 2>$null | Out-Null
} catch {
  # ignore; git will complain if it still isn't safe
}


# ---------- Helpers ----------
function Exec($cmd) {
  Write-Host ">> $cmd" -ForegroundColor DarkGray
  Invoke-Expression $cmd
}

# ---------- Ensure git repo ----------
if (!(Test-Path ".git")) {
  Write-Host "No .git found. Initializing repository..." -ForegroundColor Yellow
  Exec "git init"
  Exec "git branch -M main"
}

# ---------- Ensure origin remote ----------
if ($repoUrl -and $repoUrl.Trim().Length -gt 0) {
  $hasOrigin = $false
  try {
    $remotes = (git remote) 2>$null
    if ($remotes -match "origin") { $hasOrigin = $true }
  } catch { $hasOrigin = $false }

  if (-not $hasOrigin) {
    Write-Host "Adding remote origin -> $repoUrl" -ForegroundColor Yellow
    Exec "git remote add origin $repoUrl"
  }
}

# ---------- Stage ----------
Exec "git add ."

# ---------- Commit only if changes ----------
$status = (git status --porcelain) 2>$null
if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Host "No changes to commit." -ForegroundColor Yellow
  exit 0
}

Exec "git commit -m `"Auto save $timestamp`""

# ---------- Push (only if origin exists) ----------
$originExists = $false
try {
  $remotes = (git remote) 2>$null
  if ($remotes -match "origin") { $originExists = $true }
} catch { $originExists = $false }

if ($originExists) {
  Exec "git push -u origin main"
  Write-Host "Auto-save complete: pushed to origin/main" -ForegroundColor Green
} else {
  Write-Host "Auto-save complete: committed locally (no origin remote set)." -ForegroundColor Green
  Write-Host "Set `$repoUrl in .vscode/git-auto-save.ps1 to enable push." -ForegroundColor DarkGray
}
