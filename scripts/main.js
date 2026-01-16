// scripts/main.js
import { initDialog, promptName, toast } from "./dialog.js";
import { initTileDialog, openTileDialog } from "./tileDialog.js";
import { initLabelDialog, openLabelDialog } from "./labelDialog.js";
import { loadState, saveState, resetState } from "./storage.js";
import {
  ensureDefaultState,
  getState,
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
  deleteSubTab
} from "./state.js";
import { render } from "./render.js";

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
  // icon default blank → dialog shows favicon preview based on URL
  return { title, url, icon: "" };
}

async function refresh() {
  render();
  await saveState();
}

async function onAddCategory() {
  const name = await promptName({
    title: "Add New Category",
    label: "Category name",
    placeholder: "e.g., Sports"
  });
  if (!name) return;
  addCategory(name);
  toast(`Added Category: ${name}`);
  await refresh();
}

async function onAddTab() {
  const st = getState();
  if (!st.selectedCategoryId) {
    toast("Select a Category first (General qualifies).");
    return;
  }
  const name = await promptName({
    title: "Add New Tab",
    label: "Tab name",
    placeholder: "e.g., Amazon"
  });
  if (!name) return;
  addTab(name);
  toast(`Added Tab: ${name}`);
  await refresh();
}

async function onAddSubTab() {
  const st = getState();
  if (!st.selectedCategoryId || !st.selectedTabId) {
    toast("Select a Category and a Tab first (General qualifies).");
    return;
  }
  const name = await promptName({
    title: "Add New Sub-Tab",
    label: "Sub-Tab name",
    placeholder: "e.g., Favorites"
  });
  if (!name) return;
  addSubTab(name);
  toast(`Added Sub-Tab: ${name}`);
  await refresh();
}

async function onAddTile() {
  const st = getState();
  if (!st.selectedCategoryId) {
    toast("Select a Category first (General qualifies).");
    return;
  }
  if (!st.selectedTabId) {
    toast("Select a Tab first (All qualifies).");
    return;
  }

  const defs = defaultsFromSelectedTab();
  const result = await openTileDialog({ mode: "add", defaults: defs });
  if (!result) return;

  const { t } = getSelected();
  const tabName = (t?.name || "").toLowerCase();
  const urlRequired = tabName !== "all";

  if (urlRequired && !result.url) {
    toast("URL is required for this tab.");
    return;
  }

  addTile({ title: result.title, url: result.url, icon: result.icon });
  toast("Tile added.");
  await refresh();
}

async function onEditTile(tileId) {
  const tiles = getTilesForSelection();
  const tile = tiles.find(t => t.id === tileId);
  if (!tile) return;

  const result = await openTileDialog({ mode: "edit", tile });
  if (!result) return;

  if (result.action === "save") {
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
  if (!tile) return;

  if (!tile.url) {
    toast("This tile has no URL.");
    return;
  }
  window.open(tile.url, "_blank", "noopener");
}

async function onRightClickEdit(kind, id) {
  const st = getState();
  const { c, t } = getSelected();

  let currentName = "";
  if (kind === "category") {
    const cat = st.categories.find(x => x.id === id);
    currentName = cat?.name || "";
  } else if (kind === "tab") {
    const tab = c?.tabs?.find(x => x.id === id);
    currentName = tab?.name || "";
  } else if (kind === "subtab") {
    const sub = t?.subtabs?.find(x => x.id === id);
    currentName = sub?.name || "";
  }

  const result = await openLabelDialog({ kind, currentName });
  if (!result) return;

  if (result.action === "save") {
    if (kind === "category") renameCategory(id, result.name);
    if (kind === "tab") renameTab(id, result.name);
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
  // Left click
  document.addEventListener("click", async (e) => {
    const el = e.target;

    if (el?.id === "lp-add-category") return onAddCategory();
    if (el?.id === "lp-add-tab") return onAddTab();
    if (el?.id === "lp-add-subtab") return onAddSubTab();
    if (el?.id === "lp-add-tile") return onAddTile();

    if (el?.dataset?.lpSelectCategory) {
      selectCategory(el.dataset.lpSelectCategory);
      return refresh();
    }
    if (el?.dataset?.lpSelectTab) {
      selectTab(el.dataset.lpSelectTab);
      return refresh();
    }
    if (el?.dataset?.lpSelectSubtab) {
      selectSubTab(el.dataset.lpSelectSubtab);
      return refresh();
    }

    // Tile open
    const tileEl = el?.closest?.("[data-lp-tile-open]");
    if (tileEl?.dataset?.lpTileOpen) {
      return openTile(tileEl.dataset.lpTileOpen);
    }
  });

  // Right click (contextmenu) — edit
  document.addEventListener("contextmenu", async (e) => {
    const el = e.target?.closest?.("[data-lp-edit-kind]");
    if (!el) return;

    const kind = el.dataset.lpEditKind;
    const id = el.dataset.lpEditId;

    if (!kind || !id) return;

    e.preventDefault();

    if (kind === "tile") return onEditTile(id);
    if (kind === "category" || kind === "tab" || kind === "subtab") return onRightClickEdit(kind, id);
  });

  // Dev reset shortcut
  window.addEventListener("keydown", async (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyR") {
      e.preventDefault();
      await resetState();
      ensureDefaultState();
      toast("Reset state.");
      await refresh();
    }
  });
}

async function boot() {
  initDialog();
  initTileDialog();
  initLabelDialog();
  await loadState();
  ensureDefaultState();
  wireEvents();
  await refresh();
}

boot();
