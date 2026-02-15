// tool-encounter.js
// Encounter / Initiative tool with card-style UI, integrated into the existing toolbox.
// Drop this file alongside app.js and index.html, loaded with:
//   <script src="app.js"></script>
//   <script src="tool-encounter.js"></script>

(function () {
  "use strict";

  const STORAGE_KEY = "vrahuneEncounterV2";
  const STORAGE_PARTY_KEY = "vrahuneEncounterPartyV2";

  // Ensure the core toolbox exists
  if (
    typeof window === "undefined" ||
    !window.toolsConfig ||
    typeof window.renderToolPanel !== "function"
  ) {
    console.warn(
      "[EncounterTool] toolsConfig or renderToolPanel not found; encounter tool not initialized."
    );
    return;
  }

  // Register the tool in the left sidebar
  window.toolsConfig.push({
    id: "encounterInitiative",
    name: "Encounter / Initiative",
    description: "Track initiative order, HP, rounds, and your saved party.",
  });

  const originalRenderToolPanel = window.renderToolPanel;

  // ----------------------------
  //  CSS injection (scoped)
  // ----------------------------
  function injectEncounterStyles() {
    if (document.getElementById("encounter-tool-styles")) return;

    const style = document.createElement("style");
    style.id = "encounter-tool-styles";
    style.textContent = `
      /* ===== Encounter / Initiative Tool Scoped Styles ===== */

      .enc-root {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .enc-topbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: flex-end;
      }

      .enc-topbar-section {
        flex: 1 1 220px;
        min-width: 0;
      }

      .enc-topbar-section label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted, #9ba3b4);
        display: block;
        margin-bottom: 2px;
      }

      .enc-round-display {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .enc-round-number {
        font-size: 1.3rem;
        font-weight: 600;
        padding: 2px 10px;
        border-radius: 999px;
        background: radial-gradient(circle at top, #1c2430, #090c13);
        border: 1px solid #2e3847;
        box-shadow: 0 0 10px rgba(0,0,0,0.4);
      }

      .enc-topbar-tools {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .enc-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.4fr);
        gap: 8px;
        align-items: flex-start;
      }

      @media (max-width: 900px) {
        .enc-layout {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      .enc-box {
        border-radius: 10px;
        border: 1px solid #222832;
        padding: 6px 8px 8px;
        background: radial-gradient(circle at top, #10131b, #05070c);
        box-shadow: 0 0 18px rgba(0,0,0,0.5);
      }

      .enc-box + .enc-box {
        margin-top: 6px;
      }

      .enc-box-title {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--accent-soft, #8fb3ff);
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .enc-box-title span.subtle {
        font-size: 0.75rem;
        text-transform: none;
        letter-spacing: normal;
        color: var(--text-muted, #9ba3b4);
      }

      .enc-turn-hint {
        font-size: 0.75rem;
        color: var(--text-muted, #9ba3b4);
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
        gap: 4px;
      }

      .enc-turn-hint strong {
        color: var(--text-main, #e8ecf5);
      }

      .enc-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: 320px;
        overflow-y: auto;
        padding-right: 2px;
      }

      .enc-empty {
        font-size: 0.8rem;
        color: var(--text-muted, #8a93a3);
        padding: 6px;
        border-radius: 8px;
        border: 1px dashed #2a3341;
        text-align: center;
      }

      /* ===== Card layout ===== */
      .enc-card {
        display: flex;
        align-items: stretch;
        gap: 8px;
        border-radius: 12px;
        border: 1px solid #293344;
        background: radial-gradient(circle at top left, #151b26, #05070c);
        padding: 6px 8px;
        box-shadow: 0 0 12px rgba(0,0,0,0.45);
        font-size: 0.78rem;
        position: relative;
      }

      .enc-card--pc {
        border-color: #3464d0;
      }

      .enc-card--enemy {
        border-color: #c13b3b;
        background: radial-gradient(circle at top left, #241117, #050406);
      }

      .enc-card--other {
        border-style: dashed;
      }

      .enc-card--active {
        box-shadow: 0 0 0 1px #d5d5d5, 0 0 16px rgba(255,255,255,0.15);
      }

      .enc-card--dead {
        opacity: 0.6;
        filter: grayscale(0.25);
      }

      .enc-card-avatar {
        width: 40px;
        height: 40px;
        border-radius: 999px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.85rem;
        color: #e8ecf5;
        background: radial-gradient(circle at top, #293448, #090d15);
        border: 1px solid #3a4662;
        text-transform: uppercase;
      }

      .enc-card--enemy .enc-card-avatar {
        background: radial-gradient(circle at top, #4b2222, #140607);
        border-color: #7f3a3a;
      }

      .enc-card-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .enc-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
      }

      .enc-card-name {
        font-size: 0.9rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .enc-card-tag {
        padding: 1px 7px;
        border-radius: 999px;
        border: 1px solid #3a414f;
        font-size: 0.7rem;
        color: var(--text-muted, #a0a8b8);
        white-space: nowrap;
      }

      .enc-card-middle {
        display: flex;
        gap: 6px;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
      }

      .enc-hp-section {
        display: flex;
        align-items: center;
        gap: 6px;
        font-variant-numeric: tabular-nums;
      }

      .enc-hp-label {
        font-size: 0.75rem;
        color: var(--text-muted, #9ba3b4);
      }

      .enc-hp-current {
        font-size: 1.0rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 6px;
        border: 1px solid #2c3340;
        background: #05070c;
        min-width: 46px;
        text-align: center;
      }

      .enc-hp-slash {
        opacity: 0.5;
      }

      .enc-hp-max {
        font-size: 0.9rem;
        font-weight: 500;
      }

      .enc-hp-current::-webkit-outer-spin-button,
      .enc-hp-current::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .enc-hp-current[type=number] {
        -moz-appearance: textfield;
      }

      .enc-delta-section {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
      }

      .enc-delta-input {
        width: 48px;
        padding: 2px 4px;
        border-radius: 6px;
        border: 1px solid #2c3340;
        background: #05070c;
        color: var(--text-main, #e8ecf5);
        font-size: 0.78rem;
        text-align: center;
      }

      .enc-delta-input::-webkit-outer-spin-button,
      .enc-delta-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .enc-delta-input[type=number] {
        -moz-appearance: textfield;
      }

      .enc-card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        font-size: 0.72rem;
        color: var(--text-muted, #9ba3b4);
      }

      .enc-meta-group {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .enc-meta-pill {
        padding: 1px 7px;
        border-radius: 999px;
        border: 1px solid #353f4e;
        background: #05070c;
      }

      .enc-meta-pill strong {
        font-weight: 600;
      }

      .enc-controls-group {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        justify-content: flex-end;
      }

      .enc-kill-btn {
        border-color: #7c3131;
      }

      .enc-kill-btn.dangerous {
        background: linear-gradient(135deg, #c23c3c, #7c2424);
        border-color: #c23c3c;
        color: #fff;
      }

      .enc-remove-icon-btn {
        border: none;
        background: transparent;
        color: var(--text-muted, #9ba3b4);
        cursor: pointer;
        padding: 0 4px;
        font-size: 0.9rem;
      }

      .enc-remove-icon-btn:hover {
        color: #ff6b6b;
      }

      /* Party chips */
      .enc-party-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 4px;
        margin-bottom: 4px;
        flex-wrap: wrap;
      }

      .enc-party-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .enc-party-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid #313846;
        font-size: 0.78rem;
        background: #05070c;
        cursor: pointer;
      }

      .enc-party-chip span.avatar {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: radial-gradient(circle at top, #2b3544, #0b0f17);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.68rem;
        font-weight: 600;
      }

      .enc-party-empty {
        font-size: 0.78rem;
        color: var(--text-muted, #949fb3);
      }

      .enc-small-tip {
        font-size: 0.72rem;
        color: var(--text-muted, #8e96a9);
        margin-top: 4px;
      }

      .enc-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px 8px;
      }

      .enc-form-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .enc-form-row label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted, #9ba3b4);
      }

      .enc-form-row input,
      .enc-form-row select,
      .enc-form-row textarea {
        border-radius: 6px;
        border: 1px solid #2a3341;
        background: #05070c;
        color: var(--text-main, #e8ecf5);
        padding: 4px 6px;
        font-size: 0.78rem;
      }

      .enc-form-row textarea {
        resize: vertical;
        min-height: 40px;
      }

      .enc-form-actions {
        margin-top: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .enc-form-actions-left,
      .enc-form-actions-right {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .enc-badge-soft {
        font-size: 0.7rem;
        padding: 1px 7px;
        border-radius: 999px;
        border: 1px solid #3f4a5d;
        color: var(--text-muted, #9ba3b4);
      }
    `;
    document.head.appendChild(style);
  }

  // ----------------------------
  //  State helpers
  // ----------------------------
  function loadEncounterState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          round: 1,
          activeId: null,
          nextId: 1,
          combatants: [],
        };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") throw new Error("bad");
      // backward safety
      parsed.round = Number(parsed.round) || 1;
      parsed.nextId = Number(parsed.nextId) || 1;
      parsed.activeId = parsed.activeId || null;
      parsed.combatants = Array.isArray(parsed.combatants)
        ? parsed.combatants
        : [];
      return parsed;
    } catch (e) {
      console.warn("[EncounterTool] Failed to load encounter state:", e);
      return {
        round: 1,
        activeId: null,
        nextId: 1,
        combatants: [],
      };
    }
  }

  function saveEncounterState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("[EncounterTool] Failed to save encounter state:", e);
    }
  }

  function loadPartyState() {
    try {
      const raw = localStorage.getItem(STORAGE_PARTY_KEY);
      if (!raw) return { members: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.members)) throw new Error("bad");
      return parsed;
    } catch (e) {
      console.warn("[EncounterTool] Failed to load party:", e);
      return { members: [] };
    }
  }

  function savePartyState(partyState) {
    try {
      localStorage.setItem(STORAGE_PARTY_KEY, JSON.stringify(partyState));
    } catch (e) {
      console.warn("[EncounterTool] Failed to save party:", e);
    }
  }

  // Shared in the closure
  let encounterState = loadEncounterState();
  let partyState = loadPartyState();
  let currentEditingId = null; // null means "create new" in the form

  // ----------------------------
  //  Utilities
  // ----------------------------
  function createId() {
    const id = encounterState.nextId || 1;
    encounterState.nextId = id + 1;
    return id;
  }

  function sideLabel(side) {
    if (side === "pc") return "PC";
    if (side === "enemy") return "Enemy";
    return "Other";
  }

  function initialsFromName(name) {
    if (!name) return "?";
    const trimmed = name.trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (
      (parts[0][0] || "") + (parts[1][0] || "")
    ).toUpperCase();
  }

  function sortCombatants(list) {
    // Desc initiative, PC before others, then name
    const copy = [...list];
    copy.sort((a, b) => {
      const aInit = Number(a.init) || 0;
      const bInit = Number(b.init) || 0;
      if (bInit !== aInit) return bInit - aInit;

      const orderSide = (s) => (s === "pc" ? 0 : s === "enemy" ? 1 : 2);
      const diffSide = orderSide(a.side) - orderSide(b.side);
      if (diffSide !== 0) return diffSide;

      const an = (a.name || "").toLowerCase();
      const bn = (b.name || "").toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return copy;
  }

  function getAliveSorted() {
    const list = sortCombatants(encounterState.combatants);
    return list.filter((c) => !c.dead);
  }

  function clampHP(c) {
    if (typeof c.hpCurrent === "number" && typeof c.hpMax === "number") {
      if (c.hpCurrent > c.hpMax) c.hpCurrent = c.hpMax;
      if (c.hpCurrent < 0) c.hpCurrent = 0;
    } else if (typeof c.hpCurrent === "number" && c.hpCurrent < 0) {
      c.hpCurrent = 0;
    }
  }

  function ensureActiveId() {
    const alive = getAliveSorted();
    if (alive.length === 0) {
      encounterState.activeId = null;
      return;
    }
    if (!encounterState.activeId) {
      encounterState.activeId = alive[0].id;
      return;
    }
    const found = alive.some((c) => c.id === encounterState.activeId);
    if (!found) {
      encounterState.activeId = alive[0].id;
    }
  }

  function findCombatantById(id) {
    return encounterState.combatants.find((c) => c.id === id) || null;
  }

  function nextTurn() {
    const aliveSorted = getAliveSorted();
    if (aliveSorted.length === 0) {
      encounterState.activeId = null;
      return;
    }
    if (!encounterState.activeId) {
      encounterState.activeId = aliveSorted[0].id;
      return;
    }
    const idx = aliveSorted.findIndex((c) => c.id === encounterState.activeId);
    if (idx === -1 || idx === aliveSorted.length - 1) {
      // wrap and increment round
      encounterState.round = (Number(encounterState.round) || 1) + 1;
      encounterState.activeId = aliveSorted[0].id;
    } else {
      encounterState.activeId = aliveSorted[idx + 1].id;
    }
  }

  function nextRound() {
    encounterState.round = (Number(encounterState.round) || 1) + 1;
    ensureActiveId();
  }

  function resetEncounterKeepList() {
    encounterState.round = 1;
    // Reset HP to max, clear dead flags but keep list & initiative
    encounterState.combatants.forEach((c) => {
      if (typeof c.hpMax === "number" && !isNaN(c.hpMax)) {
        c.hpCurrent = c.hpMax;
      }
      c.dead = false;
      clampHP(c);
    });
    ensureActiveId();
  }

  // ----------------------------
  //  Party helpers
  // ----------------------------
  function saveCurrentPCsAsParty() {
    const pcs = encounterState.combatants.filter((c) => c.side === "pc");
    if (pcs.length === 0) {
      return false;
    }
    partyState.members = pcs.map((c) => ({
      name: c.name || "",
      side: "pc",
      hpMax: typeof c.hpMax === "number" ? c.hpMax : null,
      ac: c.ac || "",
      speed: c.speed || "",
      notes: c.notes || "",
    }));
    savePartyState(partyState);
    return true;
  }

  function addPartyToEncounter() {
    if (!partyState.members || partyState.members.length === 0) return 0;
    const added = [];
    for (const m of partyState.members) {
      const hpMax = typeof m.hpMax === "number" ? m.hpMax : null;
      const hpCurrent = hpMax != null ? hpMax : null;
      const combatant = {
        id: createId(),
        name: m.name || "Party member",
        side: m.side || "pc",
        hpMax,
        hpCurrent,
        ac: m.ac || "",
        speed: m.speed || "",
        init: 0,
        notes: m.notes || "",
        dead: false,
      };
      clampHP(combatant);
      encounterState.combatants.push(combatant);
      added.push(combatant);
    }
    ensureActiveId();
    return added.length;
  }

  // ----------------------------
  //  Render helpers
  // ----------------------------
  function renderEncounterTool() {
    injectEncounterStyles();

    const labelEl = document.getElementById("activeGeneratorLabel");
    const panel = document.getElementById("generatorPanel");

    if (!panel) return;

    if (labelEl) {
      labelEl.textContent = "Encounter / Initiative";
    }

    panel.innerHTML = `
      <div class="enc-root">
        <div class="muted" style="margin-bottom: 4px;">
          Track initiative order, hit points, rounds, and your usual party.
        </div>

        <div class="enc-topbar">
          <div class="enc-topbar-section">
            <label>Round & turn</label>
            <div class="enc-round-display">
              <div class="enc-round-number" id="encRoundBadge">1</div>
              <button type="button" class="btn-primary btn-small" id="encNextTurnBtn">Next turn</button>
              <button type="button" class="btn-secondary btn-small" id="encNextRoundBtn">Next round</button>
              <button type="button" class="btn-secondary btn-small" id="encResetBtn">Reset</button>
            </div>
          </div>
          <div class="enc-topbar-section">
            <label>Encounter tools</label>
            <div class="enc-topbar-tools">
              <button type="button" class="btn-secondary btn-small" id="encQuickAddPcBtn">Quick add PC</button>
              <button type="button" class="btn-secondary btn-small" id="encQuickAddEnemyBtn">Quick add enemy</button>
              <button type="button" class="btn-secondary btn-small danger" id="encClearEncounterBtn">Clear encounter</button>
            </div>
          </div>
        </div>

        <div class="enc-layout">
          <!-- Left: Turn order -->
          <div>
            <div class="enc-box">
              <div class="enc-box-title">
                <span>Turn order & rounds</span>
                <span class="subtle" id="encSummaryLabel"></span>
              </div>
              <div class="enc-turn-hint">
                <span id="encTurnHintMain"></span>
                <span id="encTurnHintSide"></span>
              </div>
              <div id="encList" class="enc-list"></div>
            </div>
          </div>

          <!-- Right: Form + Party -->
          <div>
            <div class="enc-box">
              <div class="enc-box-title">
                <span>Add / edit combatant</span>
                <span class="subtle" id="encEditingLabel"></span>
              </div>
              <div id="encFormContainer"></div>
            </div>

            <div class="enc-box">
              <div class="enc-box-title">
                <span>Saved party</span>
                <span class="subtle" id="encPartySummary"></span>
              </div>
              <div class="enc-party-row">
                <div class="enc-party-chips" id="encPartyChips"></div>
                <div class="enc-form-actions-right">
                  <button type="button" class="btn-secondary btn-small" id="encUsePartyBtn">Add party</button>
                  <button type="button" class="btn-secondary btn-small" id="encSavePartyBtn">Save PCs</button>
                </div>
              </div>
              <div id="encPartyEmpty" class="enc-party-empty"></div>
              <div class="enc-small-tip">
                "Save PCs" snapshots all current PCs as your usual party, then "Add party" drops them into a new encounter.
              </div>
            </div>
          </div>
        </div>

        <div class="enc-small-tip">
          Tips: Use quick-add to seed an encounter, then refine stats in the form. "Kill" keeps them in the order, while HP drops to 0.
          Data stays in your browser only.
        </div>
      </div>
    `;

    // Wire up static buttons
    const roundBadge = panel.querySelector("#encRoundBadge");
    const nextTurnBtn = panel.querySelector("#encNextTurnBtn");
    const nextRoundBtn = panel.querySelector("#encNextRoundBtn");
    const resetBtn = panel.querySelector("#encResetBtn");
    const quickAddPcBtn = panel.querySelector("#encQuickAddPcBtn");
    const quickAddEnemyBtn = panel.querySelector("#encQuickAddEnemyBtn");
    const clearEncounterBtn = panel.querySelector("#encClearEncounterBtn");
    const usePartyBtn = panel.querySelector("#encUsePartyBtn");
    const savePartyBtn = panel.querySelector("#encSavePartyBtn");

    if (nextTurnBtn) {
      nextTurnBtn.addEventListener("click", () => {
        nextTurn();
        saveEncounterState(encounterState);
        renderAll(panel);
      });
    }

    if (nextRoundBtn) {
      nextRoundBtn.addEventListener("click", () => {
        nextRound();
        saveEncounterState(encounterState);
        renderAll(panel);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (!window.confirm("Reset round to 1 and restore HP for all combatants?")) {
          return;
        }
        resetEncounterKeepList();
        saveEncounterState(encounterState);
        renderAll(panel);
      });
    }

    if (quickAddPcBtn) {
      quickAddPcBtn.addEventListener("click", () => {
        const numExistingPC = encounterState.combatants.filter(
          (c) => c.side === "pc"
        ).length;
        const newC = {
          id: createId(),
          name: `PC ${numExistingPC + 1}`,
          side: "pc",
          hpMax: null,
          hpCurrent: null,
          ac: "",
          speed: "",
          init: 0,
          notes: "",
          dead: false,
        };
        encounterState.combatants.push(newC);
        currentEditingId = newC.id;
        ensureActiveId();
        saveEncounterState(encounterState);
        renderAll(panel);
      });
    }

    if (quickAddEnemyBtn) {
      quickAddEnemyBtn.addEventListener("click", () => {
        const numEnemies = encounterState.combatants.filter(
          (c) => c.side === "enemy"
        ).length;
        const newC = {
          id: createId(),
          name: `Enemy ${numEnemies + 1}`,
          side: "enemy",
          hpMax: null,
          hpCurrent: null,
          ac: "",
          speed: "",
          init: 0,
          notes: "",
          dead: false,
        };
        encounterState.combatants.push(newC);
        currentEditingId = newC.id;
        ensureActiveId();
        saveEncounterState(encounterState);
        renderAll(panel);
      });
    }

    if (clearEncounterBtn) {
      clearEncounterBtn.addEventListener("click", () => {
        if (
          !window.confirm(
            "Clear all combatants from this encounter? (Saved party will remain.)"
          )
        ) {
          return;
        }
        encounterState.combatants = [];
        encounterState.round = 1;
        encounterState.activeId = null;
        saveEncounterState(encounterState);
        currentEditingId = null;
        renderAll(panel);
      });
    }

    if (usePartyBtn) {
      usePartyBtn.addEventListener("click", () => {
        const added = addPartyToEncounter();
        if (added === 0) {
          window.alert("No party saved yet. Use 'Save PCs' first.");
          return;
        }
        if (!encounterState.round || encounterState.round < 1) {
          encounterState.round = 1;
        }
        saveEncounterState(encounterState);
        renderAll(panel);
      });
    }

    if (savePartyBtn) {
      savePartyBtn.addEventListener("click", () => {
        const ok = saveCurrentPCsAsParty();
        if (!ok) {
          window.alert("No PCs found in this encounter to save.");
          return;
        }
        window.alert("Saved current PCs as your party.");
        renderAll(panel);
      });
    }

    // Initial render pass
    if (roundBadge) {
      roundBadge.textContent = String(encounterState.round || 1);
    }
    renderAll(panel);
  }

  function renderAll(panel) {
    const roundBadge = panel.querySelector("#encRoundBadge");
    if (roundBadge) {
      roundBadge.textContent = String(encounterState.round || 1);
    }
    ensureActiveId();
    saveEncounterState(encounterState);

    renderSummary(panel);
    renderList(panel);
    renderForm(panel);
    renderParty(panel);
  }

  function renderSummary(panel) {
    const summaryLabel = panel.querySelector("#encSummaryLabel");
    const turnHintMain = panel.querySelector("#encTurnHintMain");
    const turnHintSide = panel.querySelector("#encTurnHintSide");

    const total = encounterState.combatants.length;
    const alive = encounterState.combatants.filter((c) => !c.dead).length;
    const dead = encounterState.combatants.filter((c) => c.dead).length;
    const pcs = encounterState.combatants.filter((c) => c.side === "pc").length;
    const enemies = encounterState.combatants.filter(
      (c) => c.side === "enemy"
    ).length;

    if (summaryLabel) {
      if (total === 0) {
        summaryLabel.textContent = "No combatants yet.";
      } else {
        summaryLabel.textContent = `${alive}/${total} active • ${pcs} PC • ${enemies} enemy • ${dead} down`;
      }
    }

    const active = encounterState.activeId
      ? findCombatantById(encounterState.activeId)
      : null;

    if (!active) {
      if (turnHintMain) {
        turnHintMain.textContent = "No active turn.";
      }
      if (turnHintSide) {
        turnHintSide.textContent = "Add combatants and roll initiative.";
      }
      return;
    }

    if (turnHintMain) {
      turnHintMain.innerHTML = `Current turn: <strong>${active.name || "Unknown"}</strong>`;
    }
    if (turnHintSide) {
      const side = sideLabel(active.side);
      const hpInfo =
        typeof active.hpCurrent === "number" && typeof active.hpMax === "number"
          ? `${active.hpCurrent}/${active.hpMax} HP`
          : "HP unknown";
      turnHintSide.textContent = `${side} • ${hpInfo}`;
    }
  }

  function renderList(panel) {
    const listEl = panel.querySelector("#encList");
    if (!listEl) return;

    listEl.innerHTML = "";

    const sorted = sortCombatants(encounterState.combatants);

    if (sorted.length === 0) {
      const empty = document.createElement("div");
      empty.className = "enc-empty";
      empty.textContent =
        "No combatants in this encounter. Use the form or quick-add to start.";
      listEl.appendChild(empty);
      return;
    }

    for (const c of sorted) {
      const card = document.createElement("div");
      card.className = "enc-card";
      if (c.side === "pc") card.classList.add("enc-card--pc");
      else if (c.side === "enemy") card.classList.add("enc-card--enemy");
      else card.classList.add("enc-card--other");
      if (c.dead) card.classList.add("enc-card--dead");
      if (encounterState.activeId === c.id) card.classList.add("enc-card--active");

      // Avatar
      const avatar = document.createElement("div");
      avatar.className = "enc-card-avatar";
      avatar.textContent = initialsFromName(c.name || "");

      // Body
      const body = document.createElement("div");
      body.className = "enc-card-body";

      // Header
      const header = document.createElement("div");
      header.className = "enc-card-header";

      const nameEl = document.createElement("div");
      nameEl.className = "enc-card-name";
      nameEl.textContent = c.name || "(unnamed)";

      const tag = document.createElement("div");
      tag.className = "enc-card-tag";
      tag.textContent = sideLabel(c.side);

      header.appendChild(nameEl);
      header.appendChild(tag);

      // Middle (HP + delta)
      const middle = document.createElement("div");
      middle.className = "enc-card-middle";

      const hpSection = document.createElement("div");
      hpSection.className = "enc-hp-section";

      const hpLabel = document.createElement("span");
      hpLabel.className = "enc-hp-label";
      hpLabel.textContent = "HP";

      const hpCurrent = document.createElement("input");
      hpCurrent.className = "enc-hp-current";
      hpCurrent.type = "number";
      hpCurrent.step = "1";
      hpCurrent.placeholder = "-";
      if (typeof c.hpCurrent === "number" && !isNaN(c.hpCurrent)) {
        hpCurrent.value = String(c.hpCurrent);
      }

      const slash = document.createElement("span");
      slash.className = "enc-hp-slash";
      slash.textContent = "/";

      const hpMax = document.createElement("span");
      hpMax.className = "enc-hp-max";
      hpMax.textContent =
        typeof c.hpMax === "number" && !isNaN(c.hpMax)
          ? String(c.hpMax)
          : "?";

      hpSection.appendChild(hpLabel);
      hpSection.appendChild(hpCurrent);
      hpSection.appendChild(slash);
      hpSection.appendChild(hpMax);

      const deltaSection = document.createElement("div");
      deltaSection.className = "enc-delta-section";

      const deltaInput = document.createElement("input");
      deltaInput.className = "enc-delta-input";
      deltaInput.type = "number";
      deltaInput.step = "1";
      deltaInput.placeholder = "±HP";

      const dmgBtn = document.createElement("button");
      dmgBtn.type = "button";
      dmgBtn.className = "btn-primary btn-small";
      dmgBtn.textContent = "Damage";

      const healBtn = document.createElement("button");
      healBtn.type = "button";
      healBtn.className = "btn-secondary btn-small";
      healBtn.textContent = "Heal";

      deltaSection.appendChild(deltaInput);
      deltaSection.appendChild(dmgBtn);
      deltaSection.appendChild(healBtn);

      middle.appendChild(hpSection);
      middle.appendChild(deltaSection);

      // Footer (meta + controls)
      const footer = document.createElement("div");
      footer.className = "enc-card-footer";

      const metaGroup = document.createElement("div");
      metaGroup.className = "enc-meta-group";

      const pillInit = document.createElement("div");
      pillInit.className = "enc-meta-pill";
      pillInit.innerHTML = `<strong>Init</strong> ${c.init != null ? c.init : 0}`;

      const pillAC = document.createElement("div");
      pillAC.className = "enc-meta-pill";
      pillAC.innerHTML = `<strong>AC</strong> ${c.ac ? c.ac : "—"}`;

      const pillSpeed = document.createElement("div");
      pillSpeed.className = "enc-meta-pill";
      pillSpeed.innerHTML = `<strong>Speed</strong> ${c.speed ? c.speed : "—"}`;

      metaGroup.appendChild(pillInit);
      metaGroup.appendChild(pillAC);
      metaGroup.appendChild(pillSpeed);

      const controlsGroup = document.createElement("div");
      controlsGroup.className = "enc-controls-group";

      const killBtn = document.createElement("button");
      killBtn.type = "button";
      killBtn.className = "btn-secondary btn-small enc-kill-btn";
      if (!c.dead) {
        killBtn.classList.add("dangerous");
        killBtn.textContent = "Kill";
      } else {
        killBtn.textContent = "Revive";
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-secondary btn-small";
      removeBtn.textContent = "Remove";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn-secondary btn-small";
      editBtn.textContent = "Edit";

      controlsGroup.appendChild(killBtn);
      controlsGroup.appendChild(editBtn);
      controlsGroup.appendChild(removeBtn);

      footer.appendChild(metaGroup);
      footer.appendChild(controlsGroup);

      body.appendChild(header);
      body.appendChild(middle);
      body.appendChild(footer);

      card.appendChild(avatar);
      card.appendChild(body);

      // --- Interactions ---

      // Manually edit HP current
      hpCurrent.addEventListener("change", () => {
        const val = Number(hpCurrent.value);
        if (!isNaN(val)) {
          c.hpCurrent = val;
          clampHP(c);
          saveEncounterState(encounterState);
          renderAll(panel);
        }
      });

      // Damage / heal
      function applyDelta(sign) {
        const raw = deltaInput.value.trim();
        if (!raw) return;
        const val = Number(raw);
        if (isNaN(val)) return;
        if (typeof c.hpCurrent !== "number" || isNaN(c.hpCurrent)) {
          // If current is unknown but max is known, start from max
          if (typeof c.hpMax === "number" && !isNaN(c.hpMax)) {
            c.hpCurrent = c.hpMax;
          } else {
            c.hpCurrent = 0;
          }
        }
        c.hpCurrent += sign * val;
        if (c.hpCurrent < 0) c.hpCurrent = 0;
        if (typeof c.hpMax === "number" && !isNaN(c.hpMax)) {
          if (c.hpCurrent > c.hpMax) c.hpCurrent = c.hpMax;
        }
        if (c.hpCurrent === 0 && sign < 0) {
          c.dead = true;
        }
        clampHP(c);
        saveEncounterState(encounterState);
        renderAll(panel);
      }

      dmgBtn.addEventListener("click", () => applyDelta(-1));
      healBtn.addEventListener("click", () => applyDelta(1));

      // Kill / revive
      killBtn.addEventListener("click", () => {
        if (!c.dead) {
          c.dead = true;
          if (typeof c.hpCurrent === "number") {
            if (c.hpCurrent > 0) c.hpCurrent = 0;
          } else if (typeof c.hpMax === "number" && !isNaN(c.hpMax)) {
            c.hpCurrent = 0;
          }
        } else {
          c.dead = false;
          if (typeof c.hpMax === "number" && !isNaN(c.hpMax)) {
            c.hpCurrent = c.hpMax;
          }
        }
        clampHP(c);
        ensureActiveId();
        saveEncounterState(encounterState);
        renderAll(panel);
      });

      // Remove
      removeBtn.addEventListener("click", () => {
        if (
          !window.confirm(
            `Remove ${c.name || "this combatant"} from the encounter?`
          )
        ) {
          return;
        }
        encounterState.combatants = encounterState.combatants.filter(
          (x) => x.id !== c.id
        );
        if (encounterState.activeId === c.id) {
          ensureActiveId();
        }
        saveEncounterState(encounterState);
        if (currentEditingId === c.id) currentEditingId = null;
        renderAll(panel);
      });

      // Edit opens form bound to this combatant
      editBtn.addEventListener("click", () => {
        currentEditingId = c.id;
        renderForm(panel);
      });

      listEl.appendChild(card);
    }
  }

  function renderForm(panel) {
    const container = panel.querySelector("#encFormContainer");
    const editingLabel = panel.querySelector("#encEditingLabel");
    if (!container) return;

    const editing =
      currentEditingId != null
        ? findCombatantById(currentEditingId)
        : null;

    if (editingLabel) {
      if (editing) {
        editingLabel.textContent = `Editing: ${editing.name || "(unnamed)"}`;
      } else {
        editingLabel.textContent = "New combatant";
      }
    }

    // Build form HTML
    container.innerHTML = `
      <form id="encForm" autocomplete="off">
        <div class="enc-form-grid">
          <div class="enc-form-row">
            <label for="encNameInput">Name</label>
            <input id="encNameInput" type="text" placeholder="Name or label" />
          </div>
          <div class="enc-form-row">
            <label for="encSideInput">Side</label>
            <select id="encSideInput">
              <option value="pc">PC</option>
              <option value="enemy">Enemy</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="enc-form-row">
            <label for="encInitInput">Initiative</label>
            <input id="encInitInput" type="number" step="1" placeholder="e.g. 15" />
          </div>
          <div class="enc-form-row">
            <label for="encAcInput">AC</label>
            <input id="encAcInput" type="text" placeholder="e.g. 16" />
          </div>

          <div class="enc-form-row">
            <label for="encHpMaxInput">Max HP</label>
            <input id="encHpMaxInput" type="number" step="1" placeholder="e.g. 38" />
          </div>
          <div class="enc-form-row">
            <label for="encHpCurrentInput">Current HP</label>
            <input id="encHpCurrentInput" type="number" step="1" placeholder="Leave blank to use max" />
          </div>

          <div class="enc-form-row">
            <label for="encSpeedInput">Speed</label>
            <input id="encSpeedInput" type="text" placeholder="e.g. 30 ft." />
          </div>
          <div class="enc-form-row">
            <label for="encNotesInput">Notes</label>
            <textarea id="encNotesInput" rows="2" placeholder="Conditions, resistances, etc."></textarea>
          </div>
        </div>

        <div class="enc-form-actions">
          <div class="enc-form-actions-left">
            <button type="submit" class="btn-primary btn-small" id="encSaveBtn">
              ${editing ? "Update combatant" : "Add combatant"}
            </button>
            <button type="button" class="btn-secondary btn-small" id="encNewBtn">
              New
            </button>
          </div>
          <div class="enc-form-actions-right">
            <span class="enc-badge-soft">Sorted by initiative (desc)</span>
          </div>
        </div>
      </form>
    `;

    const form = container.querySelector("#encForm");
    const nameInput = container.querySelector("#encNameInput");
    const sideInput = container.querySelector("#encSideInput");
    const initInput = container.querySelector("#encInitInput");
    const acInput = container.querySelector("#encAcInput");
    const hpMaxInput = container.querySelector("#encHpMaxInput");
    const hpCurrentInput = container.querySelector("#encHpCurrentInput");
    const speedInput = container.querySelector("#encSpeedInput");
    const notesInput = container.querySelector("#encNotesInput");
    const newBtn = container.querySelector("#encNewBtn");

    // Fill form from editing entry if present
    if (editing) {
      if (nameInput) nameInput.value = editing.name || "";
      if (sideInput) sideInput.value = editing.side || "pc";
      if (initInput)
        initInput.value =
          editing.init != null && !isNaN(editing.init)
            ? String(editing.init)
            : "";
      if (acInput) acInput.value = editing.ac || "";
      if (hpMaxInput)
        hpMaxInput.value =
          editing.hpMax != null && !isNaN(editing.hpMax)
            ? String(editing.hpMax)
            : "";
      if (hpCurrentInput)
        hpCurrentInput.value =
          editing.hpCurrent != null && !isNaN(editing.hpCurrent)
            ? String(editing.hpCurrent)
            : "";
      if (speedInput) speedInput.value = editing.speed || "";
      if (notesInput) notesInput.value = editing.notes || "";
    } else {
      if (sideInput) sideInput.value = "pc";
    }

    if (newBtn) {
      newBtn.addEventListener("click", () => {
        currentEditingId = null;
        renderForm(panel);
      });
    }

    if (form) {
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();

        const name = nameInput ? nameInput.value.trim() : "";
        const side = sideInput ? sideInput.value : "pc";

        const initVal = initInput ? initInput.value.trim() : "";
        const init = initVal ? Number(initVal) : 0;

        const ac = acInput ? acInput.value.trim() : "";

        const hpMaxVal = hpMaxInput ? hpMaxInput.value.trim() : "";
        const hpMax =
          hpMaxVal !== "" && !isNaN(Number(hpMaxVal))
            ? Number(hpMaxVal)
            : null;

        const hpCurrentVal = hpCurrentInput
          ? hpCurrentInput.value.trim()
          : "";
        let hpCurrent =
          hpCurrentVal !== "" && !isNaN(Number(hpCurrentVal))
            ? Number(hpCurrentVal)
            : null;

        const speed = speedInput ? speedInput.value.trim() : "";
        const notes = notesInput ? notesInput.value.trim() : "";

        if (hpCurrent == null && hpMax != null) {
          hpCurrent = hpMax;
        }

        let target;
        if (currentEditingId != null) {
          target = findCombatantById(currentEditingId);
        }

        if (target) {
          target.name = name || target.name || "Unnamed";
          target.side = side || target.side || "pc";
          target.init = init;
          target.ac = ac;
          target.hpMax = hpMax;
          target.hpCurrent = hpCurrent;
          target.speed = speed;
          target.notes = notes;
          clampHP(target);
        } else {
          const newC = {
            id: createId(),
            name: name || "New combatant",
            side: side || "pc",
            init,
            ac,
            hpMax,
            hpCurrent,
            speed,
            notes,
            dead: false,
          };
          clampHP(newC);
          encounterState.combatants.push(newC);
          currentEditingId = newC.id;
        }

        ensureActiveId();
        saveEncounterState(encounterState);
        renderAll(panel);
      });
    }
  }

  function renderParty(panel) {
    const chipsEl = panel.querySelector("#encPartyChips");
    const emptyEl = panel.querySelector("#encPartyEmpty");
    const summary = panel.querySelector("#encPartySummary");

    if (chipsEl) chipsEl.innerHTML = "";

    const members = partyState.members || [];

    if (summary) {
      if (members.length === 0) {
        summary.textContent = "No party saved.";
      } else {
        summary.textContent = `${members.length} member${
          members.length === 1 ? "" : "s"
        } saved`;
      }
    }

    if (!chipsEl || !emptyEl) return;

    if (members.length === 0) {
      emptyEl.textContent =
        "No saved party yet. Use “Save PCs” to snapshot your current player characters.";
      return;
    }

    emptyEl.textContent = "";

    for (const m of members) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "enc-party-chip";

      const avatar = document.createElement("span");
      avatar.className = "avatar";
      avatar.textContent = initialsFromName(m.name || "");

      const label = document.createElement("span");
      label.textContent = m.name || "PC";

      chip.appendChild(avatar);
      chip.appendChild(label);

      chip.title = "Click to add this party member into the encounter";

      chip.addEventListener("click", () => {
        const hpMax =
          typeof m.hpMax === "number" && !isNaN(m.hpMax) ? m.hpMax : null;
        const hpCurrent = hpMax != null ? hpMax : null;

        const newC = {
          id: createId(),
          name: m.name || "Party member",
          side: m.side || "pc",
          hpMax,
          hpCurrent,
          ac: m.ac || "",
          speed: m.speed || "",
          init: 0,
          notes: m.notes || "",
          dead: false,
        };
        clampHP(newC);
        encounterState.combatants.push(newC);
        ensureActiveId();
        saveEncounterState(encounterState);
        currentEditingId = newC.id;
        renderAll(panel);
      });

      chipsEl.appendChild(chip);
    }
  }

  // ----------------------------
  //  Hook into the toolbox
  // ----------------------------
  window.renderToolPanel = function (toolId) {
    if (toolId === "encounterInitiative") {
      renderEncounterTool();
    } else {
      originalRenderToolPanel(toolId);
    }
  };

  // Done.
})();
