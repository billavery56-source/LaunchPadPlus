// scripts/labelDialog.js
import { toast } from "./dialog.js";
import { getState } from "./state.js";

const root = () => document.getElementById("lp-label-root");
const backdrop = () => document.getElementById("lp-label-backdrop");
const titleEl = () => document.getElementById("lp-label-title");
const inputEl = () => document.getElementById("lp-label-input");

const catRow = () => document.getElementById("lp-label-category-row");
const catSel = () => document.getElementById("lp-label-category");

const btnX = () => document.getElementById("lp-label-x");
const btnCancel = () => document.getElementById("lp-label-cancel");
const btnSave = () => document.getElementById("lp-label-save");
const btnDelete = () => document.getElementById("lp-label-delete");

let resolver = null;
let inited = false;

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

export function initLabelDialog() {
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
}

export function openLabelDialog({ kind, currentName, currentCategoryId } = {}) {
  const titleMap = {
    category: "Edit Category",
    tab: "Edit Tab",
    subtab: "Edit Sub-Tab"
  };

  titleEl().textContent = titleMap[kind] || "Edit";
  inputEl().value = currentName || "";

  // Only show Category dropdown when editing a TAB
  if (kind === "tab") {
    const st = getState();
    const items = st.categories.map(c => ({ id: c.id, name: c.name }));
    fillSelect(catSel(), items, currentCategoryId || st.selectedCategoryId);
    catRow().classList.remove("lp-hidden");
  } else {
    catRow().classList.add("lp-hidden");
  }

  btnSave().onclick = () => {
    const v = (inputEl().value || "").trim();
    if (!v) {
      toast("Name is required.");
      inputEl().focus();
      return;
    }

    const payload = { action: "save", name: v };
    if (kind === "tab") payload.categoryId = catSel().value;

    close(payload);
  };

  btnDelete().onclick = () => close({ action: "delete" });

  open();
  setTimeout(() => {
    inputEl().focus();
    inputEl().select();
  }, 0);

  return new Promise((resolve) => (resolver = resolve));
}
