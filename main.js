// main.js – ES module entry for tools

// Each tool file calls window.registerTool(...) when loaded.
// app.js is included as a classic script in index.html and defines registerTool.
import "./cloud-ui.js";
import "./tool-monster-vault.js";
import "./tool-text-cleaner.js";
import "./tool-dice-roller.js";
import "./tool-encounter.js";
import "./tool-statblock-importer.js";
import "./tool-map-measurer.js";


// In the future:
// 1) Create "tool-my-new-thing.js"
// 2) Add: import "./tool-my-new-thing.js";
