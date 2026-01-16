// scripts/storage.js
import { getState, setState, ensureDefaultState } from "./state.js";

const KEY = "lpplus_dev_clean_state_v2";

export async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get([KEY], (res) => {
      const saved = res?.[KEY];
      if (saved && typeof saved === "object") {
        setState(saved);
        resolve(saved);
      } else {
        resolve(ensureDefaultState());
      }
    });
  });
}

export async function saveState() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEY]: getState() }, () => resolve(true));
  });
}

export async function resetState() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([KEY], () => resolve(true));
  });
}
