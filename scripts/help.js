// scripts/help.js
// Custom Help / FAQ accordion (no <details> quirks)
// Uses .lp-acc, .lp-acc-summary, .lp-acc-body and toggles .open class.

function el(id) { return document.getElementById(id); }

function openDialog() {
  const r = el("lp-help-root");
  if (!r) return;
  r.style.display = "flex";
  r.classList.remove("lp-hidden");
  r.setAttribute("aria-hidden", "false");
}

function closeDialog() {
  const r = el("lp-help-root");
  if (!r) return;
  r.style.display = "none";
  r.classList.add("lp-hidden");
  r.setAttribute("aria-hidden", "true");
}

function getAccordions() {
  return Array.from(document.querySelectorAll("#lp-help-body .lp-acc"));
}

function setOpen(acc, open) {
  if (!acc) return;
  acc.classList.toggle("open", !!open);

  const btn = acc.querySelector(".lp-acc-summary");
  const body = acc.querySelector(".lp-acc-body");

  if (btn) btn.setAttribute("aria-expanded", !!open ? "true" : "false");
  if (body) body.setAttribute("aria-hidden", !!open ? "false" : "true");
}

function toggleAcc(acc) {
  const open = acc.classList.contains("open");
  setOpen(acc, !open);
}

export function initHelp() {
  el("lp-help-x")?.addEventListener("click", closeDialog);
  el("lp-help-close")?.addEventListener("click", closeDialog);
  el("lp-help-backdrop")?.addEventListener("click", closeDialog);

  // ESC closes
  window.addEventListener("keydown", (e) => {
    const r = el("lp-help-root");
    if (!r || r.style.display === "none") return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeDialog();
    }
  }, true);

  // Accordion click (event delegation)
  document.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("#lp-help-body .lp-acc-summary");
    if (!btn) return;
    const acc = btn.closest(".lp-acc");
    if (!acc) return;
    toggleAcc(acc);
  }, true);

  el("lp-help-expand")?.addEventListener("click", () => {
    getAccordions().forEach(a => setOpen(a, true));
  });

  el("lp-help-collapse")?.addEventListener("click", () => {
    getAccordions().forEach(a => setOpen(a, false));
  });
}

export function openHelpDialog() {
  openDialog();

  // Open the first accordion only
  const accs = getAccordions();
  accs.forEach((a, i) => setOpen(a, i === 0));
}
