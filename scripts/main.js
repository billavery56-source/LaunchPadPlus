// scripts/main.js
import { initDialog, promptName, toast } from "./dialog.js";
import { initTileDialog, openTileDialog } from "./tileDialog.js";
import { initLabelDialog, openLabelDialog } from "./labelDialog.js";
import { loadState, saveState, resetState } from "./storage.js";
import {
  ensureDefaultState,
  getState,
  setState,
  getSelected,
  getTilesForSelection,
  selectCategory,
  selectTab,
  selectSubTab,
  addCategory,
  addTab,
  addSubTab,
  addTile,
  updateTile,
  deleteTile,
  renameCategory,
  deleteCategory,
  renameTab,
  deleteTab,
  renameSubTab,
  deleteSubTab,
  getTileLocation,
  moveTileTo,
  moveTabToCategory
} from "./state.js";
import { render } from "./render.js";
import { initDnd } from "./dnd.js";
import { initBackup, openBackupDialog, notifyStateChanged, bindAutoSaveIndicator } from "./backup.js";
import { initTheme, openThemeDialog, applySavedTheme } from "./theme.js";

function guessUrlFromTabName(name) {
  const n = (name || "").trim();
  if (!n) return "";
  if (n.toLowerCase() === "all") return "";
  if (/^https?:\/\//i.test(n)) return n;
  if (n.includes(".")) return `https://${n}`;
  const slug = n.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!slug) return "";
  return `https://www.${slug}.com/`;
}

function defaultsFromSelectedTab() {
  const { t } = getSelected();
  const tabName = t?.name || "";
  const title = tabName.toLowerCase() === "all" ? "" : tabName;
  const url = tabName.toLowerCase() === "all" ? "" : guessUrlFromTabName(tabName);
  return { title, url, icon: "", tabName };
}

function getElementTarget(raw) {
  if (!raw) return null;
  if (raw.nodeType === 1) return raw;
  if (raw.nodeType === 3) return raw.parentElement;
  return raw.parentElement || null;
}

async function refresh({ changed = true } = {}) {
  render();

  // Buttons recreated on render
  document.getElementById("lp-backup-btn")?.addEventListener("click", () => openBackupDialog());
  document.getElementById("lp-theme-btn")?.addEventListener("click", () => openThemeDialog());

  // Indicator recreated on render
  bindAutoSaveIndicator(document.getElementById("lp-save-indicator"));

  await saveState();

  if (changed) notifyStateChanged();
}

async function onAddCategory() {
  const name = await promptName({ title: "Add New Category", label: "Category name", placeholder: "e.g., Shopping" });
  if (!name) return;
  addCategory(name);
  toast("Category added.");
  await refresh();
}

async function onAddTab() {
  const st = getState();
  if (!st.selectedCategoryId) return toast("Select a Category first.");
  const name = await promptName({ title: "Add New Tab", label: "Tab name", placeholder: "e.g., Best Buy" });
  if (!name) return;
  addTab(name);
  toast("Tab added.");
  await refresh();
}

async function onAddSubTab() {
  const st = getState();
  if (!st.selectedCategoryId || !st.selectedTabId) return toast("Select a Category and a Tab first.");
  const name = await promptName({ title: "Add New Sub-Tab", label: "Sub-Tab name", placeholder: "e.g., Deals" });
  if (!name) return;
  addSubTab(name);
  toast("Sub-Tab added.");
  await refresh();
}

async function onAddTile() {
  const st = getState();
  if (!st.selectedCategoryId) return toast("Select a Category first.");
  if (!st.selectedTabId) return toast("Select a Tab first.");

  const defs = defaultsFromSelectedTab();
  const result = await openTileDialog({ mode: "add", defaults: defs });
  if (!result) return;

  addTile({ title: result.title, url: result.url, icon: result.icon });
  toast("Tile added.");
  await refresh();
}

