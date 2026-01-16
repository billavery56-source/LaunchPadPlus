# Developer Notes: Hidden Backup Tools

This project includes a private, developer-only backup utility. It is included on the page but fully hidden until you use the hotkey.

## Hidden Dev Tools panel
- Toggle panel: Shift+Alt+B
- Actions inside the panel:
  - Choose Backups folder: Pick your local `Backups/` folder (or any folder you want). Your choice is saved and restored across sessions (permission may be prompted once after reload).
  - Backup project (to Backups): Creates a timestamped folder (e.g., `LaunchPadPlus_backup_2025-11-03_09-12PM`) and writes all project files listed in `project-files.json`.

Notes:
- Uses the File System Access API (available in Chromium-based browsers). If unavailable, you’ll see a toast message.
- The chosen folder handle is persisted using IndexedDB and restored on load; the browser may re-ask for permission.
- The Dev panel is invisible in normal usage and never appears without the hotkey.

## PowerShell one-click backup (Windows)
If you prefer a local copy directly from disk:

```powershell
# From the project root
.\tools\backup-project.ps1
```

This copies the project into `Backups/LaunchPadPlus_backup_<timestamp>` and excludes `Backups/`, `.vscode/`, and other noise.

## What gets backed up
`project-files.json` enumerates the root files and directories that are copied (e.g., `manifest.json`, `newtab.html`, `icons/`, `scripts/`, `styles/`, `vendor/`).

## Where things live
- Hidden panel script: `scripts/devBackup.js`
- Manifest for backup: `project-files.json`
- PowerShell script: `tools/backup-project.ps1`
