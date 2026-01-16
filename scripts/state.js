// scripts/state.js
let state = null;

function uid(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
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

    if (c.tabs.length === 0) c.tabs.push({ id: uid("tab"), name: "All", subtabs: [{ id: uid("sub"), name: "All", tiles: [] }] });
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

  // selections
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
  const sub = findSubTab(state.selectedCategoryId, state.selectedTabId, state.selectedSubTabId);
  if (!sub) return false;
  const tile = sub.tiles.find(t => t.id === tileId);
  if (!tile) return false;
  tile.title = title;
  tile.url = url;
  tile.icon = icon || "";
  return true;
}

export function deleteTile(tileId) {
  const sub = findSubTab(state.selectedCategoryId, state.selectedTabId, state.selectedSubTabId);
  if (!sub) return false;
  const idx = sub.tiles.findIndex(t => t.id === tileId);
  if (idx === -1) return false;
  sub.tiles.splice(idx, 1);
  return true;
}

export function getTilesForSelection() {
  const sub = findSubTab(state.selectedCategoryId, state.selectedTabId, state.selectedSubTabId);
  return sub?.tiles || [];
}

// Rename/Delete (for right-click edit)
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
  const c = findCategory(state.selectedCategoryId);
  if (!c) return false;
  const t = c.tabs.find(t => t.id === tabId);
  if (!t) return false;
  t.name = newName;
  return true;
}

export function deleteTab(tabId) {
  const c = findCategory(state.selectedCategoryId);
  if (!c) return false;
  const idx = c.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return false;
  c.tabs.splice(idx, 1);
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
