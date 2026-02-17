// tool-statblock-importer.js
(() => {
  const TOOL_ID = "statblockImporter";
  const TOOL_NAME = "Stat Block Importer";
  const STORAGE_KEY = "vrahuneStatblockImporterDraftsV1";
  const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

  const state = {
    imageDataUrl: "",
    ocrText: "",
    parsed: null,
    status: "idle", // idle | loading-lib | ocr | done | error
    progress: 0,
    error: "",
    lastInputMethod: "" // "paste" | "file"
  };

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
      .map((l) => l.trim())
      .filter(Boolean);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function addDraft(entry) {
    const drafts = loadDrafts();
    drafts.unshift(entry);
    saveDrafts(drafts.slice(0, 100));
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  async function setImageFromBlob(blob, { labelEl, panelEl, method = "" }) {
    if (!blob || !blob.type || !blob.type.startsWith("image/")) return false;
    state.imageDataUrl = await blobToDataURL(blob);
    state.error = "";
    state.status = "idle";
    state.progress = 0;
    state.lastInputMethod = method;
    render({ labelEl, panelEl });
    return true;
  }

  async function ensureTesseractLoaded() {
    if (window.Tesseract) return;

    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-vrahune-tool="tesseract"]');
      if (existing) {
        if (window.Tesseract) return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const s = document.createElement("script");
      s.src = TESSERACT_CDN;
      s.async = true;
      s.dataset.vrahuneTool = "tesseract";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function parseTitledEntries(blockText) {
    if (!blockText) return [];
    const out = [];
    const lines = splitLines(blockText);

    let buffer = "";
    for (const ln of lines) {
      const line = ln.trim();
      const titled = /^([A-Z][A-Za-z0-9'’\-\s]{2,80})\.\s+(.+)$/.exec(line);
      if (titled) {
        if (buffer) out.push(buffer.trim());
        buffer = line;
      } else if (buffer) {
        buffer += " " + line;
      } else {
        buffer = line;
      }
    }
    if (buffer) out.push(buffer.trim());

    return out.map((entry) => {
      const m = /^([A-Z][A-Za-z0-9'’\-\s]{2,80})\.\s+(.+)$/.exec(entry);
      if (m) return { name: m[1].trim(), text: m[2].trim() };
      return { name: "Feature", text: entry.trim() };
    });
  }

  function parseSectionsFromRaw(text) {
    const lines = splitLines(text);
    const sections = {
      traits: [],
      actions: [],
      bonusActions: [],
      reactions: [],
      legendaryActions: []
    };

    const headers = {
      actions: /^actions$/i,
      bonusActions: /^bonus actions?$/i,
      reactions: /^reactions?$/i,
      legendaryActions: /^legendary actions?$/i
    };

    let current = "traits";
    let bucket = [];

    function flush() {
      if (!bucket.length) return;
      const parsed = parseTitledEntries(bucket.join("\n"));
      sections[current].push(...parsed);
      bucket = [];
    }

    for (const line of lines) {
      let switched = false;
      for (const [k, re] of Object.entries(headers)) {
        if (re.test(line)) {
          flush();
          current = k;
          switched = true;
          break;
        }
      }
      if (!switched) bucket.push(line);
    }
    flush();

    return sections;
  }

  function parseStatBlock(rawText) {
    const text = normalizeSpaces(rawText);
    const lines = splitLines(text);
    const firstLine = lines[0] || "Unknown Monster";
    const secondLine = lines[1] || "";

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

    const acM =
      /\bArmor Class\b\s*([0-9]{1,2})(?:\s*\(([^)]+)\))?/i.exec(text) ||
      /\bAC\b[:\s]*([0-9]{1,2})(?:\s*\(([^)]+)\))?/i.exec(text);

    const hpM =
      /\bHit Points?\b\s*([0-9]{1,4})(?:\s*\(([^)]+)\))?/i.exec(text) ||
      /\bHP\b[:\s]*([0-9]{1,4})(?:\s*\(([^)]+)\))?/i.exec(text);

    const speedM = /\bSpeed\b\s*([^\n]+)/i.exec(text);

    const crM =
      /\bChallenge\b\s*([0-9]+(?:\/[0-9]+)?)(?:\s*\(([\d,]+)\s*XP\))?/i.exec(text) ||
      /\bCR\b[:\s]*([0-9]+(?:\/[0-9]+)?)/i.exec(text);

    const pbM =
      /\bProficiency Bonus\b\s*([+\-]?\d+)/i.exec(text) ||
      /\bPB\b[:\s]*([+\-]?\d+)/i.exec(text);

    const combined = lines.join(" ");
    const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const statRegex = /\b(STR|DEX|CON|INT|WIS|CHA)\s+(\d{1,2})\b/gi;
    let sm;
    while ((sm = statRegex.exec(combined)) !== null) {
      stats[sm[1].toLowerCase()] = toInt(sm[2], 10);
    }

    function listLine(labelRegex) {
      const m = new RegExp(`\\b(?:${labelRegex})\\b\\s*([^\\n]+)`, "i").exec(text);
      return m ? m[1].split(/[,;]+/).map((x) => x.trim()).filter(Boolean) : [];
    }

    const sectionData = parseSectionsFromRaw(text);

    return {
      id: `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: firstLine.trim(),
      source: "Imported Screenshot",
      sourceType: "homebrew",
      sizeType,
      alignment,

      ac: acM ? toInt(acM[1], 10) : 10,
      acText: acM?.[2] || "",
      hp: hpM ? Math.max(1, toInt(hpM[1], 1)) : 1,
      hpFormula: hpM?.[2] || "",
      speed: speedM?.[1]?.trim() || "30 ft.",

      cr: crM?.[1] || "1/8",
      xp: crM?.[2] ? toInt(String(crM[2]).replace(/,/g, ""), 0) : 0,
      proficiencyBonus: pbM ? toInt(pbM[1], 2) : 2,

      str: stats.str,
      dex: stats.dex,
      con: stats.con,
      int: stats.int,
      wis: stats.wis,
      cha: stats.cha,

      saves: listLine("Saving Throws"),
      skills: listLine("Skills"),
      vulnerabilities: listLine("Damage Vulnerabilities"),
      resistances: listLine("Damage Resistances"),
      immunities: listLine("Damage Immunities"),
      conditionImmunities: listLine("Condition Immunities"),
      senses: listLine("Senses"),
      languages: listLine("Languages"),
      habitats: listLine("Habitat|Environment"),

      traits: sectionData.traits || [],
      actions: sectionData.actions || [],
      bonusActions: sectionData.bonusActions || [],
      reactions: sectionData.reactions || [],
      legendaryActions: sectionData.legendaryActions || [],

      importedAt: new Date().toISOString(),
      importedFrom: "screenshot-ocr"
    };
  }

  function collectReviewed(panelEl) {
    if (!state.parsed) return null;
    const q = (id) => panelEl.querySelector(`#${id}`);

    const parseLineEntries = (id) => {
      const txt = (q(id)?.value || "").trim();
      return parseTitledEntries(txt);
    };

    return {
      ...state.parsed,
      name: (q("sbi-name")?.value || "").trim() || "Unknown Monster",
      sizeType: (q("sbi-sizeType")?.value || "").trim(),
      alignment: (q("sbi-alignment")?.value || "").trim(),
      cr: (q("sbi-cr")?.value || "").trim() || "1/8",
      xp: toInt(q("sbi-xp")?.value, 0),
      proficiencyBonus: toInt(q("sbi-pb")?.value, 2),
      ac: toInt(q("sbi-ac")?.value, 10),
      acText: (q("sbi-acText")?.value || "").trim(),
      hp: Math.max(1, toInt(q("sbi-hp")?.value, 1)),
      hpFormula: (q("sbi-hpFormula")?.value || "").trim(),
      speed: (q("sbi-speed")?.value || "").trim() || "30 ft.",
      str: toInt(q("sbi-str")?.value, 10),
      dex: toInt(q("sbi-dex")?.value, 10),
      con: toInt(q("sbi-con")?.value, 10),
      int: toInt(q("sbi-int")?.value, 10),
      wis: toInt(q("sbi-wis")?.value, 10),
      cha: toInt(q("sbi-cha")?.value, 10),
      traits: parseLineEntries("sbi-traits"),
      actions: parseLineEntries("sbi-actions"),
      bonusActions: parseLineEntries("sbi-bonusActions"),
      reactions: parseLineEntries("sbi-reactions"),
      legendaryActions: parseLineEntries("sbi-legendaryActions")
    };
  }

  function joined(arr) {
    return (arr || []).join(", ");
  }

  function entryLines(entries) {
    return (entries || []).map((e) => `${e.name}. ${e.text}`).join("\n");
  }

  function renderSection(title, entries) {
    if (!entries || !entries.length) return "";
    return `
      <section style="border-top:1px solid rgba(255,255,255,.14);padding-top:10px;margin-top:10px;">
        <h4 style="margin:0 0 8px 0;text-transform:uppercase;letter-spacing:.06em;font-size:12px;opacity:.9;">${esc(title)}</h4>
        <div style="display:grid;gap:6px;">
          ${entries.map((e) => `
            <details style="border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:0 8px;">
              <summary style="cursor:pointer;padding:8px 0;font-weight:700;">${esc(e.name)}</summary>
              <div style="padding:0 0 8px 0;opacity:.95;">${esc(e.text)}</div>
            </details>
          `).join("")}
        </div>
      </section>
    `;
  }

  function statBlockPreview(m) {
    if (!m) return "";

    return `
      <div style="margin-top:14px;border:1px solid rgba(255,255,255,.18);border-radius:14px;overflow:hidden;background:rgba(255,255,255,.02);">
        <div style="padding:12px;border-bottom:1px solid rgba(255,255,255,.14);">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:20px;">${esc(m.name || "Unknown Monster")}</h3>
            <span style="font-size:12px;padding:3px 8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;">CR ${esc(m.cr || "—")}</span>
          </div>
          <div class="muted" style="margin-top:4px;">
            ${esc(m.sizeType || "—")}${m.alignment ? `, ${esc(m.alignment)}` : ""}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
            <span style="font-size:11px;padding:2px 8px;border:1px solid rgba(255,255,255,.18);border-radius:999px;">XP ${esc(m.xp ?? 0)}</span>
            <span style="font-size:11px;padding:2px 8px;border:1px solid rgba(255,255,255,.18);border-radius:999px;">PB +${esc(m.proficiencyBonus ?? 2)}</span>
            ${m.habitats?.length ? `<span style="font-size:11px;padding:2px 8px;border:1px solid rgba(255,255,255,.18);border-radius:999px;">Habitat: ${esc(joined(m.habitats))}</span>` : ""}
          </div>
        </div>

        <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,.14);display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;">
          <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">AC</div><div style="font-weight:800;">${esc(m.ac)}</div></div>
          <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">HP</div><div style="font-weight:800;">${esc(m.hp)}</div></div>
          <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">Speed</div><div style="font-weight:800;">${esc(m.speed || "—")}</div></div>
          <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">To Hit</div><div style="font-weight:800;">—</div></div>
          <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">Save DC</div><div style="font-weight:800;">—</div></div>
        </div>

        <div style="padding:10px;">
          <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;">
            ${["str","dex","con","int","wis","cha"].map((k) => {
              const v = toInt(m[k], 10);
              const mod = Math.floor((v - 10) / 2);
              const modTxt = mod >= 0 ? `+${mod}` : `${mod}`;
              return `<div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;">
                <div class="muted" style="font-size:10px;text-transform:uppercase;">${k}</div>
                <div style="font-weight:800;">${v} (${modTxt})</div>
              </div>`;
            }).join("")}
          </div>

          <div style="margin-top:10px;display:grid;gap:4px;">
            ${m.saves?.length ? `<div><span class="muted">Saving Throws:</span> ${esc(joined(m.saves))}</div>` : ""}
            ${m.skills?.length ? `<div><span class="muted">Skills:</span> ${esc(joined(m.skills))}</div>` : ""}
            ${m.vulnerabilities?.length ? `<div><span class="muted">Damage Vulnerabilities:</span> ${esc(joined(m.vulnerabilities))}</div>` : ""}
            ${m.resistances?.length ? `<div><span class="muted">Damage Resistances:</span> ${esc(joined(m.resistances))}</div>` : ""}
            ${m.immunities?.length ? `<div><span class="muted">Damage Immunities:</span> ${esc(joined(m.immunities))}</div>` : ""}
            ${m.conditionImmunities?.length ? `<div><span class="muted">Condition Immunities:</span> ${esc(joined(m.conditionImmunities))}</div>` : ""}
            ${m.senses?.length ? `<div><span class="muted">Senses:</span> ${esc(joined(m.senses))}</div>` : ""}
            ${m.languages?.length ? `<div><span class="muted">Languages:</span> ${esc(joined(m.languages))}</div>` : ""}
          </div>

          ${renderSection("Traits", m.traits)}
          ${renderSection("Actions", m.actions)}
          ${renderSection("Bonus Actions", m.bonusActions)}
          ${renderSection("Reactions", m.reactions)}
          ${renderSection("Legendary Actions", m.legendaryActions)}
        </div>
      </div>
    `;
  }

  function template() {
    const progressPct = Math.round((state.progress || 0) * 100);
    const p = state.parsed;

    return `
      <div class="tool-panel" style="display:grid;gap:12px;">
        <div>
          <h2 style="margin:0 0 6px 0;">Stat Block Importer (MVP)</h2>
          <div class="muted">Paste screenshot (Win+Shift+S → Ctrl+V) or upload image → OCR locally → parse core fields.</div>
        </div>

        <div id="sbi-paste-zone"
             tabindex="0"
             style="padding:14px;border:1px dashed rgba(255,255,255,.30);border-radius:10px;outline:none;">
          <strong>Paste Screenshot</strong><br>
          Click here, then press <kbd>Ctrl</kbd> + <kbd>V</kbd> (or <kbd>Cmd</kbd> + <kbd>V</kbd>)
        </div>

        <label style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>Or Upload File:</span>
          <input id="sbi-file" type="file" accept="image/*" />
        </label>

        ${state.lastInputMethod ? `<div class="muted">Loaded via: <strong>${esc(state.lastInputMethod)}</strong></div>` : ""}

        ${state.status === "loading-lib" ? `<div>Loading OCR library…</div>` : ""}
        ${state.status === "ocr" ? `<div>OCR in progress: <strong>${progressPct}%</strong></div>` : ""}
        ${state.status === "error" ? `<div style="color:#ff9aa2;">${esc(state.error)}</div>` : ""}

        ${
          state.imageDataUrl
            ? `<img src="${state.imageDataUrl}" alt="Preview" style="max-width:100%;max-height:260px;border:1px solid rgba(255,255,255,.18);border-radius:10px;" />`
            : `<div style="padding:20px;border:1px dashed rgba(255,255,255,.25);border-radius:10px;">No image loaded yet.</div>`
        }

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

        <div style="border-top:1px solid rgba(255,255,255,.14);padding-top:10px;">
          <h3 style="margin:0 0 8px 0;">Parsed Fields</h3>
          ${
            p
              ? `
              <div style="display:grid;grid-template-columns:repeat(3,minmax(140px,1fr));gap:8px;">
                <label>Name<input id="sbi-name" style="width:100%;" value="${esc(p.name)}"></label>
                <label>Size/Type<input id="sbi-sizeType" style="width:100%;" value="${esc(p.sizeType)}"></label>
                <label>Alignment<input id="sbi-alignment" style="width:100%;" value="${esc(p.alignment)}"></label>

                <label>CR<input id="sbi-cr" style="width:100%;" value="${esc(p.cr)}"></label>
                <label>XP<input id="sbi-xp" type="number" style="width:100%;" value="${esc(p.xp ?? 0)}"></label>
                <label>PB<input id="sbi-pb" type="number" style="width:100%;" value="${esc(p.proficiencyBonus ?? 2)}"></label>

                <label>AC<input id="sbi-ac" type="number" style="width:100%;" value="${esc(p.ac)}"></label>
                <label>AC Notes<input id="sbi-acText" style="width:100%;" value="${esc(p.acText || "")}"></label>
                <label>HP<input id="sbi-hp" type="number" style="width:100%;" value="${esc(p.hp)}"></label>
                <label>HP Formula<input id="sbi-hpFormula" style="width:100%;" value="${esc(p.hpFormula || "")}"></label>
                <label style="grid-column:span 2;">Speed<input id="sbi-speed" style="width:100%;" value="${esc(p.speed || "")}"></label>

                <label>STR<input id="sbi-str" type="number" style="width:100%;" value="${esc(p.str)}"></label>
                <label>DEX<input id="sbi-dex" type="number" style="width:100%;" value="${esc(p.dex)}"></label>
                <label>CON<input id="sbi-con" type="number" style="width:100%;" value="${esc(p.con)}"></label>
                <label>INT<input id="sbi-int" type="number" style="width:100%;" value="${esc(p.int)}"></label>
                <label>WIS<input id="sbi-wis" type="number" style="width:100%;" value="${esc(p.wis)}"></label>
                <label>CHA<input id="sbi-cha" type="number" style="width:100%;" value="${esc(p.cha)}"></label>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
                <label>Traits (one per line: "Name. text")
                  <textarea id="sbi-traits" style="width:100%;min-height:110px;">${esc(entryLines(p.traits))}</textarea>
                </label>
                <label>Actions (one per line: "Name. text")
                  <textarea id="sbi-actions" style="width:100%;min-height:110px;">${esc(entryLines(p.actions))}</textarea>
                </label>
                <label>Bonus Actions
                  <textarea id="sbi-bonusActions" style="width:100%;min-height:90px;">${esc(entryLines(p.bonusActions))}</textarea>
                </label>
                <label>Reactions
                  <textarea id="sbi-reactions" style="width:100%;min-height:90px;">${esc(entryLines(p.reactions))}</textarea>
                </label>
                <label style="grid-column:1 / -1;">Legendary Actions
                  <textarea id="sbi-legendaryActions" style="width:100%;min-height:90px;">${esc(entryLines(p.legendaryActions))}</textarea>
                </label>
              </div>

              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                <button id="sbi-refresh-preview">Refresh Preview</button>
                <button id="sbi-save">Save Draft</button>
                <button id="sbi-copy">Copy JSON</button>
              </div>
              `
              : `<div class="muted">No parsed result yet.</div>`
          }
        </div>

        ${p ? statBlockPreview(p) : ""}
      </div>
    `;
  }

  function bind(labelEl, panelEl) {
    // cleanup old listeners from previous render
    if (panelEl._sbiCleanup && Array.isArray(panelEl._sbiCleanup)) {
      for (const fn of panelEl._sbiCleanup) {
        try { fn(); } catch {}
      }
    }
    panelEl._sbiCleanup = [];

    const fileEl = panelEl.querySelector("#sbi-file");
    const pasteZone = panelEl.querySelector("#sbi-paste-zone");
    const runBtn = panelEl.querySelector("#sbi-run");
    const clearBtn = panelEl.querySelector("#sbi-clear");
    const reparseBtn = panelEl.querySelector("#sbi-reparse");
    const refreshBtn = panelEl.querySelector("#sbi-refresh-preview");
    const saveBtn = panelEl.querySelector("#sbi-save");
    const copyBtn = panelEl.querySelector("#sbi-copy");

    fileEl?.addEventListener("change", async (e) => {
      try {
        const file = e.target.files?.[0];
        if (!file) return;
        await setImageFromBlob(file, { labelEl, panelEl, method: "file upload" });
      } catch (err) {
        state.status = "error";
        state.error = `File load failed: ${err?.message || err}`;
        render({ labelEl, panelEl });
      }
    });

    const onZonePaste = async (e) => {
      try {
        const items = e.clipboardData?.items || [];
        for (const item of items) {
          if (item.type && item.type.startsWith("image/")) {
            e.preventDefault();
            const blob = item.getAsFile();
            if (blob) {
              await setImageFromBlob(blob, { labelEl, panelEl, method: "clipboard paste" });
              return;
            }
          }
        }
      } catch (err) {
        state.status = "error";
        state.error = `Paste failed: ${err?.message || err}`;
        render({ labelEl, panelEl });
      }
    };

    pasteZone?.addEventListener("click", () => pasteZone.focus());
    pasteZone?.addEventListener("paste", onZonePaste);

    const onGlobalPaste = async (e) => {
      if (!panelEl || !panelEl.isConnected) return;
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            await setImageFromBlob(blob, { labelEl, panelEl, method: "clipboard paste" });
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onGlobalPaste);

    panelEl._sbiCleanup.push(() => {
      window.removeEventListener("paste", onGlobalPaste);
      pasteZone?.removeEventListener("paste", onZonePaste);
    });

    clearBtn?.addEventListener("click", () => {
      state.imageDataUrl = "";
      state.ocrText = "";
      state.parsed = null;
      state.status = "idle";
      state.progress = 0;
      state.error = "";
      state.lastInputMethod = "";
      render({ labelEl, panelEl });
    });

    runBtn?.addEventListener("click", async () => {
      try {
        state.status = "loading-lib";
        render({ labelEl, panelEl });

        await ensureTesseractLoaded();

        state.status = "ocr";
        state.progress = 0;
        render({ labelEl, panelEl });

        const result = await window.Tesseract.recognize(state.imageDataUrl, "eng", {
          logger: (m) => {
            if (m?.status === "recognizing text" && Number.isFinite(m.progress)) {
              state.progress = m.progress;
            }
          }
        });

        state.ocrText = normalizeSpaces(result?.data?.text || "");
        state.parsed = parseStatBlock(state.ocrText);
        state.status = "done";
      } catch (err) {
        state.status = "error";
        state.error = `OCR failed: ${err?.message || err}`;
      }
      render({ labelEl, panelEl });
    });

    reparseBtn?.addEventListener("click", () => {
      const txt = panelEl.querySelector("#sbi-ocr-text")?.value || "";
      state.ocrText = txt;
      state.parsed = parseStatBlock(txt);
      state.status = "done";
      render({ labelEl, panelEl });
    });

    refreshBtn?.addEventListener("click", () => {
      const reviewed = collectReviewed(panelEl);
      if (!reviewed) return;
      state.parsed = reviewed;
      render({ labelEl, panelEl });
    });

    saveBtn?.addEventListener("click", () => {
      const reviewed = collectReviewed(panelEl);
      if (!reviewed) return;
      state.parsed = reviewed;
      addDraft({ ...reviewed, _savedAt: new Date().toISOString() });
      alert("Saved to Stat Block Importer drafts.");
      render({ labelEl, panelEl });
    });

    copyBtn?.addEventListener("click", async () => {
      const reviewed = collectReviewed(panelEl);
      if (!reviewed) return;
      try {
        await navigator.clipboard.writeText(JSON.stringify(reviewed, null, 2));
        alert("Copied JSON.");
      } catch {
        alert("Clipboard copy failed.");
      }
    });
  }

  function render({ labelEl, panelEl }) {
    if (!panelEl) return;
    if (labelEl) labelEl.textContent = TOOL_NAME;
    panelEl.innerHTML = template();
    bind(labelEl, panelEl);
  }

  window.registerTool({
    id: TOOL_ID,
    name: TOOL_NAME,
    description: "Paste or upload screenshot, OCR locally, parse monster fields, and preview full stat block.",
    render
  });
})();
