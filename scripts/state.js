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

function collectCategoryTileMap(cat) {
  const map = new Map();
  for (const t of (cat.tabs || [])) {
    for (const s of (t.subtabs || [])) {
      for (const tile of (s.tiles || [])) {
        map.set(tile.id, tile);
      }
    }
  }
  return map;
}

function getTileIdsInCategory(cat) {
  const out = [];
  for (const t of (cat.tabs || [])) {
    for (const s of (t.subtabs || [])) {
      for (const tile of (s.tiles || [])) out.push(tile.id);
    }
  }
  return out;
}

function ensureTileOrderForCategory(cat) {
  if (!state.tileOrder) state.tileOrder = {};
  if (!Array.isArray(state.tileOrder[cat.id])) state.tileOrder[cat.id] = [];

  const existing = new Set(getTileIdsInCategory(cat));

  // remove stale + de-dupe
  const seen = new Set();
  state.tileOrder[cat.id] = state.tileOrder[cat.id].filter(id => {
    if (!existing.has(id)) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // append missing at end
  for (const id of existing) {
    if (!seen.has(id)) state.tileOrder[cat.id].push(id);
  }
}

function orderedTilesForCategory(cat) {
  ensureTileOrderForCategory(cat);
  const map = collectCategoryTileMap(cat);
  const ids = state.tileOrder[cat.id] || [];
  const out = [];
  for (const id of ids) {
    const tile = map.get(id);
    if (tile) out.push(tile);
  }
  return out;
}

function orderedTilesForSubtab(cat, subtab) {
  ensureTileOrderForCategory(cat);
  const want = new Set((subtab?.tiles || []).map(t => t.id));
  const map = collectCategoryTileMap(cat);
  const ids = state.tileOrder[cat.id] || [];
  const out = [];
  for (const id of ids) {
    if (!want.has(id)) continue;
    const tile = map.get(id);
    if (tile) out.push(tile);
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
    selectedSubTabId: subId,
    tileOrder: {}
  };

  normalizeState();
  return state;
}

function normalizeState() {
  if (!state) return;
  if (!Array.isArray(state.categories)) state.categories = [];
  if (!state.tileOrder) state.tileOrder = {};

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

    // keep tile order healthy
    ensureTileOrderForCategory(c);
  }

  if (state.categories.length === 0) {
    const catId = uid("cat");
    const tabId = uid("tab");
    const subId = uid("sub");
    state.categories.push({
      id: catId,
      name: "General",
      tabs: [{ id: tabId, name: "All", subtabs: [{ id: subId, name: "All", tiles: [] }] }]
    });
    state.selectedCategoryId = catId;
    state.selectedTabId = tabId;
    state.selectedSubTabId = subId;
    ensureTileOrderForCategory(state.categories[0]);
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
  state.categories.push({
    id,
    name,
    tabs: [{ id: tabId, name: "All", subtabs: [{ id: subId, name: "All", tiles: [] }] }]
  });
  state.selectedCategoryId = id;
  state.selectedTabId = tabId;
  state.selectedSubTabId = subId;
  state.tileOrder[id] = [];
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

// Tiles (assignments live in subtabs; ordering is category-global)
export function addTile({ title, url, icon }) {
  const sub = findSubTab(state.selectedCategoryId, state.selectedTabId, state.selectedSubTabId);
  if (!sub) return false;

  const tile = { id: uid("tile"), title, url, icon: icon || "" };
  sub.tiles.push(tile);

  const cat = findCategory(state.selectedCategoryId);
  if (cat) {
    ensureTileOrderForCategory(cat);
    state.tileOrder[cat.id].push(tile.id);
  }
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

  ensureTileOrderForCategory(hit.category);
  state.tileOrder[hit.category.id] = (state.tileOrder[hit.category.id] || []).filter(id => id !== tileId);
  return true;
}

export function getTilesForSelection() {
  const c = findCategory(state.selectedCategoryId);
  if (!c) return [];

  ensureTileOrderForCategory(c);

  const t = c.tabs.find(x => x.id === state.selectedTabId) || null;
  if (t && isAllLabel(t.name)) {
    // All tab: all tiles in the category, ordered by category-global order
    return orderedTilesForCategory(c);
  }

  const sub = findSubTab(state.selectedCategoryId, state.selectedTabId, state.selectedSubTabId);
  // Non-all: subset tiles, still ordered by category-global order
  return orderedTilesForSubtab(c, sub);
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
  delete state.tileOrder?.[catId];
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
   Tile reassignment helpers
   =========================== */

export function getTileLocation(tileId) {
  const hit = findTileAndParent(tileId);
  if (!hit) return null;
  return { categoryId: hit.category.id, tabId: hit.tab.id, subtabId: hit.subtab.id };
}

export function moveTileTo(tileId, destCategoryId, destTabId, destSubtabId) {
  const hit = findTileAndParent(tileId);
  if (!hit) return false;

  const destCat = findCategory(destCategoryId);
  const destSub = findSubTab(destCategoryId, destTabId, destSubtabId);
  if (!destCat || !destSub) return false;

  const same =
    hit.category.id === destCategoryId &&
    hit.tab.id === destTabId &&
    hit.subtab.id === destSubtabId;

  if (same) return true;

  // Remove from current subtab
  const fromIdx = hit.subtab.tiles.findIndex(t => t.id === tileId);
  if (fromIdx === -1) return false;
  const [obj] = hit.subtab.tiles.splice(fromIdx, 1);
  if (!obj) return false;

  // Add to destination subtab (assignment change)
  destSub.tiles.push(obj);

  // Update ordering lists (order is separate from assignment)
  ensureTileOrderForCategory(hit.category);
  state.tileOrder[hit.category.id] = (state.tileOrder[hit.category.id] || []).filter(id => id !== tileId);

  ensureTileOrderForCategory(destCat);
  state.tileOrder[destCat.id] = state.tileOrder[destCat.id] || [];
  if (!state.tileOrder[destCat.id].includes(tileId)) state.tileOrder[destCat.id].push(tileId);

  normalizeState();
  return true;
}

export function moveTabToCategory(tabId, destCategoryId) {
  const hit = findTabAnywhere(tabId);
  if (!hit) return false;

  const fromCat = hit.category;
  const tabObj = hit.tab;
  const destCat = findCategory(destCategoryId);
  if (!destCat) return false;

  if (fromCat.id === destCat.id) return true;

  const idx = fromCat.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return false;
  fromCat.tabs.splice(idx, 1);

  const allIdx = destCat.tabs.findIndex(t => (t.name || "").trim().toLowerCase() === "all");
  const insertAt = allIdx === -1 ? destCat.tabs.length : Math.min(destCat.tabs.length, allIdx + 1);
  destCat.tabs.splice(insertAt, 0, tabObj);

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

function moveRelativeIds(list, dragId, targetId, side) {
  if (!Array.isArray(list) || list.length < 2) return false;
  const from = list.indexOf(dragId);
  const target = list.indexOf(targetId);
  if (from === -1 || target === -1 || from === target) return false;

  let insertAt = target + (side === "right" ? 1 : 0);
  const [id] = list.splice(from, 1);
  if (!id) return false;
  if (from < insertAt) insertAt -= 1;

  if (insertAt < 0) insertAt = 0;
  if (insertAt > list.length) insertAt = list.length;

  list.splice(insertAt, 0, id);
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
  // Tile order is category-global (NOT per subtab). This is what you wanted.
  const c = findCategory(state.selectedCategoryId);
  if (!c) return false;

  ensureTileOrderForCategory(c);
  const list = state.tileOrder[c.id];

  const moved = moveRelativeIds(list, dragId, targetId, side);
  return moved;
}
