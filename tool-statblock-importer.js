// tool-statblock-importer.js
(function () {
  const STORAGE_KEY = "vrahuneStatblockImporterDraftsV1";
  const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

  const state = {
    imageDataUrl: "",
    ocrText: "",
    parsed: null,
    status: "idle",
    error: "",
    progress: 0
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
    return normalizeSpaces(text).split("\n").map(l => l.trim()).filter(Boolean);
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
      const existing = document.querySelector('script[data-tool="tesseract"]');
      if (existing) {
        if (window.Tesseract) return resolve();
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

    const acM = /\bArmor Class\b\s*([0-9]{1,2})(?:\s*\(([^)]+)\))?/i.exec(text) ||
                /\bAC\b[:\s]*([0-9]{1,2})(?:\s*\(([^)]+)\))?/i.exec(text);
    const hpM = /\bHit Points?\b\s*([0-9]{1,4})(?:\s*\(([^)]+)\))?/i.exec(text) ||
                /\bHP\b[:\s]*([0-9]{1,4})(?:\s*\(([^)]+)\))?/i.exec(text);
    const speedM = /\bSpeed\b\s*([^\n]+)/i.exec(text);
    const crM = /\bChallenge\b\s*([0-9]+(?:\/[0-9]+)?)(?:\s*\(([\d,]+)\s*XP\))?/i.exec(text) ||
                /\bCR\b[:\s]*([0-9]+(?:\/[0-9]+)?)/i.exec(text);
    const pbM = /\bProficiency Bonus\b\s*([+\-]?\d+)/i.exec(text) ||
                /\bPB\b[:\s]*([+\-]?\d+)/i.exec(text);

    const combined = lines.join(" ");
    const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const statRegex = /\b(STR|DEX|CON|INT|WIS|CHA)\s+(\d{1,2})\b/gi;
    let sm;
    while ((sm = statRegex.exec(combined)) !== null) {
      stats[sm[1].toLowerCase()] = toInt(sm[2], 10);
    }

    function lineList(labelRegex) {
      const m = new RegExp(`\\b(?:${labelRegex})\\b\\s*([^\\n]+)`, "i").exec(text);
      return m ? m[1].split(/[,;]+/).map(s => s.trim()).filter(Boolean) : [];
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
      str: stats.str, dex: stats.dex, con: stats.con, int: stats.int, wis: stats.wis, cha: stats.cha,
      saves: lineList("Saving Throws"),
      skills: lineList("Skills"),
      vulnerabilities: lineList("Damage Vulnerabilities"),
      resistances: lineList("Damage Resistances"),
      immunities: lineList("Damage Immunities"),
      conditionImmunities: lineList("Condition Immunities"),
      senses: lineList("Senses"),
      languages: lineList("Languages"),
      habitats: lineList("Habitat|Environment"),
      traits: [],
      actions: [],
      bonusActions: [],
      reactions: [],
      legendaryActions: [],
      importedAt: new Date().toISOString(),
      importedFrom: "screenshot-ocr"
    };
  }

  function html() {
    const progressPct = Math.round((state.progress || 0) * 100);
    return `
      <div style="display:grid;gap:12px;padding:12px;">
        <div>
          <h2 style="margin:0 0 6px 0;">Stat Block Importer (MVP)</h2>
          <div style="opacity:.8;">Upload screenshot → OCR locally → parse core fields → save draft.</div>
        </div>

        <label style="display:inline-flex;align-items:center;gap:8px;">
          <span>Image:</span>
          <input type="file" id="sbi-file" accept="image/*" />
        </label>

        ${state.status === "loading-lib" ? `<div>Loading OCR library…</div>` : ""}
        ${state.status === "ocr" ? `<div>OCR in progress: <strong>${progressPct}%</strong></div>` : ""}
        ${state.status === "error" ? `<div style="color:#ff9aa2;">${esc(state.error)}</div>` : ""}

        ${
          state.imageDataUrl
            ? `<img src="${state.imageDataUrl}" style="max-width:100%;max-height:260px;border:1px solid rgba(255,255,255,.2);border-radius:10px;" />`
            : `<div style="padding:20px;border:1px dashed rgba(255,255,255,.3);border-radius:10px;">Upload a stat block screenshot to begin.</div>`
        }

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="sbi-run" ${state.imageDataUrl ? "" : "disabled"}>Run OCR + Parse</button>
          <button id="sbi-clear">Clear</button>
        </div>

        <details ${state.ocrText ? "open" : ""}>
          <summary>OCR Text</summary>
          <textarea id="sbi-ocr-text" style="width:100%;min-height:120px;margin-top:8px;">${esc(state.ocrText || "")}</textarea>
          <div style="margin-top:8px;"><button id="sbi-reparse" ${state.ocrText ? "" : "disabled"}>Re-parse text</button></div>
        </details>

        <div style="border-top:1px solid rgba(255,255,255,.15);padding-top:10px;">
          <h3 style="margin:0 0 8px 0;">Parsed Core</h3>
          ${
            state.parsed ? `
            <div style="display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:8px;">
              <label>Name<input id="sbi-name" style="width:100%;" value="${esc(state.parsed.name)}"></label>
              <label>Size/Type<input id="sbi-sizeType" style="width:100%;" value="${esc(state.parsed.sizeType)}"></label>
              <label>Alignment<input id="sbi-alignment" style="width:100%;" value="${esc(state.parsed.alignment)}"></label>
              <label>CR<input id="sbi-cr" style="width:100%;" value="${esc(state.parsed.cr)}"></label>
              <label>AC<input id="sbi-ac" type="number" style="width:100%;" value="${esc(state.parsed.ac)}"></label>
              <label>HP<input id="sbi-hp" type="number" style="width:100%;" value="${esc(state.parsed.hp)}"></label>
            </div>
            <div style="margin-top:10px;display:flex;gap:8px;">
              <button id="sbi-save">Save Draft</button>
              <button id="sbi-copy">Copy JSON</button>
            </div>
            ` : `<div style="opacity:.75;">No parsed result yet.</div>`
          }
        </div>
      </div>
    `;
  }

  function collectReviewed(root) {
    if (!state.parsed) return null;
    return {
      ...state.parsed,
      name: (root.querySelector("#sbi-name")?.value || "").trim() || "Unknown Monster",
      sizeType: (root.querySelector("#sbi-sizeType")?.value || "").trim(),
      alignment: (root.querySelector("#sbi-alignment")?.value || "").trim(),
      cr: (root.querySelector("#sbi-cr")?.value || "").trim() || "1/8",
      ac: toInt(root.querySelector("#sbi-ac")?.value, 10),
      hp: Math.max(1, toInt(root.querySelector("#sbi-hp")?.value, 1))
    };
  }

  function bind(root) {
    root.querySelector("#sbi-file")?.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        state.imageDataUrl = String(fr.result || "");
        state.error = "";
        renderInto(root);
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
      renderInto(root);
    });

    root.querySelector("#sbi-run")?.addEventListener("click", async () => {
      try {
        state.status = "loading-lib";
        renderInto(root);
        await ensureTesseractLoaded();

        state.status = "ocr";
        state.progress = 0;
        renderInto(root);

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
      renderInto(root);
    });

    root.querySelector("#sbi-reparse")?.addEventListener("click", () => {
      state.ocrText = root.querySelector("#sbi-ocr-text")?.value || "";
      state.parsed = parseStatBlock(state.ocrText);
      state.status = "done";
      renderInto(root);
    });

    root.querySelector("#sbi-save")?.addEventListener("click", () => {
      const reviewed = collectReviewed(root);
      if (!reviewed) return;
      addDraft({ ...reviewed, _savedAt: new Date().toISOString() });
      alert("Saved to Stat Block Importer drafts.");
    });

    root.querySelector("#sbi-copy")?.addEventListener("click", async () => {
      const reviewed = collectReviewed(root);
      if (!reviewed) return;
      try {
        await navigator.clipboard.writeText(JSON.stringify(reviewed, null, 2));
        alert("Copied JSON.");
      } catch {
        alert("Clipboard copy failed.");
      }
    });
  }

  function renderInto(container) {
    container.innerHTML = html();
    bind(container);
  }

  const toolDef = {
    id: "statblockImporter",
    name: "Stat Block Importer",
    description: "Upload screenshot, OCR locally, parse core fields."
  };

  // Support either render() => string or render(container)
  toolDef.render = function (container) {
    if (container && container.nodeType === 1) {
      renderInto(container);
      return;
    }
    return html();
  };
  toolDef.mount = function (container) {
    renderInto(container);
  };

  if (typeof window.registerTool === "function") {
    window.registerTool(toolDef);
  } else {
    console.warn("registerTool not found: Stat Block Importer not registered.");
  }
})();
