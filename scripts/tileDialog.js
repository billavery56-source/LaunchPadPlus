// scripts/tileDialog.js
import { toast } from "./dialog.js";
import { getState, getSelected, getTileLocation } from "./state.js";

const root = () => document.getElementById("lp-tile-root");
const backdrop = () => document.getElementById("lp-tile-backdrop");

const titleEl = () => document.getElementById("lp-tile-title");
const nameEl = () => document.getElementById("lp-tile-name");
const urlEl = () => document.getElementById("lp-tile-url");
const iconEl = () => document.getElementById("lp-tile-icon");

const catSel = () => document.getElementById("lp-tile-category");
const tabSel = () => document.getElementById("lp-tile-tab");
const subSel = () => document.getElementById("lp-tile-subtab");

const iconPreview = () => document.getElementById("lp-tile-icon-preview");
const iconPickBtn = () => document.getElementById("lp-tile-icon-pick");
const iconClearBtn = () => document.getElementById("lp-tile-icon-clear");
const fileInput = () => document.getElementById("lp-tile-icon-file");

const btnX = () => document.getElementById("lp-tile-x");
const btnCancel = () => document.getElementById("lp-tile-cancel");
const btnSave = () => document.getElementById("lp-tile-save");
const btnDelete = () => document.getElementById("lp-tile-delete");

let resolver = null;
let currentId = null;
let inited = false;

function isValidUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:";
  } catch {
    return false;
  }
}

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

