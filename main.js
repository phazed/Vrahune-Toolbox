// main.js – single entry point for the toolbox

// Core app (generators, lexicons, toolbox UI)
// This is your big logic that used to live inside the <script> tag in the HTML.
import "./app.js";

// Tools – each file registers itself with window.registerTool(...)
import "./tool-text-cleaner.js";
import "./tool-dice-roller.js";
import "./tool-encounter.js";

// In the future, to add a new tool:
// 1) Create tool-my-new-tool.js
// 2) Add: import "./tool-my-new-tool.js";
