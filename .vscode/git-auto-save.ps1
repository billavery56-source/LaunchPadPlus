# .vscode/git-auto-save.ps1
# One-click: safe-directory -> init git (if needed) -> add -> commit -> pull -> push

$ErrorActionPreference = "Stop"

Write-Host "LaunchPadPlus Git Auto Save..." -ForegroundColor Cyan

# ---------- CONFIG ----------
# Set once:
$repoUrl = "https://github.com/billavery56-source/LaunchPadPlus.git"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Exec($cmd) {
  Write-Host ">> $cmd" -ForegroundColor DarkGray
  Invoke-Expression $cmd
}

# ---------- Fix "dubious ownership" by marking this repo as safe ----------
try {
  $repoPath = (Resolve-Path ".").Path
  $repoPathForward = $repoPath -replace '\\','/'
  Exec "git config --global --add safe.directory `"$repoPathForward`""
} catch {}

# ---------- Ensure git repo ----------
if (!(Test-Path ".git")) {
  Write-Host "No .git found. Initializing repository..." -ForegroundColor Yellow
  Exec "git init"
}

# Ensure branch is main
try { Exec "git branch -M main" } catch {}

# ---------- Ensure origin remote ----------
$originExists = $false
try {
  $remotes = (git remote) 2>$null
  if ($remotes -match "origin") { $originExists = $true }
} catch { $originExists = $false }

if (-not $originExists) {
  Write-Host "Adding remote origin -> $repoUrl" -ForegroundColor Yellow
  Exec "git remote add origin $repoUrl"
} else {
  # Keep origin correct
  Exec "git remote set-url origin $repoUrl"
}

# ---------- Stage ----------
Exec "git add ."

# ---------- Commit only if changes ----------
$status = (git status --porcelain) 2>$null
if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Host "No changes to commit." -ForegroundColor Yellow
} else {
  Exec "git commit -m `"Auto save $timestamp`""
}

# ---------- Pull remote changes (safe even if already up-to-date) ----------
try {
  Exec "git fetch origin"
  Exec "git pull origin main --allow-unrelated-histories -m `"Auto-merge remote main`""
} catch {
  Write-Host "Pull step skipped/failed (often OK): $($_.Exception.Message)" -ForegroundColor Yellow
}

# ---------- Push ----------
try {
  Exec "git push -u origin main"
  Write-Host "Auto-save complete: pushed to origin/main ✅" -ForegroundColor Green
} catch {
  Write-Host "Push failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