function faviconForUrl(u) {
  const url = (u || "").trim();
  return url ? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128` : "";
}

function setPreview(url) {
  const img = iconPreview();
  if (!img) return;
  if (!url) {
    img.style.visibility = "hidden";
    img.src = "";
    return;
  }
  img.style.visibility = "visible";
  img.src = url;
  img.onerror = () => (img.style.visibility = "hidden");
}

function open() {
  const r = root();
  r.style.display = "flex";
  r.classList.remove("lp-hidden");
  r.setAttribute("aria-hidden", "false");
}

function close(val) {
  const r = root();
  r.style.display = "none";
  r.classList.add("lp-hidden");
  r.setAttribute("aria-hidden", "true");

  if (resolver) {
    const fn = resolver;
    resolver = null;
    fn(val);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function fillSelect(selectEl, items, selectedId) {
  selectEl.innerHTML = "";
  for (const it of items) {
    const o = document.createElement("option");
    o.value = it.id;
    o.textContent = it.name;
    selectEl.appendChild(o);
  }
  if (selectedId && items.some(x => x.id === selectedId)) selectEl.value = selectedId;
}

function getTabNameById(catId, tabId) {
  const st = getState();
  const c = st.categories.find(x => x.id === catId);
  const t = (c?.tabs || []).find(x => x.id === tabId);
  return t?.name || "";
}

function getCurrentDest() {
  return {
    categoryId: catSel().value,
    tabId: tabSel().value,
    subtabId: subSel().value
  };
}

export function initTileDialog() {
  if (inited) return;
  inited = true;

  const closeHandler = () => close(null);
  backdrop()?.addEventListener("click", closeHandler);
  btnX()?.addEventListener("click", closeHandler);
  btnCancel()?.addEventListener("click", closeHandler);

  window.addEventListener("keydown", (e) => {
    const r = root();
    if (!r || r.style.display === "none") return;

    if (e.key === "Escape") {
      e.preventDefault();
      close(null);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      btnSave()?.click();
    }
  }, true);

  iconPickBtn()?.addEventListener("click", () => fileInput()?.click());

  fileInput()?.addEventListener("change", async () => {
    const f = fileInput().files?.[0];
    if (!f) return;
    try {
      const dataUrl = await readFileAsDataUrl(f);
      iconEl().value = dataUrl;
      setPreview(dataUrl);
      toast("Icon set.");
    } catch {
      toast("Could not read that image.");
    } finally {
      fileInput().value = "";
    }
  });

  iconClearBtn()?.addEventListener("click", () => {
    iconEl().value = "";
    const u = urlEl().value.trim();
    setPreview(u ? faviconForUrl(u) : "");
  });
}

export function openTileDialog({ mode, tile, defaults } = {}) {
  initTileDialog();

  const st = getState();
  currentId = tile?.id || null;

  titleEl().textContent = mode === "edit" ? "Edit Tile" : "Add Tile";
  btnDelete().style.display = mode === "edit" ? "inline-flex" : "none";

  // Default destination
  let dest = null;
  if (mode === "edit" && currentId) {
    dest = getTileLocation(currentId);
  }
  if (!dest) {
    const sel = getSelected();
    dest = {
      categoryId: st.selectedCategoryId,
      tabId: st.selectedTabId,
      subtabId: st.selectedSubTabId
    };
  }

  // Populate dropdowns
  fillSelect(catSel(), st.categories.map(c => ({ id: c.id, name: c.name })), dest.categoryId);

  function repopTabs(selectedTabId) {
    const c = st.categories.find(x => x.id === catSel().value);
    const tabs = (c?.tabs || []).map(t => ({ id: t.id, name: t.name }));

    // Prefer a non-"All" tab as default if possible
    let pick = selectedTabId;
    if (!pick || !tabs.some(x => x.id === pick)) {
      const nonAll = tabs.find(x => (x.name || "").trim().toLowerCase() !== "all");
      pick = nonAll?.id || tabs[0]?.id || "";
    }

    fillSelect(tabSel(), tabs, pick);
  }

  function repopSubs(selectedSubId) {
    const c = st.categories.find(x => x.id === catSel().value);
    const t = (c?.tabs || []).find(x => x.id === tabSel().value);
    const subs = (t?.subtabs || []).map(s => ({ id: s.id, name: s.name }));

    let pick = selectedSubId;
    if (!pick || !subs.some(x => x.id === pick)) pick = subs[0]?.id || "";
    fillSelect(subSel(), subs, pick);
  }

  repopTabs(dest.tabId);
  repopSubs(dest.subtabId);

  catSel().onchange = () => {
    repopTabs(null);
    repopSubs(null);
    // tab change influences URL suggestion if user hasn't typed URL manually
    applyAutoUrl();
  };

  tabSel().onchange = () => {
    repopSubs(null);
    applyAutoUrl();
  };

  subSel().onchange = () => {
    // nothing special yet
  };

  // Fill fields
  nameEl().value = mode === "edit" ? (tile?.title || "") : (defaults?.title || "");
  urlEl().value  = mode === "edit" ? (tile?.url || "")   : (defaults?.url || "");
  iconEl().value = mode === "edit" ? (tile?.icon || "")  : (defaults?.icon || "");

  const previewCandidate = iconEl().value.trim()
    ? iconEl().value.trim()
    : (urlEl().value.trim() ? faviconForUrl(urlEl().value.trim()) : "");

  setPreview(previewCandidate);

  // URL auto-fill rules:
  // - if user types URL manually, stop auto overwriting
  // - title drives it first, else tab name drives it
  let urlManual = mode === "edit";
  let lastAutoUrl = (urlEl().value || "").trim();

  function applyAutoUrl() {
    if (mode === "edit") return;
    if (urlManual) return;

    const title = (nameEl().value || "").trim();
    let proposed = guessUrlFromName(title);

    if (!proposed) {
      const tabName = getTabNameById(catSel().value, tabSel().value);
      proposed = guessUrlFromName(tabName);
    }

    const current = (urlEl().value || "").trim();
    if (current && current !== lastAutoUrl) return;

    if (proposed !== current) {
      urlEl().value = proposed;
      lastAutoUrl = proposed;
      if (!iconEl().value.trim()) setPreview(faviconForUrl(proposed));
    }
  }

  nameEl().oninput = () => applyAutoUrl();

  urlEl().oninput = () => {
    const u = urlEl().value.trim();
    if (mode !== "edit") {
      if (!u) {
        urlManual = false;
        lastAutoUrl = "";
        applyAutoUrl();
      } else {
        urlManual = true;
        lastAutoUrl = u;
      }
    }

    if (!iconEl().value.trim()) setPreview(faviconForUrl(u));
  };

  btnSave().onclick = () => {
    const title = (nameEl().value || "").trim();
    const url = (urlEl().value || "").trim();
    const icon = (iconEl().value || "").trim();
    const destNow = getCurrentDest();

    if (!title) { toast("Title is required."); nameEl().focus(); return; }
    if (url && !isValidUrl(url)) { toast("Enter a valid URL (https://...)."); urlEl().focus(); return; }

    close({
      action: "save",
      id: currentId,
      title,
      url,
      icon,
      destination: destNow
    });
  };

  btnDelete().onclick = () => close({ action: "delete", id: currentId });

  // one initial auto URL (add mode)
  applyAutoUrl();

  open();
  setTimeout(() => {
    nameEl().focus();
    nameEl().select();
  }, 0);

  return new Promise((resolve) => (resolver = resolve));
}
