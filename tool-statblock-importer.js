// tool-statblock-importer.js
(() => {
  const TOOL_ID = "statblockImporter";
  const TOOL_NAME = "Stat Block Importer";
  const STORAGE_KEY = "vrahuneStatblockImporterDraftsV3";
  const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

  const state = {
    imageDataUrl: "",
    ocrText: "",
    parsed: null,
    status: "idle", // idle | loading-lib | ocr | done | error
    progress: 0,
    error: "",
    lastInputMethod: "",
  };

  // -------------------------
  // Utils
  // -------------------------
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
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function uniq(arr) {
    return [...new Set((arr || []).map((x) => String(x).trim()).filter(Boolean))];
  }
  function normalizeSpaces(s) {
    return String(s || "")
      .replace(/\r/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  function splitLines(text) {
    return normalizeSpaces(text)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }
  function listToLine(arr) {
    return (arr || []).join(", ");
  }
  function entriesToText(entries) {
    return (entries || []).map((e) => `${e.name}. ${e.text}`).join("\n");
  }
  function confBadge(level) {
    const c = level === "high" ? "#7bd88f" : level === "medium" ? "#ffd166" : "#ff9aa2";
    return `<span style="font-size:10px;border:1px solid ${c};color:${c};padding:1px 6px;border-radius:999px;">${esc(level || "low")}</span>`;
  }

  // -------------------------
  // Storage
  // -------------------------
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
    saveDrafts(drafts.slice(0, 200));
  }

  // -------------------------
  // Clipboard/file image load
  // -------------------------
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



  // -------------------------
  // Image preprocessing + OCR multipass
  // -------------------------
  async function dataUrlToImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  function canvasToDataUrl(canvas) {
    return canvas.toDataURL("image/png");
  }

  function preprocessImageVariant(img, opts = {}) {
    const {
      scale = 1,
      grayscale = false,
      contrast = 1,
      threshold = null,
      denoise = false,
      sharpen = false,
    } = opts;

    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    ctx.drawImage(img, 0, 0, w, h);
    let imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (grayscale || threshold !== null) {
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = y;
      }
      if (contrast !== 1) {
        r = clamp((r - 128) * contrast + 128, 0, 255);
        g = clamp((g - 128) * contrast + 128, 0, 255);
        b = clamp((b - 128) * contrast + 128, 0, 255);
      }
      if (threshold !== null) {
        const v = r >= threshold ? 255 : 0;
        r = g = b = v;
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }

    if (denoise) {
      const copy = new Uint8ClampedArray(d);
      const idx = (x, y) => (y * w + x) * 4;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          let sum = 0;
          for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) sum += copy[idx(x + xx, y + yy)];
          const v = sum / 9;
          const p = idx(x, y);
          d[p] = d[p + 1] = d[p + 2] = v;
        }
      }
    }

    if (sharpen) {
      const copy = new Uint8ClampedArray(d);
      const idx = (x, y) => (y * w + x) * 4;
      const k = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++) sum += copy[idx(x + kx, y + ky)] * k[ky + 1][kx + 1];
          const v = clamp(sum, 0, 255);
          const p = idx(x, y);
          d[p] = d[p + 1] = d[p + 2] = v;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvasToDataUrl(canvas);
  }

  function scoreOcrText(text) {
    const t = (text || "").toLowerCase();
    const labels = [
      "armor class", "hit points", "speed", "str", "dex", "con", "int", "wis", "cha",
      "saving throws", "skills", "damage resistances", "damage immunities", "condition immunities",
      "senses", "languages", "challenge", "proficiency bonus", "actions", "bonus actions", "reactions", "legendary actions"
    ];
    let labelHits = 0;
    for (const lbl of labels) if (t.includes(lbl)) labelHits++;
    const lineCount = splitLines(text).length;
    const hasDice = /\d+d\d+/i.test(text);
    const hasAttack = /(hit:|melee weapon attack|ranged weapon attack)/i.test(text);
    let score = labelHits * 8 + Math.min(lineCount, 220) * 0.3;
    if (hasDice) score += 15;
    if (hasAttack) score += 12;
    const weirdRatio = ((text.match(/[^\w\s.,:;()\-+/%']/g) || []).length) / Math.max(1, text.length);
    score -= weirdRatio * 120;
    return score;
  }

  async function runMultiPassOCR(dataUrl, onProgress) {
    await ensureTesseractLoaded();
    const img = await dataUrlToImage(dataUrl);
    const variants = [
      { name: "raw", dataUrl },
      { name: "upscale-gray-contrast", dataUrl: preprocessImageVariant(img, { scale: 1.8, grayscale: true, contrast: 1.35, threshold: null, denoise: true }) },
      { name: "upscale-threshold", dataUrl: preprocessImageVariant(img, { scale: 2.0, grayscale: true, contrast: 1.45, threshold: 170, denoise: true, sharpen: true }) },
    ];

    const results = [];
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const rec = await window.Tesseract.recognize(v.dataUrl, "eng", {
        logger: (m) => {
          if (m?.status === "recognizing text" && Number.isFinite(m.progress)) {
            const total = (i + m.progress) / variants.length;
            onProgress?.(total, v.name);
          }
        },
      });
      const text = normalizeSpaces(rec?.data?.text || "");
      results.push({ name: v.name, text, score: scoreOcrText(text) });
    }

    results.sort((a, b) => b.score - a.score);
    return { best: results[0], all: results };
  }

  // -------------------------
  // OCR cleanup & section slicing
  // -------------------------
  function normalizeOcr(raw) {
    let t = normalizeSpaces(raw);

    const fixes = [
      [/Armor\s*Clas[s5]\b/gi, "Armor Class"],
      [/Arm0r\s*Class\b/gi, "Armor Class"],
      [/Hit\s*Point[s5]\b/gi, "Hit Points"],
      [/Proficienc[yv]\s*Bonus\b/gi, "Proficiency Bonus"],
      [/Saving\s*Throw[s5]\b/gi, "Saving Throws"],
      [/Damage\s*Resistan[ct]e[s5]\b/gi, "Damage Resistances"],
      [/Condition\s*Immunit(?:y|ies)\b/gi, "Condition Immunities"],
      [/Legendary\s*Action[s5]\b/gi, "Legendary Actions"],
      [/Bonus\s*Action[s5]\b/gi, "Bonus Actions"],
      [/Reaction[s5]\b/gi, "Reactions"],
      [/[“”]/g, '"'],
      [/[‘’]/g, "'"],
    ];
    for (const [re, rep] of fixes) t = t.replace(re, rep);

    // enforce line breaks before common labels
    const labels = [
      "Armor Class",
      "Hit Points",
      "Speed",
      "STR",
      "DEX",
      "CON",
      "INT",
      "WIS",
      "CHA",
      "Saving Throws",
      "Skills",
      "Damage Vulnerabilities",
      "Damage Resistances",
      "Damage Immunities",
      "Condition Immunities",
      "Senses",
      "Languages",
      "Challenge",
      "Proficiency Bonus",
      "Habitat",
      "Environment",
      "Actions",
      "Bonus Actions",
      "Reactions",
      "Legendary Actions",
    ];
    for (const lbl of labels) {
      const re = new RegExp(`\\s(${lbl})\\b`, "g");
      t = t.replace(re, "\n$1");
    }

    return normalizeSpaces(t);
  }

  function findSectionLineIndex(lines, sectionName) {
    const re = new RegExp(`^${sectionName}$`, "i");
    return lines.findIndex((l) => re.test(l));
  }

  function sliceByHeaders(lines) {
    const idx = {
      actions: findSectionLineIndex(lines, "Actions"),
      bonusActions: findSectionLineIndex(lines, "Bonus Actions"),
      reactions: findSectionLineIndex(lines, "Reactions"),
      legendaryActions: findSectionLineIndex(lines, "Legendary Actions"),
    };

    const starts = Object.values(idx).filter((n) => n >= 0).sort((a, b) => a - b);
    const firstSection = starts.length ? starts[0] : lines.length;

    function secSlice(start) {
      if (start < 0) return [];
      const next = starts.find((n) => n > start);
      const end = next >= 0 ? next : lines.length;
      return lines.slice(start + 1, end);
    }

    const pre = lines.slice(0, firstSection);
    const actions = secSlice(idx.actions);
    const bonusActions = secSlice(idx.bonusActions);
    const reactions = secSlice(idx.reactions);
    const legendaryActions = secSlice(idx.legendaryActions);

    return { pre, actions, bonusActions, reactions, legendaryActions };
  }

  function splitPreIntoCoreMetaTraits(pre) {
    // Keep first two lines for name/subtitle externally
    const coreLabels = /^(Armor Class|Hit Points|Speed|STR|DEX|CON|INT|WIS|CHA|Challenge|Proficiency Bonus)\b/i;
    const metaLabels = /^(Saving Throws|Skills|Damage Vulnerabilities|Damage Resistances|Damage Immunities|Condition Immunities|Senses|Languages|Habitat|Environment)\b/i;

    const core = [];
    const meta = [];
    const traitCandidates = [];

    for (let i = 2; i < pre.length; i++) {
      const line = pre[i];
      if (coreLabels.test(line)) core.push(line);
      else if (metaLabels.test(line)) meta.push(line);
      else traitCandidates.push(line);
    }

    return { core, meta, traitCandidates };
  }

  // -------------------------
  // Deterministic field parsing
  // -------------------------
  function repairNumericOCR(s) {
    return String(s || "")
      .replace(/(?<=\b[+\-( ]*)[lI](?=\d)/g, "1")
      .replace(/(?<=\d)[lI](?=\b)/g, "1")
      .replace(/(?<=\b)O(?=\d)/g, "0")
      .replace(/(?<=\d)O(?=\b)/g, "0");
  }

  function bestLine(lines, re) {
    const cands = lines.filter((l) => re.test(l));
    if (!cands.length) return "";
    cands.sort((a, b) => a.length - b.length);
    return cands[0];
  }

  function parseAC(coreLines, allText) {
    let line = bestLine(coreLines, /\bArmor Class\b/i);
    line = repairNumericOCR(line);

    let m = /\bArmor Class\b\s*[:\-]?\s*(\d{1,2})(?:\s*\(([^)]+)\))?/i.exec(line);
    if (!m) m = /\bArmor Class\b[^0-9]{0,12}(\d{1,2})(?:\s*\(([^)]+)\))?/i.exec(allText);

    if (m) {
      const n = toInt(m[1], 10);
      return { value: clamp(n, 1, 30), notes: (m[2] || "").trim(), confidence: n >= 1 && n <= 30 ? "high" : "low" };
    }
    return { value: 10, notes: "", confidence: "low" };
  }

  function parseHP(coreLines, allText) {
    let line = bestLine(coreLines, /\bHit Points?\b|\bHP\b/i);
    line = repairNumericOCR(line);

    let m =
      /\bHit Points?\b\s*[:\-]?\s*(\d{1,4})\s*\(([^)]+)\)/i.exec(line) ||
      /\bHit Points?\b\s*[:\-]?\s*(\d{1,4})\b/i.exec(line) ||
      /\bHP\b\s*[:\-]?\s*(\d{1,4})\s*\(([^)]+)\)/i.exec(line) ||
      /\bHP\b\s*[:\-]?\s*(\d{1,4})\b/i.exec(line);

    if (!m) {
      m =
        /\bHit Points?\b[^0-9]{0,16}(\d{1,4})(?:\s*\(([^)]+)\))?/i.exec(allText) ||
        /\bHP\b[^0-9]{0,8}(\d{1,4})(?:\s*\(([^)]+)\))?/i.exec(allText);
    }

    if (m) {
      const hp = toInt(m[1], 1);
      return {
        value: clamp(hp, 1, 9999),
        formula: (m[2] || "").trim(),
        confidence: hp > 0 ? "high" : "low",
      };
    }
    return { value: 1, formula: "", confidence: "low" };
  }

  function parseSpeed(coreLines, allText) {
    const line = bestLine(coreLines, /\bSpeed\b/i);
    let m = /\bSpeed\b\s*[:\-]?\s*([^\n]+)/i.exec(line);
    if (!m) m = /\bSpeed\b\s*[:\-]?\s*([^\n]+)/i.exec(allText);
    if (m) {
      const speed = m[1].trim();
      return { value: speed || "30 ft.", confidence: /\bft\b/i.test(speed) ? "high" : "medium" };
    }
    return { value: "30 ft.", confidence: "low" };
  }

  function parseCRPB(coreLines, allText) {
    let cr = "1/8", xp = 0, pb = 2;
    let crConf = "low", pbConf = "low";

    const coreJoin = coreLines.join(" ");

    let m = /\bChallenge\b\s*([0-9]+(?:\/[0-9]+)?)(?:\s*\(([\d,]+)\s*XP\))?/i.exec(coreJoin);
    if (!m) m = /\b(?:Challenge|CR)\b[^0-9/]{0,12}([0-9]+(?:\/[0-9]+)?)(?:\s*\(([\d,]+)\s*XP\))?/i.exec(allText);
    if (m) {
      cr = m[1];
      xp = m[2] ? toInt(String(m[2]).replace(/,/g, ""), 0) : 0;
      crConf = "high";
    }

    let p = /\bProficiency Bonus\b\s*([+\-]?\d+)/i.exec(coreJoin);
    if (!p) p = /\b(?:Proficiency Bonus|PB)\b[^+\-\d]{0,8}([+\-]?\d+)/i.exec(allText);
    if (p) {
      pb = clamp(toInt(p[1], 2), -5, 20);
      pbConf = "high";
    }

    return { cr, xp, pb, crConf, pbConf };
  }

  function parseAbilities(coreLines, allText) {
    const out = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, confidence: "low" };
    const src = `${coreLines.join(" ")} ${allText}`;

    const re = /\b(STR|DEX|CON|INT|WIS|CHA)\s+(\d{1,2})\b/gi;
    let m; const found = {};
    while ((m = re.exec(src)) !== null) {
      found[m[1].toLowerCase()] = clamp(toInt(m[2], 10), 1, 30);
    }

    if (Object.keys(found).length >= 4) {
      out.str = found.str ?? out.str;
      out.dex = found.dex ?? out.dex;
      out.con = found.con ?? out.con;
      out.int = found.int ?? out.int;
      out.wis = found.wis ?? out.wis;
      out.cha = found.cha ?? out.cha;
      out.confidence = Object.keys(found).length === 6 ? "high" : "medium";
      return out;
    }

    // fallback: first six plausible numbers after STR token
    const tokens = src.match(/\b([1-2]?\d|30)\b/g) || [];
    if (tokens.length >= 6) {
      out.str = clamp(toInt(tokens[0], 10), 1, 30);
      out.dex = clamp(toInt(tokens[1], 10), 1, 30);
      out.con = clamp(toInt(tokens[2], 10), 1, 30);
      out.int = clamp(toInt(tokens[3], 10), 1, 30);
      out.wis = clamp(toInt(tokens[4], 10), 1, 30);
      out.cha = clamp(toInt(tokens[5], 10), 1, 30);
      out.confidence = "low";
    }

    return out;
  }

  function parseMetaList(metaLines, labelRegex) {
    const re = new RegExp(`\\b(?:${labelRegex})\\b\\s*(.+)$`, "i");
    for (const line of metaLines) {
      const m = re.exec(line);
      if (m) {
        return uniq(m[1].split(/[,;]+/).map((x) => x.trim()));
      }
    }
    return [];
  }

  // -------------------------
  // Entry parsing
  // -------------------------
  function parseEntryLines(lines) {
    // Very conservative:
    // Only lines with "Name. text" create structured entries.
    const structured = [];
    const rawLeftovers = [];

    let current = null;
    const titleRe = /^([A-Z][A-Za-z0-9'’\-\s]{2,100})\.\s+(.+)$/;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      const t = titleRe.exec(line);
      if (t) {
        if (current) structured.push(current);
        current = { name: t[1].trim(), text: t[2].trim() };
      } else if (current) {
        // continuation
        current.text += " " + line;
      } else {
        rawLeftovers.push(line);
      }
    }
    if (current) structured.push(current);

    return {
      entries: structured.filter((e) => e.name && e.text),
      raw: rawLeftovers.join("\n").trim(),
    };
  }

  // -------------------------
  // Main parser
  // -------------------------
  function parseStatBlock(rawInput) {
    const cleaned = normalizeOcr(rawInput);
    const lines = splitLines(cleaned);
    const allText = lines.join("\n");

    const name = lines[0] || "Unknown Monster";
    const subtitle = lines[1] || "";

    let sizeType = "";
    let alignment = "";
    const sm = /^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+([^,]+),\s*(.+)$/i.exec(subtitle);
    if (sm) {
      sizeType = `${sm[1]} ${sm[2]}`.trim();
      alignment = sm[3].trim();
    } else {
      sizeType = subtitle.trim();
    }

    const sliced = sliceByHeaders(lines);
    const preSplit = splitPreIntoCoreMetaTraits(sliced.pre);

    const acP = parseAC(preSplit.core, allText);
    const hpP = parseHP(preSplit.core, allText);
    const spP = parseSpeed(preSplit.core, allText);
    const crpb = parseCRPB(preSplit.core, allText);
    const abil = parseAbilities(preSplit.core, allText);

    const saves = parseMetaList(preSplit.meta, "Saving Throws");
    const skills = parseMetaList(preSplit.meta, "Skills");
    const vulnerabilities = parseMetaList(preSplit.meta, "Damage Vulnerabilities");
    const resistances = parseMetaList(preSplit.meta, "Damage Resistances");
    const immunities = parseMetaList(preSplit.meta, "Damage Immunities");
    const conditionImmunities = parseMetaList(preSplit.meta, "Condition Immunities");
    const senses = parseMetaList(preSplit.meta, "Senses");
    const languages = parseMetaList(preSplit.meta, "Languages");
    const habitats = parseMetaList(preSplit.meta, "Habitat|Environment");

    // Parse sections conservatively
    const traitParsed = parseEntryLines(preSplit.traitCandidates);
    const actionParsed = parseEntryLines(sliced.actions);
    const bonusParsed = parseEntryLines(sliced.bonusActions);
    const reactParsed = parseEntryLines(sliced.reactions);
    const legendParsed = parseEntryLines(sliced.legendaryActions);

    // If actions header exists but no structured actions, keep raw text
    const actionsRawFallback = actionParsed.raw || (sliced.actions.length ? sliced.actions.join("\n") : "");

    const unmappedChunks = [];
    if (traitParsed.raw) unmappedChunks.push(`[Traits raw leftovers]\n${traitParsed.raw}`);
    if (bonusParsed.raw) unmappedChunks.push(`[Bonus Actions raw leftovers]\n${bonusParsed.raw}`);
    if (reactParsed.raw) unmappedChunks.push(`[Reactions raw leftovers]\n${reactParsed.raw}`);
    if (legendParsed.raw) unmappedChunks.push(`[Legendary Actions raw leftovers]\n${legendParsed.raw}`);

    return {
      id: `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      source: "Imported Screenshot",
      sourceType: "homebrew",
      importedFrom: "screenshot-ocr",
      importedAt: new Date().toISOString(),

      name: name.trim(),
      sizeType,
      alignment,

      ac: acP.value,
      acText: acP.notes,
      hp: hpP.value,
      hpFormula: hpP.formula,
      speed: spP.value,

      cr: crpb.cr,
      xp: crpb.xp,
      proficiencyBonus: crpb.pb,

      str: abil.str,
      dex: abil.dex,
      con: abil.con,
      int: abil.int,
      wis: abil.wis,
      cha: abil.cha,

      saves,
      skills,
      vulnerabilities,
      resistances,
      immunities,
      conditionImmunities,
      senses,
      languages,
      habitats,

      traits: traitParsed.entries,
      actions: actionParsed.entries,
      bonusActions: bonusParsed.entries,
      reactions: reactParsed.entries,
      legendaryActions: legendParsed.entries,

      // raw section editors (important for cleanup)
      rawSections: {
        traits: preSplit.traitCandidates.join("\n"),
        actions: sliced.actions.join("\n"),
        bonusActions: sliced.bonusActions.join("\n"),
        reactions: sliced.reactions.join("\n"),
        legendaryActions: sliced.legendaryActions.join("\n"),
        actionsRawFallback,
      },

      unmappedText: unmappedChunks.join("\n\n").trim(),

      confidence: {
        ac: acP.confidence,
        hp: hpP.confidence,
        speed: spP.confidence,
        cr: crpb.crConf,
        pb: crpb.pbConf,
        abilities: abil.confidence,
      },

      cleanedOcrText: cleaned,
    };
  }

  // -------------------------
  // Rebuild from raw section editors
  // -------------------------
  function parseEntriesFromTextarea(text) {
    const lines = splitLines(text || "");
    return parseEntryLines(lines).entries;
  }

  function collectReviewed(panelEl) {
    if (!state.parsed) return null;
    const q = (id) => panelEl.querySelector(`#${id}`);

    const rawTraits = q("sbi-raw-traits")?.value || "";
    const rawActions = q("sbi-raw-actions")?.value || "";
    const rawBonus = q("sbi-raw-bonus")?.value || "";
    const rawReactions = q("sbi-raw-reactions")?.value || "";
    const rawLegendary = q("sbi-raw-legendary")?.value || "";

    const reviewed = {
      ...state.parsed,

      name: (q("sbi-name")?.value || "").trim() || "Unknown Monster",
      sizeType: (q("sbi-sizeType")?.value || "").trim(),
      alignment: (q("sbi-alignment")?.value || "").trim(),

      ac: clamp(toInt(q("sbi-ac")?.value, 10), 1, 30),
      acText: (q("sbi-acText")?.value || "").trim(),
      hp: clamp(toInt(q("sbi-hp")?.value, 1), 1, 9999),
      hpFormula: (q("sbi-hpFormula")?.value || "").trim(),
      speed: (q("sbi-speed")?.value || "").trim() || "30 ft.",

      cr: (q("sbi-cr")?.value || "").trim() || "1/8",
      xp: Math.max(0, toInt(q("sbi-xp")?.value, 0)),
      proficiencyBonus: clamp(toInt(q("sbi-pb")?.value, 2), -5, 20),

      str: clamp(toInt(q("sbi-str")?.value, 10), 1, 30),
      dex: clamp(toInt(q("sbi-dex")?.value, 10), 1, 30),
      con: clamp(toInt(q("sbi-con")?.value, 10), 1, 30),
      int: clamp(toInt(q("sbi-int")?.value, 10), 1, 30),
      wis: clamp(toInt(q("sbi-wis")?.value, 10), 1, 30),
      cha: clamp(toInt(q("sbi-cha")?.value, 10), 1, 30),

      saves: uniq((q("sbi-saves")?.value || "").split(/[,;]+/).map((x) => x.trim())),
      skills: uniq((q("sbi-skills")?.value || "").split(/[,;]+/).map((x) => x.trim())),
      vulnerabilities: uniq((q("sbi-vuln")?.value || "").split(/[,;]+/).map((x) => x.trim())),
      resistances: uniq((q("sbi-resist")?.value || "").split(/[,;]+/).map((x) => x.trim())),
      immunities: uniq((q("sbi-immune")?.value || "").split(/[,;]+/).map((x) => x.trim())),
      conditionImmunities: uniq((q("sbi-condImm")?.value || "").split(/[,;]+/).map((x) => x.trim())),
      senses: uniq((q("sbi-senses")?.value || "").split(/[,;]+/).map((x) => x.trim())),
      languages: uniq((q("sbi-languages")?.value || "").split(/[,;]+/).map((x) => x.trim())),
      habitats: uniq((q("sbi-habitats")?.value || "").split(/[,;]+/).map((x) => x.trim())),

      // structured
      traits: parseEntriesFromTextarea(q("sbi-traits")?.value || ""),
      actions: parseEntriesFromTextarea(q("sbi-actions")?.value || ""),
      bonusActions: parseEntriesFromTextarea(q("sbi-bonusActions")?.value || ""),
      reactions: parseEntriesFromTextarea(q("sbi-reactions")?.value || ""),
      legendaryActions: parseEntriesFromTextarea(q("sbi-legendaryActions")?.value || ""),

      // raw section editors
      rawSections: {
        ...(state.parsed.rawSections || {}),
        traits: rawTraits,
        actions: rawActions,
        bonusActions: rawBonus,
        reactions: rawReactions,
        legendaryActions: rawLegendary,
      },

      unmappedText: (q("sbi-unmapped")?.value || "").trim(),
    };

    return reviewed;
  }

  // -------------------------
  // Preview renderer (Monster Vault style)
  // -------------------------
  function renderMvFeatureList(label, list) {
    const arr = Array.isArray(list) ? list : [];
    if (!arr.length) return "";
    return `
      <div class="mv-detail-section">
        <div class="mv-detail-heading">${esc(label)} (${arr.length})</div>
        <ul class="mv-feature-list">
          ${arr.map((f) => {
            const name = String(f?.name || "Feature").trim();
            const text = String(f?.text || "").trim();
            if (!text) return "";
            return `<li><b>${esc(name)}.</b> ${esc(text)}</li>`;
          }).join("")}
        </ul>
      </div>
    `;
  }

  function statBlockPreview(m) {
    if (!m) return "";
    const miscRows = [
      ["Saving Throws", listToLine(m.saves)],
      ["Skills", listToLine(m.skills)],
      ["Vulnerabilities", listToLine(m.vulnerabilities)],
      ["Resistances", listToLine(m.resistances)],
      ["Immunities", listToLine(m.immunities)],
      ["Condition Immunities", listToLine(m.conditionImmunities)],
      ["Senses", listToLine(m.senses)],
      ["Languages", listToLine(m.languages)],
      ["Habitats", listToLine(m.habitats)]
    ].filter(([,v]) => String(v || "").trim());

    const pb = Number.isFinite(Number(m.proficiencyBonus)) ? Number(m.proficiencyBonus) : 2;
    const xp = Number.isFinite(Number(m.xp)) ? Number(m.xp) : 0;
    const actionCount = (m.actions?.length || 0) + (m.bonusActions?.length || 0) + (m.reactions?.length || 0) + (m.legendaryActions?.length || 0);

    return `
      <div style="margin-top:8px;border:1px solid rgba(255,255,255,.18);border-radius:14px;overflow:hidden;background:#111;">
        <div style="position:sticky;top:0;z-index:2;padding:12px;border-bottom:1px solid rgba(255,255,255,.14);background:#121212;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:20px;">${esc(m.name || 'Unknown Monster')}</h3>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <span style="font-size:11px;padding:2px 8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;">CR ${esc(m.cr || '—')}</span>
              <span style="font-size:11px;padding:2px 8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;">XP ${xp.toLocaleString()}</span>
              <span style="font-size:11px;padding:2px 8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;">PB ${pb>=0?'+':''}${pb}</span>
            </div>
          </div>
          <div class="muted" style="margin-top:4px;">${esc(m.sizeType || '—')}${m.alignment ? `, ${esc(m.alignment)}` : ''}</div>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:10px;">
            <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">AC</div><b>${esc(m.ac)}</b>${m.acText ? `<div class="muted" style="font-size:10px;">${esc(m.acText)}</div>` : ''}</div>
            <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">HP</div><b>${esc(m.hp)}</b>${m.hpFormula ? `<div class="muted" style="font-size:10px;">${esc(m.hpFormula)}</div>` : ''}</div>
            <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">Speed</div><b>${esc(m.speed || '—')}</b></div>
          </div>
        </div>

        <div class="mv-details" style="padding:12px;">
          <div class="mv-details-grid" style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;">
            ${['str','dex','con','int','wis','cha'].map((k) => `<div class="mv-statline" style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><span style="display:block;font-size:10px;opacity:.8;text-transform:uppercase;">${k}</span><b>${esc(m[k] ?? 10)}</b></div>`).join('')}
            <div class="mv-statline" style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><span style="display:block;font-size:10px;opacity:.8;">PB</span><b>${pb>=0?'+':''}${pb}</b></div>
            <div class="mv-statline" style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><span style="display:block;font-size:10px;opacity:.8;">XP</span><b>${xp.toLocaleString()}</b></div>
          </div>

          ${miscRows.length ? `<div class="mv-detail-lines" style="margin-top:10px;display:grid;gap:6px;">${miscRows.map(([k,v]) => `<div class="mv-detail-line" style="display:grid;grid-template-columns:180px 1fr;gap:8px;"><span class="muted">${esc(k)}</span><b style="font-weight:600;">${esc(v)}</b></div>`).join('')}</div>` : ''}

          ${renderMvFeatureList('Traits', m.traits)}
          ${actionCount ? `
            ${renderMvFeatureList('Actions', m.actions)}
            ${renderMvFeatureList('Bonus Actions', m.bonusActions)}
            ${renderMvFeatureList('Reactions', m.reactions)}
            ${renderMvFeatureList('Legendary Actions', m.legendaryActions)}
          ` : `<div class="muted" style="margin-top:8px;">No actions recorded yet.</div>`}
        </div>
      </div>
    `;
  }

  // -------------------------
  // Template
  // -------------------------
  function template() {
    const p = state.parsed;
    const progressPct = Math.round((state.progress || 0) * 100);

    return `
      <div class="tool-panel" style="display:grid;gap:12px;">
        <div>
          <h2 style="margin:0 0 6px 0;">Stat Block Importer</h2>
          <div class="muted">Section-first parser: safer mapping, raw section fallback, manual cleanup workflow.</div>
        </div>

        <div id="sbi-paste-zone" tabindex="0" style="padding:14px;border:1px dashed rgba(255,255,255,.30);border-radius:10px;outline:none;">
          <strong>Paste Screenshot</strong><br>
          Click here and press <kbd>Ctrl</kbd> + <kbd>V</kbd> (or <kbd>Cmd</kbd> + <kbd>V</kbd>)
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
            <button id="sbi-reparse">Re-parse Edited Text</button>
          </div>
        </details>

        ${
          p ? `
            <div style="border-top:1px solid rgba(255,255,255,.14);padding-top:10px;">
              <details id="sbi-parsed-wrap" style="border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:0 10px;margin-bottom:10px;">
                <summary style="cursor:pointer;padding:10px 0;font-weight:700;">Parsed Fields</summary>
                <div style="padding:4px 0 10px 0;">

              <div style="display:grid;grid-template-columns:repeat(3,minmax(140px,1fr));gap:8px;">
                <label>Name<input id="sbi-name" style="width:100%;" value="${esc(p.name)}"></label>
                <label>Size/Type<input id="sbi-sizeType" style="width:100%;" value="${esc(p.sizeType)}"></label>
                <label>Alignment<input id="sbi-alignment" style="width:100%;" value="${esc(p.alignment)}"></label>

                <label>AC ${confBadge(p.confidence?.ac)}<input id="sbi-ac" type="number" style="width:100%;" value="${esc(p.ac)}"></label>
                <label>AC Notes<input id="sbi-acText" style="width:100%;" value="${esc(p.acText || "")}"></label>
                <label>HP ${confBadge(p.confidence?.hp)}<input id="sbi-hp" type="number" style="width:100%;" value="${esc(p.hp)}"></label>
                <label>HP Formula<input id="sbi-hpFormula" style="width:100%;" value="${esc(p.hpFormula || "")}"></label>
                <label>Speed ${confBadge(p.confidence?.speed)}<input id="sbi-speed" style="width:100%;" value="${esc(p.speed || "")}"></label>

                <label>CR ${confBadge(p.confidence?.cr)}<input id="sbi-cr" style="width:100%;" value="${esc(p.cr)}"></label>
                <label>XP<input id="sbi-xp" type="number" style="width:100%;" value="${esc(p.xp ?? 0)}"></label>
                <label>PB ${confBadge(p.confidence?.pb)}<input id="sbi-pb" type="number" style="width:100%;" value="${esc(p.proficiencyBonus ?? 2)}"></label>
              </div>

              <div style="display:grid;grid-template-columns:repeat(6,minmax(80px,1fr));gap:8px;margin-top:10px;">
                <label>STR<input id="sbi-str" type="number" style="width:100%;" value="${esc(p.str)}"></label>
                <label>DEX<input id="sbi-dex" type="number" style="width:100%;" value="${esc(p.dex)}"></label>
                <label>CON<input id="sbi-con" type="number" style="width:100%;" value="${esc(p.con)}"></label>
                <label>INT<input id="sbi-int" type="number" style="width:100%;" value="${esc(p.int)}"></label>
                <label>WIS<input id="sbi-wis" type="number" style="width:100%;" value="${esc(p.wis)}"></label>
                <label>CHA<input id="sbi-cha" type="number" style="width:100%;" value="${esc(p.cha)}"></label>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
                <label>Saving Throws<input id="sbi-saves" style="width:100%;" value="${esc(listToLine(p.saves))}"></label>
                <label>Skills<input id="sbi-skills" style="width:100%;" value="${esc(listToLine(p.skills))}"></label>
                <label>Damage Vulnerabilities<input id="sbi-vuln" style="width:100%;" value="${esc(listToLine(p.vulnerabilities))}"></label>
                <label>Damage Resistances<input id="sbi-resist" style="width:100%;" value="${esc(listToLine(p.resistances))}"></label>
                <label>Damage Immunities<input id="sbi-immune" style="width:100%;" value="${esc(listToLine(p.immunities))}"></label>
                <label>Condition Immunities<input id="sbi-condImm" style="width:100%;" value="${esc(listToLine(p.conditionImmunities))}"></label>
                <label>Senses<input id="sbi-senses" style="width:100%;" value="${esc(listToLine(p.senses))}"></label>
                <label>Languages<input id="sbi-languages" style="width:100%;" value="${esc(listToLine(p.languages))}"></label>
                <label style="grid-column:1 / -1;">Habitats / Environment<input id="sbi-habitats" style="width:100%;" value="${esc(listToLine(p.habitats))}"></label>
              </div>

              <h4 style="margin:12px 0 6px 0;">Structured Entries</h4>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <label>Traits (Name. text)<textarea id="sbi-traits" style="width:100%;min-height:110px;">${esc(entriesToText(p.traits))}</textarea></label>
                <label>Actions (Name. text)<textarea id="sbi-actions" style="width:100%;min-height:110px;">${esc(entriesToText(p.actions))}</textarea></label>
                <label>Bonus Actions<textarea id="sbi-bonusActions" style="width:100%;min-height:90px;">${esc(entriesToText(p.bonusActions))}</textarea></label>
                <label>Reactions<textarea id="sbi-reactions" style="width:100%;min-height:90px;">${esc(entriesToText(p.reactions))}</textarea></label>
                <label style="grid-column:1 / -1;">Legendary Actions<textarea id="sbi-legendaryActions" style="width:100%;min-height:90px;">${esc(entriesToText(p.legendaryActions))}</textarea></label>
              </div>

              <h4 style="margin:12px 0 6px 0;">Raw Section Editors</h4>
              <div class="muted" style="margin-bottom:6px;">Use these when OCR structure fails. Then copy cleaned lines to structured boxes above.</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <label>Raw Traits<textarea id="sbi-raw-traits" style="width:100%;min-height:90px;">${esc(p.rawSections?.traits || "")}</textarea></label>
                <label>Raw Actions<textarea id="sbi-raw-actions" style="width:100%;min-height:90px;">${esc(p.rawSections?.actions || p.rawSections?.actionsRawFallback || "")}</textarea></label>
                <label>Raw Bonus Actions<textarea id="sbi-raw-bonus" style="width:100%;min-height:80px;">${esc(p.rawSections?.bonusActions || "")}</textarea></label>
                <label>Raw Reactions<textarea id="sbi-raw-reactions" style="width:100%;min-height:80px;">${esc(p.rawSections?.reactions || "")}</textarea></label>
                <label style="grid-column:1 / -1;">Raw Legendary Actions<textarea id="sbi-raw-legendary" style="width:100%;min-height:80px;">${esc(p.rawSections?.legendaryActions || "")}</textarea></label>
              </div>

              <label style="display:block;margin-top:10px;">Unmapped Text<textarea id="sbi-unmapped" style="width:100%;min-height:90px;">${esc(p.unmappedText || "")}</textarea></label>

              </div>

              </details>

              <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <button id="sbi-preview-hover-btn" type="button">Stat Block Preview (Hover)</button>
                <span class="muted">Hover button to preview standardized card.</span>
              </div>

              <div id="sbi-hover-preview" style="display:none;position:fixed;z-index:99999;left:50%;top:50%;transform:translate(-50%,-50%);width:min(980px,94vw);max-height:90vh;overflow:auto;background:#121212;border:1px solid rgba(255,255,255,.25);border-radius:12px;box-shadow:0 30px 90px rgba(0,0,0,.6);padding:12px;">
                ${statBlockPreview(p)}
              </div>

              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                <button id="sbi-refresh-preview">Refresh Preview</button>
                <button id="sbi-save">Save Draft</button>
                <button id="sbi-copy">Copy JSON</button>
              </div>
            </div>
          ` : `<div class="muted">No parsed result yet.</div>`
        }

        
      </div>
    `;
  }

  // -------------------------
  // Bind events
  // -------------------------
  function bind(labelEl, panelEl) {
    if (panelEl._sbiCleanup && Array.isArray(panelEl._sbiCleanup)) {
      for (const fn of panelEl._sbiCleanup) {
        try { fn(); } catch {}
      }
    }
    panelEl._sbiCleanup = [];

    const q = (id) => panelEl.querySelector(`#${id}`);

    const pasteZone = q("sbi-paste-zone");
    const fileEl = q("sbi-file");

    const onZonePaste = async (e) => {
      try {
        const items = e.clipboardData?.items || [];
        for (const it of items) {
          if (it.type && it.type.startsWith("image/")) {
            e.preventDefault();
            const blob = it.getAsFile();
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

    const onGlobalPaste = async (e) => {
      if (!panelEl || !panelEl.isConnected) return;
      const items = e.clipboardData?.items || [];
      for (const it of items) {
        if (it.type && it.type.startsWith("image/")) {
          e.preventDefault();
          const blob = it.getAsFile();
          if (blob) {
            await setImageFromBlob(blob, { labelEl, panelEl, method: "clipboard paste" });
            return;
          }
        }
      }
    };

    pasteZone?.addEventListener("click", () => pasteZone.focus());
    pasteZone?.addEventListener("paste", onZonePaste);
    window.addEventListener("paste", onGlobalPaste);

    panelEl._sbiCleanup.push(() => {
      pasteZone?.removeEventListener("paste", onZonePaste);
      window.removeEventListener("paste", onGlobalPaste);
    });

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

    q("sbi-clear")?.addEventListener("click", () => {
      state.imageDataUrl = "";
      state.ocrText = "";
      state.parsed = null;
      state.status = "idle";
      state.progress = 0;
      state.error = "";
      state.lastInputMethod = "";
      render({ labelEl, panelEl });
    });

    q("sbi-run")?.addEventListener("click", async () => {
      try {
        state.status = "ocr";
        state.progress = 0;
        state._activePass = "";
        render({ labelEl, panelEl });

        const ocr = await runMultiPassOCR(state.imageDataUrl, (p, passName) => {
          state.progress = p;
          state._activePass = passName;
        });

        state.ocrText = ocr.best.text;
        state._ocrCandidates = ocr.all;
        state.parsed = parseStatBlock(ocr.best.text);
        state.status = "done";
      } catch (err) {
        state.status = "error";
        state.error = `OCR failed: ${err?.message || err}`;
      }
      render({ labelEl, panelEl });
    });

    q("sbi-reparse")?.addEventListener("click", () => {
      const raw = q("sbi-ocr-text")?.value || "";
      state.ocrText = raw;
      state.parsed = parseStatBlock(raw);
      state.status = "done";
      render({ labelEl, panelEl });
    });

    q("sbi-refresh-preview")?.addEventListener("click", () => {
      const reviewed = collectReviewed(panelEl);
      if (!reviewed) return;
      state.parsed = reviewed;
      render({ labelEl, panelEl });
    });

    q("sbi-save")?.addEventListener("click", () => {
      const reviewed = collectReviewed(panelEl);
      if (!reviewed) return;
      state.parsed = reviewed;
      addDraft({ ...reviewed, _savedAt: new Date().toISOString() });
      alert("Saved to Stat Block Importer drafts.");
      render({ labelEl, panelEl });
    });

    
    const previewBtn = q("sbi-preview-hover-btn");
    const previewEl = q("sbi-hover-preview");
    const showPreview = () => { if (previewEl) previewEl.style.display = "block"; };
    const hidePreview = () => { if (previewEl) previewEl.style.display = "none"; };
    previewBtn?.addEventListener("mouseenter", showPreview);
    previewBtn?.addEventListener("mouseleave", hidePreview);
    previewEl?.addEventListener("mouseenter", showPreview);
    previewEl?.addEventListener("mouseleave", hidePreview);

q("sbi-copy")?.addEventListener("click", async () => {
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



// -------------------------
// v5.4 parser upgrades (researched phrase-bank + column-aware OCR + guards)
// -------------------------
function imageToCanvas(img) {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  return c;
}
function cropCanvasRegion(srcCanvas, x, y, w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d");
  ctx.drawImage(srcCanvas, Math.round(x), Math.round(y), Math.round(w), Math.round(h), 0, 0, c.width, c.height);
  return c;
}
function estimateTwoColumnSplitX(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  const startX = Math.floor(w * 0.33), endX = Math.floor(w * 0.67);
  let bestX = Math.floor(w/2), bestScore = Infinity;
  for (let x=startX; x<=endX; x++) {
    let ink = 0;
    for (let y=0; y<h; y+=2) {
      const i=(y*w+x)*4;
      const lum = 0.299*data[i]+0.587*data[i+1]+0.114*data[i+2];
      ink += (255-lum);
    }
    if (ink < bestScore) { bestScore = ink; bestX = x; }
  }
  return bestX;
}
async function splitIntoColumnsDataUrls(dataUrl, opts={}) {
  const { forceTwoColumn=true, gutterPx=20, minWidthForTwoCol=700 } = opts;
  const img = await dataUrlToImage(dataUrl);
  const base = imageToCanvas(img);
  const w=base.width, h=base.height;
  if (!forceTwoColumn && w < minWidthForTwoCol) return [{name:"single",dataUrl}];
  const splitX = estimateTwoColumnSplitX(base);
  const leftW = Math.max(1, splitX-gutterPx);
  const rightX = Math.min(w-1, splitX+gutterPx);
  const rightW = Math.max(1, w-rightX);
  const left = cropCanvasRegion(base, 0, 0, leftW, h).toDataURL("image/png");
  const right = cropCanvasRegion(base, rightX, 0, rightW, h).toDataURL("image/png");
  return [{name:"left-col",dataUrl:left},{name:"right-col",dataUrl:right}];
}
async function runOcrOnDataUrl(dataUrl, onProgress, base=0, span=1, passName="") {
  const rec = await window.Tesseract.recognize(dataUrl, "eng", {
    logger: (m)=> {
      if (m?.status === "recognizing text" && Number.isFinite(m.progress)) onProgress?.(base + m.progress*span, passName);
    }
  });
  return normalizeSpaces(rec?.data?.text || "");
}
async function runMultiPassOCR(dataUrl, onProgress) {
  await ensureTesseractLoaded();
  const img = await dataUrlToImage(dataUrl);
  const variants = [
    { name: "raw", dataUrl },
    { name: "upscale-gray-contrast", dataUrl: preprocessImageVariant(img, { scale: 1.8, grayscale: true, contrast: 1.35, threshold: null, denoise: true }) },
    { name: "upscale-threshold", dataUrl: preprocessImageVariant(img, { scale: 2.0, grayscale: true, contrast: 1.45, threshold: 170, denoise: true, sharpen: true }) },
  ];
  const results = [];
  for (let i=0;i<variants.length;i++) {
    const v=variants[i];
    const single = await runOcrOnDataUrl(v.dataUrl, onProgress, i/variants.length, 0.45/variants.length, `${v.name}-single`);
    const cols = await splitIntoColumnsDataUrls(v.dataUrl, { forceTwoColumn:true, gutterPx:20, minWidthForTwoCol:700 });
    let combined = single;
    if (cols.length===2){
      const left = await runOcrOnDataUrl(cols[0].dataUrl, onProgress, (i/variants.length)+(0.45/variants.length), 0.275/variants.length, `${v.name}-left`);
      const right = await runOcrOnDataUrl(cols[1].dataUrl, onProgress, (i/variants.length)+(0.725/variants.length), 0.275/variants.length, `${v.name}-right`);
      combined = normalizeSpaces(`${left}\n${right}`);
    }
    results.push({ name:`${v.name}-single`, text:single, score:scoreOcrText(single) });
    results.push({ name:`${v.name}-columns`, text:combined, score:scoreOcrText(combined)+8 });
  }
  results.sort((a,b)=>b.score-a.score);
  return { best: results[0], all: results };
}

const FIELD_BLOCK_PATTERNS = {
  alignment:[/\bmelee weapon attack\b/i,/\branged weapon attack\b/i,/\battack roll\b/i,/\bhit:\b/i,/\bactions?\b/i,/\breactions?\b/i,/\blegendary actions?\b/i,/\bbonus actions?\b/i],
  sizeType:[/\bmelee weapon attack\b/i,/\branged weapon attack\b/i,/\battack roll\b/i,/\bhit:\b/i,/\bactions?\b/i],
  languages:[/\bmelee weapon attack\b/i,/\branged weapon attack\b/i,/\bhit:\b/i,/\bactions?\b/i],
  senses:[/\bmelee weapon attack\b/i,/\branged weapon attack\b/i,/\bhit:\b/i,/\bactions?\b/i],
};
function containsBlockedPattern(v, field){ const s=String(v||"").trim(); return (FIELD_BLOCK_PATTERNS[field]||[]).some(re=>re.test(s));}
function cleanScalar(v){ return String(v||"").replace(/\s{2,}/g," ").replace(/[|]/g,"").trim();}
const ALIGNMENT_ALLOW_RE=/^(unaligned|any alignment|any non-good alignment|any non-lawful alignment|any non-evil alignment|lawful good|neutral good|chaotic good|lawful neutral|neutral|chaotic neutral|lawful evil|neutral evil|chaotic evil)(\s*\(.+\))?$/i;
function sanitizeAlignment(value){
  let v=cleanScalar(value);
  if (!v || containsBlockedPattern(v,"alignment")) return "";
  v=v.split(/\b(?:Actions?|Reactions?|Legendary Actions?|Bonus Actions?)\b/i)[0].trim();
  if (ALIGNMENT_ALLOW_RE.test(v)) return v;
  const known=["lawful good","neutral good","chaotic good","lawful neutral","neutral","chaotic neutral","lawful evil","neutral evil","chaotic evil","unaligned","any alignment","any non-good alignment","any non-lawful alignment","any non-evil alignment"];
  const low=v.toLowerCase();
  for (const k of known){ const idx=low.indexOf(k); if (idx>=0) return k.replace(/\b\w/g,c=>c.toUpperCase()); }
  return "";
}
function sanitizeSizeType(value){
  let v=cleanScalar(value);
  if (!v || containsBlockedPattern(v,"sizeType")) return "";
  const hasSize=/\b(Tiny|Small|Medium|Large|Huge|Gargantuan)\b/i.test(v);
  if (!hasSize && v.length>45) return "";
  return v;
}
function sanitizeListField(items, fieldName){
  const arr=Array.isArray(items)?items:String(items||"").split(/[,;]+/);
  return [...new Set(arr.map(x=>cleanScalar(x)).filter(x=>x && !containsBlockedPattern(x, fieldName) && !/^(actions?|reactions?|legendary actions?|bonus actions?)$/i.test(x)))];
}
function parseCompactImmunitiesLine(line){
  const out={ dmg:[], cond:[] };
  if (!line) return out;
  const raw=line.replace(/^Immunities\b[:\s]*/i,"").trim();
  if (!raw) return out;
  const parts=raw.split(/[;,]/).map(s=>s.trim()).filter(Boolean);
  const condSet=new Set(["blinded","charmed","deafened","exhaustion","frightened","grappled","incapacitated","invisible","paralyzed","petrified","poisoned","prone","restrained","stunned","unconscious"]);
  for (const p of parts){ if (condSet.has(p.toLowerCase())) out.cond.push(p); else out.dmg.push(p); }
  return out;
}
function splitPreIntoCoreMetaTraits(pre) {
  const core=[], meta=[], traitCandidates=[];
  const coreLabels=[/^Armor Class\b/i,/^AC\b/i,/^Hit Points?\b/i,/^HP\b/i,/^Speed\b/i,/^Initiative\b/i,/^STR\b/i,/^DEX\b/i,/^CON\b/i,/^INT\b/i,/^WIS\b/i,/^CHA\b/i,/^Challenge\b/i,/^CR\b/i,/^Proficiency Bonus\b/i,/^PB\b/i];
  const metaLabels=[/^Saving Throws?\b/i,/^Saves\b/i,/^Skills?\b/i,/^Damage Vulnerabilities?\b/i,/^Vulnerabilities\b/i,/^Damage Resistances?\b/i,/^Resistances\b/i,/^Damage Immunities?\b/i,/^Immunities\b/i,/^Condition Immunities?\b/i,/^Senses\b/i,/^Languages\b/i,/^Habitat\b/i,/^Environment\b/i];
  const ignore=[/^MOD\b/i,/^SAVE\b/i,/^MOD\s+SAVE\b/i,/^SAVE\s+MOD\b/i];
  const any=(line, arr)=>arr.some(re=>re.test(line));
  for (let i=2;i<pre.length;i++){
    const line=(pre[i]||"").trim(); if(!line) continue;
    if (any(line, ignore)) continue;
    if (any(line, coreLabels) || /\b(?:AC|HP|Speed|Initiative|CR|PB)\b/i.test(line)) { core.push(line); continue; }
    if (any(line, metaLabels) || /understands|can't speak|telepathy|darkvision|blindsight|tremorsense|truesight/i.test(line)) { meta.push(line); continue; }
    traitCandidates.push(line);
  }
  return { core, meta, traitCandidates };
}
function parseAC(coreLines, allText){
  const src = repairNumericOCR(`${(coreLines||[]).join(" ")}\n${allText||""}`);
  const patterns=[
    /\b(?:AC|Armor\s*Class)\b\s*[:\-]?\s*(\d{1,2})(?:\s*\(([^)]+)\))?/i,
    /\bAC\b\s*(\d{1,2})\b(?=[^\n]*(?:Initiative|HP|Speed|$))/i,
  ];
  for (const re of patterns){
    const m=re.exec(src);
    if (m){ const n=toInt(m[1],10); if(n>=1&&n<=30) return { value:n, notes:(m[2]||"").trim(), confidence:"high"}; }
  }
  return { value:10, notes:"", confidence:"low" };
}

const __oldParseStatBlock = parseStatBlock;
parseStatBlock = function(rawInput){
  let result = __oldParseStatBlock(rawInput);
  try{
    const cleaned = normalizeOcr(rawInput||"");
    const lines = splitLines(cleaned);
    const sliced = sliceByHeaders(lines);
    const preSplit = splitPreIntoCoreMetaTraits(sliced.pre);

    // robust core refresh
    const acP = parseAC(preSplit.core, cleaned);
    if (acP?.confidence !== "low") { result.ac = acP.value; result.acText = acP.notes || result.acText; result.confidence = {...(result.confidence||{}), ac: acP.confidence}; }

    // compact immunities
    const immLine = preSplit.meta.find(l=>/^Immunities\b/i.test(l));
    if (immLine){
      const x = parseCompactImmunitiesLine(immLine);
      result.immunities = uniq([...(result.immunities||[]), ...x.dmg]);
      result.conditionImmunities = uniq([...(result.conditionImmunities||[]), ...x.cond]);
    }

    // language continuation rescue
    if ((!result.languages || !result.languages.length)){
      const m = preSplit.meta.find(l=>/understands|can't speak|telepathy|common|undercommon|draconic/i.test(l));
      if (m) result.languages = [m.replace(/^Languages?\b[:\s]*/i,"").trim()];
    }

    // Guards
    result.sizeType = sanitizeSizeType(result.sizeType);
    result.alignment = sanitizeAlignment(result.alignment);
    result.languages = sanitizeListField(result.languages||[], "languages");
    result.senses = sanitizeListField(result.senses||[], "senses");
  } catch(e){}
  return result;
};


  window.registerTool({
    id: TOOL_ID,
    name: TOOL_NAME,
    description: "Paste/upload screenshot, OCR locally, section-first parse with raw fallbacks.",
    render,
  });
})();
