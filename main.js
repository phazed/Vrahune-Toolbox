// main.js – ES module entry for tools
// Each tool file calls window.registerTool(...) when loaded.
// app.js is included as a classic script in index.html and defines registerTool.

const TOOL_MODULES = [
  "./tool-monster-vault.js",
  "./tool-text-cleaner.js",
  "./tool-dice-roller.js",
  "./tool-encounter.js",
  "./tool-statblock-importer.js",
  "./tool-map-measurer.js",
  "./tool-hex-stocker.js"
];

async function loadToolModule(path) {
  try {
    await import(path);
    console.log(`[Vrahune Toolbox] Loaded ${path}`);
  } catch (err) {
    console.error(`[Vrahune Toolbox] Failed to load ${path}`, err);
  }
}

async function loadTools() {
  if (typeof window.registerTool !== "function") {
    console.error(
      "[Vrahune Toolbox] window.registerTool is missing. app.js may not have loaded before main.js."
    );
  }

  for (const path of TOOL_MODULES) {
    await loadToolModule(path);
  }

  // Optional cloud save module. If it breaks or is missing, normal tools still load.
  try {
    await import("./cloud-ui.js");
    console.log("[Vrahune Toolbox] Cloud UI loaded");
  } catch (err) {
    console.warn("[Vrahune Toolbox] Cloud UI disabled or failed to load:", err);
  }
}

loadTools();
