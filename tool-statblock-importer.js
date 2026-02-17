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
    error: ""
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

  function parseStatBlock(rawText) {
    const text = normalizeSpaces(rawText);
    const lines = splitLines(text);
    const firstLine = lines[0] || "Unknown Monster";
    const secondLine = lines[1] || "";

    // Size/type/alignment common pattern
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

      traits: [],
      actions: [],
      bonusActions: [],
      reactions: [],
      legendaryActions: [],

      importedAt: new Date().toISOString(),
      importedFrom: "screenshot-ocr"
    };
  }

  function collectReviewed(panelEl) {
    if (!state.parsed) return null;
    const q = (id) => panelEl.querySelector(`#${id}`);
    return {
      ...state.parsed,
      name: (q("sbi-name")?.value || "").trim() || "Unknown Monster",
      sizeType: (q("sbi-sizeType")?.value || "").trim(),
      alignment: (q("sbi-alignment")?.value || "").trim(),
      cr: (q("sbi-cr")?.value || "").trim() || "1/8",
      ac: toInt(q("sbi-ac")?.value, 10),
      hp: Math.max(1, toInt(q("sbi-hp")?.value, 1))
    };
  }

  function template() {
    const progressPct = Math.round((state.progress || 0) * 100);

    return `
      <div class="tool-panel" style="display:grid;gap:12px;">
        <div>
          <h2 style="margin:0 0 6px 0;">Stat Block Importer (MVP)</h2>
          <div class="muted">Upload screenshot → OCR locally → parse core fields → save draft.</div>
        </div>

        <label style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>Image:</span>
          <input id="sbi-file" type="file" accept="image/*" />
        </label>

        ${state.status === "loading-lib" ? `<div>Loading OCR library…</div>` : ""}
        ${state.status === "ocr" ? `<div>OCR in progress: <strong>${progressPct}%</strong></div>` : ""}
        ${state.status === "error" ? `<div style="color:#ff9aa2;">${esc(state.error)}</div>` : ""}

        ${
          state.imageDataUrl
            ? `<img src="${state.imageDataUrl}" alt="Preview" style="max-width:100%;max-height:260px;border:1px solid rgba(255,255,255,.18);border-radius:10px;" />`
            : `<div style="padding:20px;border:1px dashed rgba(255,255,255,.25);border-radius:10px;">Upload a stat block screenshot to begin.</div>`
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
          <h3 style="margin:0 0 8px 0;">Parsed Core</h3>
          ${
            state.parsed
              ? `
              <div style="display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:8px;">
                <label>Name<input id="sbi-name" style="width:100%;" value="${esc(state.parsed.name)}"></label>
                <label>Size/Type<input id="sbi-sizeType" style="width:100%;" value="${esc(state.parsed.sizeType)}"></label>
                <label>Alignment<input id="sbi-alignment" style="width:100%;" value="${esc(state.parsed.alignment)}"></label>
                <label>CR<input id="sbi-cr" style="width:100%;" value="${esc(state.parsed.cr)}"></label>
                <label>AC<input id="sbi-ac" type="number" style="width:100%;" value="${esc(state.parsed.ac)}"></label>
                <label>HP<input id="sbi-hp" type="number" style="width:100%;" value="${esc(state.parsed.hp)}"></label>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                <button id="sbi-save">Save Draft</button>
                <button id="sbi-copy">Copy JSON</button>
              </div>
              `
              : `<div class="muted">No parsed result yet.</div>`
          }
        </div>
      </div>
    `;
  }

  function bind(labelEl, panelEl) {
    const fileEl = panelEl.querySelector("#sbi-file");
    const runBtn = panelEl.querySelector("#sbi-run");
    const clearBtn = panelEl.querySelector("#sbi-clear");
    const reparseBtn = panelEl.querySelector("#sbi-reparse");
    const saveBtn = panelEl.querySelector("#sbi-save");
    const copyBtn = panelEl.querySelector("#sbi-copy");

    fileEl?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        state.imageDataUrl = String(fr.result || "");
        state.error = "";
        render({ labelEl, panelEl });
      };
      fr.readAsDataURL(file);
    });

    clearBtn?.addEventListener("click", () => {
      state.imageDataUrl = "";
      state.ocrText = "";
      state.parsed = null;
      state.status = "idle";
      state.progress = 0;
      state.error = "";
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
              // lightweight progress refresh
              const runText = panelEl.querySelector("#sbi-run");
              const statusRow = panelEl.querySelector("div");
              if (runText) runText.textContent = `Run OCR + Parse (${Math.round(m.progress * 100)}%)`;
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

    saveBtn?.addEventListener("click", () => {
      const reviewed = collectReviewed(panelEl);
      if (!reviewed) return;
      addDraft({ ...reviewed, _savedAt: new Date().toISOString() });
      alert("Saved to Stat Block Importer drafts.");
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
    description: "Upload a screenshot and parse monster stats locally (no API).",
    render
  });
})();
