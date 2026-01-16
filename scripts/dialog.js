// scripts/dialog.js
// Centered name-prompt modal + toast (JS ONLY — no CSS in this file)

const root = () => document.getElementById("lp-modal-root");
const backdrop = () => document.getElementById("lp-modal-backdrop");

const titleEl = () => document.getElementById("lp-modal-title");
const labelEl = () => document.getElementById("lp-modal-label");
const inputEl = () => document.getElementById("lp-modal-input");
const hintEl = () => document.getElementById("lp-modal-hint");

const btnX = () => document.getElementById("lp-modal-x");
const btnCancel = () => document.getElementById("lp-modal-cancel");
const btnSave = () => document.getElementById("lp-modal-save");

const toastEl = () => document.getElementById("lp-toast");

let resolver = null;
let inited = false;

export function initDialog() {
  if (inited) return;
  inited = true;

  const closeHandler = () => close(null);

  backdrop()?.addEventListener("click", closeHandler);
  btnX()?.addEventListener("click", closeHandler);
  btnCancel()?.addEventListener("click", closeHandler);

  // Keyboard for the name dialog
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
        e.preventDefault();
        btnSave()?.click();
      }
    },
    true
  );
}

export function toast(msg, ms = 2200) {
  const el = toastEl();
  if (!el) return;

  el.textContent = msg;
  el.classList.add("show");

  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), ms);
}

function open() {
  const r = root();
  if (!r) return;

  // make visible even if inline style="display:none"
  r.style.display = "flex";
  r.classList.remove("lp-hidden");
  r.setAttribute("aria-hidden", "false");
}

function close(val) {
  const r = root();
  if (!r) return;

  r.style.display = "none";
  r.classList.add("lp-hidden");
  r.setAttribute("aria-hidden", "true");

  const hint = hintEl();
  if (hint) hint.textContent = "";

  if (resolver) {
    const fn = resolver;
    resolver = null;
    fn(val);
  }
}

export function promptName({ title, label, placeholder, hint, initialValue } = {}) {
  initDialog();

  const t = titleEl();
  if (t) t.textContent = title || "Add";

  const l = labelEl();
  if (l) l.textContent = label || "Name";

  const input = inputEl();
  if (input) {
    input.value = (initialValue ?? "").toString();
    input.placeholder = placeholder || "";
  }

  const h = hintEl();
  if (h) h.textContent = hint || "";

  const save = btnSave();
  if (save) {
    save.onclick = () => {
      const value = (input?.value || "").trim();
      if (!value) {
        toast("Please enter a name.");
        input?.focus();
        return;
      }
      close(value);
    };
  }

  open();

  setTimeout(() => {
    input?.focus();
    input?.select();
  }, 0);

  return new Promise((resolve) => {
    resolver = resolve;
  });
}
