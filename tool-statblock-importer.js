// tool-statblock-importer.js
// MVP: screenshot -> OCR -> parsed stat block fields (local, no paid API)

(function () {
  if (!window.registerTool) {
    console.warn("Stat Block Importer tool: registerTool not found yet.");
    return;
  }

  const STORAGE_KEY = "vrahuneStatblockImporterDraftsV1";
  const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

  const state = {
    imageDataUrl: "",
    ocrText: "",
    parsed: null,
    status: "idle", // idle | loading-lib | ocr | parsing | done | error
    error: "",
    progress: 0
  };

  // -----------------------
  // Helpers
  // -----------------------
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toInt(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  }

  function loadDrafts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveDrafts(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (err) {
      console.warn("Failed to save drafts:", err);
    }
  }

  function addDraft(entry) {
    const drafts = loadDrafts();
    drafts.unshift(entry);
    saveDrafts(drafts.slice(0, 100));
  }

  function normalizeSpaces(s) {
    return String(s || "")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function splitLines(text) {
    return normalizeSpaces(text)
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);
  }

  function matchFirst(re, text) {
    const m = re.exec(text);
    return m ? m : null;
  }

  function abilityMod(score) {
    return Math.floor((toInt(score, 10) - 10) / 2);
  }

  function signed(n) {
    return n >= 0 ? `+${n}` : `${n}`;
  }

  function parseAbilities(lines, fullText) {
    const out = { str: null, dex: null, con: null, int: null, wis: null, cha: null };

    // Strategy A: line like "STR 23 (+6) DEX 14 (+2) ..."
    const combined = lines.join(" ");
    const statRegex = /\b(STR|DEX|CON|INT|WIS|CHA)\s+(\d{1,2})\b/gi;
    let m;
    while ((m = statRegex.exec(combined)) !== null) {
      const key = m[1].toLowerCase();
      out[key] = toInt(m[2], null);
    }

    // Strategy B: fallback from six-number runs
    if (Object.values(out).some(v => v == null)) {
      const nums = combined.match(/\b([1-2]?\d)\s*\(([+-]?\d)\)\b/g);
      if (nums && nums.length >= 6) {
        const vals = nums.slice(0, 6).map(x => toInt((/\b([1-2]?\d)\b/.exec(x) || [])[1], null));
        ["str", "dex", "con", "int", "wis", "cha"].forEach((k, i) => {
          if (out[k] == null) out[k] = vals[i];
        });
      }
    }

    // Final defaults
    for (const k of Object.keys(out)) {
      if (out[k] == null) out[k] = 10;
    }
    return out;
  }

  function parseSections(lines) {
    // Basic section splitter by headers
    const sections = {
      traits: [],
      actions: [],
      bonusActions: [],
      reactions: [],
      legendaryActions: []
    };

    const headerMap = {
      actions: /^actions$/i,
      bonusActions: /^bonus actions?$/i,
      reactions: /^reactions?$/i,
      legendaryActions: /^legendary actions?$/i
    };

    let current = "traits";
    let buffer = [];

    const flushBufferAsEntry = () => {
      const text = buffer.join(" ").trim();
      if (!text) return;
      // Split "Name. Description"
      const m = /^([^\.]{2,80})\.\s+(.+)$/.exec(text);
      const entry = m
        ? { name: m[1].trim(), text: m[2].trim() }
        : { name: "Feature", text };
      sections[current].push(entry);
      buffer = [];
    };

    for (const line of lines) {
      let switched = false;
      for (const [k, re] of Object.entries(headerMap)) {
        if (re.test(line.trim())) {
          flushBufferAsEntry();
          current = k;
          switched = true;
          break;
        }
      }
      if (switched) continue;

      // Heuristic new entry when a line starts with Title.
      if (/^[A-Z][A-Za-z0-9'’\-\s]{2,60}\.\s+/.test(line) && buffer.length) {
        flushBufferAsEntry();
      }
      buffer.push(line);
    }
    flushBufferAsEntry();

    return sections;
  }

  function parseStatBlock(rawText) {
    const text = normalizeSpaces(rawText);
    const lines = splitLines(text);

    const firstLine = lines[0] || "Unknown Monster";
    const secondLine = lines[1] || "";

    // Name
    const name = firstLine.replace(/\s{2,}/g, " ").trim();

    // Size/type/alignment (common pattern)
    // e.g. "Huge dragon, chaotic evil"
    let sizeType = "";
    let alignment = "";
    {
      const m = /^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+([^,]+),\s*(.+)$/i.exec(secondLine);
      if (m) {
        sizeType = `${m[1]} ${m[2]}`.trim();
        alignment = m[3].trim();
      } else {
        sizeType = secondLine.trim();
      }
    }

    // AC
    const acMatch = matchFirst(/\bArmor Class\b\s*([0-9]{1,2})(?:\s*\(([^)]+)\))?/i, text) ||
                    matchFirst(/\bAC\b[:\s]*([0-9]{1,2})(?:\s*\(([^)]+)\))?/i, text);
    const ac = acMatch ? toInt(acMatch[1], 10) : 10;
    const acText = acMatch && acMatch[2] ? acMatch[2].trim() : "";

    // HP
    const hpMatch = matchFirst(/\bHit Points?\b\s*([0-9]{1,4})(?:\s*\(([^)]+)\))?/i, text) ||
                    matchFirst(/\bHP\b[:\s]*([0-9]{1,4})(?:\s*\(([^)]+)\))?/i, text);
    const hp = hpMatch ? toInt(hpMatch[1], 1) : 1;
    const hpFormula = hpMatch && hpMatch[2] ? hpMatch[2].trim() : "";

    // Speed
    const speedMatch = matchFirst(/\bSpeed\b\s*([^\n]+)/i, text);
    const speed = speedMatch ? speedMatch[1].trim() : "30 ft.";

    // CR / XP / PB
    const crMatch = matchFirst(/\bChallenge\b\s*([0-9]+(?:\/[0-9]+)?)(?:\s*\(([\d,]+)\s*XP\))?/i, text) ||
                    matchFirst(/\bCR\b[:\s]*([0-9]+(?:\/[0-9]+)?)/i, text);
    const cr = crMatch ? crMatch[1].trim() : "1/8";
    const xp = crMatch && crMatch[2] ? toInt(String(crMatch[2]).replace(/,/g, ""), 0) : 0;

    const pbMatch = matchFirst(/\bProficiency Bonus\b\s*([+\-]?\d+)/i, text) ||
                    matchFirst(/\bPB\b[:\s]*([+\-]?\d+)/i, text);
    const proficiencyBonus = pbMatch ? toInt(pbMatch[1], 2) : 2;

    // Abilities
    const abilities = parseAbilities(lines, text);

    // Meta lines
    function parseLineList(label) {
      const re = new RegExp(`\\b${label}\\b\\s*([^\\n]+)`, "i");
      const m = re.exec(text);
      if (!m) return [];
      return m[1]
        .split(/[,;]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }

    const saves = parseLineList("Saving Throws");
    const skills = parseLineList("Skills");
    const vulnerabilities = parseLineList("Damage Vulnerabilities");
    const resistances = parseLineList("Damage Resistances");
    const immunities = parseLineList("Damage Immunities");
    const conditionImmunities = parseLineList("Condition Immunities");
    const senses = parseLineList("Senses");
    const languages = parseLineList("Languages");
    const habitats = parseLineList("Habitat|Environment");

    const sections = parseSections(lines);

    return {
      id: `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      source: "Imported Screenshot",
      sourceType: "homebrew",
      sizeType,
      alignment,

      ac,
      acText,
      hp,
      hpFormula,
      speed,

      cr,
      xp,
      proficiencyBonus,

      str: abilities.str,
      dex: abilities.dex,
      con: abilities.con,
      int: abilities.int,
      wis: abilities.wis,
      cha: abilities.cha,

      saves,
      skills,
      vulnerabilities,
      resistances,
      immunities,
      conditionImmunities,
      senses,
      languages,
      habitats,

      traits: sections.traits,
      actions: sections.actions,
      bonusActions: sections.bonusActions,
      reactions: sections.reactions,
      legendaryActions: sections.legendaryActions,

      importedAt: new Date().toISOString(),
      importedFrom: "screenshot-ocr",
      confidence: {
        core: 0.75,
        sections: 0.65
      }
    };
  }

  async function ensureTesseractLoaded() {
    if (window.Tesseract) return;
    state.status = "loading-lib";
    rerender();

    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-tool="tesseract"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const s = document.createElement("script");
      s.src = TESSERACT_CDN;
      s.async = true;
      s.dataset.tool = "tesseract";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function runOcr(dataUrl) {
    await ensureTesseractLoaded();
    state.status = "ocr";
    state.progress = 0;
    state.error = "";
    rerender();

    const result = await window.Tesseract.recognize(dataUrl, "eng", {
      logger: (m) => {
        if (m && m.status === "recognizing text" && Number.isFinite(m.progress)) {
          state.progress = m.progress;
          rerenderProgressOnly();
        }
      }
    });

    return normalizeSpaces(result?.data?.text || "");
  }

  function fillReviewForm(panel, parsed) {
    const set = (id, value) => {
      const el = panel.querySelector(`#${id}`);
      if (el) el.value = value ?? "";
    };

    set("sbi-name", parsed.name);
    set("sbi-sizeType", parsed.sizeType);
    set("sbi-alignment", parsed.alignment);
    set("sbi-ac", parsed.ac);
    set("sbi-acText", parsed.acText);
    set("sbi-hp", parsed.hp);
    set("sbi-hpFormula", parsed.hpFormula);
    set("sbi-speed", parsed.speed);
    set("sbi-cr", parsed.cr);
    set("sbi-xp", parsed.xp);
    set("sbi-pb", parsed.proficiencyBonus);

    set("sbi-str", parsed.str);
    set("sbi-dex", parsed.dex);
    set("sbi-con", parsed.con);
    set("sbi-int", parsed.int);
    set("sbi-wis", parsed.wis);
    set("sbi-cha", parsed.cha);

    set("sbi-traits", (parsed.traits || []).map(x => `${x.name}. ${x.text}`).join("\n"));
    set("sbi-actions", (parsed.actions || []).map(x => `${x.name}. ${x.text}`).join("\n"));
  }

  function readReviewForm(panel) {
    const get = (id) => panel.querySelector(`#${id}`)?.value ?? "";

    const parseEntryLines = (txt) => {
      return String(txt || "")
        .split(/\n+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(line => {
          const m = /^([^\.]{2,80})\.\s+(.+)$/.exec(line);
          return m ? { name: m[1].trim(), text: m[2].trim() } : { name: "Feature", text: line };
        });
    };

    return {
      ...state.parsed,
      name: get("sbi-name").trim() || "Unknown Monster",
      sizeType: get("sbi-sizeType").trim(),
      alignment: get("sbi-alignment").trim(),

      ac: toInt(get("sbi-ac"), 10),
      acText: get("sbi-acText").trim(),
      hp: Math.max(1, toInt(get("sbi-hp"), 1)),
      hpFormula: get("sbi-hpFormula").trim(),
      speed: get("sbi-speed").trim() || "30 ft.",

      cr: get("sbi-cr").trim() || "1/8",
      xp: Math.max(0, toInt(get("sbi-xp"), 0)),
      proficiencyBonus: toInt(get("sbi-pb"), 2),

      str: toInt(get("sbi-str"), 10),
      dex: toInt(get("sbi-dex"), 10),
      con: toInt(get("sbi-con"), 10),
      int: toInt(get("sbi-int"), 10),
      wis: toInt(get("sbi-wis"), 10),
      cha: toInt(get("sbi-cha"), 10),

      traits: parseEntryLines(get("sbi-traits")),
      actions: parseEntryLines(get("sbi-actions"))
    };
  }

  function pushToMonsterVaultLikeStorage(monster) {
    // Keep this conservative and non-breaking:
    // Save importer drafts in our own key always.
    // If your vault key is known, we can wire direct write in v2.
    addDraft({
      ...monster,
      _savedAt: new Date().toISOString()
    });

    // Soft attempt: if your Monster Vault API has upsert/create later, support it automatically.
    const api = window.VrahuneMonsterVault || window.MonsterVault || window.vrahuneMonsterVault;
    if (api) {
      try {
        if (typeof api.upsertMonster === "function") api.upsertMonster(monster);
        else if (typeof api.addMonster === "function") api.addMonster(monster);
        else if (typeof api.createMonster === "function") api.createMonster(monster);
      } catch (err) {
        console.warn("Vault API save attempt failed:", err);
      }
    }
  }

  // -----------------------
  // Render
  // -----------------------
  function renderUI() {
    const progressPct = Math.round((state.progress || 0) * 100);

    const preview = state.imageDataUrl
      ? `<img src="${state.imageDataUrl}" alt="Uploaded stat block" style="max-width:100%;max-height:260px;border:1px solid rgba(255,255,255,.2);border-radius:10px;" />`
      : `<div style="padding:24px;border:1px dashed rgba(255,255,255,.3);border-radius:10px;opacity:.8;">Upload a stat block screenshot to begin.</div>`;

    const statusHtml = state.status === "ocr"
      ? `<div style="margin-top:8px;">OCR in progress: <strong>${progressPct}%</strong></div>`
      : state.status === "loading-lib"
      ? `<div style="margin-top:8px;">Loading OCR library…</div>`
      : state.status === "error"
      ? `<div style="margin-top:8px;color:#ff9aa2;">${esc(state.error || "Something went wrong.")}</div>`
      : "";

    const parsed = state.parsed;

    return `
      <div class="tool-panel" style="display:grid;gap:12px;">
        <div>
          <h2 style="margin:0 0 6px 0;">Stat Block Importer (MVP)</h2>
          <div style="opacity:.8;">Upload screenshot → OCR locally → review fields → save draft.</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:10px;">
          <label style="display:inline-flex;align-items:center;gap:8px;">
            <span>Image:</span>
            <input type="file" id="sbi-file" accept="image/*" />
          </label>
          ${statusHtml}
          ${preview}
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="sbi-run" ${state.imageDataUrl ? "" : "disabled"}>Run OCR + Parse</button>
          <button id="sbi-clear">Clear</button>
        </div>

        <details ${state.ocrText ? "open" : ""}>
          <summary>OCR Text</summary>
          <textarea id="sbi-ocr-text" style="width:100%;min-height:140px;margin-top:8px;">${esc(state.ocrText || "")}</textarea>
          <div style="margin-top:8px;">
            <button id="sbi-reparse" ${state.ocrText ? "" : "disabled"}>Re-parse edited OCR text</button>
          </div>
        </details>

        <div style="border-top:1px solid rgba(255,255,255,.15);padding-top:10px;">
          <h3 style="margin:0 0 8px 0;">Review Parsed Fields</h3>
          ${
            parsed
              ? `
            <div style="display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:8px;">
              <label>Name<input id="sbi-name" style="width:100%;" /></label>
              <label>Size/Type<input id="sbi-sizeType" style="width:100%;" /></label>
              <label>Alignment<input id="sbi-alignment" style="width:100%;" /></label>
              <label>CR<input id="sbi-cr" style="width:100%;" /></label>
              <label>XP<input id="sbi-xp" type="number" style="width:100%;" /></label>
              <label>PB<input id="sbi-pb" type="number" style="width:100%;" /></label>

              <label>AC<input id="sbi-ac" type="number" style="width:100%;" /></label>
              <label>AC Notes<input id="sbi-acText" style="width:100%;" /></label>
              <label>HP<input id="sbi-hp" type="number" style="width:100%;" /></label>
              <label>HP Formula<input id="sbi-hpFormula" style="width:100%;" /></label>
              <label style="grid-column:1/-1;">Speed<input id="sbi-speed" style="width:100%;" /></label>
            </div>

            <div style="margin-top:8px;display:grid;grid-template-columns:repeat(6,minmax(70px,1fr));gap:8px;">
              <label>STR<input id="sbi-str" type="number" style="width:100%;" /></label>
              <label>DEX<input id="sbi-dex" type="number" style="width:100%;" /></label>
              <label>CON<input id="sbi-con" type="number" style="width:100%;" /></label>
              <label>INT<input id="sbi-int" type="number" style="width:100%;" /></label>
              <label>WIS<input id="sbi-wis" type="number" style="width:100%;" /></label>
              <label>CHA<input id="sbi-cha" type="number" style="width:100%;" /></label>
            </div>

            <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <label>Traits (one per line: "Name. text")
                <textarea id="sbi-traits" style="width:100%;min-height:140px;"></textarea>
              </label>
              <label>Actions (one per line: "Name. text")
                <textarea id="sbi-actions" style="width:100%;min-height:140px;"></textarea>
              </label>
            </div>

            <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
              <button id="sbi-save">Save Draft</button>
              <button id="sbi-copy-json">Copy JSON</button>
            </div>
          `
              : `<div style="opacity:.75;">No parsed result yet.</div>`
          }
        </div>
      </div>
    `;
  }

  function rerender() {
    const root = document.getElementById("toolMount");
    if (!root) return;
    root.innerHTML = renderUI();
    bindEvents(root);
    if (state.parsed) fillReviewForm(root, state.parsed);
  }

  function rerenderProgressOnly() {
    const root = document.getElementById("toolMount");
    if (!root) return;
    const pct = Math.round((state.progress || 0) * 100);
    const el = root.querySelector("#sbi-progress-text");
    if (el) el.textContent = `${pct}%`;
    // For simplicity keep full rerender - still okay MVP
    rerender();
  }

  function bindEvents(root) {
    const file = root.querySelector("#sbi-file");
    file?.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        state.imageDataUrl = String(fr.result || "");
        state.error = "";
        rerender();
      };
      fr.readAsDataURL(f);
    });

    root.querySelector("#sbi-clear")?.addEventListener("click", () => {
      state.imageDataUrl = "";
      state.ocrText = "";
      state.parsed = null;
      state.status = "idle";
      state.error = "";
      state.progress = 0;
      rerender();
    });

    root.querySelector("#sbi-run")?.addEventListener("click", async () => {
      try {
        state.error = "";
        const text = await runOcr(state.imageDataUrl);
        state.status = "parsing";
        state.ocrText = text;
        state.parsed = parseStatBlock(text);
        state.status = "done";
      } catch (err) {
        state.status = "error";
        state.error = `OCR failed: ${err?.message || err}`;
      }
      rerender();
    });

    root.querySelector("#sbi-reparse")?.addEventListener("click", () => {
      const t = root.querySelector("#sbi-ocr-text")?.value || "";
      state.ocrText = t;
      state.status = "parsing";
      state.parsed = parseStatBlock(t);
      state.status = "done";
      rerender();
    });

    root.querySelector("#sbi-copy-json")?.addEventListener("click", async () => {
      if (!state.parsed) return;
      const reviewed = readReviewForm(root);
      try {
        await navigator.clipboard.writeText(JSON.stringify(reviewed, null, 2));
        alert("Copied parsed monster JSON.");
      } catch {
        alert("Clipboard copy failed.");
      }
    });

    root.querySelector("#sbi-save")?.addEventListener("click", () => {
      if (!state.parsed) return;
      const reviewed = readReviewForm(root);
      pushToMonsterVaultLikeStorage(reviewed);
      alert("Saved as draft import (and attempted Monster Vault API save if available).");
    });
  }

  // -----------------------
  // Register tool
  // -----------------------
  window.registerTool({
    id: "statblockImporter",
    name: "Stat Block Importer",
    description: "Upload a screenshot, OCR it locally, parse fields, and save as draft/homebrew.",
    render: function renderStatBlockImporter() {
      return renderUI();
    }
  });

  // Keep tool interactive after app renders it
  const originalSelectTool = window.selectTool;
  // If app has no hook, a periodic lightweight bind fallback:
  const bindObserver = new MutationObserver(() => {
    const root = document.getElementById("toolMount");
    if (!root) return;
    const hasOurUi = !!root.querySelector("#sbi-file") || !!root.querySelector("h2");
    if (hasOurUi && root.innerHTML.includes("Stat Block Importer")) {
      bindEvents(root);
      if (state.parsed) fillReviewForm(root, state.parsed);
    }
  });
  bindObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
