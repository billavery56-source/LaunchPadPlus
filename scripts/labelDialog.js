// scripts/labelDialog.js
import { toast } from "./dialog.js";

const root = () => document.getElementById("lp-label-root");
const backdrop = () => document.getElementById("lp-label-backdrop");
const titleEl = () => document.getElementById("lp-label-title");
const inputEl = () => document.getElementById("lp-label-input");
const btnX = () => document.getElementById("lp-label-x");
const btnCancel = () => document.getElementById("lp-label-cancel");
const btnSave = () => document.getElementById("lp-label-save");
const btnDelete = () => document.getElementById("lp-label-delete");

let resolver = null;

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

export function initLabelDialog() {
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
}

export function openLabelDialog({ kind, currentName } = {}) {
  const titleMap = {
    category: "Edit Category",
    tab: "Edit Tab",
    subtab: "Edit Sub-Tab"
  };

  titleEl().textContent = titleMap[kind] || "Edit";
  inputEl().value = currentName || "";

  btnSave().onclick = () => {
    const v = (inputEl().value || "").trim();
    if (!v) {
      toast("Name is required.");
      inputEl().focus();
      return;
    }
    close({ action: "save", name: v });
  };

  btnDelete().onclick = () => {
    close({ action: "delete" });
  };

  open();
  setTimeout(() => {
    inputEl().focus();
    inputEl().select();
  }, 0);

  return new Promise((resolve) => (resolver = resolve));
}
