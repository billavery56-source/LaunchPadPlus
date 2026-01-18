// scripts/backup.js
import { idbGet, idbSet } from "./idb.js";
import { toast } from "./dialog.js";

const KEY_HANDLE = "backupFileHandle";
const KEY_META = "backupMeta";

let getStateFn = null;
let setStateFn = null;
let refreshFn = null;

let indicatorEl = null;

let autoEnabled = false;
let lastFileName = "";
let dirty = false;
let lastSnapshot = "";
let timer = null;
let saving = false;

function el(id) { return document.getElementById(id); }

function formatFileName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `LaunchPadPlus - ${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.json`;
}

function openDialog() {
  const r = el("lp-backup-root");
  r.style.display = "flex";
  r.classList.remove("lp-hidden");
  r.setAttribute("aria-hidden", "false");
}

function closeDialog() {
  const r = el("lp-backup-root");
  r.style.display = "none";
  r.classList.add("lp-hidden");
  r.setAttribute("aria-hidden", "true");
}

async function readMeta() {
  const data = await chrome.storage.local.get(KEY_META);
  const meta = data[KEY_META] || {};
  autoEnabled = !!meta.autoEnabled;
  lastFileName = meta.lastFileName || "";
  return meta;
}

async function writeMeta(patch) {
  const current = await readMeta();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [KEY_META]: next });
  autoEnabled = !!next.autoEnabled;
  lastFileName = next.lastFileName || "";
}

async function getHandle() {
  return await idbGet(KEY_HANDLE);
}

async function setHandle(handle) {
  await idbSet(KEY_HANDLE, handle);
}

async function ensurePermission(handle, mode = "readwrite") {
  if (!handle) return false;
  try {
    const q = await handle.queryPermission({ mode });
    if (q === "granted") return true;
    const r = await handle.requestPermission({ mode });
    return r === "granted";
  } catch {
    return false;
  }
}

function updateFileLabel(name) {
  const lab = el("lp-backup-file-label");
  if (lab) lab.textContent = name ? name : "(not set)";
}

function setIndicator(state, text) {
  if (!indicatorEl) return;
  indicatorEl.classList.remove("off", "pending", "saving", "saved", "needsfile", "error");
  indicatorEl.classList.add(state);
  indicatorEl.textContent = text;
}

export function bindAutoSaveIndicator(node) {
  indicatorEl = node || null;

  if (!indicatorEl) return;

  if (!autoEnabled) {
    setIndicator("off", "Auto: Off");
    return;
  }

  if (saving) {
    setIndicator("saving", "Auto: Saving…");
    return;
  }

  if (dirty) {
    setIndicator("pending", "Auto: Pending");
    return;
  }

  // enabled + not dirty
  setIndicator("saved", "Auto: Saved");
}

function buildPayload(stateObj) {
  return {
    meta: {
      app: "LaunchPadPlus",
      version: 1,
      savedAt: new Date().toISOString()
    },
    state: stateObj
  };
}

async function writeToHandle(handle, payloadObj) {
  const ok = await ensurePermission(handle, "readwrite");
  if (!ok) return false;

  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(payloadObj, null, 2));
  await writable.close();
  return true;
}

async function chooseFileForAutoSave() {
  const handle = await window.showSaveFilePicker({
    suggestedName: formatFileName(),
    types: [{ description: "LaunchPadPlus Backup", accept: { "application/json": [".json"] } }]
  });

  await setHandle(handle);
  const name = handle?.name || "LaunchPadPlus Backup.json";
  await writeMeta({ lastFileName: name });
  updateFileLabel(name);
  toast("Backup file selected.");
  return handle;
}

async function saveNow({ forcePicker = false } = {}) {
  const stateObj = getStateFn?.();
  if (!stateObj) {
    toast("No state to save.");
    return;
  }

  let handle = await getHandle();

  if (!handle || forcePicker) {
    handle = await chooseFileForAutoSave();
  }

  const payload = buildPayload(stateObj);

  saving = true;
  bindAutoSaveIndicator(indicatorEl);

  try {
    const ok = await writeToHandle(handle, payload);
    if (!ok) {
      setIndicator("error", "Auto: Error");
      toast("Could not write backup (permission?).");
      return;
    }

    dirty = false;
    lastSnapshot = JSON.stringify(stateObj);
    setIndicator(autoEnabled ? "saved" : "off", autoEnabled ? "Auto: Saved" : "Auto: Off");
    toast("Backup saved.");
  } finally {
    saving = false;
    bindAutoSaveIndicator(indicatorEl);
  }
}

