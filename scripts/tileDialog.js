// scripts/tileDialog.js
import { toast } from "./dialog.js";

const root = () => document.getElementById("lp-tile-root");
const backdrop = () => document.getElementById("lp-tile-backdrop");

const titleEl = () => document.getElementById("lp-tile-title");
const nameEl = () => document.getElementById("lp-tile-name");
const urlEl = () => document.getElementById("lp-tile-url");
const iconEl = () => document.getElementById("lp-tile-icon");

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
  if (!r) {
    console.error("Tile dialog root not found (#lp-tile-root)");
    toast("Tile dialog root missing.");
    return;
  }
  r.style.display = "flex";
  r.classList.remove("lp-hidden");
  r.setAttribute("aria-hidden", "false");
}

function close(result) {
  const r = root();
  if (r) {
    r.style.display = "none";
    r.classList.add("lp-hidden");
    r.setAttribute("aria-hidden", "true");
  }
  if (resolver) {
    const fn = resolver;
    resolver = null;
    fn(result);
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

export function initTileDialog() {
  if (inited) return;
  inited = true;

  const closeHandler = () => close(null);

  backdrop()?.addEventListener("click", closeHandler);
  btnX()?.addEventListener("click", closeHandler);
  btnCancel()?.addEventListener("click", closeHandler);

  // ESC/Enter (capture)
  window.addEventListener(
    "keydown",
    (e) => {
      const r = root();
      if (!r || r.style.display === "none") return;

      if (e.key === "Escape") {
        e.preventDefault();
        close(null);
        return;
      }
      if (e.key === "Enter") {
        // don’t auto-save if user is inside URL field typing a partial
        e.preventDefault();
        btnSave()?.click();
      }
    },
    true
  );

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

  currentId = tile?.id || null;

  titleEl().textContent = mode === "edit" ? "Edit Tile" : "Add Tile";
  nameEl().value = mode === "edit" ? (tile?.title || "") : (defaults?.title || "");
  urlEl().value = mode === "edit" ? (tile?.url || "") : (defaults?.url || "");
  iconEl().value = mode === "edit" ? (tile?.icon || "") : (defaults?.icon || "");

  btnDelete().style.display = mode === "edit" ? "inline-flex" : "none";

  const previewCandidate = iconEl().value.trim()
    ? iconEl().value.trim()
    : (urlEl().value.trim() ? faviconForUrl(urlEl().value.trim()) : "");

  setPreview(previewCandidate);

  const tabHint = (defaults?.tabName || defaults?.title || "").trim();
  let urlManual = mode === "edit";                 // editing = don’t auto-overwrite
  let lastAutoUrl = (urlEl().value || "").trim();  // track what auto set last

  function applyAutoUrl() {
    if (mode === "edit") return;
    if (urlManual) return;

    const title = (nameEl().value || "").trim();
    let proposed = guessUrlFromName(title);

    if (!proposed) proposed = guessUrlFromName(tabHint);

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

    if (!title) {
      toast("Title is required.");
      nameEl().focus();
      return;
    }
    if (url && !isValidUrl(url)) {
      toast("Enter a valid URL (https://...).");
      urlEl().focus();
      return;
    }

    close({ action: "save", id: currentId, title, url, icon });
  };

  btnDelete().onclick = () => close({ action: "delete", id: currentId });

  // make visible + apply auto URL once
  open();
  applyAutoUrl();

  setTimeout(() => {
    nameEl().focus();
    nameEl().select();
  }, 0);

  return new Promise((resolve) => (resolver = resolve));
}
