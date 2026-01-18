// scripts/theme.js
// Single-base theme: user picks ONE page background color.
// Every other UI surface is derived from that base with consistent offsets.
// Stores in chrome.storage.local under "themeSettings".

const KEY = "themeSettings";

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function hexToRgb(hex) {
  const h = (hex || "").trim().replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b };
  }
  return { r: 0, g: 0, b: 0 };
}

function rgbToHex({ r, g, b }) {
  const to = (x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function srgbToLinear(c) {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function relLuminance(rgb) {
  const R = srgbToLinear(rgb.r);
  const G = srgbToLinear(rgb.g);
  const B = srgbToLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - C / 2;

  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = C; g = X; b = 0; }
  else if (60 <= h && h < 120) { r = X; g = C; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = C; b = X; }
  else if (180 <= h && h < 240) { r = 0; g = X; b = C; }
  else if (240 <= h && h < 300) { r = X; g = 0; b = C; }
  else { r = C; g = 0; b = X; }

  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function pickTextColor(bgRgb) {
  const lum = relLuminance(bgRgb);
  // slightly softer than pure white/black
  return lum > 0.50 ? "#101010" : "#f2f2f2";
}

function deriveAccentFromBase(bgRgb) {
  // Accent derived from base hue, with rotation + pop
  const hsl = rgbToHsl(bgRgb);
  const h = (hsl.h + 28) % 360;
  const s = clamp(hsl.s * 1.15 + 0.15, 0.25, 0.90);

  // Choose accent lightness to stand out vs base
  const baseLum = relLuminance(bgRgb);
  const l = baseLum > 0.50 ? 0.38 : 0.62;

  return rgbToHex(hslToRgb({ h, s, l }));
}

function shadeFromBase(baseRgb, deltaL) {
  // deltaL is +/- in HSL lightness
  const baseHsl = rgbToHsl(baseRgb);
  const next = { ...baseHsl, l: clamp(baseHsl.l + deltaL, 0, 1) };

  // keep saturation from getting too crazy on extreme colors
  next.s = clamp(next.s * 0.95, 0.04, 0.95);

  return rgbToHex(hslToRgb(next));
}

function makePaletteFromBase(baseHex) {
  const bgRgb = hexToRgb(baseHex);
  const lum = relLuminance(bgRgb);
  const textHex = pickTextColor(bgRgb);
  const muted = (textHex === "#101010") ? "rgba(16,16,16,.70)" : "rgba(242,242,242,.75)";
  const accentHex = deriveAccentFromBase(bgRgb);

  // One consistent rule:
  // - If background is light -> surfaces are darker
  // - If background is dark  -> surfaces are lighter
  const dir = lum > 0.50 ? -1 : 1;

  // These are the ONLY deltas. Every surface is derived from the same base.
  const panel   = shadeFromBase(bgRgb, dir * 0.055);
  const panel2  = shadeFromBase(bgRgb, dir * 0.090);
  const chip    = shadeFromBase(bgRgb, dir * 0.075);
  const chipHov = shadeFromBase(bgRgb, dir * 0.110);

  const border  = shadeFromBase(bgRgb, dir * 0.140);
  const border2 = shadeFromBase(bgRgb, dir * 0.185);

  return {
    "--bg": baseHex,
    "--panel": panel,
    "--panel2": panel2,
    "--chip": chip,
    "--chipHover": chipHov,
    "--border": border,
    "--border2": border2,
    "--text": textHex,
    "--muted": muted,
    "--accent": accentHex
  };
}

const PRESETS = {
  dark:   { base: "#000000" },
  medium: { base: "#2d2d2d" },
  light:  { base: "#ffffff" }
};

function applyVars(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

async function readSettings() {
  const data = await chrome.storage.local.get(KEY);
  return data[KEY] || { mode: "preset", preset: "dark", customBase: "#1a1a1a" };
}

async function writeSettings(next) {
  await chrome.storage.local.set({ [KEY]: next });
}

function $(id) { return document.getElementById(id); }

function openDialog() {
  const r = $("lp-theme-root");
  r.style.display = "flex";
  r.classList.remove("lp-hidden");
  r.setAttribute("aria-hidden", "false");
}

function closeDialog() {
  const r = $("lp-theme-root");
  r.style.display = "none";
  r.classList.add("lp-hidden");
  r.setAttribute("aria-hidden", "true");
}

function setRadio(name, value) {
  const inputs = document.querySelectorAll(`input[name="${name}"]`);
  inputs.forEach(i => { i.checked = (i.value === value); });
}

function getRadio(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function updateDialogUi(settings) {
  const mode = settings.mode || "preset";
  const preset = settings.preset || "dark";
  const customBase = settings.customBase || "#1a1a1a";

  setRadio("lp-theme-mode", mode);
  setRadio("lp-theme-preset", preset);
  $("lp-theme-color").value = customBase;

  $("lp-theme-preset-wrap").style.display = (mode === "preset") ? "grid" : "none";
  $("lp-theme-custom-wrap").style.display = (mode === "custom") ? "grid" : "none";
}

function getCurrentBase(settings) {
  if (settings.mode === "custom") return settings.customBase;
  const p = PRESETS[settings.preset] || PRESETS.dark;
  return p.base;
}

export async function applySavedTheme() {
  const settings = await readSettings();
  const base = getCurrentBase(settings);
  applyVars(makePaletteFromBase(base));
  return settings;
}

export async function initTheme() {
  $("lp-theme-x")?.addEventListener("click", closeDialog);
  $("lp-theme-close")?.addEventListener("click", closeDialog);
  $("lp-theme-backdrop")?.addEventListener("click", closeDialog);

  document.addEventListener("change", async (e) => {
    const t = e.target;

    if (t?.name === "lp-theme-mode") {
      const settings = await readSettings();
      settings.mode = getRadio("lp-theme-mode") || settings.mode;
      await writeSettings(settings);
      updateDialogUi(settings);

      applyVars(makePaletteFromBase(getCurrentBase(settings)));
    }

    if (t?.name === "lp-theme-preset") {
      const settings = await readSettings();
      settings.preset = getRadio("lp-theme-preset") || settings.preset;
      await writeSettings(settings);

      applyVars(makePaletteFromBase(getCurrentBase(settings)));
    }
  });

  $("lp-theme-color")?.addEventListener("input", async () => {
    const settings = await readSettings();
    settings.customBase = $("lp-theme-color").value || settings.customBase;
    settings.mode = "custom";
    await writeSettings(settings);
    updateDialogUi(settings);

    applyVars(makePaletteFromBase(settings.customBase));
  });

  $("lp-theme-save")?.addEventListener("click", () => closeDialog());

  await applySavedTheme();
}

export async function openThemeDialog() {
  const settings = await readSettings();
  updateDialogUi(settings);
  openDialog();
}
