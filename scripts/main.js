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

function guessUrlFromName(name) {
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
  const tabName = (t?.name || "").trim();
  const title = tabName.toLowerCase() === "all" ? "" : tabName;
  const url = guessUrlFromName(title);
  return { title, url, icon: "", tabName };
}

function getElementTarget(raw) {
  if (!raw) return null;
  if (raw.nodeType === 1) return raw; // Element
  if (raw.nodeType === 3) return raw.parentElement; // Text node
  return raw.parentElement || null;
}

async function refresh() {
  render();
  bindStaticButtons();     // these exist in DOM after render
  bindDynamicButtons();    // the + tile is recreated each render
  await saveState();
}

function bindStaticButtons() {
  // (Optional future: static header buttons, etc.)
}

function bindDynamicButtons() {
  // These nodes are recreated by render(), so bind after every render.
  const addCat = document.getElementById("lp-add-category");
  if (addCat) addCat.onclick = () => onAddCategory();

  const addTabBtn = document.getElementById("lp-add-tab");
  if (addTabBtn) addTabBtn.onclick = () => onAddTab();

  const addSub = document.getElementById("lp-add-subtab");
  if (addSub) addSub.onclick = () => onAddSubTab();

  const addTileBtn = document.getElementById("lp-add-tile");
  if (addTileBtn) addTileBtn.onclick = () => onAddTile(); // <-- the important one
}

async function onAddCategory() {
  const name = await promptName({
    title: "Add New Category",
    label: "Category name",
    placeholder: "e.g., Shopping"
  });
  if (!name) return;
  addCategory(name);
  toast("Category added.");
  await refresh();
}

async function onAddTab() {
  const st = getState();
  if (!st.selectedCategoryId) {
    toast("Select a Category first.");
    return;
  }
  const name = await promptName({
    title: "Add New Tab",
    label: "Tab name",
    placeholder: "e.g., Amazon"
  });
  if (!name) return;
  addTab(name);
  toast("Tab added.");
  await refresh();
}

async function onAddSubTab() {
  const st = getState();
  if (!st.selectedCategoryId || !st.selectedTabId) {
    toast("Select a Category and a Tab first.");
    return;
  }
  const name = await promptName({
    title: "Add New Sub-Tab",
    label: "Sub-Tab name",
    placeholder: "e.g., Deals"
  });
  if (!name) return;
  addSubTab(name);
  toast("Sub-Tab added.");
  await refresh();
}

async function onAddTile() {
  // Visible proof that the click fired
  // (If you see this toast but no dialog, it’s a dialog visibility issue, not the click.)
  toast("Opening Add Tile…", 900);

  const tileRoot = document.getElementById("lp-tile-root");
  if (!tileRoot) {
    toast("Missing tile dialog container (#lp-tile-root).");
    console.error("Missing #lp-tile-root");
    return;
  }

  const st = getState();
  if (!st.selectedCategoryId) {
    toast("Select a Category first.");
    return;
  }
  if (!st.selectedTabId) {
    toast("Select a Tab first.");
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
  const tile = tiles.find((x) => x.id === tileId);
  if (!tile) return;

  const result = await openTileDialog({ mode: "edit", tile });
  if (!result) return;

  if (result.action === "save") {
    updateTile(tileId, { title: result.title, url: result.url, icon: result.icon });
    toast("Tile updated.");
    await refresh();
  } else if (result.action === "delete") {
    deleteTile(tileId);
    toast("Tile deleted.");
    await refresh();
  }
}

function openTile(tileId) {
  const tiles = getTilesForSelection();
  const tile = tiles.find((x) => x.id === tileId);
  if (!tile?.url) {
    toast("This tile has no URL.");
    return;
  }
  window.open(tile.url, "_blank", "noopener,noreferrer");
}

async function onEditLabel(kind, id) {
  const st = getState();
  if (kind === "category") {
    const c = st.categories.find((x) => x.id === id);
    const name = await openLabelDialog({ title: "Edit Category", value: c?.name || "" });
    if (!name) return;
    renameCategory(id, name);
    toast("Category renamed.");
    await refresh();
    return;
  }

  if (kind === "tab") {
    const { c } = getSelected();
    const t = c?.tabs?.find((x) => x.id === id);
    const name = await openLabelDialog({ title: "Edit Tab", value: t?.name || "" });
    if (!name) return;
    renameTab(id, name);
    toast("Tab renamed.");
    await refresh();
    return;
  }

  if (kind === "subtab") {
    const { t } = getSelected();
    const s = t?.subtabs?.find((x) => x.id === id);
    const name = await openLabelDialog({ title: "Edit Sub-Tab", value: s?.name || "" });
    if (!name) return;
    renameSubTab(id, name);
    toast("Sub-Tab renamed.");
    await refresh();
    return;
  }

  if (kind === "tile") {
    return onEditTile(id);
  }
}

async function onDeleteLabel(kind, id) {
  if (kind === "category") deleteCategory(id);
  if (kind === "tab") deleteTab(id);
  if (kind === "subtab") deleteSubTab(id);
  toast("Deleted.");
  await refresh();
}

function wireEvents() {
  // Capture-phase click handler: survives stopPropagation in bubbling phase
  document.addEventListener(
    "click",
    async (e) => {
      try {
        const el = getElementTarget(e.target);
        if (!el) return;

        // Selection chips
        const btn = el.closest?.("button");

        if (btn?.dataset?.lpSelectCategory) {
          selectCategory(btn.dataset.lpSelectCategory);
          return await refresh();
        }
        if (btn?.dataset?.lpSelectTab) {
          selectTab(btn.dataset.lpSelectTab);
          return await refresh();
        }
        if (btn?.dataset?.lpSelectSubtab) {
          selectSubTab(btn.dataset.lpSelectSubtab);
          return await refresh();
        }

        // Tile open
        const tileEl = el.closest?.("[data-lp-tile-open]");
        if (tileEl?.dataset?.lpTileOpen) return openTile(tileEl.dataset.lpTileOpen);
      } catch (err) {
        console.error("Click handler error:", err);
        toast("Click error — check console.");
      }
    },
    true
  );

  // Right-click for edit
  document.addEventListener("contextmenu", async (e) => {
    const el = e.target?.closest?.("[data-lp-edit-kind]");
    if (!el) return;

    const kind = el.dataset.lpEditKind;
    const id = el.dataset.lpEditId;
    if (!kind || !id) return;

    e.preventDefault();

    if (e.shiftKey) return onDeleteLabel(kind, id);
    return onEditLabel(kind, id);
  });

  // Dev reset shortcut
  document.addEventListener("keydown", async (e) => {
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
  await loadState();
  ensureDefaultState();
  wireEvents();
  await refresh();
}

boot();
