// tool-encounter.js
// Encounter / Initiative tool – self-contained, plugs into existing toolbox.
// - Injects its own scoped styles
// - Registers as a tool in toolsConfig
// - Wraps renderToolPanel to handle id = "encounter"
// - Uses localStorage to persist encounters between sessions

(function () {
  const STYLE_ID = "encounter-tool-styles-v1";
  const STORAGE_KEY = "vrahune_toolbox_encounter_v1";

  // ---- STYLE INJECTION (scoped under .encounter-panel) ----
  function injectEncounterStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* === Encounter / Initiative – scoped styles === */
      .encounter-panel {
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-size: 0.85rem;
      }

      .encounter-panel .header-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .encounter-panel .title {
        font-size: 1.05rem;
        font-weight: 600;
        color: #f8fafc;
      }

      .encounter-panel .subtitle {
        font-size: 0.78rem;
        color: var(--text-muted);
        max-width: 280px;
      }

      .encounter-panel .label-pill {
        font-size: 0.72rem;
        padding: 3px 8px;
        border-radius: 999px;
        border: 1px solid #2d3748;
        background: #05070c;
        color: var(--accent-soft);
        white-space: nowrap;
      }

      .encounter-panel .tabs-row {
        display: inline-flex;
        background: #05070c;
        padding: 2px;
        border-radius: 999px;
        border: 1px solid #202633;
      }

      .encounter-panel .tab {
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.78rem;
        padding: 3px 10px;
        border-radius: 999px;
        cursor: pointer;
      }

      .encounter-panel .tab.active {
        background: linear-gradient(to bottom right, #1f2933, #111827);
        color: #f9fafb;
      }

      .encounter-panel .panel-inner {
        border-radius: 12px;
        border: 1px solid #202633;
        background: #05070c;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .encounter-panel .section-heading-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 6px;
      }

      .encounter-panel .section-title {
        font-size: 0.88rem;
        font-weight: 600;
        color: #e5e7eb;
      }

      .encounter-panel .hint-text {
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      .encounter-panel .section-divider {
        border: none;
        border-top: 1px solid #1c2430;
        margin: 4px 0;
      }

      .encounter-panel .boxed-subsection {
        border-radius: 10px;
        border: 1px solid #262c37;
        background: #05070c;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .encounter-panel .boxed-subsection-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 4px;
      }

      .encounter-panel .boxed-subsection-title {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .encounter-panel .boxed-subsection-title .chevron {
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      .encounter-panel .initiative-box {
        border-radius: 10px;
        border: 1px solid #262c37;
        background: #05070c;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .encounter-panel .initiative-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 320px;
        overflow-y: auto;
        padding-right: 2px;
      }

      .encounter-panel .card {
        border-radius: 10px;
        border: 1px solid #2c3340;
        background: #070a10;
        padding: 5px 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.08s ease;
      }

      .encounter-panel .card.pc-card {
        border-color: #2563eb;
      }

      .encounter-panel .card.enemy-card {
        border-color: #b91c1c;
      }

      .encounter-panel .card.npc-card {
        border-color: #059669;
      }

      .encounter-panel .card.active-turn {
        box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.7);
        transform: translateY(-1px);
      }

      .encounter-panel .card.downed {
        opacity: 0.65;
      }

      .encounter-panel .card-main {
        display: flex;
        align-items: stretch;
        gap: 6px;
      }

      .encounter-panel .card-portrait {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        background: radial-gradient(circle at 30% 20%, #4b5563, #020617);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 600;
        color: #e5e7eb;
        flex-shrink: 0;
      }

      .encounter-panel .card-content {
        display: flex;
        flex: 1;
        flex-direction: row;
        gap: 6px;
        align-items: stretch;
      }

      .encounter-panel .name-block {
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex: 0 0 90px;
        max-width: 120px;
      }

      .encounter-panel .name-row {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .encounter-panel .card-name {
        font-size: 0.8rem;
        font-weight: 500;
        color: #f9fafb;
      }

      .encounter-panel .card-tag {
        font-size: 0.7rem;
        padding: 1px 5px;
        border-radius: 999px;
        background: #0b1120;
        border: 1px solid #1f2937;
        color: var(--accent-soft);
      }

      .encounter-panel .hp-block {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }

      .encounter-panel .hp-label {
        font-size: 0.78rem;
        color: #e5e7eb;
      }

      .encounter-panel .hp-amount-input {
        width: 100%;
        font-size: 0.75rem;
        padding: 2px 4px;
      }

      .encounter-panel .hp-buttons {
        display: flex;
        gap: 3px;
      }

      .encounter-panel .hp-buttons .btn {
        font-size: 0.72rem;
        padding-inline: 6px;
      }

      .encounter-panel .card-meta {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex: 0 0 92px;
        max-width: 110px;
      }

      .encounter-panel .card-meta-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 4px;
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      .encounter-panel .btn-icon {
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.8rem;
        cursor: pointer;
        padding: 0 3px;
      }

      .encounter-panel .btn-icon:hover {
        color: #fca5a5;
      }

      .encounter-panel .party-strip {
        border-radius: 10px;
        border: 1px solid #262c37;
        background: #05070c;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .encounter-panel .party-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
      }

      .encounter-panel .party-name {
        font-size: 0.78rem;
        color: var(--accent-soft);
        font-weight: 500;
        margin-right: 4px;
      }

      .encounter-panel .party-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.76rem;
        border-radius: 999px;
        border: 1px solid #303641;
        padding: 2px 6px;
        background: #080b11;
        color: #e6e6e6;
      }

      .encounter-panel .party-chip button {
        border: none;
        background: transparent;
        color: var(--accent-soft);
        font-size: 0.78rem;
        cursor: default;
        padding: 0 2px;
      }

      .encounter-panel .encounter-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 220px;
        overflow-y: auto;
        padding-right: 2px;
      }

      .encounter-panel .encounter-row {
        border-radius: 8px;
        border: 1px solid #262c37;
        background: #05070c;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .encounter-panel .encounter-row-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
      }

      .encounter-panel .encounter-name {
        font-weight: 500;
        font-size: 0.82rem;
      }

      .encounter-panel .encounter-tags {
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      .encounter-panel .encounter-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 2px;
      }

      .encounter-panel code {
        font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
        font-size: 0.74rem;
        background: rgba(255,255,255,0.04);
        padding: 0 3px;
        border-radius: 4px;
      }

      .encounter-panel .enc-tabs-view {
        display: none;
        flex-direction: column;
        gap: 8px;
      }

      .encounter-panel .enc-tabs-view.active {
        display: flex;
      }

      .encounter-panel .row-tight {
        display: flex;
        gap: 6px;
        flex-wrap: nowrap;
      }

      .encounter-panel .row-tight > .col {
        flex: 1;
      }
    `;
    document.head.appendChild(style);
  }

  // ---- STATE & STORAGE ----
  function defaultState() {
    return {
      round: 1,
      turnIndex: 0,
      combatants: [],
      savedEncounters: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      return {
        round: typeof parsed.round === "number" && parsed.round > 0 ? parsed.round : base.round,
        turnIndex: typeof parsed.turnIndex === "number" ? parsed.turnIndex : base.turnIndex,
        combatants: Array.isArray(parsed.combatants) ? parsed.combatants : base.combatants,
        savedEncounters: Array.isArray(parsed.savedEncounters) ? parsed.savedEncounters : base.savedEncounters
      };
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }

  let encounterState = loadState();

  function ensureSorted(state) {
    state.combatants.sort((a, b) => {
      const ai = typeof a.initiative === "number" ? a.initiative : 0;
      const bi = typeof b.initiative === "number" ? b.initiative : 0;
      if (bi !== ai) return bi - ai;
      // tie-breaker: PCs first, then NPC, then Enemy
      const order = { PC: 0, NPC: 1, Enemy: 2 };
      const at = order[a.type] ?? 99;
      const bt = order[b.type] ?? 99;
      if (at !== bt) return at - bt;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  function getActiveCombatant(state) {
    if (!state.combatants.length) return null;
    const n = state.combatants.length;
    let idx = state.turnIndex % n;
    if (idx < 0) idx = 0;

    // Prefer a non-downed combatant; avoid infinite loop
    for (let i = 0; i < n; i++) {
      const c = state.combatants[idx];
      if (c && c.hpCurrent > 0) {
        state.turnIndex = idx;
        return c;
      }
      idx = (idx + 1) % n;
    }
    // if all are downed, just return first
    state.turnIndex = 0;
    return state.combatants[0] || null;
  }

  // ---- TOOL REGISTRATION ----
  function registerEncounterTool() {
    if (Array.isArray(window.toolsConfig)) {
      const exists = window.toolsConfig.some(t => t && t.id === "encounter");
      if (!exists) {
        window.toolsConfig.push({
          id: "encounter",
          name: "Encounter / Initiative",
          description: "Quick initiative tracker & encounter builder."
        });
        if (typeof window.renderToolsNav === "function") {
          window.renderToolsNav();
        }
      }
    }
  }

  // ---- MAIN RENDERER ----
  function renderEncounterTool(panel) {
    injectEncounterStyles();
    encounterState = loadState();
    ensureSorted(encounterState);

    panel.innerHTML = `
      <div class="encounter-panel">
        <div class="header-line">
          <div>
            <div class="title">Encounter / Initiative</div>
            <div class="subtitle">
              Quick initiative tracker & encounter builder – designed to live on the right side of your toolbox.
            </div>
          </div>
          <div class="label-pill">Tool · Right Panel</div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div class="tabs-row">
            <button class="tab active" data-view="active">Active Encounter</button>
            <button class="tab" data-view="library">Encounter Library</button>
          </div>
          <div class="hint-text">
            Use this even outside combat (stealth runs, chases, social scenes with “turns”).
          </div>
        </div>

        <div class="panel-inner">
          <!-- ACTIVE VIEW -->
          <div class="enc-tabs-view active" data-view="active">
            <div class="section-heading-row">
              <div class="section-title">Active Encounter</div>
              <div class="hint-text">Round & turn tracking with compact, draggable cards.</div>
            </div>

            <!-- ROUND / TURN CONTROLS -->
            <div class="row row-tight">
              <div class="col" style="max-width:80px;">
                <label for="encRoundInput">Round</label>
                <input id="encRoundInput" type="number" min="1">
              </div>
              <div class="col">
                <label for="encCurrentTurnInput">Current turn</label>
                <input id="encCurrentTurnInput" type="text" readonly>
              </div>
              <div class="col" style="display:flex; gap:4px; justify-content:flex-end;">
                <button id="encNextTurnBtn" class="btn btn-xs">Next turn</button>
                <button id="encNextRoundBtn" class="btn btn-secondary btn-xs">Next round</button>
              </div>
            </div>

            <!-- SAVED PARTY STRIP (lightweight for now) -->
            <div class="party-strip">
              <div class="party-row">
                <span class="party-name" id="encPartyName">Saved party: not configured yet</span>
                <span class="hint-text">Use the Encounter Library to store your usual parties/combats.</span>
              </div>
              <div class="party-row">
                <span class="hint-text">
                  Party support will hook into <code>localStorage</code> later. For now, save a “party template”
                  encounter and load/append it as needed.
                </span>
              </div>
            </div>

            <!-- ADD / EDIT COMBATANTS -->
            <div class="boxed-subsection">
              <div class="boxed-subsection-header">
                <div class="boxed-subsection-title">
                  <span class="chevron">▾</span>
                  Add / edit combatants
                </div>
                <span class="hint-text">Preload monsters or drop in ad-hoc PCs/NPCs.</span>
              </div>
              <div class="row row-tight">
                <div class="col">
                  <label for="encAddName">Name</label>
                  <input id="encAddName" type="text" placeholder="Vesper, Goblin Scout, Frostclaw Wolf">
                </div>
                <div class="col" style="max-width:80px;">
                  <label for="encAddAC">AC</label>
                  <input id="encAddAC" type="number" min="0" placeholder="15">
                </div>
                <div class="col" style="max-width:100px;">
                  <label for="encAddSpeed">Speed (ft)</label>
                  <input id="encAddSpeed" type="number" min="0" placeholder="30">
                </div>
                <div class="col" style="max-width:170px;">
                  <label>HP (current / max)</label>
                  <div style="display:flex; gap:4px;">
                    <input id="encAddHpCurrent" type="number" min="0" placeholder="27">
                    <input id="encAddHpMax" type="number" min="0" placeholder="35">
                  </div>
                </div>
                <div class="col" style="max-width:110px;">
                  <label for="encAddType">Type</label>
                  <select id="encAddType">
                    <option value="PC">PC</option>
                    <option value="NPC">NPC</option>
                    <option value="Enemy">Enemy</option>
                  </select>
                </div>
                <div class="col" style="max-width:90px;">
                  <label for="encAddInit">Init</label>
                  <input id="encAddInit" type="number" placeholder="15">
                </div>
                <div class="col" style="max-width:90px;">
                  <label>&nbsp;</label>
                  <button id="encAddBtn" class="btn btn-xs">Add</button>
                </div>
              </div>
            </div>

            <!-- TURN ORDER + CARDS -->
            <div class="initiative-box">
              <div class="section-heading-row">
                <div class="section-title">Turn order</div>
                <div class="hint-text">Sorted by initiative. Click a card to set active.</div>
              </div>
              <div id="encCardsContainer" class="initiative-list"></div>
              <div id="encCardsEmpty" class="muted" style="font-size:0.78rem;">
                No combatants yet. Add PCs, NPCs, or enemies above.
              </div>
            </div>
          </div>

          <!-- LIBRARY VIEW -->
          <div class="enc-tabs-view" data-view="library">
            <div class="section-heading-row">
              <div class="section-title">Encounter Library</div>
              <div class="hint-text">
                Prebuild fights, then load them into the Active view with a single click.
              </div>
            </div>

            <div class="row" style="margin-bottom:4px;">
              <button id="encSaveEncounterBtn" class="btn btn-xs">Save current as new encounter</button>
            </div>

            <div id="encLibraryList" class="encounter-list"></div>

            <div class="hint-text">
              Encounters and their combatants are stored in <code>localStorage</code>.
              Use “Load as active” to replace the current encounter, or “Append to active” to stack them.
            </div>
          </div>
        </div>
      </div>
    `;

    wireEncounterEvents(panel);
    syncUiFromState(panel);
  }

  function wireEncounterEvents(panel) {
    const tabs = panel.querySelectorAll(".tab[data-view]");
    const views = panel.querySelectorAll(".enc-tabs-view");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const view = tab.dataset.view;
        tabs.forEach(t => t.classList.toggle("active", t === tab));
        views.forEach(v => v.classList.toggle("active", v.dataset.view === view));
      });
    });

    const roundInput = panel.querySelector("#encRoundInput");
    const currentTurnInput = panel.querySelector("#encCurrentTurnInput");
    const nextTurnBtn = panel.querySelector("#encNextTurnBtn");
    const nextRoundBtn = panel.querySelector("#encNextRoundBtn");

    if (roundInput) {
      roundInput.addEventListener("change", () => {
        let r = parseInt(roundInput.value || "1", 10);
        if (!Number.isFinite(r) || r < 1) r = 1;
        encounterState.round = r;
        saveState(encounterState);
        syncRoundAndTurn(panel);
      });
    }

    if (nextTurnBtn) {
      nextTurnBtn.addEventListener("click", () => {
        if (!encounterState.combatants.length) return;
        const n = encounterState.combatants.length;
        encounterState.turnIndex = (encounterState.turnIndex + 1) % n;
        saveState(encounterState);
        syncRoundAndTurn(panel);
        renderCards(panel);
      });
    }

    if (nextRoundBtn) {
      nextRoundBtn.addEventListener("click", () => {
        encounterState.round = (encounterState.round || 1) + 1;
        if (!encounterState.combatants.length) {
          encounterState.turnIndex = 0;
        } else {
          const n = encounterState.combatants.length;
          encounterState.turnIndex = (encounterState.turnIndex + 1) % n;
        }
        saveState(encounterState);
        syncRoundAndTurn(panel);
        renderCards(panel);
      });
    }

    // Add combatant
    const addBtn = panel.querySelector("#encAddBtn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const nameInput = panel.querySelector("#encAddName");
        const acInput = panel.querySelector("#encAddAC");
        const speedInput = panel.querySelector("#encAddSpeed");
        const hpCurInput = panel.querySelector("#encAddHpCurrent");
        const hpMaxInput = panel.querySelector("#encAddHpMax");
        const typeSelect = panel.querySelector("#encAddType");
        const initInput = panel.querySelector("#encAddInit");

        const name = (nameInput.value || "").trim();
        if (!name) {
          nameInput.focus();
          return;
        }

        const type = typeSelect.value || "PC";
        const ac = parseInt(acInput.value || "0", 10) || 0;
        const speed = parseInt(speedInput.value || "0", 10) || 0;
        const hpMaxRaw = parseInt(hpMaxInput.value || hpCurInput.value || "0", 10);
        const hpMax = Number.isFinite(hpMaxRaw) && hpMaxRaw > 0 ? hpMaxRaw : 0;
        const hpCurRaw = parseInt(hpCurInput.value || hpMaxInput.value || "0", 10);
        const hpCurrent = Number.isFinite(hpCurRaw) && hpCurRaw >= 0 ? hpCurRaw : hpMax;
        const init = parseInt(initInput.value || "0", 10) || 0;

        const id = `c_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

        encounterState.combatants.push({
          id,
          name,
          type,
          ac,
          speed,
          hpCurrent,
          hpMax,
          initiative: init
        });
        ensureSorted(encounterState);
        saveState(encounterState);

        nameInput.value = "";
        acInput.value = "";
        speedInput.value = "";
        hpCurInput.value = "";
        hpMaxInput.value = "";
        initInput.value = "";

        renderCards(panel);
        syncRoundAndTurn(panel);
      });
    }

    // Cards – event delegation
    const cardsContainer = panel.querySelector("#encCardsContainer");
    if (cardsContainer) {
      cardsContainer.addEventListener("click", (evt) => {
        const target = evt.target;
        if (!(target instanceof HTMLElement)) return;

        // Damage / Heal
        if (target.classList.contains("btn")) {
          const label = target.textContent && target.textContent.trim().toLowerCase();
          if (label === "damage" || label === "heal") {
            const cardEl = target.closest(".card");
            if (!cardEl) return;
            const id = cardEl.dataset.id;
            const c = encounterState.combatants.find(x => x.id === id);
            if (!c) return;
            const input = cardEl.querySelector(".hp-amount-input");
            const valRaw = input && input.value ? parseInt(input.value, 10) : NaN;
            if (!Number.isFinite(valRaw) || valRaw <= 0) return;
            if (label === "damage") {
              c.hpCurrent = Math.max(0, (c.hpCurrent || 0) - valRaw);
            } else {
              const max = c.hpMax || 0;
              if (max > 0) {
                c.hpCurrent = Math.min(max, (c.hpCurrent || 0) + valRaw);
              } else {
                c.hpCurrent = (c.hpCurrent || 0) + valRaw;
              }
            }
            if (input) input.value = "";
            saveState(encounterState);
            renderCards(panel);
            syncRoundAndTurn(panel);
            return;
          }
        }

        // Remove button
        if (target.classList.contains("btn-icon")) {
          const cardEl = target.closest(".card");
          if (!cardEl) return;
          const id = cardEl.dataset.id;
          encounterState.combatants = encounterState.combatants.filter(x => x.id !== id);
          if (encounterState.turnIndex >= encounterState.combatants.length) {
            encounterState.turnIndex = 0;
          }
          saveState(encounterState);
          renderCards(panel);
          syncRoundAndTurn(panel);
          return;
        }

        // Click card body to set active
        const cardMain = target.closest(".card-main");
        if (cardMain) {
          const cardEl = cardMain.closest(".card");
          if (!cardEl) return;
          const id = cardEl.dataset.id;
          const idx = encounterState.combatants.findIndex(x => x.id === id);
          if (idx !== -1) {
            encounterState.turnIndex = idx;
            saveState(encounterState);
            renderCards(panel);
            syncRoundAndTurn(panel);
          }
        }
      });
    }

    // Library actions
    const saveEncounterBtn = panel.querySelector("#encSaveEncounterBtn");
    if (saveEncounterBtn) {
      saveEncounterBtn.addEventListener("click", () => {
        if (!encounterState.combatants.length) {
          window.alert("No combatants to save. Add some first.");
          return;
        }
        const name = window.prompt("Name for this encounter:", "New encounter");
        if (!name) return;
        const enc = {
          id: `e_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          name: name.trim(),
          createdAt: Date.now(),
          combatants: encounterState.combatants.map(c => ({ ...c }))
        };
        encounterState.savedEncounters.push(enc);
        saveState(encounterState);
        renderLibrary(panel);
      });
    }

    const libraryList = panel.querySelector("#encLibraryList");
    if (libraryList) {
      libraryList.addEventListener("click", (evt) => {
        const target = evt.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.dataset.action) return;

        const row = target.closest(".encounter-row");
        if (!row) return;
        const encId = row.dataset.id;
        const enc = encounterState.savedEncounters.find(e => e.id === encId);
        if (!enc) return;

        const action = target.dataset.action;
        if (action === "load") {
          encounterState.combatants = enc.combatants.map(c => ({ ...c }));
          encounterState.round = 1;
          encounterState.turnIndex = 0;
          ensureSorted(encounterState);
          saveState(encounterState);
          // switch back to active tab
          const tabs = panel.querySelectorAll(".tab[data-view]");
          const views = panel.querySelectorAll(".enc-tabs-view");
          tabs.forEach(t => {
            t.classList.toggle("active", t.dataset.view === "active");
          });
          views.forEach(v => {
            v.classList.toggle("active", v.dataset.view === "active");
          });
          renderCards(panel);
          syncRoundAndTurn(panel);
        } else if (action === "append") {
          const extras = enc.combatants.map(c => ({ ...c }));
          encounterState.combatants = encounterState.combatants.concat(extras);
          ensureSorted(encounterState);
          saveState(encounterState);
          renderCards(panel);
          syncRoundAndTurn(panel);
        } else if (action === "edit") {
          const newName = window.prompt("Rename encounter:", enc.name || "");
          if (!newName) return;
          enc.name = newName.trim();
          saveState(encounterState);
          renderLibrary(panel);
        } else if (action === "duplicate") {
          const copy = {
            id: `e_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            name: (enc.name || "Encounter") + " (copy)",
            createdAt: Date.now(),
            combatants: enc.combatants.map(c => ({ ...c }))
          };
          encounterState.savedEncounters.push(copy);
          saveState(encounterState);
          renderLibrary(panel);
        } else if (action === "delete") {
          const ok = window.confirm(`Delete encounter “${enc.name}”?`);
          if (!ok) return;
          encounterState.savedEncounters = encounterState.savedEncounters.filter(e => e.id !== encId);
          saveState(encounterState);
          renderLibrary(panel);
        }
      });
    }
  }

  function syncRoundAndTurn(panel) {
    const roundInput = panel.querySelector("#encRoundInput");
    const currentTurnInput = panel.querySelector("#encCurrentTurnInput");

    if (roundInput) {
      roundInput.value = String(encounterState.round || 1);
    }

    const active = getActiveCombatant(encounterState);
    if (currentTurnInput) {
      currentTurnInput.value = active ? active.name || "" : "";
    }
  }

  function renderCards(panel) {
    const container = panel.querySelector("#encCardsContainer");
    const emptyMsg = panel.querySelector("#encCardsEmpty");
    if (!container) return;

    container.innerHTML = "";
    const list = encounterState.combatants;
    if (!list.length) {
      if (emptyMsg) emptyMsg.style.display = "block";
      return;
    }
    if (emptyMsg) emptyMsg.style.display = "none";

    const active = getActiveCombatant(encounterState);
    const activeId = active ? active.id : null;

    const frag = document.createDocumentFragment();

    list.forEach(c => {
      const card = document.createElement("div");
      card.className = "card " + (c.type === "PC" ? "pc-card" : c.type === "NPC" ? "npc-card" : "enemy-card");
      if (c.hpCurrent <= 0) card.classList.add("downed");
      if (c.id === activeId) card.classList.add("active-turn");
      card.dataset.id = c.id;

      const initial = (c.name || "?").trim().charAt(0).toUpperCase() || "?";
      const hpCurrent = Number.isFinite(c.hpCurrent) ? c.hpCurrent : 0;
      const hpMax = Number.isFinite(c.hpMax) ? c.hpMax : 0;
      const ac = Number.isFinite(c.ac) ? c.ac : 0;
      const spd = Number.isFinite(c.speed) ? c.speed : 0;

      card.innerHTML = `
        <div class="card-main">
          <div class="card-portrait" title="Portrait">
            ${initial}
          </div>
          <div class="card-content">
            <div class="name-block">
              <div class="name-row">
                <span class="card-name">${c.name || "Unnamed"}</span>
                <span class="card-tag">${c.type || ""}</span>
              </div>
            </div>

            <div class="hp-block">
              <span class="hp-label">HP: ${hpCurrent} / <strong>${hpMax}</strong></span>
              <input class="hp-amount-input" type="text" placeholder="">
              <div class="hp-buttons">
                <button class="btn btn-xs">Damage</button>
                <button class="btn btn-secondary btn-xs">Heal</button>
              </div>
            </div>

            <div class="card-meta">
              <div class="card-meta-top">
                <span>AC: ${ac}</span>
                <span>Spd: ${spd} ft</span>
                <button class="btn-icon" title="Remove">×</button>
              </div>
            </div>
          </div>
        </div>
      `;
      frag.appendChild(card);
    });

    container.appendChild(frag);
  }

  function renderLibrary(panel) {
    const listEl = panel.querySelector("#encLibraryList");
    if (!listEl) return;

    listEl.innerHTML = "";

    const list = encounterState.savedEncounters;
    if (!list.length) {
      listEl.innerHTML = `<div class="muted" style="font-size:0.78rem;">
        No encounters saved yet. Build a fight in the Active tab, then click “Save current as new encounter”.
      </div>`;
      return;
    }

    const frag = document.createDocumentFragment();

    list
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .forEach(enc => {
        const row = document.createElement("div");
        row.className = "encounter-row";
        row.dataset.id = enc.id;

        const pcs = enc.combatants.filter(c => c.type === "PC").length;
        const npcs = enc.combatants.filter(c => c.type === "NPC").length;
        const enemies = enc.combatants.filter(c => c.type === "Enemy").length;
        const parts = [];
        if (pcs) parts.push(`${pcs}x PC`);
        if (npcs) parts.push(`${npcs}x NPC`);
        if (enemies) parts.push(`${enemies}x Enemy`);
        const tagsText = parts.length ? parts.join(" · ") : `${enc.combatants.length} combatant(s)`;

        row.innerHTML = `
          <div class="encounter-row-header">
            <div>
              <div class="encounter-name">${enc.name || "Encounter"}</div>
              <div class="encounter-tags">${tagsText}</div>
            </div>
          </div>
          <div class="encounter-actions">
            <button class="btn btn-xs" data-action="load">Load as active</button>
            <button class="btn btn-secondary btn-xs" data-action="append">Append to active</button>
            <button class="btn btn-secondary btn-xs" data-action="edit">Edit</button>
            <button class="btn btn-secondary btn-xs" data-action="duplicate">Duplicate</button>
            <button class="btn btn-secondary btn-xs" data-action="delete">Delete</button>
          </div>
        `;
        frag.appendChild(row);
      });

    listEl.appendChild(frag);
  }

  function syncUiFromState(panel) {
    syncRoundAndTurn(panel);
    renderCards(panel);
    renderLibrary(panel);
  }

  // ---- PATCH renderToolPanel ----
  function patchRenderToolPanel() {
    if (typeof window.renderToolPanel !== "function") return;
    const base = window.renderToolPanel;
    window.renderToolPanel = function (toolId) {
      if (toolId === "encounter") {
        const label = document.getElementById("activeGeneratorLabel");
        const panel = document.getElementById("generatorPanel");
        if (label) label.textContent = "Encounter / Initiative";
        if (panel) renderEncounterTool(panel);
        return;
      }
      return base(toolId);
    };
  }

  // ---- INIT ----
  registerEncounterTool();
  patchRenderToolPanel();
})();
