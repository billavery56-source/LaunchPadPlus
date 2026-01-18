// scripts/dnd.js
// Click + HOLD to arm dragging, then move and release to drop.
// Tiles reorder is allowed in ALL views.

import {
  moveCategoryRelative,
  moveTabRelative,
  moveSubTabRelative,
  moveTileRelative
} from "./state.js";

const HOLD_MS = 220;
const MOVE_PX = 4;
const CLICK_SUPPRESS_MS = 220;

let refreshFn = null;

let pressEl = null;
let pressType = null;
let pressId = null;
let pressContainer = null;
let pressX = 0;
let pressY = 0;

let holdTimer = null;
let armed = false;

let dragging = false;
let pointerId = null;

let lastTarget = null;
let lastSide = null;

let suppressClicksUntil = 0;

function clearHoldTimer() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
}

function cleanupIndicators() {
  if (lastTarget) lastTarget.classList.remove("lp-drop-left", "lp-drop-right");
  lastTarget = null;
  lastSide = null;
}

function stopAll() {
  clearHoldTimer();
  cleanupIndicators();

  if (pressEl) pressEl.classList.remove("lp-dragging");
  document.body.classList.remove("lp-no-select", "lp-dnd-active");

  pressEl = null;
  pressType = null;
  pressId = null;
  pressContainer = null;
  pressX = 0;
  pressY = 0;

  armed = false;
  dragging = false;
  pointerId = null;
}

function getElementTarget(raw) {
  if (!raw) return null;
  if (raw.nodeType === 1) return raw;
  if (raw.nodeType === 3) return raw.parentElement;
  return raw.parentElement || null;
}

function getDndElFromTarget(target) {
  const el = getElementTarget(target);
  return el?.closest?.("[data-lp-dnd-type][data-lp-dnd-id]") || null;
}

function containerForType(type, element) {
  if (type === "tile") return element.closest(".lp-tile-grid");
  return element.closest(".lp-row-mid");
}

function sameContainer(a, b) {
  return a && b && a === b;
}

function isLocked(dndEl) {
  return dndEl?.dataset?.lpDndLocked === "1";
}

function isAddThing(dndEl) {
  if (!dndEl) return true;
  if (dndEl.id && dndEl.id.startsWith("lp-add-")) return true;
  if (dndEl.classList.contains("lp-plus-tile")) return true;
  if (dndEl.classList.contains("add")) return true;
  return false;
}

function canDrag(dndEl) {
  if (!dndEl) return false;
  if (isAddThing(dndEl)) return false;
  if (isLocked(dndEl)) return false;
  return true;
}

function sideFromPointer(e, targetEl) {
  const r = targetEl.getBoundingClientRect();
  const mid = r.left + r.width / 2;
  return e.clientX < mid ? "left" : "right";
}

function updateDropTarget(e) {
  const under = document.elementFromPoint(e.clientX, e.clientY);
  const target = getDndElFromTarget(under);

  if (!target || target === pressEl) {
    cleanupIndicators();
    return;
  }

  if (target.dataset.lpDndType !== pressType) {
    cleanupIndicators();
    return;
  }

  const targetContainer = containerForType(pressType, target);
  if (!sameContainer(pressContainer, targetContainer)) {
    cleanupIndicators();
    return;
  }

  const side = sideFromPointer(e, target);
  if (lastTarget !== target || lastSide !== side) {
    cleanupIndicators();
    target.classList.add(side === "left" ? "lp-drop-left" : "lp-drop-right");
    lastTarget = target;
    lastSide = side;
  }
}

function beginDrag(e) {
  if (dragging) return;
  dragging = true;

  document.body.classList.add("lp-no-select", "lp-dnd-active");
  pressEl.classList.add("lp-dragging");

  try {
    pointerId = e.pointerId;
    pressEl.setPointerCapture(pointerId);
  } catch {
    // ignore
  }
}

async function commitDrop() {
  if (!dragging) return false;
  if (!lastTarget || !lastSide) return false;

  const targetId = lastTarget.dataset.lpDndId;
  const side = lastSide;

  let moved = false;
  if (pressType === "category") moved = moveCategoryRelative(pressId, targetId, side);
  if (pressType === "tab") moved = moveTabRelative(pressId, targetId, side);
  if (pressType === "subtab") moved = moveSubTabRelative(pressId, targetId, side);
  if (pressType === "tile") moved = moveTileRelative(pressId, targetId, side);

  if (moved && typeof refreshFn === "function") await refreshFn();
  return moved;
}

function onPointerDown(e) {
  if (e.button !== 0) return;

  // don’t drag when modals are open
  if (document.getElementById("lp-modal-root")?.style?.display === "flex") return;
  if (document.getElementById("lp-tile-root")?.style?.display === "flex") return;
  if (document.getElementById("lp-label-root")?.style?.display === "flex") return;

  const dndEl = getDndElFromTarget(e.target);
  if (!canDrag(dndEl)) return;

  stopAll();

  pressEl = dndEl;
  pressType = dndEl.dataset.lpDndType;
  pressId = dndEl.dataset.lpDndId;
  pressContainer = containerForType(pressType, dndEl);

  pressX = e.clientX;
  pressY = e.clientY;

  armed = false;
  dragging = false;

  clearHoldTimer();
  holdTimer = setTimeout(() => {
    armed = true;
  }, HOLD_MS);
}

function onPointerMove(e) {
  if (!pressEl) return;
  if (!armed) return;

  const dx = Math.abs(e.clientX - pressX);
  const dy = Math.abs(e.clientY - pressY);

  if (!dragging && (dx > MOVE_PX || dy > MOVE_PX)) beginDrag(e);
  if (!dragging) return;

  updateDropTarget(e);
}

async function onPointerUp() {
  if (!pressEl) return stopAll();
  if (!dragging) return stopAll();

  try {
    const moved = await commitDrop();
    if (moved) suppressClicksUntil = Date.now() + CLICK_SUPPRESS_MS;
  } finally {
    stopAll();
  }
}

function onClickCapture(e) {
  if (Date.now() < suppressClicksUntil) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
  }
}

export function initDnd({ refresh } = {}) {
  if (refresh) refreshFn = refresh;

  // ✅ Safety net: prevent the browser from starting native drag operations (images, etc.)
  document.addEventListener("dragstart", (e) => {
    e.preventDefault();
  }, true);

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", () => stopAll(), true);

  document.addEventListener("click", onClickCapture, true);
}