async function loadFromPicker() {
  const [fileHandle] = await window.showOpenFilePicker({
    multiple: false,
    types: [{ description: "LaunchPadPlus Backup", accept: { "application/json": [".json"] } }]
  });

  if (!fileHandle) return;

  const file = await fileHandle.getFile();
  const text = await file.text();

  let obj = null;
  try { obj = JSON.parse(text); } catch { obj = null; }

  if (!obj?.state) {
    toast("That file doesn’t look like a LaunchPadPlus backup.");
    return;
  }

  setStateFn(obj.state);
  await refreshFn?.();

  // loaded state becomes the baseline
  dirty = false;
  lastSnapshot = JSON.stringify(getStateFn?.() || obj.state);

  toast("Backup loaded.");
  bindAutoSaveIndicator(indicatorEl);
}

function scheduleAutoSave() {
  if (!autoEnabled) return;

  // show immediate “pending”
  bindAutoSaveIndicator(indicatorEl);

  clearTimeout(timer);
  timer = setTimeout(async () => {
    const stateObj = getStateFn?.();
    if (!stateObj) return;

    const snap = JSON.stringify(stateObj);
    if (snap === lastSnapshot) {
      dirty = false;
      bindAutoSaveIndicator(indicatorEl);
      return;
    }

    const handle = await getHandle();
    if (!handle) {
      setIndicator("needsfile", "Auto: Needs file");
      return;
    }

    const payload = buildPayload(stateObj);

    saving = true;
    bindAutoSaveIndicator(indicatorEl);

    try {
      const ok = await writeToHandle(handle, payload);
      if (!ok) {
        setIndicator("error", "Auto: Error");
        return;
      }
      lastSnapshot = snap;
      dirty = false;
      bindAutoSaveIndicator(indicatorEl);
    } catch (e) {
      console.error(e);
      setIndicator("error", "Auto: Error");
    } finally {
      saving = false;
      bindAutoSaveIndicator(indicatorEl);
    }
  }, 900);
}

async function flushIfDirty() {
  if (!autoEnabled) return;
  if (!dirty) return;
  try { await saveNow(); } catch { /* best effort */ }
}

export async function initBackup({ getState, setState, refresh } = {}) {
  getStateFn = getState;
  setStateFn = setState;
  refreshFn = refresh;

  // UI hooks
  el("lp-backup-x")?.addEventListener("click", closeDialog);
  el("lp-backup-close")?.addEventListener("click", closeDialog);
  el("lp-backup-backdrop")?.addEventListener("click", closeDialog);

  el("lp-backup-choose")?.addEventListener("click", async () => {
    try { await chooseFileForAutoSave(); bindAutoSaveIndicator(indicatorEl); }
    catch { toast("Cancelled."); }
  });

  el("lp-backup-save")?.addEventListener("click", async () => {
    try { await saveNow(); }
    catch (e) { console.error(e); setIndicator("error","Auto: Error"); toast("Save failed. Check console."); }
  });

  el("lp-backup-load")?.addEventListener("click", async () => {
    try { await loadFromPicker(); }
    catch (e) { console.error(e); toast("Load failed. Check console."); }
  });

  el("lp-backup-auto")?.addEventListener("change", async () => {
    const enabled = !!el("lp-backup-auto").checked;

    if (enabled) {
      let handle = await getHandle();
      if (!handle) {
        try {
          handle = await chooseFileForAutoSave();
        } catch {
          el("lp-backup-auto").checked = false;
          await writeMeta({ autoEnabled: false });
          autoEnabled = false;
          bindAutoSaveIndicator(indicatorEl);
          toast("Auto-save not enabled.");
          return;
        }
      }
      await writeMeta({ autoEnabled: true });
      autoEnabled = true;
      toast("Auto-save enabled.");
      bindAutoSaveIndicator(indicatorEl);
    } else {
      await writeMeta({ autoEnabled: false });
      autoEnabled = false;
      toast("Auto-save disabled.");
      bindAutoSaveIndicator(indicatorEl);
    }
  });

  // load meta and update UI
  await readMeta();
  if (el("lp-backup-auto")) el("lp-backup-auto").checked = autoEnabled;
  updateFileLabel(lastFileName);

  // baseline snapshot (prevents an immediate auto-save spam)
  const st = getStateFn?.();
  lastSnapshot = st ? JSON.stringify(st) : "";

  // best-effort flush on close/visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flushIfDirty();
  });
  window.addEventListener("beforeunload", () => {
    flushIfDirty();
  });

  bindAutoSaveIndicator(indicatorEl);
}

export function openBackupDialog() {
  // refresh labels each open
  updateFileLabel(lastFileName);
  if (el("lp-backup-auto")) el("lp-backup-auto").checked = autoEnabled;
  openDialog();
}

export function notifyStateChanged() {
  dirty = true;
  scheduleAutoSave();
  bindAutoSaveIndicator(indicatorEl);
}