async function onEditTile(tileId) {
  const tiles = getTilesForSelection();
  const tile = tiles.find(t => t.id === tileId);
  if (!tile) return;

  const beforeLoc = getTileLocation(tileId);
  const result = await openTileDialog({ mode: "edit", tile });
  if (!result) return;

  if (result.action === "save") {
    const dest = result.destination;
    if (dest && beforeLoc) {
      const changed =
        dest.categoryId !== beforeLoc.categoryId ||
        dest.tabId !== beforeLoc.tabId ||
        dest.subtabId !== beforeLoc.subtabId;
      if (changed) moveTileTo(tileId, dest.categoryId, dest.tabId, dest.subtabId);
    }

    updateTile(tileId, { title: result.title, url: result.url, icon: result.icon });
    toast("Tile saved.");
    await refresh();
  } else if (result.action === "delete") {
    deleteTile(tileId);
    toast("Tile deleted.");
    await refresh();
  }
}

function openTile(tileId) {
  const tiles = getTilesForSelection();
  const tile = tiles.find(t => t.id === tileId);
  if (!tile?.url) return toast("This tile has no URL.");
  window.open(tile.url, "_blank", "noopener,noreferrer");
}

async function onRightClickEdit(kind, id) {
  const st = getState();
  const { c, t } = getSelected();

  if (kind === "tile") return onEditTile(id);

  let currentName = "";
  let currentCategoryId = st.selectedCategoryId;

  if (kind === "category") {
    const cat = st.categories.find(x => x.id === id);
    currentName = cat?.name || "";
  } else if (kind === "tab") {
    const tab = c?.tabs?.find(x => x.id === id);
    currentName = tab?.name || "";
    currentCategoryId = c?.id || st.selectedCategoryId;
  } else if (kind === "subtab") {
    const sub = t?.subtabs?.find(x => x.id === id);
    currentName = sub?.name || "";
  }

  const result = await openLabelDialog({ kind, currentName, currentCategoryId });
  if (!result) return;

  if (result.action === "save") {
    if (kind === "category") renameCategory(id, result.name);
    if (kind === "tab") {
      renameTab(id, result.name);
      if (result.categoryId && result.categoryId !== currentCategoryId) {
        moveTabToCategory(id, result.categoryId);
      }
    }
    if (kind === "subtab") renameSubTab(id, result.name);

    toast("Saved.");
    await refresh();
  }

  if (result.action === "delete") {
    if (kind === "category") deleteCategory(id);
    if (kind === "tab") deleteTab(id);
    if (kind === "subtab") deleteSubTab(id);
    toast("Deleted.");
    await refresh();
  }
}

function wireEvents() {
  document.addEventListener("click", async (e) => {
    const el = getElementTarget(e.target);
    const btn = el?.closest?.("button");

    try {
      if (btn?.id === "lp-add-category") return await onAddCategory();
      if (btn?.id === "lp-add-tab") return await onAddTab();
      if (btn?.id === "lp-add-subtab") return await onAddSubTab();
      if (btn?.id === "lp-add-tile") return await onAddTile();

      if (btn?.dataset?.lpSelectCategory) { selectCategory(btn.dataset.lpSelectCategory); return await refresh(); }
      if (btn?.dataset?.lpSelectTab) { selectTab(btn.dataset.lpSelectTab); return await refresh(); }
      if (btn?.dataset?.lpSelectSubtab) { selectSubTab(btn.dataset.lpSelectSubtab); return await refresh(); }

      const tileEl = el?.closest?.("[data-lp-tile-open]");
      if (tileEl?.dataset?.lpTileOpen) return openTile(tileEl.dataset.lpTileOpen);
    } catch (err) {
      console.error("Click handler error:", err);
      toast("Click error — check console.");
    }
  }, true);

  document.addEventListener("contextmenu", async (e) => {
    const el = e.target?.closest?.("[data-lp-edit-kind]");
    if (!el) return;

    const kind = el.dataset.lpEditKind;
    const id = el.dataset.lpEditId;
    if (!kind || !id) return;

    e.preventDefault();
    e.stopPropagation();
    return onRightClickEdit(kind, id);
  }, true);

  window.addEventListener("keydown", async (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyR") {
      e.preventDefault();
      await resetState();
      ensureDefaultState();
      toast("Reset.");
      await refresh();
    }
  });
}

async function boot() {
  initDialog();
  initTileDialog();
  initLabelDialog();
  initDnd({ refresh });

  // Theme (apply saved + hook theme dialog)
  await initTheme();
  await applySavedTheme();

  await loadState();
  ensureDefaultState();

  await initBackup({
    getState,
    setState: (s) => setState(s),
    refresh: () => refresh({ changed: false })
  });

  wireEvents();
  await refresh({ changed: false });
}

boot();
