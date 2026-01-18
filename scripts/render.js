// scripts/render.js
import { getState, getSelected, getTilesForSelection } from "./state.js";

function chip(text, selected, dataset = {}) {
  const b = document.createElement("button");
  b.className = `lp-chip ${selected ? "selected" : ""}`;
  b.textContent = text;
  for (const [k, v] of Object.entries(dataset)) b.dataset[k] = v;
  return b;
}

function buildPlusTile() {
  const btn = document.createElement("button");
  btn.className = "lp-tile lp-plus-tile";
  btn.id = "lp-add-tile";
  btn.type = "button";
  btn.title = "Add Tile";

  const plus = document.createElement("div");
  plus.className = "lp-plus";
  plus.textContent = "+";
  btn.appendChild(plus);

  // IMPORTANT: no DnD dataset on the + tile
  return btn;
}

function buildTileCard(tile) {
  const btn = document.createElement("button");
  btn.className = "lp-tile";
  btn.type = "button";

  // open/edit
  btn.dataset.lpTileOpen = tile.id;
  btn.dataset.lpEditKind = "tile";
  btn.dataset.lpEditId = tile.id;

  // DnD (THIS is what makes tile dragging possible)
  btn.dataset.lpDndType = "tile";
  btn.dataset.lpDndId = tile.id;

  const img = document.createElement("img");
  img.className = "lp-tile-icon";
  img.alt = "";

  const iconUrl = tile.icon?.trim()
    ? tile.icon.trim()
    : (tile.url ? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(tile.url)}&sz=128` : "");

  if (iconUrl) img.src = iconUrl;

  img.addEventListener("error", () => {
    img.style.visibility = "hidden";
  });

  const title = document.createElement("div");
  title.className = "lp-tile-title";
  title.textContent = tile.title || "";
  title.title = tile.title || "";

  btn.appendChild(img);
  btn.appendChild(title);
  return btn;
}

export function render() {
  const st = getState();
  const { c, t } = getSelected();
  const tiles = getTilesForSelection();

  const app = document.getElementById("app");
  app.innerHTML = "";

  const makeRow = (titleText) => {
    const row = document.createElement("div");
    row.className = "lp-row";

    const left = document.createElement("div");
    left.className = "lp-row-left";
    left.textContent = titleText;

    const mid = document.createElement("div");
    mid.className = "lp-row-mid";

    row.append(left, mid);
    app.appendChild(row);
    return mid;
  };

  // Categories
  {
    const mid = makeRow("Categories");
    st.categories.forEach((cat) => {
      const locked = (cat.name || "").trim().toLowerCase() === "general";
      mid.appendChild(
        chip(cat.name, cat.id === st.selectedCategoryId, {
          lpSelectCategory: cat.id,
          lpEditKind: "category",
          lpEditId: cat.id,

          lpDndType: "category",
          lpDndId: cat.id,
          lpDndLocked: locked ? "1" : "0"
        })
      );
    });

    const add = chip("+", false);
    add.id = "lp-add-category";
    add.classList.add("add");
    mid.appendChild(add);
  }

  // Tabs
  {
    const mid = makeRow("Tabs");
    (c?.tabs || []).forEach((tab) => {
      const locked = (tab.name || "").trim().toLowerCase() === "all";
      mid.appendChild(
        chip(tab.name, tab.id === st.selectedTabId, {
          lpSelectTab: tab.id,
          lpEditKind: "tab",
          lpEditId: tab.id,

          lpDndType: "tab",
          lpDndId: tab.id,
          lpDndLocked: locked ? "1" : "0"
        })
      );
    });

    const add = chip("+", false);
    add.id = "lp-add-tab";
    add.classList.add("add");
    mid.appendChild(add);
  }

  // Sub-tabs
  {
    const mid = makeRow("Sub-tabs");
    (t?.subtabs || []).forEach((sub) => {
      const locked = (sub.name || "").trim().toLowerCase() === "all";
      mid.appendChild(
        chip(sub.name, sub.id === st.selectedSubTabId, {
          lpSelectSubtab: sub.id,
          lpEditKind: "subtab",
          lpEditId: sub.id,

          lpDndType: "subtab",
          lpDndId: sub.id,
          lpDndLocked: locked ? "1" : "0"
        })
      );
    });

    const add = chip("+", false);
    add.id = "lp-add-subtab";
    add.classList.add("add");
    mid.appendChild(add);
  }

  // Tiles
  const tilesWrap = document.createElement("div");
  tilesWrap.className = "lp-tiles";

  const grid = document.createElement("div");
  grid.className = "lp-tile-grid";
  if (tiles.length === 0) grid.classList.add("empty");

  tiles.forEach((tile) => grid.appendChild(buildTileCard(tile)));

  // + tile always last
  grid.appendChild(buildPlusTile());

  tilesWrap.appendChild(grid);
  app.appendChild(tilesWrap);
}
