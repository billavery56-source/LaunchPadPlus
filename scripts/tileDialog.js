// scripts/tileDialog.js
import { toast } from "./dialog.js";

const root = () => document.getElementById("lp-tile-root");
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
const backdrop = () => document.getElementById("lp-tile-backdrop");

let resolver = null;
let currentId = null;

function open() {
  const r = root();
  r.style.display = "flex";
  r.classList.remove("lp-hidden");
  r.setAttribute("aria-hidden", "false");
}

function close(result) {
  const r = root();
  r.style.display = "none";
  r.classList.add("lp-hidden");
  r.setAttribute("aria-hidden", "true");

  if (resolver) {
    const fn = resolver;
    resolver = null;
    fn(result);
  }
}

function isValidUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:";
  } catch {
    return false;
  }
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function initTileDialog() {
  const closeHandler = () => close(null);
  backdrop()?.addEventListener("click", closeHandler);
  btnX()?.addEventListener("click", closeHandler);
  btnCancel()?.addEventListener("click", closeHandler);

  iconPickBtn()?.addEventListener("click", () => fileInput()?.click());

  fileInput()?.addEventListener("change", async () => {
    const f = fileInput().files?.[0];
    if (!f) return;
    try {
      const dataUrl = await readFileAsDataUrl(f);
      iconEl().value = dataUrl;
      setPreview(dataUrl);
      toast("Icon loaded.");
    } catch (e) {
      console.error(e);
      toast("Failed to load icon.");
    } finally {
      fileInput().value = "";
    }
  });

  iconClearBtn()?.addEventListener("click", () => {
    iconEl().value = "";
    // will fallback to favicon preview if URL exists
    const u = urlEl().value.trim();
    setPreview(u ? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(u)}&sz=128` : "");
  });

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
}

export function openTileDialog({ mode, tile, defaults } = {}) {
  currentId = tile?.id || null;

  titleEl().textContent = mode === "edit" ? "Edit Tile" : "Add Tile";

  nameEl().value = mode === "edit" ? (tile?.title || "") : (defaults?.title || "");
  urlEl().value  = mode === "edit" ? (tile?.url || "")   : (defaults?.url || "");
  iconEl().value = mode === "edit" ? (tile?.icon || "")  : (defaults?.icon || "");

  btnDelete().style.display = mode === "edit" ? "inline-flex" : "none";

  const previewCandidate = iconEl().value.trim()
    ? iconEl().value.trim()
    : (urlEl().value.trim()
        ? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(urlEl().value.trim())}&sz=128`
        : "");

  setPreview(previewCandidate);

  urlEl().oninput = () => {
    if (iconEl().value.trim()) return;
    const u = urlEl().value.trim();
    setPreview(u ? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(u)}&sz=128` : "");
  };

  btnSave().onclick = () => {
    const title = (nameEl().value || "").trim();
    const url = (urlEl().value || "").trim();
    const icon = (iconEl().value || "").trim();

    if (!title) { toast("Title is required."); nameEl().focus(); return; }
    if (url && !isValidUrl(url)) { toast("Enter a valid URL (https://...)."); urlEl().focus(); return; }

    close({ action: "save", id: currentId, title, url, icon });
  };

  btnDelete().onclick = () => close({ action: "delete", id: currentId });

  open();
  setTimeout(() => { nameEl().focus(); nameEl().select(); }, 0);

  return new Promise((resolve) => (resolver = resolve));
}
