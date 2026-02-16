// tool-encounter.js
// Encounter / Initiative tool for Vrahune Toolbox
(function () {
  if (window.__vrahuneEncounterToolActive) return;
  window.__vrahuneEncounterToolActive = true;

  const TOOL_ID = "encounterTool";
  const TOOL_NAME = "Encounter / Initiative";
  const STORAGE_KEY = "vrahuneEncounterToolStateV6";
  const LEGACY_KEYS = ["vrahuneEncounterToolStateV4", "vrahuneEncounterToolStateV3", "vrahuneEncounterToolStateV2"];

  function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function intOr(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function initialParties() {
    return [
      {
        id: uid("party"),
        name: "Frostclaw Cell",
        members: [
          { id: uid("m"), name: "Vesper", type: "PC", ac: 16, speed: 30, hpCurrent: 27, hpMax: 35 },
          { id: uid("m"), name: "Arelix", type: "PC", ac: 15, speed: 30, hpCurrent: 31, hpMax: 31 },
          { id: uid("m"), name: "Lirael", type: "PC", ac: 14, speed: 30, hpCurrent: 24, hpMax: 24 },
          { id: uid("m"), name: "Thamar", type: "PC", ac: 18, speed: 25, hpCurrent: 39, hpMax: 39 }
        ]
      }
    ];
  }

  function mkCombatant(raw = {}) {
    const hpMax = Math.max(0, intOr(raw.hpMax, 10));
    const hpCurrent = clamp(intOr(raw.hpCurrent, hpMax), 0, hpMax);
    const type = ["PC", "NPC", "Enemy"].includes(raw.type) ? raw.type : "NPC";
    const initiative = Math.max(0, intOr(raw.initiative, 10));

    return {
      id: raw.id || uid("c"),
      name: String(raw.name || "Unnamed").trim() || "Unnamed",
      type,
      initiative,
      ac: Math.max(0, intOr(raw.ac, 10)),
      speed: Math.max(0, intOr(raw.speed, 30)),
      hpCurrent,
      hpMax
    };
  }

  function cloneCombatant(c, withFreshId = false) {
    return mkCombatant({ ...c, id: withFreshId ? uid("c") : c.id || uid("c") });
  }

  function summarizeEncounter(enc) {
    if (!enc || !Array.isArray(enc.combatants) || !enc.combatants.length) {
      return "No combatants";
    }
    const countByType = enc.combatants.reduce((acc, c) => {
      const k = c.type || "NPC";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const parts = [];
    if (countByType.PC) parts.push(`${countByType.PC}x PC`);
    if (countByType.NPC) parts.push(`${countByType.NPC}x NPC`);
    if (countByType.Enemy) parts.push(`${countByType.Enemy}x Enemy`);
    return parts.join(" · ");
  }

  function initialLibrary() {
    return [
      {
        id: uid("enc"),
        name: "Bandits on the Old Road",
        tags: "CR ~3",
        location: "Verdant Veil · Old trade route",
        combatants: [
          mkCombatant({ name: "Bandit Captain", type: "Enemy", ac: 15, speed: 30, hpCurrent: 65, hpMax: 65 }),
          mkCombatant({ name: "Bandit", type: "Enemy", ac: 12, speed: 30, hpCurrent: 11, hpMax: 11 }),
          mkCombatant({ name: "Bandit", type: "Enemy", ac: 12, speed: 30, hpCurrent: 11, hpMax: 11 }),
          mkCombatant({ name: "Bandit", type: "Enemy", ac: 12, speed: 30, hpCurrent: 11, hpMax: 11 })
        ]
      },
      {
        id: uid("enc"),
        name: "Frostclaw Gulf Patrol",
        tags: "Ambush",
        location: "Frostclaw Wilds · Coastal ice",
        combatants: [
          mkCombatant({ name: "Frostclaw Wolf", type: "Enemy", ac: 13, speed: 40, hpCurrent: 55, hpMax: 55 }),
          mkCombatant({ name: "Frostclaw Wolf", type: "Enemy", ac: 13, speed: 40, hpCurrent: 55, hpMax: 55 }),
          mkCombatant({ name: "Clan Hunter", type: "NPC", ac: 14, speed: 30, hpCurrent: 32, hpMax: 32 })
        ]
      }
    ];
  }

  function defaultState() {
    const parties = initialParties();
    const activeCombatants = [
      mkCombatant({ name: "Vesper", type: "PC", ac: 16, speed: 30, hpCurrent: 27, hpMax: 35 }),
      mkCombatant({ name: "Frostclaw Wolf", type: "Enemy", ac: 13, speed: 40, hpCurrent: 55, hpMax: 55 }),
      mkCombatant({ name: "Bandit Captain", type: "Enemy", ac: 15, speed: 30, hpCurrent: 0, hpMax: 65 })
    ];

    return {
      tab: "active",
      round: 3,
      turnIndex: 0,
      activeEncounterName: "Current Encounter",
      activeLibraryId: null,
      activeCombatants,
      addExpanded: true,
      partyManagerOpen: false,
      selectedPartyId: parties[0]?.id || null,
      parties,
      library: initialLibrary(),
      createName: "",
      createTags: "",
      createLocation: "",
      libraryEditId: null,
      // add form for active
      addDraft: {
        name: "",
        type: "NPC",
        initiative: 10,
        ac: 15,
        speed: 30,
        hpCurrent: 12,
        hpMax: 12
      },
      libraryAddDraft: {
        name: "",
        type: "Enemy",
        initiative: 10,
        ac: 13,
        speed: 30,
        hpCurrent: 10,
        hpMax: 10
      },
      // editor modal
      editorOpen: false,
      editorEncounterId: null,
      editor: {
        name: "",
        tags: "",
        location: "",
        combatants: [],
        addDraft: { name: "", type: "Enemy", initiative: 10, ac: 13, speed: 30, hpCurrent: 10, hpMax: 10 }
      }
    };
  }

  function normalizeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;

    const state = { ...base, ...raw };

    state.tab = state.tab === "library" ? "library" : "active";
    state.round = Math.max(1, intOr(state.round, 1));
    state.turnIndex = Math.max(0, intOr(state.turnIndex, 0));
    state.activeEncounterName = String(state.activeEncounterName || "Current Encounter");
    state.activeLibraryId = state.activeLibraryId || null;
    state.addExpanded = state.addExpanded !== false;
    state.partyManagerOpen = !!state.partyManagerOpen;

    state.activeCombatants = Array.isArray(state.activeCombatants)
      ? state.activeCombatants.map((c) => mkCombatant(c))
      : [];

    if (state.activeCombatants.length === 0) {
      state.turnIndex = 0;
    } else {
      state.turnIndex = clamp(state.turnIndex, 0, state.activeCombatants.length - 1);
    }

    state.parties = Array.isArray(state.parties)
      ? state.parties.map((p) => ({
          id: p.id || uid("party"),
          name: String(p.name || "Party"),
          members: Array.isArray(p.members) ? p.members.map((m) => mkCombatant({ ...m, id: m.id || uid("m") })) : []
        }))
      : base.parties;

    if (!state.parties.length) {
      state.parties = base.parties;
    }

    if (!state.selectedPartyId || !state.parties.some((p) => p.id === state.selectedPartyId)) {
      state.selectedPartyId = state.parties[0]?.id || null;
    }

    state.library = Array.isArray(state.library)
      ? state.library.map((e) => ({
          id: e.id || uid("enc"),
          name: String(e.name || "Untitled Encounter"),
          tags: String(e.tags || ""),
          location: String(e.location || ""),
          combatants: Array.isArray(e.combatants) ? e.combatants.map((c) => mkCombatant(c)) : []
        }))
      : base.library;

    if (state.activeLibraryId && !state.library.some((e) => e.id === state.activeLibraryId)) {
      state.activeLibraryId = null;
    }

    state.createName = String(state.createName || "");
    state.createTags = String(state.createTags || "");
    state.createLocation = String(state.createLocation || "");
    state.libraryEditId = state.libraryEditId || null;
    if (state.libraryEditId && !state.library.some((e) => e.id === state.libraryEditId)) {
      state.libraryEditId = null;
    }

    state.addDraft = {
      name: String(state.addDraft?.name || ""),
      type: ["PC", "NPC", "Enemy"].includes(state.addDraft?.type) ? state.addDraft.type : "NPC",
      initiative: Math.max(0, intOr(state.addDraft?.initiative, 10)),
      ac: Math.max(0, intOr(state.addDraft?.ac, 15)),
      speed: Math.max(0, intOr(state.addDraft?.speed, 30)),
      hpCurrent: Math.max(0, intOr(state.addDraft?.hpCurrent, 10)),
      hpMax: Math.max(0, intOr(state.addDraft?.hpMax, 10))
    };

    state.libraryAddDraft = {
      name: String(state.libraryAddDraft?.name || ""),
      type: ["PC", "NPC", "Enemy"].includes(state.libraryAddDraft?.type) ? state.libraryAddDraft.type : "Enemy",
      initiative: Math.max(0, intOr(state.libraryAddDraft?.initiative, 10)),
      ac: Math.max(0, intOr(state.libraryAddDraft?.ac, 13)),
      speed: Math.max(0, intOr(state.libraryAddDraft?.speed, 30)),
      hpCurrent: Math.max(0, intOr(state.libraryAddDraft?.hpCurrent, 10)),
      hpMax: Math.max(0, intOr(state.libraryAddDraft?.hpMax, 10))
    };

    state.editorOpen = !!state.editorOpen;
    state.editorEncounterId = state.editorEncounterId || null;
    const ed = state.editor || {};
    state.editor = {
      name: String(ed.name || ""),
      tags: String(ed.tags || ""),
      location: String(ed.location || ""),
      combatants: Array.isArray(ed.combatants) ? ed.combatants.map((c) => mkCombatant(c)) : [],
      addDraft: {
        name: String(ed.addDraft?.name || ""),
        type: ["PC", "NPC", "Enemy"].includes(ed.addDraft?.type) ? ed.addDraft.type : "Enemy",
        initiative: Math.max(0, intOr(ed.addDraft?.initiative, 10)),
        ac: Math.max(0, intOr(ed.addDraft?.ac, 13)),
        speed: Math.max(0, intOr(ed.addDraft?.speed, 30)),
        hpCurrent: Math.max(0, intOr(ed.addDraft?.hpCurrent, 10)),
        hpMax: Math.max(0, intOr(ed.addDraft?.hpMax, 10))
      }
    };

    return state;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalizeState(JSON.parse(raw));
      for (const key of LEGACY_KEYS) {
        const oldRaw = localStorage.getItem(key);
        if (oldRaw) return normalizeState(JSON.parse(oldRaw));
      }
    } catch (err) {
      console.warn("Encounter tool: failed to load state", err);
    }
    return defaultState();
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Encounter tool: failed to save state", err);
    }
  }

  function registerEncounterTool() {
    const def = {
      id: TOOL_ID,
      name: TOOL_NAME,
      description: "Quick initiative tracker & encounter builder.",
      render: renderEncounterTool
    };

    if (typeof window.registerTool === "function") {
      window.registerTool(def);
      return;
    }

    window.toolsConfig = window.toolsConfig || [];
    const exists = window.toolsConfig.some((t) => t.id === TOOL_ID);
    if (!exists) {
      window.toolsConfig.push({ id: TOOL_ID, name: TOOL_NAME, description: def.description });
    }
  }

  function injectPanelOverrideCss() {
    const id = "encounter-tool-panel-overrides";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      #generatorPanel.encounter-tool-panel {
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
        overflow: visible !important;
      }
    `;
    document.head.appendChild(style);
  }

  function renderEncounterTool() {
    const label = document.getElementById("activeGeneratorLabel");
    const panel = document.getElementById("generatorPanel");
    if (!panel) return;

    if (label) label.textContent = TOOL_NAME;

    panel.innerHTML = "";
    panel.classList.add("encounter-tool-panel");

    const host = document.createElement("div");
    host.style.display = "block";
    host.style.width = "100%";
    panel.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    const state = loadState();

    const app = createApp(shadow, state);
    app.render();
  }

  function createApp(shadow, initial) {
    const state = initial;
    let dragActiveId = null;
    let dragEditorId = null;

    function getSelectedParty() {
      return state.parties.find((p) => p.id === state.selectedPartyId) || null;
    }

    function currentTurnName() {
      if (!state.activeCombatants.length) return "—";
      const idx = clamp(state.turnIndex, 0, state.activeCombatants.length - 1);
      return state.activeCombatants[idx]?.name || "—";
    }

    function tagClass(type) {
      if (type === "PC") return "pc-card";
      if (type === "Enemy") return "enemy-card";
      return "npc-card";
    }

    function initials(name) {
      const s = String(name || "?").trim();
      if (!s) return "?";
      const parts = s.split(/\s+/).slice(0, 2);
      return parts.map((p) => p.charAt(0).toUpperCase()).join("");
    }

    function moveItem(arr, fromId, toId) {
      if (!Array.isArray(arr) || !fromId || !toId || fromId === toId) return arr;
      const from = arr.findIndex((x) => x.id === fromId);
      const to = arr.findIndex((x) => x.id === toId);
      if (from < 0 || to < 0) return arr;
      const copy = [...arr];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    }

    function moveToEnd(arr, fromId) {
      const i = arr.findIndex((x) => x.id === fromId);
      if (i < 0) return arr;
      const copy = [...arr];
      const [item] = copy.splice(i, 1);
      copy.push(item);
      return copy;
    }

    function sortByInitiativeDesc(arr) {
      return [...arr].sort((a, b) => {
        const diff = intOr(b.initiative, 0) - intOr(a.initiative, 0);
        return diff;
      });
    }


    function serializeActiveAsEncounter(existing = null) {
      const baseName = state.activeEncounterName?.trim() || "Current Encounter";
      return {
        id: existing?.id || uid("enc"),
        name: existing?.name || baseName,
        tags: existing?.tags || "",
        location: existing?.location || "",
        combatants: state.activeCombatants.map((c) => cloneCombatant(c, true))
      };
    }

    function ensureTurnIndex() {
      if (!state.activeCombatants.length) {
        state.turnIndex = 0;
      } else {
        state.turnIndex = clamp(state.turnIndex, 0, state.activeCombatants.length - 1);
      }
    }

    function openEditor(encounter) {
      const enc = encounter || { id: null, name: "", tags: "", location: "", combatants: [] };
      state.editorOpen = true;
      state.editorEncounterId = enc.id || null;
      state.editor = {
        name: enc.name || "",
        tags: enc.tags || "",
        location: enc.location || "",
        combatants: (enc.combatants || []).map((c) => cloneCombatant(c, true)),
        addDraft: { name: "", type: "Enemy", initiative: 10, ac: 13, speed: 30, hpCurrent: 10, hpMax: 10 }
      };
      persistAndRender();
    }

    function closeEditor() {
      state.editorOpen = false;
      state.editorEncounterId = null;
      persistAndRender();
    }

    function persistAndRender() {
      saveState(state);
      render();
    }

    function renderTopTabs() {
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div class="tabs-row">
            <button class="tab ${state.tab === "active" ? "active" : ""}" data-tab="active">Active Encounter</button>
            <button class="tab ${state.tab === "library" ? "active" : ""}" data-tab="library">Encounter Library</button>
          </div>
          <div class="hint-text">Use this for combat, chases, stealth runs, or social scenes with turns.</div>
        </div>
      `;
    }

    function renderPartyManager(party) {
      if (!party || !state.partyManagerOpen) return "";

      const rows = party.members
        .map((m, i) => {
          return `
            <div class="row" data-party-member-row="${esc(m.id)}">
              <div class="col"><label>Name</label><input type="text" data-party-field="name" data-member-id="${esc(m.id)}" value="${esc(m.name)}"></div>
              <div class="col" style="max-width:85px;"><label>Type</label>
                <select data-party-field="type" data-member-id="${esc(m.id)}">
                  <option ${m.type === "PC" ? "selected" : ""}>PC</option>
                  <option ${m.type === "NPC" ? "selected" : ""}>NPC</option>
                  <option ${m.type === "Enemy" ? "selected" : ""}>Enemy</option>
                </select>
              </div>
              <div class="col" style="max-width:78px;"><label>Init</label><input type="number" min="0" data-party-field="initiative" data-member-id="${esc(m.id)}" value="${intOr(m.initiative, 0)}"></div>
              <div class="col" style="max-width:70px;"><label>AC</label><input type="number" min="0" data-party-field="ac" data-member-id="${esc(m.id)}" value="${m.ac}"></div>
              <div class="col" style="max-width:90px;"><label>Speed</label><input type="number" min="0" data-party-field="speed" data-member-id="${esc(m.id)}" value="${m.speed}"></div>
              <div class="col" style="max-width:90px;"><label>HP Cur</label><input type="number" min="0" data-party-field="hpCurrent" data-member-id="${esc(m.id)}" value="${m.hpCurrent}"></div>
              <div class="col" style="max-width:90px;"><label>HP Max</label><input type="number" min="0" data-party-field="hpMax" data-member-id="${esc(m.id)}" value="${m.hpMax}"></div>
              <div class="col" style="max-width:62px;"><label>&nbsp;</label><button class="btn btn-secondary btn-xs" data-party-remove="${esc(m.id)}">×</button></div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="boxed-subsection" style="margin-top:6px;">
          <div class="boxed-subsection-header">
            <div class="boxed-subsection-title">Manage party preset</div>
            <span class="hint-text">Preset AC / speed / HP used by quick add and add full party.</span>
          </div>

          <div class="row">
            <div class="col" style="max-width:300px;">
              <label>Party name</label>
              <input type="text" id="partyNameInput" value="${esc(party.name)}">
            </div>
            <div class="col" style="max-width:120px;">
              <label>&nbsp;</label>
              <button class="btn btn-xs" id="partyAddMemberBtn">+ Add member</button>
            </div>
          </div>
          ${rows || `<div class="hint-text">No party members yet.</div>`}
        </div>
      `;
    }

    function renderActiveTab() {
      const party = getSelectedParty();
      const addExpanded = !!state.addExpanded;

      const addSectionBody = addExpanded
        ? `
          <div class="row">
            <div class="col">
              <label>Name</label>
              <input type="text" id="addName" placeholder="Vesper, Goblin Scout, Frostclaw Wolf" value="${esc(state.addDraft.name)}">
            </div>
            <div class="col" style="max-width:85px;">
              <label>Init</label>
              <input type="number" min="0" id="addInit" value="${state.addDraft.initiative}">
            </div>
            <div class="col" style="max-width:85px;">
              <label>AC</label>
              <input type="number" min="0" id="addAC" value="${state.addDraft.ac}">
            </div>
            <div class="col" style="max-width:110px;">
              <label>Speed (ft)</label>
              <input type="number" min="0" id="addSpeed" value="${state.addDraft.speed}">
            </div>
            <div class="col" style="max-width:178px;">
              <label>HP (current / max)</label>
              <div style="display:flex; gap:4px;">
                <input type="number" min="0" id="addHpCur" value="${state.addDraft.hpCurrent}">
                <input type="number" min="0" id="addHpMax" value="${state.addDraft.hpMax}">
              </div>
            </div>
            <div class="col" style="max-width:110px;">
              <label>Type</label>
              <select id="addType">
                <option ${state.addDraft.type === "PC" ? "selected" : ""}>PC</option>
                <option ${state.addDraft.type === "NPC" ? "selected" : ""}>NPC</option>
                <option ${state.addDraft.type === "Enemy" ? "selected" : ""}>Enemy</option>
              </select>
            </div>
            <div class="col" style="max-width:92px;">
              <label>&nbsp;</label>
              <button class="btn btn-xs" id="addCombatantBtn">Add</button>
            </div>
          </div>

          <div class="party-strip">
            <div class="party-row">
              <span class="party-name">Saved party: ${esc(party?.name || "None")}</span>
              <span class="hint-text">Click + to add one, or add all at once.</span>
            </div>
            <div class="party-row">
              ${party
                ? party.members
                    .map(
                      (m) => `<div class="party-chip">${esc(m.name)} <button title="Add to encounter" data-party-add-one="${esc(
                        m.id
                      )}">+</button></div>`
                    )
                    .join("")
                : `<span class="hint-text">No members in selected party.</span>`}
              <button class="btn btn-xs" id="addFullPartyBtn">Add full party</button>
              <button class="btn btn-secondary btn-xs" id="togglePartyManagerBtn">${state.partyManagerOpen ? "Hide" : "Manage"} party</button>
            </div>
          </div>

          ${renderPartyManager(party)}
        `
        : "";

      const cards = state.activeCombatants
        .map((c, i) => {
          const active = i === state.turnIndex;
          const downed = c.hpCurrent <= 0;
          const typeClass = tagClass(c.type);
          return `
            <div class="card ${typeClass} ${active ? "active-turn" : ""} ${downed ? "downed" : ""}" draggable="true" data-card-id="${esc(c.id)}">
              <div class="card-main">
                <div class="card-portrait" title="Portrait">${esc(initials(c.name))}</div>
                <div class="card-content">
                  <div class="name-block">
                    <div class="name-row">
                      <input class="card-name-input" data-card-field="name" data-card-id="${esc(c.id)}" value="${esc(c.name)}" />
                      <select class="card-type-input" data-card-field="type" data-card-id="${esc(c.id)}">
                        <option ${c.type === "PC" ? "selected" : ""}>PC</option>
                        <option ${c.type === "NPC" ? "selected" : ""}>NPC</option>
                        <option ${c.type === "Enemy" ? "selected" : ""}>Enemy</option>
                      </select>
                    </div>
                  </div>

                  <div class="hp-block">
                    <span class="hp-label">HP:</span>
                    <input class="tiny-num" type="number" min="0" data-card-field="hpCurrent" data-card-id="${esc(c.id)}" value="${c.hpCurrent}">
                    <span>/</span>
                    <input class="tiny-num" type="number" min="0" data-card-field="hpMax" data-card-id="${esc(c.id)}" value="${c.hpMax}">

                    <input class="hp-amount-input" type="number" min="1" step="1" placeholder="1" data-amount-for="${esc(c.id)}">
                    <div class="hp-buttons">
                      <button class="btn btn-xs" data-dmg="${esc(c.id)}">Damage</button>
                      <button class="btn btn-secondary btn-xs" data-heal="${esc(c.id)}">Heal</button>
                    </div>
                  </div>

                  <div class="card-meta">
                    <div class="card-meta-top">
                      <div class="meta-group meta-init-group">
                        <span>Init</span>
                        <input class="tiny-num" type="number" min="0" data-card-field="initiative" data-card-id="${esc(c.id)}" value="${intOr(c.initiative, 0)}">
                      </div>
                      <div class="meta-stack">
                        <div class="meta-group">
                          <span>AC</span>
                          <input class="tiny-num" type="number" min="0" data-card-field="ac" data-card-id="${esc(c.id)}" value="${c.ac}">
                        </div>
                        <div class="meta-group">
                          <span>Spd</span>
                          <input class="tiny-num" type="number" min="0" data-card-field="speed" data-card-id="${esc(c.id)}" value="${c.speed}">
                        </div>
                      </div>
                      <button class="btn-icon" title="Remove" data-remove-card="${esc(c.id)}">×</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="section-heading-row">
          <div class="section-title">Active Encounter</div>
          <div class="hint-text">Round & turn tracking with compact, draggable cards.</div>
        </div>

        <div class="row">
          <div class="col" style="max-width:220px;">
            <label>Encounter name</label>
            <input type="text" id="activeEncounterName" value="${esc(state.activeEncounterName)}" placeholder="Current Encounter">
          </div>
          <div class="col" style="max-width:85px;">
            <label>Round</label>
            <input type="number" id="roundInput" min="1" value="${state.round}">
          </div>
          <div class="col">
            <label>Current turn</label>
            <input type="text" value="${esc(currentTurnName())}" readonly>
          </div>
          <div class="col" style="display:flex; gap:4px; justify-content:flex-end; max-width:320px;">
            <button class="btn btn-secondary btn-xs" id="prevTurnBtn">Previous turn</button>
            <button class="btn btn-xs" id="nextTurnBtn">Next turn</button>
            <button class="btn btn-secondary btn-xs" id="nextRoundBtn">Next round</button>
          </div>
        </div>

        <div class="boxed-subsection">
          <div class="boxed-subsection-header">
            <button class="btn btn-secondary btn-xs" id="toggleAddSectionBtn" style="gap:8px; border-radius:8px;">
              <span class="chevron">${addExpanded ? "▾" : "▸"}</span>
              <span>Add / edit combatants</span>
            </button>
            <span class="hint-text">Preload monsters or drop in ad-hoc PCs/NPCs.</span>
          </div>
          ${addSectionBody}
        </div>

        <div class="initiative-box">
          <div class="section-heading-row">
            <div class="section-title">Turn order</div>
            <div class="hint-text">Drag cards up/down to set initiative. Top goes first.</div>
          </div>
          <div class="initiative-list" id="initiativeList">
            ${cards || `<div class="hint-text">No combatants yet. Add one above or from party presets.</div>`}
          </div>
        </div>
      `;
    }

    
    
function renderLibraryTab() {
  const party = getSelectedParty();
  const editingId = state.libraryEditId;

  const rows = state.library
    .map((enc) => {
      const isActive = enc.id === state.activeLibraryId;
      const isEditing = enc.id === editingId;
      const namesList = enc.combatants.length
        ? enc.combatants.map((c) => c.name).join(" · ")
        : "No combatants saved";

      const editorCards = isEditing
        ? enc.combatants
            .map((c) => {
              const downed = c.hpCurrent <= 0;
              return `
                <div class="card ${tagClass(c.type)} ${downed ? "downed" : ""}" draggable="true" data-lib-card-id="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}">
                  <div class="card-main">
                    <div class="card-portrait">${esc(initials(c.name))}</div>
                    <div class="card-content">
                      <div class="name-block">
                        <div class="name-row">
                          <input class="card-name-input" data-lib-card-field="name" data-lib-card-id="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}" value="${esc(c.name)}" />
                          <select class="card-type-input" data-lib-card-field="type" data-lib-card-id="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}">
                            <option ${c.type === "PC" ? "selected" : ""}>PC</option>
                            <option ${c.type === "NPC" ? "selected" : ""}>NPC</option>
                            <option ${c.type === "Enemy" ? "selected" : ""}>Enemy</option>
                          </select>
                        </div>
                      </div>
                      <div class="hp-block">
                        <span class="hp-label">HP:</span>
                        <input class="tiny-num" type="number" min="0" data-lib-card-field="hpCurrent" data-lib-card-id="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}" value="${c.hpCurrent}">
                        <span>/</span>
                        <input class="tiny-num" type="number" min="0" data-lib-card-field="hpMax" data-lib-card-id="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}" value="${c.hpMax}">
                      </div>
                      <div class="card-meta">
                        <div class="card-meta-top">
                          <div class="meta-group meta-init-group">
                            <span>Init</span>
                            <input class="tiny-num" type="number" min="0" data-lib-card-field="initiative" data-lib-card-id="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}" value="${intOr(c.initiative, 0)}">
                          </div>
                          <div class="meta-stack">
                            <div class="meta-group">
                              <span>AC</span>
                              <input class="tiny-num" type="number" min="0" data-lib-card-field="ac" data-lib-card-id="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}" value="${c.ac}">
                            </div>
                            <div class="meta-group">
                              <span>Spd</span>
                              <input class="tiny-num" type="number" min="0" data-lib-card-field="speed" data-lib-card-id="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}" value="${c.speed}">
                            </div>
                          </div>
                          <button class="btn-icon" title="Remove" data-lib-remove-card="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}">×</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            })
            .join("")
        : "";

      const editBlock = isEditing
        ? `
          <div class="boxed-subsection">
            <div class="row">
              <div class="col"><label>Name</label><input type="text" data-lib-enc-field="name" data-lib-enc-id="${esc(enc.id)}" value="${esc(enc.name)}"></div>
              <div class="col"><label>Location</label><input type="text" data-lib-enc-field="location" data-lib-enc-id="${esc(enc.id)}" value="${esc(enc.location || "")}"></div>
            </div>

            <div class="boxed-subsection">
              <div class="boxed-subsection-header">
                <div class="boxed-subsection-title">Quick add from party</div>
                <span class="hint-text">Uses your saved party preset stats.</span>
              </div>
              <div class="party-row">
                <span class="party-name">${esc(party?.name || "No party selected")}</span>
                ${
                  party
                    ? party.members
                        .map(
                          (m) =>
                            `<div class="party-chip">${esc(m.name)} <button data-lib-add-party-one="${esc(
                              m.id
                            )}" data-lib-enc-id="${esc(enc.id)}" title="Add">+</button></div>`
                        )
                        .join("")
                    : ""
                }
                <button class="btn btn-xs" data-lib-add-full-party="${esc(enc.id)}">Add full party</button>
              </div>
            </div>

            <div class="boxed-subsection">
              <div class="boxed-subsection-header">
                <div class="boxed-subsection-title">Add combatant</div>
                <span class="hint-text">Auto-sorts by highest initiative when added. Drag to reorder anytime.</span>
              </div>
              <div class="row">
                <div class="col"><label>Name</label><input type="text" id="libAddName_${esc(enc.id)}" value="${esc(state.libraryAddDraft.name)}" placeholder="Goblin, Veteran, Mage"></div>
                <div class="col" style="max-width:84px;"><label>Type</label>
                  <select id="libAddType_${esc(enc.id)}">
                    <option ${state.libraryAddDraft.type === "PC" ? "selected" : ""}>PC</option>
                    <option ${state.libraryAddDraft.type === "NPC" ? "selected" : ""}>NPC</option>
                    <option ${state.libraryAddDraft.type === "Enemy" ? "selected" : ""}>Enemy</option>
                  </select>
                </div>
                <div class="col" style="max-width:76px;"><label>Init</label><input type="number" min="0" id="libAddInit_${esc(enc.id)}" value="${state.libraryAddDraft.initiative}"></div>
                <div class="col" style="max-width:70px;"><label>AC</label><input type="number" min="0" id="libAddAC_${esc(enc.id)}" value="${state.libraryAddDraft.ac}"></div>
                <div class="col" style="max-width:90px;"><label>Speed</label><input type="number" min="0" id="libAddSpeed_${esc(enc.id)}" value="${state.libraryAddDraft.speed}"></div>
                <div class="col" style="max-width:88px;"><label>HP Cur</label><input type="number" min="0" id="libAddHpCur_${esc(enc.id)}" value="${state.libraryAddDraft.hpCurrent}"></div>
                <div class="col" style="max-width:88px;"><label>HP Max</label><input type="number" min="0" id="libAddHpMax_${esc(enc.id)}" value="${state.libraryAddDraft.hpMax}"></div>
                <div class="col" style="max-width:80px;"><label>&nbsp;</label><button class="btn btn-xs" data-lib-add-combatant="${esc(enc.id)}">Add</button></div>
              </div>
            </div>

            <div class="initiative-box">
              <div class="section-heading-row">
                <div class="section-title">Encounter combatants (${enc.combatants.length})</div>
                <div class="hint-text">Drag to reorder.</div>
              </div>
              <div class="initiative-list" data-lib-initiative-list="${esc(enc.id)}">
                ${editorCards || `<div class="hint-text">No combatants yet.</div>`}
              </div>
            </div>
          </div>
        `
        : "";

      return `
        <div class="encounter-row ${isEditing ? "editing" : ""}" data-library-id="${esc(enc.id)}">
          <div class="encounter-row-header">
            <div>
              <div class="encounter-name">${esc(enc.name)}</div>
              <div class="hint-text">${enc.location ? esc(enc.location) : "No location set"}</div>
              <div class="encounter-members">${esc(namesList)}</div>
            </div>
          </div>
          <div class="encounter-actions">
            ${
              isActive
                ? `<button class="btn btn-xs btn-active-status" type="button">Active</button>`
                : `<button class="btn btn-secondary btn-xs" data-set-active="${esc(enc.id)}">Set active</button>`
            }
            <button class="btn btn-secondary btn-xs" data-toggle-edit-library="${esc(enc.id)}">${isEditing ? "Close edit" : "Edit"}</button>
            <button class="btn btn-secondary btn-xs" data-delete-library="${esc(enc.id)}">Delete</button>
          </div>
          ${editBlock}
        </div>
      `;
    })
    .join("");

  return `
    <div class="section-heading-row">
      <div class="section-title">Encounter Library</div>
      <div class="hint-text">Prep encounters here, then set one active when combat starts.</div>
    </div>

    <div class="boxed-subsection">
      <div class="boxed-subsection-header">
        <div class="boxed-subsection-title">Create encounter entry</div>
        <span class="hint-text">Name it, then save the current active combatants into the library.</span>
      </div>
      <div class="row">
        <div class="col"><label>Name</label><input type="text" id="createName" placeholder="Ruined Tower Ambush" value="${esc(state.createName)}"></div>
        <div class="col"><label>Location</label><input type="text" id="createLocation" placeholder="Onyx frontier road" value="${esc(state.createLocation)}"></div>
        <div class="col" style="max-width:180px; display:flex; gap:6px; align-items:flex-end;">
          <button class="btn btn-xs" id="createFromActiveBtn">Create from active</button>
        </div>
      </div>
    </div>

    <div class="encounter-list">
      ${rows || `<div class="hint-text">No encounters yet. Create one above.</div>`}
    </div>
  `;
}

function renderEditorModal() {
  return "";
}

    function template() {
      return `
      <style>
        :host {
          --bg-main: #050608;
          --bg-panel: #0b0f14;
          --border-subtle: #232a33;
          --accent-soft: #808890;
          --accent-strong: #f5f5f5;
          --danger: #ff5c5c;
          --text-main: #e6e6e6;
          --text-muted: #9ba1aa;
          --hover: #151a22;
          --radius-lg: 14px;
          --radius-md: 10px;
          --radius-sm: 6px;
        }

        * { box-sizing: border-box; }

        .encounter-body {
          margin: 0;
          padding: 0;
          width: 100%;
          background: radial-gradient(circle at top left, #151921 0, #050608 40%, #000000 100%);
          color: var(--text-main);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .preview-shell {
          width: 100%;
          max-width: 100%;
          background: var(--bg-panel);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
          padding: 10px 12px;
          box-shadow: 0 0 24px rgba(0,0,0,0.55);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .header-line {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }

        .title {
          font-size: 1rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent-strong);
        }

        .subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .label-pill {
          font-size: 0.76rem;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid var(--border-subtle);
          background: #05070c;
          color: var(--accent-soft);
          white-space: nowrap;
        }

        .tabs-row {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid #303641;
          overflow: hidden;
          background: #05070c;
          font-size: 0.78rem;
        }

        .tab {
          padding: 4px 12px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }

        .tab.active {
          background: #181f2b;
          color: var(--accent-strong);
        }

        .panel-inner {
          border-radius: var(--radius-md);
          border: 1px solid #222832;
          background: radial-gradient(circle at top left, #10151f, #05070c 70%);
          padding: 8px 10px;
          font-size: 0.82rem;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: calc(100vh - 190px);
          min-height: 220px;
          overflow-y: auto;
        }

        .row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: flex-end;
        }

        .col {
          flex: 1;
          min-width: 120px;
        }

        label {
          font-size: 0.76rem;
          color: var(--text-muted);
          display: block;
          margin-bottom: 3px;
        }

        input[type="text"],
        input[type="number"],
        select {
          width: 100%;
          font-family: inherit;
          font-size: 0.8rem;
          padding: 5px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: #05070c;
          color: var(--text-main);
        }

        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }

        input:focus, select:focus {
          outline: none;
          border-color: #9aa2af;
          box-shadow: 0 0 0 1px rgba(192,192,192,0.4);
        }

        .btn {
          font-family: inherit;
          font-size: 0.78rem;
          border-radius: 999px;
          border: 1px solid transparent;
          padding: 5px 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: #181f2b;
          color: var(--accent-strong);
        }
        .btn:hover { filter: brightness(1.08); }

        .btn-secondary {
          background: #080b11;
          border-color: #303641;
          color: var(--text-muted);
        }

        .btn-xs {
          font-size: 0.72rem;
          padding: 3px 8px;
        }

        .btn-icon {
          border-radius: 999px;
          border: none;
          background: transparent;
          color: var(--accent-soft);
          padding: 0 4px;
          font-size: 0.95rem;
          cursor: pointer;
        }

        .btn-icon:hover { color: #ff9999; }

        .section-divider {
          border: none;
          border-top: 1px solid #1a2028;
          margin: 4px 0;
        }

        .section-heading-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }

        .section-title { font-size: 0.82rem; color: var(--accent-soft); }
        .hint-text { font-size: 0.74rem; color: var(--text-muted); }

        .boxed-subsection {
          border-radius: 10px;
          border: 1px solid #262c37;
          background: rgba(5, 7, 12, 0.85);
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .boxed-subsection-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .boxed-subsection-title {
          font-size: 0.8rem;
          color: var(--accent-soft);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chevron { font-size: 0.9rem; color: var(--accent-soft); }

        .initiative-box {
          border-radius: 10px;
          border: 1px solid #262c37;
          background: #05070c;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .initiative-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-height: 18px;
        }

        .card {
          border-radius: 10px;
          border: 1px solid #222832;
          padding: 4px 7px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: grab;
        }

        .card.dragging { opacity: 0.45; }

        .pc-card { background: linear-gradient(120deg, #0b101c, #05070c); border-color: #2e3b57; }
        .enemy-card { background: linear-gradient(120deg, #16090d, #05070c); border-color: #4a2028; }
        .npc-card { background: linear-gradient(120deg, #101010, #05070c); border-color: #33363f; }

        .card-main { display: flex; align-items: center; gap: 8px; }

        .card-portrait {
          flex-shrink: 0;
          width: 41px;
          height: 41px;
          border-radius: 999px;
          border: 1px solid #323949;
          background: radial-gradient(circle at top left, #2a3244, #05070c);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-strong);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: default;
        }

        .enemy-card .card-portrait { background: radial-gradient(circle at top left, #3a2025, #05070c); }

        .card-content {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(140px,1.7fr) auto minmax(120px,1.1fr);
          align-items: center;
          column-gap: 8px;
        }

        .name-block { min-width: 0; }
        .name-row { display: flex; align-items: center; gap: 6px; min-width: 0; }

                .card-name-input {
          min-width: 0;
          font-weight: 640;
          font-size: 0.87rem;
          letter-spacing: 0.01em;
          padding: 3px 8px;
          border-radius: 8px;
          background: rgba(8, 12, 18, 0.7) !important;
          border: 1px solid #2f3746;
          color: #eef3ff;
          appearance: none;
          -webkit-appearance: none;
        }

        .card-name-input:hover {
          background: #0d121a !important;
          border-color: #3c4658;
        }

        .card-name-input:focus {
          background: #0f1520 !important;
          border-color: #7281a0;
          box-shadow: 0 0 0 1px rgba(140,155,180,0.25);
        }

        .card-name-input:-webkit-autofill,
        .card-name-input:-webkit-autofill:hover,
        .card-name-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #eef3ff;
          -webkit-box-shadow: 0 0 0px 1000px #0b0f16 inset;
          transition: background-color 9999s ease-out 0s;
        }

        .card-type-input {
          width: 78px;
          min-width: 78px;
          font-size: 0.72rem;
          padding: 3px 6px;
          background: #0c1118;
          border-color: #2a3240;
          color: #dbe3f3;
        }

        .hp-block {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 4px;
          justify-self: start;
          min-width: 0;
        }

        .hp-label { font-size: 0.86rem; font-weight: 600; white-space: nowrap; }

        .tiny-num {
          width: 52px !important;
          min-width: 52px;
          padding: 3px 4px !important;
          font-size: 0.75rem !important;
          text-align: center;
        }

        .hp-amount-input {
          width: 42px !important;
          min-width: 41px;
          padding: 3px 4px !important;
          font-size: 0.72rem;
          text-align: center;
        }

        .hp-buttons {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 2px;
          white-space: nowrap;
        }

        .card-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          font-size: 0.8rem;
          font-weight: 500;
          justify-self: end;
        }

        .card-meta-top { display: flex; align-items: flex-start; gap: 6px; }

        .meta-group {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .meta-group span {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .meta-stack {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: -1px;
        }

        .meta-init-group {
          min-width: 102px;
        }

        .card-meta-top .btn-icon {
          margin-left: auto;
          align-self: center;
        }

        .card.active-turn {
          border-color: #c0c0c0;
          box-shadow: 0 0 0 1px rgba(192,192,192,0.25);
          background: radial-gradient(circle at top left, #243046, #070a10);
        }

        .card.downed {
          border-color: var(--danger);
          background: #1a0506;
          opacity: 0.95;
        }

        .encounter-list {
          border-radius: 8px;
          border: 1px solid #222832;
          background: #05070c;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .encounter-row {
          border-radius: 8px;
          border: 1px solid #262c37;
          background: #080b11;
          padding: 6px;
          font-size: 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

                .encounter-row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
        }

        .encounter-name { font-weight: 600; }

        .encounter-members {
          margin-top: 2px;
          font-size: 0.76rem;
          color: #cfd5e2;
          word-break: break-word;
        }

        .btn-active-status {
          background: linear-gradient(120deg, #2d374b, #20293a);
          border: 1px solid #7385ab;
          color: #eef4ff;
          box-shadow: 0 0 0 1px rgba(128, 150, 210, 0.35), 0 0 14px rgba(128, 150, 210, 0.2);
          cursor: default;
          font-weight: 650;
        }

        .encounter-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 2px;
        }

        .party-strip {
          border-radius: 10px;
          border: 1px solid #262c37;
          background: #05070c;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .party-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
        }

        .party-name {
          font-size: 0.78rem;
          color: var(--accent-soft);
          font-weight: 500;
          margin-right: 4px;
        }

        .party-chip {
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

        .party-chip button {
          border: none;
          background: transparent;
          color: var(--accent-soft);
          font-size: 0.78rem;
          cursor: pointer;
          padding: 0 2px;
        }

        @media (max-width: 860px) {
          .card-content { grid-template-columns: 1fr; row-gap: 4px; }
          .card-meta { justify-self: start; align-items: flex-start; }
          .hp-block { justify-self: start; }
        }

        .encounter-row.editing {
          border-color: #4e5e7f;
          box-shadow: 0 0 0 1px rgba(120,140,190,0.25);
        }
      </style>

      <div class="encounter-body">
        <div class="preview-shell">
          <div class="header-line">
            <div>
              <div class="title">Encounter / Initiative</div>
              <div class="subtitle">Quick initiative tracker & encounter builder – right panel tool.</div>
            </div>
            <div class="label-pill">Tool · Functional</div>
          </div>

          ${renderTopTabs()}

          <div class="panel-inner">
            ${state.tab === "active" ? renderActiveTab() : renderLibraryTab()}
          </div>
        </div>
      </div>
      `;
    }

    function bindGeneralEvents() {
      // tabs
      shadow.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.tab = btn.getAttribute("data-tab") === "library" ? "library" : "active";
          persistAndRender();
        });
      });

      // active name & round
      const activeNameInput = shadow.getElementById("activeEncounterName");
      if (activeNameInput) {
        activeNameInput.addEventListener("input", () => {
          state.activeEncounterName = activeNameInput.value;
          saveState(state);
        });
      }

      const roundInput = shadow.getElementById("roundInput");
      if (roundInput) {
        roundInput.addEventListener("input", () => {
          state.round = Math.max(1, intOr(roundInput.value, state.round));
          saveState(state);
        });
      }

      const prevTurnBtn = shadow.getElementById("prevTurnBtn");
      if (prevTurnBtn) {
        prevTurnBtn.addEventListener("click", () => {
          if (!state.activeCombatants.length) return;
          if (state.turnIndex === 0) {
            state.turnIndex = state.activeCombatants.length - 1;
            state.round = Math.max(1, state.round - 1);
          } else {
            state.turnIndex -= 1;
          }
          persistAndRender();
        });
      }

      const nextTurnBtn = shadow.getElementById("nextTurnBtn");
      if (nextTurnBtn) {
        nextTurnBtn.addEventListener("click", () => {
          if (!state.activeCombatants.length) return;
          state.turnIndex = (state.turnIndex + 1) % state.activeCombatants.length;
          if (state.turnIndex === 0) state.round += 1;
          persistAndRender();
        });
      }

      const nextRoundBtn = shadow.getElementById("nextRoundBtn");
      if (nextRoundBtn) {
        nextRoundBtn.addEventListener("click", () => {
          state.round += 1;
          state.turnIndex = 0;
          persistAndRender();
        });
      }

      const toggleAddSectionBtn = shadow.getElementById("toggleAddSectionBtn");
      if (toggleAddSectionBtn) {
        toggleAddSectionBtn.addEventListener("click", () => {
          state.addExpanded = !state.addExpanded;
          persistAndRender();
        });
      }

      const togglePartyManagerBtn = shadow.getElementById("togglePartyManagerBtn");
      if (togglePartyManagerBtn) {
        togglePartyManagerBtn.addEventListener("click", () => {
          state.partyManagerOpen = !state.partyManagerOpen;
          persistAndRender();
        });
      }

      // add combatant draft sync
      const addInputs = [
        ["addName", "name"],
        ["addInit", "initiative"],
        ["addAC", "ac"],
        ["addSpeed", "speed"],
        ["addHpCur", "hpCurrent"],
        ["addHpMax", "hpMax"],
        ["addType", "type"]
      ];
      addInputs.forEach(([id, key]) => {
        const el = shadow.getElementById(id);
        if (!el) return;
        el.addEventListener("input", () => {
          if (key === "name" || key === "type") {
            state.addDraft[key] = el.value;
          } else {
            state.addDraft[key] = Math.max(0, intOr(el.value, state.addDraft[key]));
          }
          saveState(state);
        });
      });

      const addCombatantBtn = shadow.getElementById("addCombatantBtn");
      const addNameEl = shadow.getElementById("addName");
      if (addCombatantBtn) {
        addCombatantBtn.addEventListener("click", () => {
          const hpMax = Math.max(0, intOr(state.addDraft.hpMax, 10));
          const hpCur = clamp(intOr(state.addDraft.hpCurrent, hpMax), 0, hpMax);
          const c = mkCombatant({
            name: state.addDraft.name || "New Combatant",
            type: state.addDraft.type || "NPC",
            initiative: state.addDraft.initiative,
            ac: state.addDraft.ac,
            speed: state.addDraft.speed,
            hpCurrent: hpCur,
            hpMax
          });
          state.activeCombatants.push(c);
          state.activeCombatants = sortByInitiativeDesc(state.activeCombatants);
          state.turnIndex = 0;
          state.addDraft.name = "";
          persistAndRender();
        });
      }
      if (addNameEl) {
        addNameEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addCombatantBtn?.click();
          }
        });
      }

      // party quick-add / full add
      const party = getSelectedParty();
      if (party) {
        shadow.querySelectorAll("[data-party-add-one]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const memberId = btn.getAttribute("data-party-add-one");
            const member = party.members.find((m) => m.id === memberId);
            if (!member) return;
            state.activeCombatants.push(cloneCombatant(member, true));
            state.activeCombatants = sortByInitiativeDesc(state.activeCombatants);
            state.turnIndex = 0;
            persistAndRender();
          });
        });

        const addFullPartyBtn = shadow.getElementById("addFullPartyBtn");
        if (addFullPartyBtn) {
          addFullPartyBtn.addEventListener("click", () => {
            party.members.forEach((m) => state.activeCombatants.push(cloneCombatant(m, true)));
            state.activeCombatants = sortByInitiativeDesc(state.activeCombatants);
            state.turnIndex = 0;
            persistAndRender();
          });
        }
      }

      // party manager controls
      const partyNameInput = shadow.getElementById("partyNameInput");
      if (partyNameInput && party) {
        partyNameInput.addEventListener("input", () => {
          party.name = partyNameInput.value || "Party";
          saveState(state);
        });
      }

      const partyAddMemberBtn = shadow.getElementById("partyAddMemberBtn");
      if (partyAddMemberBtn && party) {
        partyAddMemberBtn.addEventListener("click", () => {
          party.members.push(
            mkCombatant({
              id: uid("m"),
              name: "New Member",
              type: "PC",
              initiative: 10,
              ac: 10,
              speed: 30,
              hpCurrent: 10,
              hpMax: 10
            })
          );
          persistAndRender();
        });
      }

      shadow.querySelectorAll("[data-party-field]").forEach((el) => {
        el.addEventListener("input", () => {
          const memberId = el.getAttribute("data-member-id");
          const field = el.getAttribute("data-party-field");
          const p = getSelectedParty();
          if (!p) return;
          const m = p.members.find((x) => x.id === memberId);
          if (!m) return;
          if (field === "name" || field === "type") {
            m[field] = el.value;
          } else {
            m[field] = Math.max(0, intOr(el.value, m[field]));
            if (field === "hpMax") {
              m.hpCurrent = clamp(m.hpCurrent, 0, m.hpMax);
            }
            if (field === "hpCurrent") {
              m.hpCurrent = clamp(m.hpCurrent, 0, m.hpMax);
            }
          }
          saveState(state);
        });
      });

      shadow.querySelectorAll("[data-party-remove]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const memberId = btn.getAttribute("data-party-remove");
          const p = getSelectedParty();
          if (!p) return;
          p.members = p.members.filter((m) => m.id !== memberId);
          persistAndRender();
        });
      });

      // card edits
      shadow.querySelectorAll("[data-card-field]").forEach((el) => {
        el.addEventListener("input", () => {
          const id = el.getAttribute("data-card-id");
          const field = el.getAttribute("data-card-field");
          const c = state.activeCombatants.find((x) => x.id === id);
          if (!c) return;
          if (field === "name" || field === "type") {
            c[field] = el.value;
          } else {
            c[field] = Math.max(0, intOr(el.value, c[field]));
            if (field === "hpMax") c.hpCurrent = clamp(c.hpCurrent, 0, c.hpMax);
            if (field === "hpCurrent") c.hpCurrent = clamp(c.hpCurrent, 0, c.hpMax);
          }
          saveState(state);
        });
      });

      shadow.querySelectorAll("[data-remove-card]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-remove-card");
          const idx = state.activeCombatants.findIndex((c) => c.id === id);
          if (idx < 0) return;
          state.activeCombatants.splice(idx, 1);
          if (state.turnIndex >= idx) state.turnIndex = Math.max(0, state.turnIndex - 1);
          ensureTurnIndex();
          persistAndRender();
        });
      });

      shadow.querySelectorAll("[data-dmg]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-dmg");
          const c = state.activeCombatants.find((x) => x.id === id);
          if (!c) return;
          const amountEl = shadow.querySelector(`[data-amount-for="${id}"]`);
          const amount = Math.max(1, intOr(amountEl?.value, 1));
          c.hpCurrent = clamp(c.hpCurrent - amount, 0, c.hpMax);
          persistAndRender();
        });
      });

      shadow.querySelectorAll("[data-heal]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-heal");
          const c = state.activeCombatants.find((x) => x.id === id);
          if (!c) return;
          const amountEl = shadow.querySelector(`[data-amount-for="${id}"]`);
          const amount = Math.max(1, intOr(amountEl?.value, 1));
          c.hpCurrent = clamp(c.hpCurrent + amount, 0, c.hpMax);
          persistAndRender();
        });
      });

      // drag and drop active list
      const initiativeList = shadow.getElementById("initiativeList");
      if (initiativeList) {
        const cards = Array.from(initiativeList.querySelectorAll("[data-card-id]"));
        cards.forEach((card) => {
          const id = card.getAttribute("data-card-id");
          card.addEventListener("dragstart", (e) => {
            dragActiveId = id;
            card.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", id || "");
          });
          card.addEventListener("dragend", () => {
            card.classList.remove("dragging");
          });
          card.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          });
          card.addEventListener("drop", (e) => {
            e.preventDefault();
            const targetId = card.getAttribute("data-card-id");
            if (!dragActiveId || !targetId) return;
            state.activeCombatants = moveItem(state.activeCombatants, dragActiveId, targetId);
            state.turnIndex = clamp(state.turnIndex, 0, Math.max(0, state.activeCombatants.length - 1));
            dragActiveId = null;
            persistAndRender();
          });
        });

        initiativeList.addEventListener("dragover", (e) => {
          e.preventDefault();
        });

        initiativeList.addEventListener("drop", (e) => {
          const targetCard = e.target.closest("[data-card-id]");
          if (targetCard || !dragActiveId) return;
          state.activeCombatants = moveToEnd(state.activeCombatants, dragActiveId);
          dragActiveId = null;
          persistAndRender();
        });
      }


  // library creation and actions
  const createName = shadow.getElementById("createName");
  const createLocation = shadow.getElementById("createLocation");
  if (createName) {
    createName.addEventListener("input", () => {
      state.createName = createName.value;
      saveState(state);
    });
  }
  if (createLocation) {
    createLocation.addEventListener("input", () => {
      state.createLocation = createLocation.value;
      saveState(state);
    });
  }

  const createFromActiveBtn = shadow.getElementById("createFromActiveBtn");
  if (createFromActiveBtn) {
    createFromActiveBtn.addEventListener("click", () => {
      const e = serializeActiveAsEncounter();
      e.name = (state.createName || state.activeEncounterName || "New Encounter").trim() || "New Encounter";
      e.tags = "";
      e.location = (state.createLocation || "").trim();
      state.library.unshift(e);
      state.activeLibraryId = e.id;
      state.createName = "";
      state.createLocation = "";
      persistAndRender();
    });
  }

  shadow.querySelectorAll("[data-set-active]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-set-active");
      const enc = state.library.find((e) => e.id === id);
      if (!enc) return;
      state.activeLibraryId = enc.id;
      state.activeEncounterName = enc.name || "Current Encounter";
      state.activeCombatants = enc.combatants.map((c) => cloneCombatant(c, true));
      state.turnIndex = 0;
      state.round = 1;
      state.tab = "active";
      persistAndRender();
    });
  });

  shadow.querySelectorAll("[data-toggle-edit-library]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-edit-library");
      state.libraryEditId = state.libraryEditId === id ? null : id;
      persistAndRender();
    });
  });

  shadow.querySelectorAll("[data-delete-library]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete-library");
      state.library = state.library.filter((e) => e.id !== id);
      if (state.activeLibraryId === id) state.activeLibraryId = null;
      if (state.libraryEditId === id) state.libraryEditId = null;
      persistAndRender();
    });
  });

  // inline library encounter editing
  shadow.querySelectorAll("[data-lib-enc-field]").forEach((el) => {
    el.addEventListener("input", () => {
      const id = el.getAttribute("data-lib-enc-id");
      const field = el.getAttribute("data-lib-enc-field");
      const enc = state.library.find((e) => e.id === id);
      if (!enc) return;
      enc[field] = el.value;
      saveState(state);
    });
  });

  shadow.querySelectorAll("[data-lib-card-field]").forEach((el) => {
    el.addEventListener("input", () => {
      const encId = el.getAttribute("data-lib-enc-id");
      const cardId = el.getAttribute("data-lib-card-id");
      const field = el.getAttribute("data-lib-card-field");
      const enc = state.library.find((e) => e.id === encId);
      if (!enc) return;
      const c = enc.combatants.find((x) => x.id === cardId);
      if (!c) return;
      if (field === "name" || field === "type") {
        c[field] = el.value;
      } else {
        c[field] = Math.max(0, intOr(el.value, c[field]));
        if (field === "hpMax") c.hpCurrent = clamp(c.hpCurrent, 0, c.hpMax);
        if (field === "hpCurrent") c.hpCurrent = clamp(c.hpCurrent, 0, c.hpMax);
      }
      saveState(state);
    });
  });

  shadow.querySelectorAll("[data-lib-remove-card]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const encId = btn.getAttribute("data-lib-enc-id");
      const cardId = btn.getAttribute("data-lib-remove-card");
      const enc = state.library.find((e) => e.id === encId);
      if (!enc) return;
      enc.combatants = enc.combatants.filter((c) => c.id !== cardId);
      persistAndRender();
    });
  });

  const partyForLibrary = getSelectedParty();
  if (partyForLibrary) {
    shadow.querySelectorAll("[data-lib-add-party-one]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const encId = btn.getAttribute("data-lib-enc-id");
        const memberId = btn.getAttribute("data-lib-add-party-one");
        const enc = state.library.find((e) => e.id === encId);
        const member = partyForLibrary.members.find((m) => m.id === memberId);
        if (!enc || !member) return;
        enc.combatants.push(cloneCombatant(member, true));
        enc.combatants = sortByInitiativeDesc(enc.combatants);
        persistAndRender();
      });
    });

    shadow.querySelectorAll("[data-lib-add-full-party]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const encId = btn.getAttribute("data-lib-add-full-party");
        const enc = state.library.find((e) => e.id === encId);
        if (!enc) return;
        partyForLibrary.members.forEach((m) => enc.combatants.push(cloneCombatant(m, true)));
        enc.combatants = sortByInitiativeDesc(enc.combatants);
        persistAndRender();
      });
    });
  }

  shadow.querySelectorAll("[data-lib-add-combatant]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const encId = btn.getAttribute("data-lib-add-combatant");
      const enc = state.library.find((e) => e.id === encId);
      if (!enc) return;

      const getVal = (idSuffix, fallback = "") => {
        const el = shadow.getElementById(`${idSuffix}_${encId}`);
        return el ? el.value : fallback;
      };

      const draft = {
        name: getVal("libAddName", state.libraryAddDraft.name),
        type: getVal("libAddType", state.libraryAddDraft.type),
        initiative: intOr(getVal("libAddInit", state.libraryAddDraft.initiative), state.libraryAddDraft.initiative),
        ac: intOr(getVal("libAddAC", state.libraryAddDraft.ac), state.libraryAddDraft.ac),
        speed: intOr(getVal("libAddSpeed", state.libraryAddDraft.speed), state.libraryAddDraft.speed),
        hpCurrent: intOr(getVal("libAddHpCur", state.libraryAddDraft.hpCurrent), state.libraryAddDraft.hpCurrent),
        hpMax: intOr(getVal("libAddHpMax", state.libraryAddDraft.hpMax), state.libraryAddDraft.hpMax)
      };

      state.libraryAddDraft = {
        name: draft.name,
        type: ["PC", "NPC", "Enemy"].includes(draft.type) ? draft.type : "Enemy",
        initiative: Math.max(0, intOr(draft.initiative, 10)),
        ac: Math.max(0, intOr(draft.ac, 13)),
        speed: Math.max(0, intOr(draft.speed, 30)),
        hpCurrent: Math.max(0, intOr(draft.hpCurrent, 10)),
        hpMax: Math.max(0, intOr(draft.hpMax, 10))
      };

      const hpMax = Math.max(0, intOr(draft.hpMax, 10));
      const hpCur = clamp(intOr(draft.hpCurrent, hpMax), 0, hpMax);

      enc.combatants.push(
        mkCombatant({
          name: draft.name || "New Combatant",
          type: draft.type || "Enemy",
          initiative: draft.initiative,
          ac: draft.ac,
          speed: draft.speed,
          hpCurrent: hpCur,
          hpMax
        })
      );
      enc.combatants = sortByInitiativeDesc(enc.combatants);
      state.libraryAddDraft.name = "";
      persistAndRender();
    });
  });

  // drag reorder for library editor cards
  let dragLibrary = { encId: null, cardId: null };
  shadow.querySelectorAll("[data-lib-card-id]").forEach((card) => {
    const cardId = card.getAttribute("data-lib-card-id");
    const encId = card.getAttribute("data-lib-enc-id");
    card.addEventListener("dragstart", (e) => {
      dragLibrary = { encId, cardId };
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", cardId || "");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      const targetCardId = card.getAttribute("data-lib-card-id");
      const targetEncId = card.getAttribute("data-lib-enc-id");
      if (!dragLibrary.cardId || !targetCardId || dragLibrary.encId !== targetEncId) return;
      const enc = state.library.find((x) => x.id === targetEncId);
      if (!enc) return;
      enc.combatants = moveItem(enc.combatants, dragLibrary.cardId, targetCardId);
      dragLibrary = { encId: null, cardId: null };
      persistAndRender();
    });
  });

  shadow.querySelectorAll("[data-lib-initiative-list]").forEach((list) => {
    list.addEventListener("dragover", (e) => e.preventDefault());
    list.addEventListener("drop", (e) => {
      const targetCard = e.target.closest("[data-lib-card-id]");
      if (targetCard || !dragLibrary.cardId) return;
      const listEncId = list.getAttribute("data-lib-initiative-list");
      if (!listEncId || dragLibrary.encId !== listEncId) return;
      const enc = state.library.find((x) => x.id === listEncId);
      if (!enc) return;
      enc.combatants = moveToEnd(enc.combatants, dragLibrary.cardId);
      dragLibrary = { encId: null, cardId: null };
      persistAndRender();
    });
  });
}

function bindEditorEvents() {
  return;
}


    function render() {
      shadow.innerHTML = template();
      bindGeneralEvents();
    }

    return { render };
  }

  registerEncounterTool();
  injectPanelOverrideCss();

  if (typeof window.renderToolsNav === "function") {
    window.renderToolsNav();
  }

  const prevRender = window.renderToolPanel;
  if (typeof prevRender === "function" && !prevRender.__encounterToolWrapped) {
    const wrappedRender = function (toolId) {
      const panel = document.getElementById("generatorPanel");
      if (panel) panel.classList.remove("encounter-tool-panel");

      if (toolId === TOOL_ID) {
        renderEncounterTool();
        return;
      }

      return prevRender(toolId);
    };
    wrappedRender.__encounterToolWrapped = true;
    window.renderToolPanel = wrappedRender;
  }
})();
