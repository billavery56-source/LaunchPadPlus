// scripts/state.js
let state = null;

function uid(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function isAllLabel(name) {
  return (name || "").trim().toLowerCase() === "all";
}

function findTabAnywhere(tabId) {
  for (const c of (state?.categories || [])) {
    const t = (c.tabs || []).find(x => x.id === tabId);
    if (t) return { category: c, tab: t };
  }
  return null;
}

function findTileAndParent(tileId) {
  if (!state?.categories) return null;
  for (const c of state.categories) {
    for (const t of (c.tabs || [])) {
      for (const s of (t.subtabs || [])) {
        const tiles = Array.isArray(s.tiles) ? s.tiles : [];
        const tile = tiles.find(x => x.id === tileId);
        if (tile) return { tile, subtab: s, tab: t, category: c };
      }
    }
  }
  return null;
}

function getAllTilesInCategory(catId) {
  const c = findCategory(catId);
  if (!c) return [];
  const out = [];
  for (const t of (c.tabs || [])) {
    for (const s of (t.subtabs || [])) {
      const tiles = Array.isArray(s.tiles) ? s.tiles : [];
      for (const tile of tiles) out.push(tile);
    }
  }
  return out;
}

export function getState() { return state; }

export function setState(next) {
  state = next;
  normalizeState();
  return state;
}

export function ensureDefaultState() {
  if (state) { normalizeState(); return state; }

  const catId = uid("cat");
  const tabId = uid("tab");
  const subId = uid("sub");

  state = {
    categories: [
      { id: catId, name: "General", tabs: [
        { id: tabId, name: "All", subtabs: [ { id: subId, name: "All", tiles: [] } ] }
      ] }
    ],
    selectedCategoryId: catId,
    selectedTabId: tabId,
    selectedSubTabId: subId
  };

  return state;
}

function normalizeState() {
  if (!state) return;
  if (!Array.isArray(state.categories)) state.categories = [];

  for (const c of state.categories) {
    if (!c.id) c.id = uid("cat");
    if (!c.name) c.name = "Category";
    if (!Array.isArray(c.tabs)) c.tabs = [];

    for (const t of c.tabs) {
      if (!t.id) t.id = uid("tab");
      if (!t.name) t.name = "Tab";
      if (!Array.isArray(t.subtabs)) t.subtabs = [];

      for (const s of t.subtabs) {
        if (!s.id) s.id = uid("sub");
        if (!s.name) s.name = "All";
        if (!Array.isArray(s.tiles)) s.tiles = [];
      }

      if (t.subtabs.length === 0) t.subtabs.push({ id: uid("sub"), name: "All", tiles: [] });
    }

    if (c.tabs.length === 0) {
      c.tabs.push({ id: uid("tab"), name: "All", subtabs: [{ id: uid("sub"), name: "All", tiles: [] }] });
    }
  }

  if (state.categories.length === 0) {
    const catId = uid("cat");
    const tabId = uid("tab");
    const subId = uid("sub");
    state.categories.push({ id: catId, name: "General", tabs: [{ id: tabId, name: "All", subtabs: [{ id: subId, name: "All", tiles: [] }] }] });
    state.selectedCategoryId = catId;
    state.selectedTabId = tabId;
    state.selectedSubTabId = subId;
  }

  const firstCat = state.categories[0];
  if (!state.selectedCategoryId || !state.categories.some(c => c.id === state.selectedCategoryId)) {
    state.selectedCategoryId = firstCat.id;
  }

  const cat = findCategory(state.selectedCategoryId);
  const firstTab = cat.tabs[0];
  if (!state.selectedTabId || !cat.tabs.some(t => t.id === state.selectedTabId)) {
    state.selectedTabId = firstTab.id;
  }

  const tab = findTab(state.selectedCategoryId, state.selectedTabId);
  const firstSub = tab.subtabs[0];
  if (!state.selectedSubTabId || !tab.subtabs.some(s => s.id === state.selectedSubTabId)) {
    state.selectedSubTabId = firstSub.id;
  }
}

export function findCategory(catId) {
  return state.categories.find(c => c.id === catId) || null;
}

export function findTab(catId, tabId) {
  const c = findCategory(catId);
  if (!c) return null;
  return c.tabs.find(t => t.id === tabId) || null;
}

export function findSubTab(catId, tabId, subId) {
  const t = findTab(catId, tabId);
  if (!t) return null;
  return t.subtabs.find(s => s.id === subId) || null;
}

export function getSelected() {
  const c = findCategory(state.selectedCategoryId);
  const t = c ? c.tabs.find(x => x.id === state.selectedTabId) : null;
  const s = t ? t.subtabs.find(x => x.id === state.selectedSubTabId) : null;
  return { c, t, s };
}

export function selectCategory(id) {
  const c = findCategory(id);
  if (!c) return;
  state.selectedCategoryId = c.id;
  state.selectedTabId = c.tabs[0]?.id || null;
  state.selectedSubTabId = c.tabs[0]?.subtabs?.[0]?.id || null;
}

export function selectTab(tabId) {
  const c = findCategory(state.selectedCategoryId);
  if (!c) return;
  const t = c.tabs.find(t => t.id === tabId);
  if (!t) return;
  state.selectedTabId = t.id;
  state.selectedSubTabId = t.subtabs[0]?.id || null;
}

export function selectSubTab(subId) {
  const t = findTab(state.selectedCategoryId, state.selectedTabId);
  if (!t) return;
  const s = t.subtabs.find(s => s.id === subId);
  if (!s) return;
  state.selectedSubTabId = s.id;
}

export function addCategory(name) {
  const id = uid("cat");
  const tabId = uid("tab");
  const subId = uid("sub");
  state.categories.push({ id, name, tabs: [{ id: tabId, name: "All", subtabs: [{ id: subId, name: "All", tiles: [] }] }] });
  state.selectedCategoryId = id;
  state.selectedTabId = tabId;
  state.selectedSubTabId = subId;
}

export function addTab(name) {
  const c = findCategory(state.selectedCategoryId);
  if (!c) return false;
  const tabId = uid("tab");
  const subId = uid("sub");
  c.tabs.push({ id: tabId, name, subtabs: [{ id: subId, name: "All", tiles: [] }] });
  state.selectedTabId = tabId;
  state.selectedSubTabId = subId;
  return true;
}

export function addSubTab(name) {
  const t = findTab(state.selectedCategoryId, state.selectedTabId);
  if (!t) return false;
  const subId = uid("sub");
  t.subtabs.push({ id: subId, name, tiles: [] });
  state.selectedSubTabId = subId;
  return true;
}

// Tiles
export function addTile({ title, url, icon }) {
  const sub = findSubTab(state.selectedCategoryId, state.selectedTabId, state.selectedSubTabId);
  if (!sub) return false;
  sub.tiles.push({ id: uid("tile"), title, url, icon: icon || "" });
  return true;
}

export function updateTile(tileId, { title, url, icon }) {
  const hit = findTileAndParent(tileId);
  if (!hit) return false;
  hit.tile.title = title;
  hit.tile.url = url;
  hit.tile.icon = icon || "";
  return true;
}

export function deleteTile(tileId) {
  const hit = findTileAndParent(tileId);
  if (!hit) return false;
  const idx = hit.subtab.tiles.findIndex(t => t.id === tileId);
  if (idx === -1) return false;
  hit.subtab.tiles.splice(idx, 1);
  return true;
}

export function getTilesForSelection() {
  const c = findCategory(state.selectedCategoryId);
  if (!c) return [];
  const t = c.tabs.find(x => x.id === state.selectedTabId) || null;
  if (t && isAllLabel(t.name)) {
    return getAllTilesInCategory(c.id);
  }
  const sub = findSubTab(state.selectedCategoryId, state.selectedTabId, state.selectedSubTabId);
  return sub?.tiles || [];
}

// Rename/Delete
export function renameCategory(catId, newName) {
  const c = findCategory(catId);
  if (!c) return false;
  c.name = newName;
  return true;
}

export function deleteCategory(catId) {
  const idx = state.categories.findIndex(c => c.id === catId);
  if (idx === -1) return false;
  state.categories.splice(idx, 1);
  normalizeState();
  return true;
}

export function renameTab(tabId, newName) {
  const hit = findTabAnywhere(tabId);
  if (!hit) return false;
  hit.tab.name = newName;
  return true;
}

export function deleteTab(tabId) {
  const hit = findTabAnywhere(tabId);
  if (!hit) return false;
  const idx = hit.category.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return false;
  hit.category.tabs.splice(idx, 1);
  normalizeState();
  return true;
}

export function renameSubTab(subId, newName) {
  const t = findTab(state.selectedCategoryId, state.selectedTabId);
  if (!t) return false;
  const s = t.subtabs.find(s => s.id === subId);
  if (!s) return false;
  s.name = newName;
  return true;
}

export function deleteSubTab(subId) {
  const t = findTab(state.selectedCategoryId, state.selectedTabId);
  if (!t) return false;
  const idx = t.subtabs.findIndex(s => s.id === subId);
  if (idx === -1) return false;
  t.subtabs.splice(idx, 1);
  normalizeState();
  return true;
}

/* ===========================
   New: Reassignment helpers
   =========================== */

export function getTileLocation(tileId) {
  const hit = findTileAndParent(tileId);
  if (!hit) return null;
  return {
    categoryId: hit.category.id,
    tabId: hit.tab.id,
    subtabId: hit.subtab.id
  };
}

export function moveTileTo(tileId, destCategoryId, destTabId, destSubtabId) {
  const hit = findTileAndParent(tileId);
  if (!hit) return false;

  const destSub = findSubTab(destCategoryId, destTabId, destSubtabId);
  if (!destSub) return false;

  // No-op
  if (hit.category.id === destCategoryId && hit.tab.id === destTabId && hit.subtab.id === destSubtabId) {
    return true;
  }

  const fromIdx = hit.subtab.tiles.findIndex(t => t.id === tileId);
  if (fromIdx === -1) return false;

  const [obj] = hit.subtab.tiles.splice(fromIdx, 1);
  if (!obj) return false;

  destSub.tiles.push(obj);
  return true;
}

export function moveTabToCategory(tabId, destCategoryId) {
  const hit = findTabAnywhere(tabId);
  if (!hit) return false;

  const fromCat = hit.category;
  const tabObj = hit.tab;
  const destCat = findCategory(destCategoryId);
  if (!destCat) return false;

  // Don't move if already there
  if (fromCat.id === destCat.id) return true;

  // Remove from source
  const idx = fromCat.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return false;
  fromCat.tabs.splice(idx, 1);

  // Insert into dest after its "All" tab (if present)
  const allIdx = destCat.tabs.findIndex(t => (t.name || "").trim().toLowerCase() === "all");
  const insertAt = allIdx === -1 ? destCat.tabs.length : Math.min(destCat.tabs.length, allIdx + 1);
  destCat.tabs.splice(insertAt, 0, tabObj);

  // If the moved tab is currently selected, keep selection stable
  if (state.selectedTabId === tabId) {
    state.selectedCategoryId = destCat.id;
    state.selectedTabId = tabId;
    state.selectedSubTabId = tabObj.subtabs?.[0]?.id || null;
  }

  normalizeState();
  return true;
}

/* ===========================
   Drag & Drop reorder helpers
   =========================== */

function moveRelative(list, dragId, targetId, side) {
  if (!Array.isArray(list) || list.length < 2) return false;
  const from = list.findIndex(x => x.id === dragId);
  const target = list.findIndex(x => x.id === targetId);
  if (from === -1 || target === -1 || from === target) return false;

  let insertAt = target + (side === "right" ? 1 : 0);
  const [item] = list.splice(from, 1);
  if (!item) return false;
  if (from < insertAt) insertAt -= 1;

  if (insertAt < 0) insertAt = 0;
  if (insertAt > list.length) insertAt = list.length;

  list.splice(insertAt, 0, item);
  return true;
}

function pinFirst(list, predicate) {
  if (!Array.isArray(list) || list.length === 0) return;
  const idx = list.findIndex(predicate);
  if (idx > 0) {
    const [item] = list.splice(idx, 1);
    if (item) list.unshift(item);
  }
}

function pinFixed() {
  pinFirst(state.categories, c => (c?.name || "").trim().toLowerCase() === "general");
  for (const c of state.categories) {
    pinFirst(c.tabs, t => (t?.name || "").trim().toLowerCase() === "all");
    for (const t of (c.tabs || [])) {
      pinFirst(t.subtabs, s => (s?.name || "").trim().toLowerCase() === "all");
    }
  }
}

export function moveCategoryRelative(dragId, targetId, side) {
  const moved = moveRelative(state.categories, dragId, targetId, side);
  if (moved) pinFixed();
  return moved;
}

export function moveTabRelative(dragId, targetId, side) {
  const c = findCategory(state.selectedCategoryId);
  if (!c) return false;
  const moved = moveRelative(c.tabs, dragId, targetId, side);
  if (moved) pinFixed();
  return moved;
}

export function moveSubTabRelative(dragId, targetId, side) {
  const t = findTab(state.selectedCategoryId, state.selectedTabId);
  if (!t) return false;
  const moved = moveRelative(t.subtabs, dragId, targetId, side);
  if (moved) pinFixed();
  return moved;
}

export function moveTileRelative(dragId, targetId, side) {
  const sub = findSubTab(state.selectedCategoryId, state.selectedTabId, state.selectedSubTabId);
  if (!sub) return false;
  return moveRelative(sub.tiles, dragId, targetId, side);
}
