// scripts/boot.js
(() => {
  "use strict";

  document.documentElement.style.background = "#000";

  function run() {
    document.body.style.margin = "0";
    document.body.style.background = "#000";
    document.body.style.color = "#fff";
    document.body.style.fontFamily = "system-ui, Segoe UI, Arial, sans-serif";

    const badge = document.createElement("div");
    badge.textContent = "DEV CLEAN ✅ booting…";
    badge.style.cssText = `
      position: fixed; left: 12px; top: 12px; z-index: 2147483647;
      padding: 10px 12px; border-radius: 999px;
      background: #111; border: 1px solid #333; color: #fff;
      font: 12px/1.2 ui-monospace, Menlo, Consolas, monospace;
      box-shadow: 0 12px 30px rgba(0,0,0,.6);
      pointer-events: none;
    `;
    document.documentElement.appendChild(badge);

    if (!chrome?.runtime?.getURL) {
      badge.textContent = "DEV CLEAN ❌ chrome.runtime.getURL missing";
      return;
    }

    const cssFiles = ["styles/base.css", "styles/ui.css", "styles/dialog.css"];
    const head = document.head || document.documentElement;

    let ok = 0, fail = 0;
    const update = () => (badge.textContent = `DEV CLEAN ✅ CSS ${ok}/${cssFiles.length} ok, ${fail} fail`);

    cssFiles.forEach((f) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL(f);
      link.onload = () => { ok++; update(); };
      link.onerror = () => { fail++; update(); console.error("CSS failed:", f, link.href); };
      head.appendChild(link);
    });

    const main = document.createElement("script");
    main.type = "module";
    main.src = chrome.runtime.getURL("scripts/main.js");
    main.onload = () => setTimeout(() => badge.remove(), 1200);
    main.onerror = () => {
      badge.textContent = "DEV CLEAN ❌ scripts/main.js failed";
      console.error("main.js failed:", main.src);
    };
    head.appendChild(main);

    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
