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

  function normalizePortrait(value) {
    const s = String(value || "").trim();
    if (!s) return "";
    return /^data:image\//i.test(s) ? s : "";
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
      hpMax,
      portrait: normalizePortrait(raw.portrait)
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

    const PORTRAIT_EDITOR_PREVIEW_SIZE = 220;
    const PORTRAIT_EDITOR_EXPORT_SIZE = 256;
    const PORTRAIT_EDITOR_MIN_ZOOM = 1;
    const PORTRAIT_EDITOR_MAX_ZOOM = 3.6;

    const portraitEditor = {
      open: false,
      target: null,
      source: "",
      image: null,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      pointerId: null,
      pointerStartX: 0,
      pointerStartY: 0,
      startOffsetX: 0,
      startOffsetY: 0
    };

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

    function portraitMarkup(c, scope, refId = null) {
      const hasPortrait = !!c.portrait;
      const style = hasPortrait ? ` style="background-image:url('${esc(c.portrait)}')"` : "";
      const encAttr = scope === "library" && refId ? ` data-lib-enc-id="${esc(refId)}"` : "";
      const partyAttr = scope === "party" && refId ? ` data-party-id="${esc(refId)}"` : "";
      return `
        <button
          type="button"
          class="card-portrait ${hasPortrait ? "has-image" : ""}"
          title="Edit portrait"
          data-portrait-upload
          data-scope="${esc(scope)}"
          data-card-id="${esc(c.id)}"
          ${encAttr}
          ${partyAttr}
          ${style}
        >
          ${hasPortrait ? "" : esc(initials(c.name))}
          <span class="portrait-badge" aria-hidden="true">📷</span>
        </button>
      `;
    }

    function getTargetCombatant(target) {
      if (!target || !target.scope || !target.cardId) return null;
      if (target.scope === "active") {
        return state.activeCombatants.find((c) => c.id === target.cardId) || null;
      }
      if (target.scope === "library") {
        const enc = state.library.find((e) => e.id === target.encId);
        if (!enc) return null;
        return enc.combatants.find((c) => c.id === target.cardId) || null;
      }
      if (target.scope === "party") {
        const party = state.parties.find((p) => p.id === target.partyId) || getSelectedParty();
        if (!party) return null;
        return party.members.find((m) => m.id === target.cardId) || null;
      }
      return null;
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });
    }

    function resizeImageDataUrl(dataUrl, maxDimension = 256, quality = 0.84) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const srcW = img.naturalWidth || img.width || 1;
            const srcH = img.naturalHeight || img.height || 1;
            const ratio = Math.min(1, maxDimension / Math.max(srcW, srcH));
            const width = Math.max(1, Math.round(srcW * ratio));
            const height = Math.max(1, Math.round(srcH * ratio));

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(dataUrl);
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            let out = "";
            try {
              out = canvas.toDataURL("image/webp", quality);
            } catch (_) {}
            if (!out || out === "data:,") {
              try {
                out = canvas.toDataURL("image/jpeg", quality);
              } catch (_) {}
            }

            resolve(out || dataUrl);
          } catch (_) {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    }

    async function processPortraitFile(file) {
      if (!file) return "";
      const raw = await readFileAsDataUrl(file);
      if (!/^data:image\//i.test(raw)) return "";
      const optimized = await resizeImageDataUrl(raw, 1024, 0.9);
      return normalizePortrait(optimized || raw);
    }

    function portraitEditorMetrics() {
      const img = portraitEditor.image;
      const size = PORTRAIT_EDITOR_PREVIEW_SIZE;
      if (!img) {
        return {
          size,
          cx: size / 2,
          cy: size / 2,
          r: size * 0.485,
          drawW: 0,
          drawH: 0,
          x: 0,
          y: 0,
          maxOffsetX: 0,
          maxOffsetY: 0
        };
      }

      const srcW = img.naturalWidth || img.width || 1;
      const srcH = img.naturalHeight || img.height || 1;
      const baseScale = Math.max(size / srcW, size / srcH);
      const scale = baseScale * clamp(Number(portraitEditor.zoom) || 1, PORTRAIT_EDITOR_MIN_ZOOM, PORTRAIT_EDITOR_MAX_ZOOM);
      const drawW = srcW * scale;
      const drawH = srcH * scale;
      const maxOffsetX = Math.max(0, (drawW - size) / 2);
      const maxOffsetY = Math.max(0, (drawH - size) / 2);
      const offsetX = clamp(portraitEditor.offsetX, -maxOffsetX, maxOffsetX);
      const offsetY = clamp(portraitEditor.offsetY, -maxOffsetY, maxOffsetY);

      return {
        size,
        cx: size / 2,
        cy: size / 2,
        r: size * 0.485,
        drawW,
        drawH,
        x: size / 2 - drawW / 2 + offsetX,
        y: size / 2 - drawH / 2 + offsetY,
        maxOffsetX,
        maxOffsetY
      };
    }

    function clampPortraitEditorOffsets() {
      const m = portraitEditorMetrics();
      portraitEditor.offsetX = clamp(portraitEditor.offsetX, -m.maxOffsetX, m.maxOffsetX);
      portraitEditor.offsetY = clamp(portraitEditor.offsetY, -m.maxOffsetY, m.maxOffsetY);
    }

    function drawPortraitEditorCanvas() {
      const canvas = shadow.getElementById("portraitEditorCanvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const m = portraitEditorMetrics();
      canvas.width = m.size;
      canvas.height = m.size;

      ctx.clearRect(0, 0, m.size, m.size);
      ctx.fillStyle = "#080b11";
      ctx.fillRect(0, 0, m.size, m.size);

      if (portraitEditor.image) {
        clampPortraitEditorOffsets();
        const mm = portraitEditorMetrics();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(portraitEditor.image, mm.x, mm.y, mm.drawW, mm.drawH);
      } else {
        ctx.fillStyle = "#8f98a8";
        ctx.font = "600 13px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No image selected", m.cx, m.cy);
      }

      ctx.save();
      ctx.fillStyle = "rgba(4, 6, 10, 0.62)";
      ctx.beginPath();
      ctx.rect(0, 0, m.size, m.size);
      ctx.moveTo(m.cx + m.r, m.cy);
      ctx.arc(m.cx, m.cy, m.r, 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.restore();

      ctx.beginPath();
      ctx.arc(m.cx, m.cy, m.r, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(236, 242, 255, 0.95)";
      ctx.stroke();
    }

    function loadPortraitEditorImage(dataUrl, reset = true) {
      const normalized = normalizePortrait(dataUrl);
      portraitEditor.source = normalized;
      portraitEditor.image = null;
      portraitEditor.zoom = PORTRAIT_EDITOR_MIN_ZOOM;
      if (reset) {
        portraitEditor.offsetX = 0;
        portraitEditor.offsetY = 0;
      }

      if (!normalized) {
        drawPortraitEditorCanvas();
        const saveBtn = shadow.getElementById("portraitEditorSaveBtn");
        if (saveBtn) saveBtn.disabled = true;
        return;
      }

      const img = new Image();
      img.onload = () => {
        portraitEditor.image = img;
        clampPortraitEditorOffsets();
        drawPortraitEditorCanvas();
        const saveBtn = shadow.getElementById("portraitEditorSaveBtn");
        if (saveBtn) saveBtn.disabled = false;
      };
      img.onerror = () => {
        portraitEditor.image = null;
        drawPortraitEditorCanvas();
        const saveBtn = shadow.getElementById("portraitEditorSaveBtn");
        if (saveBtn) saveBtn.disabled = true;
      };
      img.src = normalized;
    }

    function openPortraitEditor(target) {
      const combatant = getTargetCombatant(target);
      if (!combatant) return;
      portraitEditor.open = true;
      portraitEditor.target = {
        scope: target.scope,
        cardId: target.cardId,
        encId: target.encId || null,
        partyId: target.partyId || null
      };
      portraitEditor.dragging = false;
      portraitEditor.pointerId = null;
      loadPortraitEditorImage(combatant.portrait || "", true);
      render();
    }

    function closePortraitEditor(shouldRender = true) {
      portraitEditor.open = false;
      portraitEditor.target = null;
      portraitEditor.source = "";
      portraitEditor.image = null;
      portraitEditor.zoom = PORTRAIT_EDITOR_MIN_ZOOM;
      portraitEditor.offsetX = 0;
      portraitEditor.offsetY = 0;
      portraitEditor.dragging = false;
      portraitEditor.pointerId = null;
      if (shouldRender) render();
    }

    function exportPortraitFromEditor() {
      if (!portraitEditor.image) return "";

      const out = document.createElement("canvas");
      out.width = PORTRAIT_EDITOR_EXPORT_SIZE;
      out.height = PORTRAIT_EDITOR_EXPORT_SIZE;
      const ctx = out.getContext("2d");
      if (!ctx) return "";

      const m = portraitEditorMetrics();
      const ratio = PORTRAIT_EDITOR_EXPORT_SIZE / m.size;

      ctx.clearRect(0, 0, out.width, out.height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(out.width / 2, out.height / 2, out.width / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        portraitEditor.image,
        m.x * ratio,
        m.y * ratio,
        m.drawW * ratio,
        m.drawH * ratio
      );
      ctx.restore();

      let data = "";
      try {
        data = out.toDataURL("image/webp", 0.92);
      } catch (_) {
        data = "";
      }
      if (!data || data === "data:,") {
        try {
          data = out.toDataURL("image/png");
        } catch (_) {
          data = "";
        }
      }
      return normalizePortrait(data);
    }

    function savePortraitFromEditor() {
      if (!portraitEditor.target) return;
      const combatant = getTargetCombatant(portraitEditor.target);
      if (!combatant) {
        closePortraitEditor();
        return;
      }
      const data = exportPortraitFromEditor();
      if (!data) return;
      combatant.portrait = data;
      closePortraitEditor(false);
      persistAndRender();
    }

    function removePortraitFromEditor() {
      if (!portraitEditor.target) {
        closePortraitEditor();
        return;
      }
      const combatant = getTargetCombatant(portraitEditor.target);
      if (!combatant) {
        closePortraitEditor();
        return;
      }
      combatant.portrait = "";
      closePortraitEditor(false);
      persistAndRender();
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

    function renderPortraitEditorModal() {
      if (!portraitEditor.open) return "";
      const targetCombatant = getTargetCombatant(portraitEditor.target);
      const hasPortrait = !!targetCombatant?.portrait;
      const hasDraftImage = !!portraitEditor.source;
      const canRemove = hasPortrait || hasDraftImage;

      return `
        <div class="portrait-editor-backdrop" id="portraitEditorBackdrop">
          <div class="portrait-editor-modal" role="dialog" aria-modal="true" aria-label="Portrait editor">
            <div class="portrait-editor-head">
              <div class="portrait-editor-title">Portrait Editor</div>
              <div class="hint-text">Drag to reposition · Zoom to frame</div>
            </div>

            <div class="portrait-editor-canvas-wrap">
              <canvas id="portraitEditorCanvas" width="${PORTRAIT_EDITOR_PREVIEW_SIZE}" height="${PORTRAIT_EDITOR_PREVIEW_SIZE}" aria-label="Portrait crop preview"></canvas>
            </div>

            <div class="portrait-editor-controls">
              <label for="portraitEditorZoom">Zoom</label>
              <input id="portraitEditorZoom" type="range" min="${PORTRAIT_EDITOR_MIN_ZOOM}" max="${PORTRAIT_EDITOR_MAX_ZOOM}" step="0.01" value="${Number(portraitEditor.zoom || 1).toFixed(2)}">
            </div>

            <div class="portrait-editor-actions">
              <button type="button" class="btn btn-secondary btn-xs" id="portraitEditorCancelBtn">Cancel</button>
              <button type="button" class="btn btn-secondary btn-xs" id="portraitEditorUploadBtn">Choose image</button>
              <button type="button" class="btn btn-secondary btn-xs" id="portraitEditorRemoveBtn" ${canRemove ? "" : "disabled"}>Remove image</button>
              <button type="button" class="btn btn-xs" id="portraitEditorSaveBtn" ${portraitEditor.image ? "" : "disabled"}>Save portrait</button>
            </div>
          </div>
        </div>
      `;
    }

    function renderPartyManager(party) {
      if (!party || !state.partyManagerOpen) return "";

      const rows = party.members
        .map((m, i) => {
          return `
            <div class="row" data-party-member-row="${esc(m.id)}">
              <div class="col" style="max-width:66px;">
                <label>Portrait</label>
                ${portraitMarkup(m, "party", party.id)}
              </div>
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
                ${portraitMarkup(c, "active")}
                <div class="card-content">
                  <div class="name-block">
                    <div class="name-row">
                      <span class="inline-edit inline-edit-name" data-inline-edit data-scope="active" data-card-id="${esc(c.id)}" data-field="name" data-type="text">
                        <span class="inline-view card-name" title="Click to edit">${esc(c.name)}</span>
                        <input class="inline-input inline-input-name" type="text" value="${esc(c.name)}" aria-label="Edit name">
                      </span>
                      <span class="card-tag">${esc(c.type)}</span>
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
                      <div class="meta-init-center">
                        <span class="meta-k">Init</span>
                        <span class="inline-edit inline-edit-meta" data-inline-edit data-scope="active" data-card-id="${esc(c.id)}" data-field="initiative" data-type="number">
                          <span class="inline-view meta-v" title="Click to edit">${intOr(c.initiative, 0)}</span>
                          <input class="inline-input inline-input-meta" type="number" min="0" value="${intOr(c.initiative, 0)}" aria-label="Edit initiative">
                        </span>
                      </div>
                      <div class="meta-stack-read">
                        <div class="meta-read-line">
                          <span class="meta-k">AC</span>
                          <span class="inline-edit inline-edit-meta" data-inline-edit data-scope="active" data-card-id="${esc(c.id)}" data-field="ac" data-type="number">
                            <span class="inline-view meta-v" title="Click to edit">${c.ac}</span>
                            <input class="inline-input inline-input-meta" type="number" min="0" value="${c.ac}" aria-label="Edit AC">
                          </span>
                        </div>
                        <div class="meta-read-line">
                          <span class="meta-k">Spd</span>
                          <span class="inline-edit inline-edit-meta" data-inline-edit data-scope="active" data-card-id="${esc(c.id)}" data-field="speed" data-type="number">
                            <span class="inline-view meta-v" title="Click to edit">${c.speed}</span>
                            <input class="inline-input inline-input-meta" type="number" min="0" value="${c.speed}" aria-label="Edit speed">
                          </span>
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
                    ${portraitMarkup(c, "library", enc.id)}
                    <div class="card-content">
                      <div class="name-block">
                        <div class="name-row">
                          <span class="inline-edit inline-edit-name" data-inline-edit data-scope="library" data-lib-enc-id="${esc(enc.id)}" data-card-id="${esc(c.id)}" data-field="name" data-type="text">
                            <span class="inline-view card-name" title="Click to edit">${esc(c.name)}</span>
                            <input class="inline-input inline-input-name" type="text" value="${esc(c.name)}" aria-label="Edit name">
                          </span>
                          <span class="card-tag">${esc(c.type)}</span>
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
                          <div class="meta-init-center">
                            <span class="meta-k">Init</span>
                            <span class="inline-edit inline-edit-meta" data-inline-edit data-scope="library" data-lib-enc-id="${esc(enc.id)}" data-card-id="${esc(c.id)}" data-field="initiative" data-type="number">
                              <span class="inline-view meta-v" title="Click to edit">${intOr(c.initiative, 0)}</span>
                              <input class="inline-input inline-input-meta" type="number" min="0" value="${intOr(c.initiative, 0)}" aria-label="Edit initiative">
                            </span>
                          </div>
                          <div class="meta-stack-read">
                            <div class="meta-read-line">
                              <span class="meta-k">AC</span>
                              <span class="inline-edit inline-edit-meta" data-inline-edit data-scope="library" data-lib-enc-id="${esc(enc.id)}" data-card-id="${esc(c.id)}" data-field="ac" data-type="number">
                                <span class="inline-view meta-v" title="Click to edit">${c.ac}</span>
                                <input class="inline-input inline-input-meta" type="number" min="0" value="${c.ac}" aria-label="Edit AC">
                              </span>
                            </div>
                            <div class="meta-read-line">
                              <span class="meta-k">Spd</span>
                              <span class="inline-edit inline-edit-meta" data-inline-edit data-scope="library" data-lib-enc-id="${esc(enc.id)}" data-card-id="${esc(c.id)}" data-field="speed" data-type="number">
                                <span class="inline-view meta-v" title="Click to edit">${c.speed}</span>
                                <input class="inline-input inline-input-meta" type="number" min="0" value="${c.speed}" aria-label="Edit speed">
                              </span>
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

        .card .inline-input,
        .card input,
        .card select {
          cursor: text;
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
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          outline: none;
          padding: 0;
          line-height: 1;
          position: relative;
          overflow: hidden;
          background-size: cover;
          background-position: center;
          transition: border-color 120ms ease, box-shadow 120ms ease, filter 120ms ease;
        }

        .card-portrait:hover,
        .card-portrait:focus-visible {
          border-color: #5a6a89;
          box-shadow: 0 0 0 1px rgba(122, 142, 183, 0.35);
        }

        .card-portrait.has-image {
          color: transparent;
          text-shadow: none;
        }

        .portrait-badge {
          position: absolute;
          right: -1px;
          bottom: -1px;
          width: 15px;
          height: 15px;
          border-radius: 999px;
          border: 1px solid #2d3645;
          background: #090d14;
          color: #ced8ea;
          font-size: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          opacity: 0.88;
          box-shadow: 0 1px 4px rgba(0,0,0,0.45);
        }

        .enemy-card .card-portrait { background: radial-gradient(circle at top left, #3a2025, #05070c); }

        .card-content {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(150px,1.7fr) auto minmax(106px,0.95fr);
          align-items: center;
          column-gap: 8px;
        }

        .name-block { min-width: 0; }
        .name-row {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          min-width: 0;
        }

        .card-name {
          min-width: 0;
          font-weight: 640;
          font-size: 0.9rem;
          letter-spacing: 0.01em;
          color: #eef3ff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: inline-block;
          max-width: 100%;
        }

        .inline-edit {
          display: inline-flex;
          align-items: center;
          min-width: 0;
          max-width: 100%;
          cursor: inherit;
        }

        .inline-view {
          display: inline-flex;
          align-items: center;
          min-width: 0;
          max-width: 100%;
          cursor: inherit;
        }

        .inline-input {
          display: none;
          min-width: 0;
          font-family: inherit;
          background: #05070c;
          color: var(--text-main);
          border: 1px solid #414957;
          border-radius: 6px;
          padding: 2px 6px;
        }

        .inline-edit.editing .inline-view {
          display: none;
        }

        .inline-edit.editing .inline-input {
          display: inline-flex;
        }


        .inline-edit.editing,
        .inline-edit.editing .inline-view,
        .inline-edit.editing .inline-input {
          cursor: text;
        }

        .card:active {
          cursor: grabbing;
        }

        .inline-edit-name {
          flex: 0 1 auto;
          min-width: 0;
          max-width: calc(100% - 58px);
        }

        .inline-input-name {
          width: min(260px, 100%);
          font-size: 0.86rem;
          line-height: 1.2;
          padding: 3px 7px;
        }

        .inline-edit-meta {
          min-width: 26px;
          justify-content: flex-end;
        }

        .inline-input-meta {
          width: 54px;
          font-size: 0.78rem;
          text-align: center;
          padding: 2px 4px;
        }

        .card-tag {
          font-size: 0.7rem;
          line-height: 1;
          padding: 3px 7px;
          border-radius: 999px;
          border: 1px solid #303641;
          color: var(--text-muted);
          background: #0a0f15;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .pc-card .card-tag { border-color: #3b5678; color: #b8c8ff; background: #0b1420; }
        .enemy-card .card-tag { border-color: #6b2c38; color: #ffb8c0; background: #190b10; }

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

        .card-meta-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .meta-k {
          font-size: 0.68rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .meta-v {
          font-size: 0.82rem;
          color: #e6edf8;
          font-weight: 650;
          line-height: 1;
        }

        .meta-init-center {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          gap: 2px;
          align-self: center;
          padding-top: 1px;
        }

        .meta-stack-read {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 64px;
        }

        .meta-read-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-width: 64px;
        }

        .card-meta-top .btn-icon {
          margin-left: 2px;
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

        .portrait-editor-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(3, 5, 8, 0.74);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          backdrop-filter: blur(3px);
        }

        .portrait-editor-modal {
          width: min(92vw, 360px);
          border-radius: 12px;
          border: 1px solid #2b3444;
          background: linear-gradient(150deg, #0d131d, #06090f 70%);
          box-shadow: 0 12px 38px rgba(0, 0, 0, 0.55);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .portrait-editor-head {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .portrait-editor-title {
          font-size: 0.92rem;
          font-weight: 650;
          letter-spacing: 0.01em;
          color: #ebf1ff;
        }

        .portrait-editor-canvas-wrap {
          border-radius: 12px;
          border: 1px solid #2d3443;
          background: radial-gradient(circle at top left, #182133, #090d14);
          padding: 8px;
          display: grid;
          place-items: center;
        }

        #portraitEditorCanvas {
          width: ${PORTRAIT_EDITOR_PREVIEW_SIZE}px;
          height: ${PORTRAIT_EDITOR_PREVIEW_SIZE}px;
          max-width: 100%;
          border-radius: 8px;
          border: 1px solid #2c3340;
          background: #070b11;
          cursor: grab;
          touch-action: none;
          image-rendering: auto;
          user-select: none;
        }

        #portraitEditorCanvas.dragging {
          cursor: grabbing;
        }

        .portrait-editor-controls {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .portrait-editor-controls label {
          font-size: 0.73rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }

        .portrait-editor-controls input[type="range"] {
          width: 100%;
        }

        .portrait-editor-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
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
          <input id="portraitUploadInput" type="file" accept="image/*" style="display:none;" aria-hidden="true">
        </div>
      </div>
      ${renderPortraitEditorModal()}
      `;
    }

    function bindInlineEditEvents() {
      shadow.querySelectorAll("[data-inline-edit]").forEach((editor) => {
        const view = editor.querySelector(".inline-view");
        const input = editor.querySelector(".inline-input");
        if (!view || !input) return;

        const openEditor = () => {
          editor.classList.add("editing");
          input.focus();
          input.select();
        };

        const cancelEditor = () => {
          editor.classList.remove("editing");
          input.value = view.textContent?.trim() || "";
        };

        const commitEditor = () => {
          const scope = editor.getAttribute("data-scope");
          const field = editor.getAttribute("data-field");
          const type = editor.getAttribute("data-type");
          const cardId = editor.getAttribute("data-card-id");

          if (!scope || !field || !cardId) {
            editor.classList.remove("editing");
            return;
          }

          let target = null;
          if (scope === "active") {
            target = state.activeCombatants.find((c) => c.id === cardId) || null;
          } else if (scope === "library") {
            const encId = editor.getAttribute("data-lib-enc-id");
            const enc = state.library.find((e) => e.id === encId);
            if (enc) target = enc.combatants.find((c) => c.id === cardId) || null;
          }

          if (!target) {
            editor.classList.remove("editing");
            persistAndRender();
            return;
          }

          let nextValue;
          if (type === "text" || field === "name") {
            nextValue = String(input.value || "").trim() || "Unnamed";
          } else {
            nextValue = Math.max(0, intOr(input.value, target[field]));
          }

          target[field] = nextValue;
          editor.classList.remove("editing");
          persistAndRender();
        };

        view.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        view.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openEditor();
        });

        input.addEventListener("mousedown", (e) => e.stopPropagation());
        input.addEventListener("click", (e) => e.stopPropagation());

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancelEditor();
          }
        });

        input.addEventListener("blur", () => {
          if (!editor.classList.contains("editing")) return;
          commitEditor();
        });
      });
    }

    function bindGeneralEvents() {
      // tabs
      shadow.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.tab = btn.getAttribute("data-tab") === "library" ? "library" : "active";
          persistAndRender();
        });
      });


      // portrait upload + editor (active, library, party cards)
      const portraitInput = shadow.getElementById("portraitUploadInput");
      if (portraitInput) {
        shadow.querySelectorAll("[data-portrait-upload]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const scope = btn.getAttribute("data-scope");
            const cardId = btn.getAttribute("data-card-id");
            const encId = btn.getAttribute("data-lib-enc-id") || null;
            const partyId = btn.getAttribute("data-party-id") || null;
            if (!scope || !cardId) return;

            openPortraitEditor({ scope, cardId, encId, partyId });
          });
        });

        portraitInput.addEventListener("change", async () => {
          const file = portraitInput.files?.[0];
          portraitInput.value = "";
          if (!file || !portraitEditor.open) return;

          try {
            const dataUrl = await processPortraitFile(file);
            if (!dataUrl) return;
            loadPortraitEditorImage(dataUrl, true);
            const zoom = shadow.getElementById("portraitEditorZoom");
            if (zoom) zoom.value = String(PORTRAIT_EDITOR_MIN_ZOOM);

            const removeBtn = shadow.getElementById("portraitEditorRemoveBtn");
            if (removeBtn) removeBtn.disabled = false;

            const saveBtn = shadow.getElementById("portraitEditorSaveBtn");
            if (saveBtn) saveBtn.disabled = false;
          } catch (err) {
            console.warn("Encounter tool: failed portrait upload", err);
          }
        });
      }

      const editorBackdrop = shadow.getElementById("portraitEditorBackdrop");
      if (editorBackdrop) {
        editorBackdrop.addEventListener("click", (e) => {
          if (e.target === editorBackdrop) closePortraitEditor();
        });
      }

      const editorCancelBtn = shadow.getElementById("portraitEditorCancelBtn");
      if (editorCancelBtn) {
        editorCancelBtn.addEventListener("click", () => {
          closePortraitEditor();
        });
      }

      const editorUploadBtn = shadow.getElementById("portraitEditorUploadBtn");
      if (editorUploadBtn && portraitInput) {
        editorUploadBtn.addEventListener("click", () => {
          portraitInput.value = "";
          portraitInput.click();
        });
      }

      const editorSaveBtn = shadow.getElementById("portraitEditorSaveBtn");
      if (editorSaveBtn) {
        editorSaveBtn.addEventListener("click", () => {
          savePortraitFromEditor();
        });
      }

      const editorRemoveBtn = shadow.getElementById("portraitEditorRemoveBtn");
      if (editorRemoveBtn) {
        editorRemoveBtn.addEventListener("click", () => {
          removePortraitFromEditor();
        });
      }

      const editorZoom = shadow.getElementById("portraitEditorZoom");
      if (editorZoom) {
        editorZoom.addEventListener("input", () => {
          portraitEditor.zoom = clamp(
            Number(editorZoom.value) || PORTRAIT_EDITOR_MIN_ZOOM,
            PORTRAIT_EDITOR_MIN_ZOOM,
            PORTRAIT_EDITOR_MAX_ZOOM
          );
          clampPortraitEditorOffsets();
          drawPortraitEditorCanvas();
        });
      }

      const editorCanvas = shadow.getElementById("portraitEditorCanvas");
      if (editorCanvas) {
        drawPortraitEditorCanvas();

        editorCanvas.addEventListener("pointerdown", (e) => {
          if (!portraitEditor.image) return;
          portraitEditor.dragging = true;
          portraitEditor.pointerId = e.pointerId;
          portraitEditor.pointerStartX = e.clientX;
          portraitEditor.pointerStartY = e.clientY;
          portraitEditor.startOffsetX = portraitEditor.offsetX;
          portraitEditor.startOffsetY = portraitEditor.offsetY;
          editorCanvas.classList.add("dragging");
          try {
            editorCanvas.setPointerCapture(e.pointerId);
          } catch (_) {}
        });

        editorCanvas.addEventListener("pointermove", (e) => {
          if (!portraitEditor.dragging || portraitEditor.pointerId !== e.pointerId) return;
          portraitEditor.offsetX = portraitEditor.startOffsetX + (e.clientX - portraitEditor.pointerStartX);
          portraitEditor.offsetY = portraitEditor.startOffsetY + (e.clientY - portraitEditor.pointerStartY);
          clampPortraitEditorOffsets();
          drawPortraitEditorCanvas();
        });

        const stopDrag = (e) => {
          if (portraitEditor.pointerId !== e.pointerId) return;
          portraitEditor.dragging = false;
          portraitEditor.pointerId = null;
          editorCanvas.classList.remove("dragging");
          try {
            editorCanvas.releasePointerCapture(e.pointerId);
          } catch (_) {}
        };

        editorCanvas.addEventListener("pointerup", stopDrag);
        editorCanvas.addEventListener("pointercancel", stopDrag);

        editorCanvas.addEventListener(
          "wheel",
          (e) => {
            if (!portraitEditor.image) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            portraitEditor.zoom = clamp(
              (Number(portraitEditor.zoom) || PORTRAIT_EDITOR_MIN_ZOOM) + delta,
              PORTRAIT_EDITOR_MIN_ZOOM,
              PORTRAIT_EDITOR_MAX_ZOOM
            );
            if (editorZoom) editorZoom.value = String(portraitEditor.zoom);
            clampPortraitEditorOffsets();
            drawPortraitEditorCanvas();
          },
          { passive: false }
        );
      }

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
          c[field] = Math.max(0, intOr(el.value, c[field]));
          if (field === "hpMax") c.hpCurrent = clamp(c.hpCurrent, 0, c.hpMax);
          if (field === "hpCurrent") c.hpCurrent = clamp(c.hpCurrent, 0, c.hpMax);
          saveState(state);
        });
      });

      bindInlineEditEvents();

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
      c[field] = Math.max(0, intOr(el.value, c[field]));
      if (field === "hpMax") c.hpCurrent = clamp(c.hpCurrent, 0, c.hpMax);
      if (field === "hpCurrent") c.hpCurrent = clamp(c.hpCurrent, 0, c.hpMax);
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
