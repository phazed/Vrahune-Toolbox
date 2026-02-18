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
    activeTab: "ocr", // ocr | import
    importer: { fmt: "open5e", jsonText: "", items: [], selected: null, error: "" },
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
  
  // ---------------------
  // Open5e source helpers
  // ---------------------
  const OPEN5E_BASE = "https://api.open5e.com";

  async function open5eFetchDocuments() {
    try {
      const url = `${OPEN5E_BASE}/documents/?limit=200`;
      const res = await fetch(url, { method: "GET", headers: { "Accept": "application/json" }, mode: "cors", cache: "no-store" });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok) throw new Error(`Open5e documents error ${res.status}`);
      if (!ct.includes("application/json")) throw new Error("Open5e documents returned non-JSON");
      const data = await res.json();
      const docs = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
      // normalize to { slug, title }
      const mapped = docs.map(d => ({
        slug: d?.slug || d?.key || d?.document || "",
        title: d?.title || d?.name || d?.slug || d?.key || ""
      })).filter(d => d.slug);
      state.importer.documents = mapped;
    } catch {
      // fallback common docs if endpoint fails
      state.importer.documents = [
        { slug: "srd-2024", title: "SRD 2024" },
        { slug: "srd-2014", title: "SRD 2014" },
        { slug: "5esrd", title: "5e SRD (legacy)" },
      ];
    }
  }

  let _open5eSearchTimer = null;

  function normalizeOpen5eMonster(m) {
    if (!m) return null;

    // Speed can be a string or object in some datasets; normalize to string
    let speed = m.speed;
    if (speed && typeof speed === "object") {
      speed = Object.entries(speed).map(([k,v]) => {
        if (v == null || v === "") return "";
        return k === "walk" ? `${v} ft.` : `${k} ${v} ft.`;
      }).filter(Boolean).join(", ");
    }
    speed = String(speed || "").replace(/\s+/g, " ").trim();

    const hp = toInt(m.hit_points ?? m.hp ?? 0, 0);
    const hitDice = String(m.hit_dice || m.hitDice || "").trim();

    const acRaw = m.armor_class ?? m.ac ?? "";
    const ac = toInt((typeof acRaw === "string" ? (acRaw.match(/\d+/)?.[0] || "") : acRaw), 0);
    const acText = typeof acRaw === "string" && acRaw.replace(/\d+/g,"").trim() ? String(acRaw).trim() : "";

    const name = String(m.name || "").trim();
    const size = String(m.size || "").trim();
    const type = String(m.type || "").trim();
    const alignment = String(m.alignment || "").trim();
    const sizeType = [size, type].filter(Boolean).join(" ");

    // Abilities
    const str = toInt(m.strength, 10);
    const dex = toInt(m.dexterity, 10);
    const con = toInt(m.constitution, 10);
    const intel = toInt(m.intelligence, 10);
    const wis = toInt(m.wisdom, 10);
    const cha = toInt(m.charisma, 10);

    // Saves/skills/meta are often stored as comma-separated strings in Open5e
    const splitCsv = (v) => String(v || "").split(/[,;]+/).map(s => s.trim()).filter(Boolean);

    const saves = splitCsv(m.saving_throws || m.saves);
    const skills = splitCsv(m.skills);

    const vulnerabilities = splitCsv(m.damage_vulnerabilities);
    const resistances = splitCsv(m.damage_resistances);
    const immunities = splitCsv(m.damage_immunities);
    const conditionImmunities = splitCsv(m.condition_immunities);

    const senses = String(m.senses || "").replace(/\s+/g, " ").trim();
    const languages = String(m.languages || "").replace(/\s+/g, " ").trim();

    const cr = String(m.challenge_rating ?? m.cr ?? "").trim();
    const pb = m.proficiency_bonus != null ? String(m.proficiency_bonus).trim() : "";

    // Sections: Open5e uses arrays of objects with "name"/"desc" (or "desc" strings)
    const mapFeatureArray = (arr) => (Array.isArray(arr) ? arr.map(x => ({
      name: String(x?.name || "").trim(),
      text: String(x?.desc || x?.text || "").trim()
    })).filter(x => x.name || x.text) : []);

    const traits = mapFeatureArray(m.special_abilities);
    const actions = mapFeatureArray(m.actions);
    const bonusActions = mapFeatureArray(m.bonus_actions);
    const reactions = mapFeatureArray(m.reactions);
    const legendaryActions = mapFeatureArray(m.legendary_actions);

    // Some datasets provide "legendary_desc"
    if (m.legendary_desc && !legendaryActions.length) {
      legendaryActions.push({ name: "Legendary Actions", text: String(m.legendary_desc).trim() });
    }

    const out = {
      name,
      sizeType,
      alignment,
      ac: ac || 10,
      acText,
      initiative: "", // Open5e doesn't reliably provide; keep blank
      hp: hp || "",
      hpFormula: hitDice ? hitDice : "",
      speed,
      str, dex, con, int: intel, wis, cha,
      saves,
      skills,
      vulnerabilities,
      resistances,
      immunities,
      conditionImmunities,
      senses,
      languages,
      cr,
      pb,
      traits,
      actions,
      bonusActions,
      reactions,
      legendaryActions,
      unmappedText: "",
      _source: "open5e",
      _open5e: {
        slug: m.slug || "",
        document: m.document__slug || m.document__title || "",
        url: m.url || "",
      }
    };

    return out;
  }

// ---------------------
// Import adapters
// ---------------------
function normalize5eToolsMonster(m) {
  if (!m) return null;
  const name = m.name || m.n || "";
  const size = (m.size || m.sz || "").toString();
  const type = (m.type?.type || m.type || m.t || "").toString();
  const alignment = (Array.isArray(m.alignment) ? m.alignment.join(" ") : (m.alignment || m.al || "")).toString();

  let ac = 0, acText = "";
  const acr = m.ac ?? m.armor_class ?? m.armorClass;
  if (Array.isArray(acr) && acr.length) {
    const first = acr[0];
    if (typeof first === "number") ac = first;
    else if (typeof first === "string") { ac = toInt(first.match(/\d+/)?.[0] || 0, 0); acText = first; }
    else if (typeof first === "object") { ac = toInt(first.ac ?? first.value ?? 0, 0); acText = (first.from ? (Array.isArray(first.from) ? first.from.join(", ") : String(first.from)) : "") || ""; }
  } else if (typeof acr === "number") ac = acr;
  else if (typeof acr === "string") { ac = toInt(acr.match(/\d+/)?.[0] || 0, 0); acText = acr; }
  else if (acr && typeof acr === "object") { ac = toInt(acr.ac ?? acr.value ?? 0, 0); }

  const hpObj = m.hp || m.hit_points || m.hitPoints;
  let hp = 0, hpFormula = "";
  if (typeof hpObj === "number") hp = hpObj;
  else if (typeof hpObj === "string") { hp = toInt(hpObj.match(/\d+/)?.[0] || 0, 0); hpFormula = hpObj; }
  else if (hpObj && typeof hpObj === "object") { hp = toInt(hpObj.average ?? hpObj.avg ?? 0, 0); hpFormula = hpObj.formula || hpObj.dice || ""; }

  let speed = m.speed;
  if (speed && typeof speed === "object") {
    speed = Object.entries(speed).map(([k,v]) => {
      if (v == null || v === "") return "";
      return k === "walk" ? `${v} ft.` : `${k} ${v} ft.`;
    }).filter(Boolean).join(", ");
  }
  speed = String(speed || "").trim();

  const str = toInt(m.str ?? m.strength ?? 10, 10);
  const dex = toInt(m.dex ?? m.dexterity ?? 10, 10);
  const con = toInt(m.con ?? m.constitution ?? 10, 10);
  const intel = toInt(m.int ?? m.intelligence ?? 10, 10);
  const wis = toInt(m.wis ?? m.wisdom ?? 10, 10);
  const cha = toInt(m.cha ?? m.charisma ?? 10, 10);

  let saves = [];
  const sv = m.save || m.saves || m.saving_throws;
  if (sv && typeof sv === "object" && !Array.isArray(sv)) {
    saves = Object.entries(sv).map(([k,v]) => `${k.toUpperCase()} ${String(v).startsWith("+")||String(v).startsWith("-")?v:`+${v}`}`);
  } else if (Array.isArray(sv)) {
    saves = sv.map(String);
  } else if (typeof sv === "string") {
    saves = sv.split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
  }

  function flattenEntries(ent) {
    if (ent == null) return "";
    if (typeof ent === "string") return ent;
    if (Array.isArray(ent)) return ent.map(flattenEntries).join("\n");
    if (typeof ent === "object") {
      if (ent.entries) return flattenEntries(ent.entries);
      if (ent.entry) return flattenEntries(ent.entry);
      if (ent.items) return ent.items.map(flattenEntries).join("\n");
      return JSON.stringify(ent);
    }
    return String(ent);
  }
  function entriesToPlainText(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(e => {
      if (typeof e === "string") return { name: "", text: e };
      if (e?.name && e?.entries) return { name: e.name, text: flattenEntries(e.entries) };
      if (e?.name && e?.entry) return { name: e.name, text: flattenEntries(e.entry) };
      return { name: e?.name || "", text: flattenEntries(e?.entries || e?.entry || "") };
    }).filter(x => x.name || x.text);
  }

  const traits = entriesToPlainText(m.trait || m.traits || m.special_abilities);
  const actions = entriesToPlainText(m.action || m.actions);
  const bonusActions = entriesToPlainText(m.bonus || m.bonusActions || m.bonus_actions);
  const reactions = entriesToPlainText(m.reaction || m.reactions);
  const legendaryActions = entriesToPlainText(m.legendary || m.legendaryActions || m.legendary_actions);

  const senses = String(m.senses || "").trim();
  const languages = String(m.languages || "").trim();
  const cr = String(m.cr ?? m.challenge_rating ?? "").trim();
  const pb = String(m.pb ?? m.proficiency_bonus ?? "").trim();

  return {
    name,
    sizeType: [size, type].filter(Boolean).join(" ").trim() || type || "",
    alignment,
    ac: ac || 10,
    acText,
    initiative: "",
    hp,
    hpFormula,
    speed,
    str, dex, con, int: intel, wis, cha,
    saves,
    skills: typeof m.skill === "string" ? m.skill.split(/[,;]+/).map(s=>s.trim()).filter(Boolean) : (Array.isArray(m.skills)?m.skills:[]),
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    conditionImmunities: [],
    senses,
    languages,
    cr,
    pb,
    traits,
    actions,
    bonusActions,
    reactions,
    legendaryActions,
    source: "Imported JSON",
    sourceType: "custom",
  };
}

function toCanonicalMonster(obj, fmt) {
  if (!obj) return null;
  const f = String(fmt || state.importer.fmt || "open5e");
  if (f === "open5e") return normalizeOpen5eMonster(obj);
  if (f === "5etools") return normalize5eToolsMonster(obj);
  return obj;
}

  async function open5eFetchPage(url) {
    // Add a timeout so "Searching..." can't hang forever on network/CORS issues
    const ctrl = new AbortController();
    const timeoutMs = 12000;
    const to = setTimeout(() => ctrl.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        headers: { "Accept": "application/json" },
        signal: ctrl.signal
      });
    } catch (err) {
      if (err && err.name === "AbortError") {
        throw new Error("Open5e request timed out. This can happen if the network is blocking the request or CORS fails.");
      }
      throw err;
    } finally {
      clearTimeout(to);
    }

    if (!res.ok) throw new Error(`Open5e request failed (${res.status})`);

    const ct = (res.headers && res.headers.get) ? (res.headers.get("content-type") || "") : "";
    // If we didn't get JSON, show a clearer error
    if (ct && !/application\/json/i.test(ct)) {
      const txt = await res.text().catch(() => "");
      throw new Error("Open5e returned a non-JSON response (possible CORS/proxy issue). " + (txt ? ("Preview: " + txt.slice(0, 80)) : ""));
    }

    return await res.json();
  }

  async function open5eSearchMonsters(queryOrUrl) {
    const url = queryOrUrl && /^https?:\/\//i.test(queryOrUrl)
      ? queryOrUrl
      : `${OPEN5E_BASE}/monsters/?search=${encodeURIComponent(String(queryOrUrl || "").trim())}&limit=50`;
    return await open5eFetchPage(url);
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
    const coreJoin = repairNumericOCR((coreLines || []).join(" "));
    const full = repairNumericOCR(String(allText || ""));

    // Handles: HP 150, HP150, HP:150, Hit Points 150, HitPoints150
    let m =
      /\b(?:Hit\s*Points?|HitPoints|HP)\s*[:\-]?\s*(\d{1,4})\s*\(([^)]+)\)/i.exec(coreJoin) ||
      /\b(?:Hit\s*Points?|HitPoints|HP)(\d{1,4})\b\s*\(([^)]+)\)/i.exec(coreJoin) ||
      /\b(?:Hit\s*Points?|HitPoints|HP)\s*[:\-]?\s*(\d{1,4})\b/i.exec(coreJoin) ||
      /\b(?:Hit\s*Points?|HitPoints|HP)(\d{1,4})\b/i.exec(coreJoin);

    if (!m) {
      m =
        /\b(?:Hit\s*Points?|HitPoints|HP)\s*[:\-]?\s*(\d{1,4})\s*\(([^)]+)\)/i.exec(full) ||
        /\b(?:Hit\s*Points?|HitPoints|HP)(\d{1,4})\b\s*\(([^)]+)\)/i.exec(full) ||
        /\b(?:Hit\s*Points?|HitPoints|HP)\s*[:\-]?\s*(\d{1,4})\b/i.exec(full) ||
        /\b(?:Hit\s*Points?|HitPoints|HP)(\d{1,4})\b/i.exec(full);
    }

    if (m) {
      const hp = clamp(toInt(m[1], 1), 1, 9999);
      const formula = (m[2] || "").trim();
      return { value: hp, formula, confidence: hp > 1 ? "high" : "medium" };
    }
    return { value: 1, formula: "", confidence: "low" };
  }

  function parseSpeed(coreLines, allText) {
    const coreJoin = repairNumericOCR((coreLines || []).join(" "));
    const full = repairNumericOCR(String(allText || ""));
    const text = `${coreJoin} ${full}`.replace(/\s+/g, " ").trim();

    // locate Speed label (supports Speed30 / Speed: 30)
    const m = /\bSpeed\b\s*[:\-]?\s*/i.exec(text) || /\bSpeed(?=\d)/i.exec(text);
    if (!m) return { value: "30 ft.", confidence: "low" };

    const start = (m.index || 0) + m[0].length;
    let tail = text.slice(start).trim();

    // stop at next known field/section boundary
    const boundaryRe = /\b(?:STR|DEX|CON|INT|WIS|CHA|AC|Armor\s*Class|HP|Hit\s*Points|Initiative|CR|Challenge|PB|Proficiency\s*Bonus|Saving\s*Throws?|Skills?|Senses?|Languages?|Traits?|Actions?|Reactions?|Legendary\s*Actions?)\b/i;
    const b = tail.search(boundaryRe);
    if (b >= 0) tail = tail.slice(0, b);

    // remove obvious bleed
    tail = tail
      .replace(/\bHit\s*Points?\b[\s\S]*$/i, "")
      .replace(/\bCR\b[\s\S]*$/i, "")
      .replace(/\bSTR\b[\s\S]*$/i, "")
      .trim();

    // keep only speed-ish segments
    const parts = tail
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => /\b\d+\s*ft\.?\b/i.test(s) || /\bhover\b/i.test(s));

    let value = parts.join(", ").replace(/\s{2,}/g, " ").trim();

    // final sanitation against contamination
    if (/\b(?:STR|DEX|CON|INT|WIS|CHA|CR|Challenge|Hit\s*Points?|Melee Weapon Attack|Ranged Weapon Attack|Hit:)\b/i.test(value)) {
      value = value
        .split(/[,;]/)
        .map((x) => x.trim())
        .filter((x) => /\b\d+\s*ft\.?\b/i.test(x) || /\bhover\b/i.test(x))
        .join(", ");
    }

    return { value: value || "30 ft.", confidence: value ? "high" : "low" };
  }

  function parseCRPB(coreLines, allText) {
    let cr = "1/8", xp = 0, pb = 2;
    let crConf = "low", pbConf = "low";

    const coreJoin = repairNumericOCR((coreLines || []).join(" "));
    const full = repairNumericOCR(String(allText || ""));

    // CR variants: CR 10, CR10, Challenge 10, Challenge10
    let m =
      /\b(?:Challenge|CR)\s*[:\-]?\s*([0-9]+(?:\/[0-9]+)?)(?:\s*\((?:XP\s*)?([\d,]+)[^)]*\))?/i.exec(coreJoin) ||
      /\b(?:Challenge|CR)([0-9]+(?:\/[0-9]+)?)\b(?:\s*\((?:XP\s*)?([\d,]+)[^)]*\))?/i.exec(coreJoin) ||
      /\b(?:Challenge|CR)\s*[:\-]?\s*([0-9]+(?:\/[0-9]+)?)(?:\s*\((?:XP\s*)?([\d,]+)[^)]*\))?/i.exec(full) ||
      /\b(?:Challenge|CR)([0-9]+(?:\/[0-9]+)?)\b(?:\s*\((?:XP\s*)?([\d,]+)[^)]*\))?/i.exec(full);

    if (m) {
      cr = m[1];
      xp = m[2] ? toInt(String(m[2]).replace(/,/g, ""), 0) : 0;
      crConf = "high";
    }

    // PB variants: PB +4, PB+4, Proficiency Bonus +4
    let p =
      /\b(?:Proficiency\s*Bonus|PB)\s*[:\-]?\s*([+\-]?\d{1,2})\b/i.exec(coreJoin) ||
      /\b(?:Proficiency\s*Bonus|PB)([+\-]?\d{1,2})\b/i.exec(coreJoin) ||
      /\b(?:Proficiency\s*Bonus|PB)\s*[:\-]?\s*([+\-]?\d{1,2})\b/i.exec(full) ||
      /\b(?:Proficiency\s*Bonus|PB)([+\-]?\d{1,2})\b/i.exec(full);

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


  function parseAbilityTriplets(coreLines, allText) {
    const src = `${coreLines.join(" ")} ${allText}`.replace(/\s+/g, " ").trim();
    const out = {
      strSave: null, dexSave: null, conSave: null, intSave: null, wisSave: null, chaSave: null,
      confidence: "low"
    };
    const keyMap = { STR:"str", DEX:"dex", CON:"con", INT:"int", WIS:"wis", CHA:"cha" };
    const re = /\b(STR|DEX|CON|INT|WIS|CHA)\b([\s\S]*?)(?=\b(?:STR|DEX|CON|INT|WIS|CHA)\b|$)/gi;
    let m, count=0;
    while ((m = re.exec(src)) !== null) {
      const ab = m[1].toUpperCase();
      const chunk = m[2];
      const scoreMatch = chunk.match(/(?:^|\s)(\d{1,2})(?:\s|$)/);
      if (!scoreMatch) continue;
      const after = chunk.slice((scoreMatch.index || 0) + scoreMatch[0].length);
      const signed = [...after.matchAll(/([+\-]\d{1,2})/g)].map(x => Number(x[1]));
      const k = keyMap[ab];
      if (Number.isFinite(signed[1])) {
        out[`${k}Save`] = signed[1];
        count++;
      } else if (Number.isFinite(signed[0])) {
        // fallback to mod if explicit save missing
        out[`${k}Save`] = signed[0];
      }
    }
    out.confidence = count >= 4 ? "high" : (count >= 2 ? "medium" : "low");
    return out;
  }

  function parseSaves(metaLines, coreLines, allText) {
    // 1) labeled line wins
    const labeled = parseMetaList(metaLines, "Saving Throws|Saves");
    const cleaned = (Array.isArray(labeled) ? labeled : [])
      .map(s => String(s || "").trim())
      .filter(Boolean)
      .map(s => s.replace(/\b(STR|DEX|CON|INT|WIS|CHA)\.?\s*/i, (m) => m.toUpperCase().replace(".", "") + " "))
      .map(s => s.replace(/\s+/g, " "));
    if (cleaned.length) return cleaned;

    // 2) reconstruct from ability triplets
    const tr = parseAbilityTriplets(coreLines, allText);
    const order = [["STR","strSave"],["DEX","dexSave"],["CON","conSave"],["INT","intSave"],["WIS","wisSave"],["CHA","chaSave"]];
    const arr = order
      .filter(([,k]) => Number.isFinite(tr[k]))
      .map(([abbr,k]) => `${abbr} ${tr[k] >= 0 ? "+" : ""}${tr[k]}`);
    return arr;
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

    const saves = parseSaves(preSplit.meta, preSplit.core, allText);
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
  
function statBlockPreviewFiveEtoolsLike(mon) {
  if (!mon) return `<div class="sbi-muted">No monster selected.</div>`;
  const m = mon;

  const mod = (score) => {
    const v = Number(score);
    const sc = Number.isFinite(v) ? v : 10;
    return Math.floor((sc - 10) / 2);
  };
  const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);

  const saveVal = (abbr, score) => {
    const key = (abbr || "").toLowerCase() + "Save";
    if (m[key] !== undefined && m[key] !== null && m[key] !== "") return fmt(Number(m[key]));
    return fmt(mod(score));
  };

  const abilities = [
    ["STR", m.str, saveVal("str", m.str)],
    ["DEX", m.dex, saveVal("dex", m.dex)],
    ["CON", m.con, saveVal("con", m.con)],
    ["INT", m.int, saveVal("int", m.int)],
    ["WIS", m.wis, saveVal("wis", m.wis)],
    ["CHA", m.cha, saveVal("cha", m.cha)],
  ].map(([k, score, save]) => {
    const sc = Number(score) || 10;
    const md = fmt(mod(sc));
    return `
      <div class="sb5-abil">
        <div class="sb5-abil-k">${k}</div>
        <div class="sb5-abil-v">${sc} <span class="sb5-abil-mod">(${md})</span></div>
        <div class="sb5-abil-s">Save ${save}</div>
      </div>`;
  }).join("");

  const row = (label, value) => value ? `<div class="sb5-row"><span class="sb5-lbl">${esc(label)}</span> <span class="sb5-val">${esc(value)}</span></div>` : "";
  const metaRow = (label, arr) => (arr && arr.length) ? row(label, Array.isArray(arr) ? arr.join(", ") : String(arr)) : "";

  const section = (title, entries) => {
    const list = (entries || []).filter(e => (e?.name || e?.text));
    if (!list.length) return "";
    const body = list.map(e => {
      const nm = e.name ? `<span class="sb5-entry-n">${esc(e.name)}.</span> ` : "";
      return `<div class="sb5-entry">${nm}<span class="sb5-entry-t">${esc(e.text || "")}</span></div>`;
    }).join("");
    return `<div class="sb5-sec"><div class="sb5-sec-h">${esc(title)}</div>${body}</div>`;
  };

  const headerLine = [m.sizeType || "", m.alignment || ""].filter(Boolean).join(" • ");

  return `
    <style>
      .sb5-wrap{border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(0,0,0,.22);padding:12px;}
      .sb5-name{font-weight:950;letter-spacing:.2px;font-size:22px;line-height:1.05;margin-bottom:2px;}
      .sb5-sub{color:rgba(255,255,255,.75);font-size:12px;margin-bottom:10px;}
      .sb5-core{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;}
      .sb5-chip{border:1px solid rgba(255,255,255,.16);background:rgba(120,180,255,.10);padding:6px 10px;border-radius:999px;font-size:12px;}
      .sb5-chip b{font-weight:900;}
      .sb5-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin:10px 0;}
      @media (max-width: 760px){.sb5-grid{grid-template-columns:repeat(3,minmax(0,1fr));}}
      .sb5-abil{border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.18);border-radius:12px;padding:8px;text-align:center;}
      .sb5-abil-k{font-weight:900;font-size:11px;letter-spacing:.8px;color:rgba(255,255,255,.72);}
      .sb5-abil-v{font-weight:950;font-size:15px;margin-top:2px;}
      .sb5-abil-mod{font-weight:800;color:rgba(255,255,255,.78);}
      .sb5-abil-s{margin-top:4px;font-size:11px;color:rgba(255,255,255,.70);}
      .sb5-rows{display:grid;grid-template-columns:1fr;gap:4px;margin-top:6px;}
      .sb5-row{font-size:13px;line-height:1.25;}
      .sb5-lbl{font-weight:900;color:rgba(255,255,255,.82);}
      .sb5-sec{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12);}
      .sb5-sec-h{font-weight:950;letter-spacing:.8px;color:rgba(255,255,255,.82);font-size:12px;margin-bottom:8px;text-transform:uppercase;}
      .sb5-entry{font-size:13px;line-height:1.25;margin-bottom:6px;}
      .sb5-entry-n{font-weight:950;}
      .sb5-entry-t{color:rgba(255,255,255,.88);}
    </style>

    <div class="sb5-wrap">
      <div class="sb5-name">${esc(m.name || "Unknown")}</div>
      <div class="sb5-sub">${esc(headerLine)}</div>

      <div class="sb5-core">
        <div class="sb5-chip"><b>AC</b> ${esc(m.ac ?? "")}${m.acText ? ` <span style="opacity:.75">(${esc(m.acText)})</span>` : ""}</div>
        <div class="sb5-chip"><b>HP</b> ${esc(m.hp ?? "")}${m.hpFormula ? ` <span style="opacity:.75">(${esc(m.hpFormula)})</span>` : ""}</div>
        ${m.speed ? `<div class="sb5-chip"><b>Speed</b> ${esc(m.speed)}</div>` : ""}
        ${m.initiative ? `<div class="sb5-chip"><b>Init</b> ${esc(m.initiative)}</div>` : ""}
        ${m.cr ? `<div class="sb5-chip"><b>CR</b> ${esc(m.cr)}</div>` : ""}
        ${m.pb ? `<div class="sb5-chip"><b>PB</b> ${esc(m.pb)}</div>` : ""}
      </div>

      <div class="sb5-grid">${abilities}</div>

      <div class="sb5-rows">
        ${metaRow("Saving Throws:", m.saves)}
        ${metaRow("Skills:", m.skills)}
        ${row("Senses:", m.senses)}
        ${row("Languages:", m.languages)}
        ${metaRow("Damage Vulnerabilities:", m.vulnerabilities)}
        ${metaRow("Damage Resistances:", m.resistances)}
        ${metaRow("Damage Immunities:", m.immunities)}
        ${metaRow("Condition Immunities:", m.conditionImmunities)}
      </div>

      ${section("Traits", m.traits)}
      ${section("Actions", m.actions)}
      ${section("Bonus Actions", m.bonusActions)}
      ${section("Reactions", m.reactions)}
      ${section("Legendary Actions", m.legendaryActions)}
    </div>
  `;
}

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

  function statBlockPreview2024(m) {
    if (!m) return "";

    const toNum = (v, d=10) => Number.isFinite(Number(v)) ? Number(v) : d;
    const mod = (s) => Math.floor((toNum(s,10)-10)/2);
    const fmtMod = (n) => (n>=0?`+${n}`:`${n}`);

    const xp = Number.isFinite(Number(m.xp)) ? Number(m.xp) : 0;
    const pb = Number.isFinite(Number(m.proficiencyBonus)) ? Number(m.proficiencyBonus) : null;

    const saveFromList = (abbr) => {
      const list = Array.isArray(m.saves) ? m.saves : String(m.saves||"").split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
      const re = new RegExp(`^${abbr}\\b|^${abbr.toLowerCase()}\\b`, "i");
      for (const s of list) {
        if (re.test(s)) {
          const mm = s.match(/([+-]\\s*\\d+)/);
          return mm ? mm[1].replace(/\\s+/g,"") : s.replace(/^\\w+\\s*/,"");
        }
      }
      return null;
    };

    const abilities = [
      ["STR","str"],["DEX","dex"],["CON","con"],["INT","int"],["WIS","wis"],["CHA","cha"]
    ].map(([abbr,key]) => {
      const score = toNum(m[key],10);
      const mmod = fmtMod(mod(score));
      const sv = saveFromList(abbr) || m[`${key}Save`] || m[`${abbr.toLowerCase()}Save`] || mmod;
      return {abbr, score, mod:mmod, save:String(sv).replace(/\\s+/g,"")};
    });

    const detailRows = [
      ["Skills", listToLine(m.skills)],
      ["Damage Vulnerabilities", listToLine(m.vulnerabilities)],
      ["Damage Resistances", listToLine(m.resistances)],
      ["Damage Immunities", listToLine(m.immunities)],
      ["Condition Immunities", listToLine(m.conditionImmunities)],
      ["Senses", listToLine(m.senses)],
      ["Languages", listToLine(m.languages)],
      ["Habitat", listToLine(m.habitats)]
    ].filter(([,v]) => String(v||"").trim());

    const renderEntries = (title, arr) => {
      const rows = Array.isArray(arr)?arr:[];
      if (!rows.length) return "";
      return `
        <section style="margin-top:10px;">
          <div style="font-weight:800;border-bottom:1px solid rgba(255,255,255,.18);padding-bottom:4px;margin-bottom:6px;">${esc(title)}</div>
          ${rows.map(e=>`<div style="margin:0 0 6px 0;line-height:1.45;"><b>${esc(e.name||"")}${e.name?". ":""}</b>${esc(e.text||"")}</div>`).join("")}
        </section>`;
    };

    return `
      <div style="margin-top:8px;border:1px solid rgba(255,255,255,.22);border-radius:12px;overflow:auto;max-height:72vh;background:#121212;">
        <div style="position:sticky;top:0;z-index:2;background:#151515;border-bottom:1px solid rgba(255,255,255,.14);padding:10px 12px;">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap;">
            <div>
              <div style="font-size:20px;font-weight:900;line-height:1.1;">${esc(m.name || "Unknown Monster")}</div>
              <div class="muted" style="margin-top:2px;">${esc(m.sizeType || "—")}${m.alignment?` • ${esc(m.alignment)}`:""}</div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <span style="font-size:11px;padding:2px 8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;">CR ${esc(m.cr || "—")}</span>
              <span style="font-size:11px;padding:2px 8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;">XP ${xp.toLocaleString()}</span>
              ${pb!==null?`<span style="font-size:11px;padding:2px 8px;border:1px solid rgba(255,255,255,.2);border-radius:999px;">PB ${pb>=0?"+":""}${pb}</span>`:""}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px;">
            <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">AC</div><b>${esc(m.ac ?? "—")}</b></div>
            <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">HP</div><b>${esc(m.hp ?? "—")}</b>${m.hpFormula?`<div class="muted" style="font-size:10px;">(${esc(m.hpFormula)})</div>`:""}</div>
            <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">Speed</div><b style="font-size:12px;">${esc(m.speed || "—")}</b></div>
            <div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;"><div class="muted" style="font-size:10px;">Initiative</div><b>${esc(m.initiative || "—")}</b></div>
          </div>
        </div>

        <div style="padding:12px;">
          <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;">
            ${abilities.map(a=>`<div style="border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px;text-align:center;">
              <div class="muted" style="font-size:10px;">${a.abbr}</div>
              <div style="font-weight:800;">${a.score} (${a.mod})</div>
              <div class="muted" style="font-size:10px;">Save ${esc(String(a.save))}</div>
            </div>`).join("")}
          </div>

          ${detailRows.length ? `<div style="margin-top:10px;display:grid;gap:4px;">${detailRows.map(([k,v])=>`<div><span class="muted">${esc(k)}:</span> ${esc(v)}</div>`).join("")}</div>` : ""}

          ${renderEntries("Traits", m.traits)}
          ${renderEntries("Actions", m.actions)}
          ${renderEntries("Bonus Actions", m.bonusActions)}
          ${renderEntries("Reactions", m.reactions)}
          ${renderEntries("Legendary Actions", m.legendaryActions)}
        </div>
      </div>`;
  }


  
function statBlockPreview5etools(m) {
    if (!m) return "";
    const toNum = (v,d=10)=>Number.isFinite(Number(v))?Number(v):d;
    const mod = (s)=>Math.floor((toNum(s,10)-10)/2);
    const fmtMod=(n)=>n>=0?`+${n}`:`${n}`;
    const arr = (v)=>Array.isArray(v)?v:String(v||"").split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
    const line = (label, value)=> value ? `<div><span class="lbl">${esc(label)} </span>${esc(value)}</div>` : "";
    const abilityCell=(abbr,key)=> {
      const score = toNum(m[key],10);
      const saveKey = key + "Save";
      const sv = m[saveKey];
      const saveTxt = (sv===0 || sv) ? (String(sv).startsWith("+")||String(sv).startsWith("-")?String(sv):`+${sv}`) : fmtMod(mod(score));
      return `<div class="ab"><div class="a">${abbr}</div><div class="s">${score}</div><div class="m">${fmtMod(mod(score))}</div><div class="sv">Save ${saveTxt}</div></div>`;
    };
    const renderEntries=(title,list)=>{
      const a = Array.isArray(list)?list:[];
      if(!a.length) return "";
      return `<div class="sec"><div class="sec-h">${esc(title)}</div>${a.map(e=>`<p><b>${esc(e?.name||"")}${e?.name?". ":""}</b>${esc(e?.text||"")}</p>`).join("")}</div>`;
    };
    const xp = Number.isFinite(Number(m.xp)) ? Number(m.xp).toLocaleString() : "";
    const pb = (m.proficiencyBonus || m.proficiencyBonus===0) ? (String(m.proficiencyBonus).startsWith("+")?String(m.proficiencyBonus):`+${m.proficiencyBonus}`) : "";
    return `
      <div class="sb5e-wrap">
        <style>
          .sb5e-wrap{background:#f7f1e6;color:#1f1a17;border:1px solid #7a5a2d;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:13px;line-height:1.35}
          .sb5e-head{padding:10px 12px;border-bottom:2px solid #7a5a2d}
          .sb5e-name{font:700 26px/1.05 Georgia,serif;letter-spacing:.3px}
          .sb5e-sub{font-style:italic;opacity:.9;margin-top:2px}
          .sb5e-rule{border-top:2px solid #7a5a2d;margin:0 12px}
          .sb5e-core{padding:8px 12px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
          .sb5e-core .k{font-weight:700;color:#5b3e16}
          .sb5e-abilities{padding:8px 12px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
          .sb5e-abilities .ab{border:1px solid #c9b18c;border-radius:6px;padding:6px;text-align:center;background:#fffaf2}
          .sb5e-abilities .a{font-weight:700;color:#5b3e16}
          .sb5e-abilities .s{font-size:18px;font-weight:700}
          .sb5e-abilities .m{font-size:12px;opacity:.9}
          .sb5e-abilities .sv{font-size:11px;opacity:.9;margin-top:2px}
          .sb5e-meta{padding:8px 12px;display:grid;gap:4px}
          .sb5e-meta .lbl{font-weight:700;color:#5b3e16}
          .sb5e-sections{padding:8px 12px 12px}
          .sb5e-sections .sec{margin-top:8px}
          .sb5e-sections .sec-h{font:700 12px/1.2 Arial,sans-serif;letter-spacing:.08em;color:#5b3e16;border-top:2px solid #7a5a2d;padding-top:6px;margin-bottom:4px;text-transform:uppercase}
          .sb5e-sections p{margin:0 0 6px 0}
        
          /* Open5e-style preview */
          .o5-wrap{background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:14px;color:rgba(255,255,255,.92);}
          .o5-head{border-bottom:1px solid rgba(255,255,255,.10);padding-bottom:10px;margin-bottom:10px;}
          .o5-name{font-weight:950;font-size:18px;letter-spacing:.2px;}
          .o5-meta{opacity:.8;margin-top:3px;font-size:12px;}
          .o5-line{display:flex;gap:10px;justify-content:space-between;padding:4px 0;border-bottom:1px dashed rgba(255,255,255,.08);}
          .o5-line:last-child{border-bottom:none;}
          .o5-lab{opacity:.75;font-weight:800;}
          .o5-val{font-weight:700;text-align:right;flex:1;}
          .o5-core{display:grid;grid-template-columns:1fr;gap:0;margin-bottom:10px;}
          .o5-abilgrid{margin:12px 0;padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(0,0,0,.22);}
          .o5-abil-legend{display:grid;grid-template-columns:56px 1fr 1fr 1fr;gap:8px;font-size:11px;opacity:.7;margin-bottom:6px;}
          .o5-abil-row{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;}
          .o5-abil{border:1px solid rgba(255,255,255,.10);border-radius:10px;padding:8px;background:rgba(0,0,0,.18);text-align:center;}
          .o5-abil-h{font-weight:900;font-size:11px;opacity:.8;}
          .o5-abil-s{font-weight:950;font-size:14px;margin-top:2px;}
          .o5-abil-m,.o5-abil-save{font-size:11px;opacity:.85;margin-top:2px;}
          .o5-details{margin-top:10px;}
          .o5-sec{margin-top:12px;border-top:1px solid rgba(255,255,255,.10);padding-top:10px;}
          .o5-sec-h{font-weight:950;letter-spacing:.8px;font-size:12px;text-transform:uppercase;opacity:.85;margin-bottom:6px;}
          .o5-entry{margin:6px 0;line-height:1.35;}
          .o5-entry-n{font-weight:900;}
          .o5-entry-d{opacity:.92;}
          @media (max-width: 900px){
            .o5-abil-row{grid-template-columns:repeat(3,1fr);}
          }


        /* 5etools-inspired preview */
        .sb5e{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:12px;box-shadow:0 1px 0 rgba(0,0,0,.08);} 
        .sb5e .nm{font-weight:900;letter-spacing:.2px;font-size:16px;line-height:1.2;}
        .sb5e .sub{color:var(--muted);font-size:12px;margin-top:2px;}
        .sb5e .rule{height:1px;background:var(--border);margin:10px 0;}
        .sb5e .kv{font-size:13px;margin:4px 0;}
        .sb5e .kv b{font-weight:800;}
        .sb5e .abi{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:8px;}
        .sb5e .abi .c{border:1px solid var(--border);border-radius:10px;padding:6px 6px;text-align:center;background:rgba(255,255,255,.02);} 
        .sb5e .abi .l{font-size:10px;letter-spacing:.5px;color:var(--muted);font-weight:900;}
        .sb5e .abi .v{font-size:13px;font-weight:900;margin-top:2px;}
        .sb5e .sec{margin-top:10px;}
        .sb5e .sec h4{margin:0 0 6px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);} 
        .sb5e .item{margin:6px 0;font-size:13px;}
        .sb5e .item b{font-weight:900;}

      </style>
        <div class="sb5e-head">
          <div class="sb5e-name">${esc(m.name||"Unnamed Monster")}</div>
          <div class="sb5e-sub">${esc([m.sizeType,m.alignment].filter(Boolean).join(", "))}</div>
        </div>
        <div class="sb5e-core">
          <div><div class="k">AC</div><div>${esc(String(m.ac ?? "—"))}${m.acText?` (${esc(m.acText)})`:""}</div></div>
          <div><div class="k">HP</div><div>${esc(String(m.hp ?? "—"))}${m.hpFormula?` (${esc(m.hpFormula)})`:""}</div></div>
          <div><div class="k">Speed</div><div>${esc(m.speed||"—")}</div></div>
          <div><div class="k">Initiative</div><div>${esc(m.initiative||"—")}</div></div>
          <div><div class="k">CR / PB</div><div>${esc(String(m.cr||"—"))}${xp?` (${xp} XP)`:""}${pb?` • ${esc(pb)}`:""}</div></div>
        </div>
        <div class="sb5e-rule"></div>
        <div class="sb5e-abilities">
          ${abilityCell("STR","str")}
          ${abilityCell("DEX","dex")}
          ${abilityCell("CON","con")}
          ${abilityCell("INT","int")}
          ${abilityCell("WIS","wis")}
          ${abilityCell("CHA","cha")}
        </div>
        <div class="sb5e-meta">
          ${line("Saving Throws:", arr(m.saves).join(", "))}
          ${line("Skills:", arr(m.skills).join(", "))}
          ${line("Damage Vulnerabilities:", arr(m.vulnerabilities).join(", "))}
          ${line("Damage Resistances:", arr(m.resistances).join(", "))}
          ${line("Damage Immunities:", arr(m.immunities).join(", "))}
          ${line("Condition Immunities:", arr(m.conditionImmunities).join(", "))}
          ${line("Senses:", arr(m.senses).join(", "))}
          ${line("Languages:", arr(m.languages).join(", "))}
        </div>
        <div class="sb5e-sections">
          ${renderEntries("Traits", m.traits)}
          ${renderEntries("Actions", m.actions)}
          ${renderEntries("Bonus Actions", m.bonusActions)}
          ${renderEntries("Reactions", m.reactions)}
          ${renderEntries("Legendary Actions", m.legendaryActions)}
        </div>
      </div>
    `;
  }


  function statBlockPreview(m) {
    return statBlockPreview2024(m);
  }

  // Open5e-style stat block preview (compact, label-forward like open5e.com)
  function statBlockPreviewOpen5eStyle(mon) {
    const m = mon || {};
    const name = esc(m.name || "Unknown");
    const meta = [m.size, m.type, m.alignment].filter(Boolean).join(" • ");
    const acLine = m.ac ? `${m.ac}${m.acText ? ` (${esc(m.acText)})` : ""}` : "";
    const hpLine = m.hp ? `${m.hp}${m.hpFormula ? ` (${esc(m.hpFormula)})` : ""}` : "";
    const initLine = (m.initiative != null && m.initiative !== "") ? `${m.initiative}` : "";
    const crLine = m.cr ? `${esc(String(m.cr))}${m.xp ? ` (${esc(String(m.xp))} XP)` : ""}` : "";
    const pbLine = m.pb ? `${esc(String(m.pb))}` : "";

    const speedLine = esc(m.speed || "");

    const abilities = [
      ["STR", m.str, m.strMod, m.strSave],
      ["DEX", m.dex, m.dexMod, m.dexSave],
      ["CON", m.con, m.conMod, m.conSave],
      ["INT", m.int, m.intMod, m.intSave],
      ["WIS", m.wis, m.wisMod, m.wisSave],
      ["CHA", m.cha, m.chaMod, m.chaSave],
    ];

    const abilityCells = abilities.map(([lab, score, mod, save]) => {
      const s = (score != null && score !== "") ? Number(score) : null;
      const mm = (mod != null && mod !== "") ? Number(mod) : (s != null ? Math.floor((s - 10) / 2) : null);
      const sv = (save != null && save !== "") ? Number(save) : mm;
      const modStr = (mm == null || Number.isNaN(mm)) ? "" : (mm >= 0 ? `+${mm}` : `${mm}`);
      const saveStr = (sv == null || Number.isNaN(sv)) ? "" : (sv >= 0 ? `+${sv}` : `${sv}`);
      return `
        <div class="o5-abil">
          <div class="o5-abil-h">${esc(lab)}</div>
          <div class="o5-abil-s">${s == null ? "—" : s}</div>
          <div class="o5-abil-m">${modStr || "—"}</div>
          <div class="o5-abil-save">${saveStr || "—"}</div>
        </div>`;
    }).join("");

    const line = (label, value) => value ? `<div class="o5-line"><span class="o5-lab">${label}</span><span class="o5-val">${value}</span></div>` : "";

    const joinList = (arr) => Array.isArray(arr) ? arr.filter(Boolean).join(", ") : (arr ? String(arr) : "");

    const savesLine = joinList(m.saves);
    const skillsLine = joinList(m.skills);
    const vulnLine = joinList(m.vulnerabilities);
    const resLine = joinList(m.resistances);
    const immLine = joinList(m.immunities);
    const cimmLine = joinList(m.conditionImmunities);
    const sensesLine = m.senses ? esc(String(m.senses)) : "";
    const langsLine = m.languages ? esc(String(m.languages)) : "";

    const section = (title, list) => {
      const arr = Array.isArray(list) ? list : [];
      if (!arr.length) return "";
      return `
        <div class="o5-sec">
          <div class="o5-sec-h">${esc(title)}</div>
          ${arr.map(it => {
            const n = esc(it?.name || "");
            const d = esc(it?.desc || it?.text || "");
            return `<div class="o5-entry"><span class="o5-entry-n">${n ? n + "." : ""}</span> <span class="o5-entry-d">${d}</span></div>`;
          }).join("")}
        </div>`;
    };

    return `
      <div class="o5-wrap">
        <div class="o5-head">
          <div class="o5-name">${name}</div>
          <div class="o5-meta">${esc(meta)}</div>
        </div>

        <div class="o5-core">
          ${line("Armor Class", acLine)}
          ${line("Hit Points", hpLine)}
          ${line("Speed", speedLine)}
          ${line("Initiative", esc(initLine))}
          ${line("Challenge", crLine)}
          ${line("Proficiency Bonus", pbLine)}
        </div>

        <div class="o5-abilgrid">
          <div class="o5-abil-legend">
            <div class="o5-abil-legend-sp"></div>
            <div class="o5-abil-legend-s">Score</div>
            <div class="o5-abil-legend-m">Mod</div>
            <div class="o5-abil-legend-save">Save</div>
          </div>
          <div class="o5-abil-row">${abilityCells}</div>
        </div>

        <div class="o5-details">
          ${line("Saving Throws", esc(savesLine))}
          ${line("Skills", esc(skillsLine))}
          ${line("Damage Vulnerabilities", esc(vulnLine))}
          ${line("Damage Resistances", esc(resLine))}
          ${line("Damage Immunities", esc(immLine))}
          ${line("Condition Immunities", esc(cimmLine))}
          ${line("Senses", sensesLine)}
          ${line("Languages", langsLine)}
        </div>

        ${section("Traits", m.traits)}
        ${section("Actions", m.actions)}
        ${section("Bonus Actions", m.bonusActions)}
        ${section("Reactions", m.reactions)}
        ${section("Legendary Actions", m.legendaryActions)}
      </div>
    `;
  }

function template() {
    const p = state.parsed;
    const progressPct = Math.round((state.progress || 0) * 100);

    const o5 = state.importer || { q:"", results:[], next:null, prev:null, loading:false, error:"", selected:null };
    const o5ResultsHtml = (o5.results || []).map((m, idx) => {
      const cr = m.challenge_rating ?? m.cr ?? "";
      const type = [m.size, m.type].filter(Boolean).join(" ");
      const doc = m.document__slug || m.document__title || "";
      return `<button type="button" class="sbi-o5-item" data-o5-idx="${idx}">
        <div class="sbi-o5-name">${esc(m.name || "(Unnamed)")}</div>
        <div class="sbi-o5-sub">${esc([type, m.alignment].filter(Boolean).join(" • "))}</div>
        <div class="sbi-o5-meta">${cr !== "" ? `CR ${esc(String(cr))}` : ""}${doc ? ` • ${esc(String(doc))}` : ""}</div>
      </button>`;
    }).join("");

    const o5Selected = o5.selected ? normalizeOpen5eMonster(o5.selected) : null;

    const statusLine =
      state.status === "loading-lib" ? `<div class="sbi-status">Loading OCR library…</div>` :
      state.status === "ocr" ? `<div class="sbi-status">OCR in progress <span class="sbi-pill">${progressPct}%</span></div>` :
      state.status === "error" ? `<div class="sbi-status sbi-status--error">${esc(state.error)}</div>` :
      "";

    return `
      <style>
        .sbi-root{display:grid;gap:12px;}
        .sbi-header{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;}
        .sbi-title{margin:0;font-size:20px;letter-spacing:.2px;}
        .sbi-sub{opacity:.75;font-size:13px;line-height:1.35;}
        .sbi-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;}
        .sbi-card--dashed{border-style:dashed;background:rgba(255,255,255,.02);}
        .sbi-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
        .sbi-col{display:grid;gap:10px;}
        .sbi-split{display:grid;grid-template-columns:1.1fr .9fr;gap:12px;align-items:start;}
        @media (max-width: 900px){.sbi-split{grid-template-columns:1fr;}}
        .sbi-drop{cursor:pointer;outline:none;}
        .sbi-drop:focus{box-shadow:0 0 0 2px rgba(123,216,143,.25);}
        .sbi-drop strong{font-size:14px;}
        .sbi-drop .sbi-hint{opacity:.7;font-size:12px;margin-top:4px;}
        .sbi-kbd kbd{padding:2px 6px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.25);font-size:12px;}
        .sbi-status{font-size:13px;opacity:.9;}
        .sbi-status--error{color:#ff9aa2;}
        .sbi-pill{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.25);font-size:12px;}
        .sbi-btnbar{display:flex;gap:8px;flex-wrap:wrap;}
        .sbi-btnbar button{padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;}
        .sbi-btnbar button:hover{background:rgba(255,255,255,.10);}
        .sbi-btnbar button:disabled{opacity:.45;cursor:not-allowed;}
        .sbi-btnbar button.sbi-primary{background:rgba(123,216,143,.14);border-color:rgba(123,216,143,.35);}
        .sbi-btnbar button.sbi-danger{background:rgba(255,154,162,.10);border-color:rgba(255,154,162,.25);}
        .sbi-form label{display:grid;gap:6px;font-size:12px;opacity:.9;}
        .sbi-form input,.sbi-form textarea{width:100%;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.22);color:inherit;padding:8px;outline:none;}
        .sbi-form textarea{min-height:110px;resize:vertical;}
        .sbi-form input:focus,.sbi-form textarea:focus{box-shadow:0 0 0 2px rgba(123,216,143,.22);border-color:rgba(123,216,143,.35);}
        .sbi-grid3{display:grid;grid-template-columns:repeat(3,minmax(140px,1fr));gap:10px;}
        .sbi-grid6{display:grid;grid-template-columns:repeat(6,minmax(80px,1fr));gap:10px;}
        .sbi-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        @media (max-width: 900px){.sbi-grid3{grid-template-columns:1fr 1fr;}.sbi-grid6{grid-template-columns:repeat(3,1fr);}.sbi-grid2{grid-template-columns:1fr;}}
        .sbi-sectionTitle{margin:12px 0 6px 0;font-size:14px;letter-spacing:.2px;}
        .sbi-muted{opacity:.7;font-size:12px;}
        .sbi-details summary{cursor:pointer;font-weight:700;opacity:.92;list-style:none;}
        .sbi-details summary::-webkit-details-marker{display:none;}
        .sbi-details summary:after{content:"▾";float:right;opacity:.6;}
        .sbi-details[open] summary:after{content:"▴";}
        .sbi-hoverWrap{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
        .sbi-hoverWrap .sbi-muted{font-size:12px;}
        .sbi-tabs{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
        .sbi-tab{padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);cursor:pointer;font-weight:700;font-size:13px;}
        .sbi-tab:hover{background:rgba(255,255,255,.09);}
        .sbi-tab.active{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);}
        .sbi-open5eGrid{display:grid;gap:12px;grid-template-columns: 1fr 1.2fr;}
        @media (max-width: 920px){.sbi-open5eGrid{grid-template-columns:1fr;}}
        .sbi-o5-list{display:flex;flex-direction:column;gap:8px;max-height:64vh;overflow:auto;padding-right:4px;}
        .sbi-o5-item{text-align:left;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);cursor:pointer;}
        .sbi-o5-item:hover{background:rgba(255,255,255,.08);}
        .sbi-o5-name{font-weight:800;font-size:14px;line-height:1.1;}
        .sbi-o5-sub{opacity:.78;font-size:12px;margin-top:2px;}
        .sbi-o5-meta{opacity:.65;font-size:12px;margin-top:6px;}
        .sbi-o5-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
        .sbi-input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.25);color:#fff;outline:none;}
        .sbi-input:focus{border-color:rgba(255,255,255,.28);}
        .sbi-btn{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-weight:800;}
        .sbi-btn:hover{background:rgba(255,255,255,.12);}
        .sbi-btn.primary{background:rgba(120,180,255,.18);border-color:rgba(120,180,255,.32);}
        .sbi-btn.primary:hover{background:rgba(120,180,255,.24);}
        .sbi-btn.danger{background:rgba(255,120,120,.15);border-color:rgba(255,120,120,.28);}
        .sbi-btn.danger:hover{background:rgba(255,120,120,.22);}
        /* Hover preview container */
        #sbi-hover-preview{background:#121212;border:1px solid rgba(255,255,255,.25);border-radius:14px;box-shadow:0 30px 90px rgba(0,0,0,.6);padding:12px;}
      </style>

      <div class="sbi-root">
        <div class="sbi-header">
          <div>
            <h2 class="sbi-title">Stat Block Importer</h2>
            <div class="sbi-sub">Paste a stat block screenshot, run OCR, then quickly correct structured fields. Preview uses the same standardized stat block format you’ll use across the site.</div>
          </div>
          ${state.lastInputMethod ? `<div class="sbi-pill">Loaded via <strong>${esc(state.lastInputMethod)}</strong></div>` : ""}
        </div>

        ${statusLine}

        <div class="sbi-tabs">
          <button id="sbi-tab-ocr" type="button" class="sbi-tab ${state.activeTab==="ocr"?"active":""}">Screenshot / OCR</button>
          <button id="sbi-tab-import" type="button" class="sbi-tab ${state.activeTab==="import"?"active":""}">Import</button>
        </div>

        
<div class="sbi-card" style="display:${state.activeTab==="import"?"block":"none"};">
  <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;">
    <div style="flex:1;min-width:220px;">
      <div class="sbi-muted" style="margin-bottom:6px;">Format</div>
      <select id="sbi-import-format" class="sbi-input">
        <option value="open5e" ${String(state.importer.fmt||"open5e")==="open5e"?"selected":""}>Open5e monster JSON</option>
        <option value="5etools" ${String(state.importer.fmt||"open5e")==="5etools"?"selected":""}>5etools-style monster JSON</option>
        <option value="vrahune" ${String(state.importer.fmt||"open5e")==="vrahune"?"selected":""}>Vrahune/Vault monster JSON (your schema)</option>
      </select>
    </div>
    <div class="sbi-btnbar" style="margin:0;">
      <button id="sbi-import-load" class="sbi-btn primary" type="button">Load JSON</button>
      <button id="sbi-import-clear" class="sbi-btn danger" type="button">Clear</button>
    </div>
  </div>

  <div class="sbi-row" style="margin-top:10px;align-items:flex-start;">
    <div style="flex:1;min-width:260px;">
      <div class="sbi-muted" style="margin-bottom:6px;">Paste JSON</div>
      <textarea id="sbi-import-json" class="sbi-input" style="height:140px;resize:vertical;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;" placeholder='Paste monster JSON here (single object, an array, or an API payload with "results").'>${esc(state.importer.jsonText || "")}</textarea>
      <div class="sbi-hint" style="margin-top:6px;">Everything stays in your browser. This tool does not upload files anywhere.</div>
    </div>
    <div style="width:260px;min-width:220px;">
      <div class="sbi-muted" style="margin-bottom:6px;">Or upload a JSON file</div>
      <input id="sbi-import-file" type="file" accept="application/json,.json" />
      <div class="sbi-hint" style="margin-top:8px;">Tip: export your own homebrew entries and re-import them here.</div>
    </div>
  </div>

  ${state.importer.error ? `<div class="sbi-status sbi-status--error" style="margin-top:10px;">${esc(state.importer.error)}</div>` : ""}
</div>

<div class="sbi-open5eGrid" style="display:${state.activeTab==="import"?"grid":"none"};">
  <div class="sbi-card">
    <div style="font-weight:900;margin-bottom:8px;">Imported Monsters</div>
    <div class="sbi-o5-list" id="sbi-import-list">
      ${(state.importer.items && state.importer.items.length)
        ? state.importer.items.slice(0, 200).map((it, idx) => {
            const sel = state.importer.selected === idx;
            const name = it?.name || it?.monster_name || it?.title || `Monster ${idx+1}`;
            const sub = (it?.sizeType || it?.type || it?.size || "").toString();
            return `<button type="button" data-imp-idx="${idx}" class="sbi-o5-item ${sel?"sel":""}">
              <div style="font-weight:800;">${esc(name)}</div>
              <div class="sbi-muted" style="font-size:12px;">${esc(sub)}</div>
            </button>`;
          }).join("")
        : `<div class="sbi-muted">Paste or upload JSON, then click <strong>Load JSON</strong>.</div>`
      }
    </div>
  </div>

  <div class="sbi-card">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <div style="font-weight:900;">Stat Block Preview</div>
      <div class="sbi-btnbar" style="margin:0;">
        <button id="sbi-import-use" class="sbi-btn primary" type="button" ${Number.isFinite(state.importer.selected) ? "" : "disabled"}>Use in Importer</button>
        <button id="sbi-import-save" class="sbi-btn" type="button" ${Number.isFinite(state.importer.selected) ? "" : "disabled"}>Save Draft</button>
      </div>
    </div>

    ${Number.isFinite(state.importer.selected) && state.importer.items?.[state.importer.selected] ? `
      <div style="margin-top:10px;">
        <div class="sbi-muted" style="margin-bottom:8px;">Preview uses a 5etools-like compact layout, re-skinned to your theme colors.</div>
        <div style="border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px;background:rgba(0,0,0,.18);">
          ${statBlockPreviewFiveEtoolsLike(toCanonicalMonster(state.importer.items[state.importer.selected], state.importer.fmt))}
        </div>
      </div>
    ` : `<div class="sbi-muted" style="margin-top:10px;">Select an imported monster to preview it.</div>`}
  </div>
</div>

<div class="sbi-split" style="display:${state.activeTab==="ocr"?"grid":"none"};">
          <div class="sbi-col">
            <div id="sbi-paste-zone" tabindex="0" class="sbi-card sbi-card--dashed sbi-drop sbi-kbd">
              <strong>Paste Screenshot</strong>
              <div class="sbi-hint">Click here, then press <kbd>Ctrl</kbd> + <kbd>V</kbd> (or <kbd>Cmd</kbd> + <kbd>V</kbd>)</div>
            </div>

            <div class="sbi-card sbi-row">
              <span class="sbi-muted">Or upload an image:</span>
              <input id="sbi-file" type="file" accept="image/*" />
            </div>

            <div class="sbi-card">
              ${
                state.imageDataUrl
                  ? `<img src="${state.imageDataUrl}" alt="Preview" style="width:100%;max-height:320px;object-fit:contain;border-radius:10px;border:1px solid rgba(255,255,255,.12);" />`
                  : `<div class="sbi-muted" style="padding:10px;">No image loaded yet.</div>`
              }
              <div class="sbi-btnbar" style="margin-top:10px;">
                <button id="sbi-run" class="sbi-primary" ${state.imageDataUrl ? "" : "disabled"}>Run OCR + Parse</button>
                <button id="sbi-clear" class="sbi-danger" type="button">Clear</button>
              </div>
            </div>

            <details class="sbi-card sbi-details" ${state.ocrText ? "open" : ""}>
              <summary>OCR Text</summary>
              <div class="sbi-form" style="margin-top:10px;">
                <textarea id="sbi-ocr-text">${esc(state.ocrText || "")}</textarea>
              </div>
              <div class="sbi-btnbar" style="margin-top:10px;">
                <button id="sbi-reparse" type="button">Re-parse Edited Text</button>
              </div>
            </details>
          </div>

          <div class="sbi-col">
            ${
              p ? `
              <details id="sbi-parsed-wrap" class="sbi-card sbi-details" open>
                <summary>Parsed Fields</summary>

                <div class="sbi-form" style="margin-top:10px;">
                  <div class="sbi-grid3">
                    <label>Name<input id="sbi-name" value="${esc(p.name)}"></label>
                    <label>Size/Type<input id="sbi-sizeType" value="${esc(p.sizeType)}"></label>
                    <label>Alignment<input id="sbi-alignment" value="${esc(p.alignment)}"></label>

                    <label>AC ${confBadge(p.confidence?.ac)}<input id="sbi-ac" type="number" value="${esc(p.ac)}"></label>
                    <label>AC Notes<input id="sbi-acText" value="${esc(p.acText || "")}"></label>
                    <label>HP ${confBadge(p.confidence?.hp)}<input id="sbi-hp" type="number" value="${esc(p.hp)}"></label>
                    <label>HP Formula<input id="sbi-hpFormula" value="${esc(p.hpFormula || "")}"></label>
                    <label>Speed ${confBadge(p.confidence?.speed)}<input id="sbi-speed" value="${esc(p.speed || "")}"></label>

                    <label>CR ${confBadge(p.confidence?.cr)}<input id="sbi-cr" value="${esc(p.cr)}"></label>
                    <label>XP<input id="sbi-xp" type="number" value="${esc(p.xp ?? 0)}"></label>
                    <label>PB ${confBadge(p.confidence?.pb)}<input id="sbi-pb" type="number" value="${esc(p.proficiencyBonus ?? 2)}"></label>
                  </div>

                  <div class="sbi-grid6" style="margin-top:10px;">
                    <label>STR<input id="sbi-str" type="number" value="${esc(p.str)}"></label>
                    <label>DEX<input id="sbi-dex" type="number" value="${esc(p.dex)}"></label>
                    <label>CON<input id="sbi-con" type="number" value="${esc(p.con)}"></label>
                    <label>INT<input id="sbi-int" type="number" value="${esc(p.int)}"></label>
                    <label>WIS<input id="sbi-wis" type="number" value="${esc(p.wis)}"></label>
                    <label>CHA<input id="sbi-cha" type="number" value="${esc(p.cha)}"></label>
                  </div>

                  <div class="sbi-grid2" style="margin-top:10px;">
                    <label>Saving Throws<input id="sbi-saves" value="${esc(listToLine(p.saves))}"></label>
                    <label>Skills<input id="sbi-skills" value="${esc(listToLine(p.skills))}"></label>
                    <label>Damage Vulnerabilities<input id="sbi-vuln" value="${esc(listToLine(p.vulnerabilities))}"></label>
                    <label>Damage Resistances<input id="sbi-resist" value="${esc(listToLine(p.resistances))}"></label>
                    <label>Damage Immunities<input id="sbi-immune" value="${esc(listToLine(p.immunities))}"></label>
                    <label>Condition Immunities<input id="sbi-condImm" value="${esc(listToLine(p.conditionImmunities))}"></label>
                    <label>Senses<input id="sbi-senses" value="${esc(listToLine(p.senses))}"></label>
                    <label>Languages<input id="sbi-languages" value="${esc(listToLine(p.languages))}"></label>
                    <label style="grid-column:1 / -1;">Habitats / Environment<input id="sbi-habitats" value="${esc(listToLine(p.habitats))}"></label>
                  </div>

                  <div class="sbi-sectionTitle">Structured Entries</div>
                  <div class="sbi-grid2">
                    <label>Traits (Name. text)<textarea id="sbi-traits">${esc(entriesToText(p.traits))}</textarea></label>
                    <label>Actions (Name. text)<textarea id="sbi-actions">${esc(entriesToText(p.actions))}</textarea></label>
                    <label>Bonus Actions<textarea id="sbi-bonusActions" style="min-height:90px;">${esc(entriesToText(p.bonusActions))}</textarea></label>
                    <label>Reactions<textarea id="sbi-reactions" style="min-height:90px;">${esc(entriesToText(p.reactions))}</textarea></label>
                    <label style="grid-column:1 / -1;">Legendary Actions<textarea id="sbi-legendaryActions" style="min-height:90px;">${esc(entriesToText(p.legendaryActions))}</textarea></label>
                  </div>

                  <div class="sbi-sectionTitle">Raw Section Editors</div>
                  <div class="sbi-muted" style="margin-bottom:8px;">Use these when OCR structure fails. Then copy cleaned lines to structured boxes above.</div>
                  <div class="sbi-grid2">
                    <label>Raw Traits<textarea id="sbi-raw-traits" style="min-height:90px;">${esc(p.rawSections?.traits || "")}</textarea></label>
                    <label>Raw Actions<textarea id="sbi-raw-actions" style="min-height:90px;">${esc(p.rawSections?.actions || p.rawSections?.actionsRawFallback || "")}</textarea></label>
                    <label>Raw Bonus Actions<textarea id="sbi-raw-bonus" style="min-height:80px;">${esc(p.rawSections?.bonusActions || "")}</textarea></label>
                    <label>Raw Reactions<textarea id="sbi-raw-reactions" style="min-height:80px;">${esc(p.rawSections?.reactions || "")}</textarea></label>
                    <label style="grid-column:1 / -1;">Raw Legendary Actions<textarea id="sbi-raw-legendary" style="min-height:80px;">${esc(p.rawSections?.legendaryActions || "")}</textarea></label>
                  </div>

                  <label style="margin-top:10px;">Unmapped Text<textarea id="sbi-unmapped" style="min-height:90px;">${esc(p.unmappedText || "")}</textarea></label>
                </div>
              </details>

              <div class="sbi-card">
                <div class="sbi-hoverWrap">
                  <button id="sbi-preview-hover-btn" type="button">Stat Block Preview (Hover)</button>
                  <span class="sbi-muted">Hover to preview the standardized stat block card.</span>
                </div>
              </div>

              <div id="sbi-hover-preview" style="display:none;position:fixed;z-index:99999;left:50%;top:50%;transform:translate(-50%,-50%);width:min(980px,94vw);max-height:90vh;overflow:auto;">
                ${statBlockPreview(p)}
              </div>

              <div class="sbi-btnbar">
                <button id="sbi-refresh-preview" type="button">Refresh Preview</button>
                <button id="sbi-save" type="button">Save Draft</button>
                <button id="sbi-copy" type="button">Copy JSON</button>
              </div>
              ` : `
              <div class="sbi-card">
                <div class="sbi-muted">No parsed result yet. Paste/upload an image and run OCR + Parse.</div>
              </div>
              `
            }
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------
  // Bind events
  // -------------------------
  function bind(labelEl, panelEl) {
    if (!state.importer._docsLoaded) {
      state.importer._docsLoaded = true;
      open5eFetchDocuments().then(() => {
        // only re-render if open5e tab visible or filter select exists
        if (panelEl && panelEl.querySelector("#sbi-open5e-doc")) render({ labelEl, panelEl });
      });
    }
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

// -------------------------

// Tabs
q("sbi-tab-ocr")?.addEventListener("click", () => {
  state.activeTab = "ocr";
  render({ labelEl, panelEl });
});
q("sbi-tab-import")?.addEventListener("click", () => {
  state.activeTab = "import";
  render({ labelEl, panelEl });
});

// Import: file -> textarea
q("sbi-import-file")?.addEventListener("change", async (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  try {
    const txt = await f.text();
    state.importer.jsonText = txt;
    const ta = q("sbi-import-json");
    if (ta) ta.value = txt;
  } catch (err) {
    state.importer.error = err?.message || String(err);
  }
  render({ labelEl, panelEl });
});

q("sbi-import-format")?.addEventListener("change", (e) => {
  state.importer.fmt = e.target.value || "open5e";
});

q("sbi-import-clear")?.addEventListener("click", () => {
  state.importer.jsonText = "";
  state.importer.items = [];
  state.importer.selected = null;
  state.importer.error = "";
  const ta = q("sbi-import-json");
  if (ta) ta.value = "";
  const fi = q("sbi-import-file");
  if (fi) fi.value = "";
  render({ labelEl, panelEl });
});

q("sbi-import-load")?.addEventListener("click", () => {
  const ta = q("sbi-import-json");
  const raw = (ta ? ta.value : state.importer.jsonText) || "";
  state.importer.jsonText = raw;
  state.importer.error = "";
  state.importer.items = [];
  state.importer.selected = null;

  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : (parsed?.results && Array.isArray(parsed.results) ? parsed.results : [parsed]);
    state.importer.items = arr.filter(Boolean);
    state.importer.selected = state.importer.items.length ? 0 : null;
    if (!state.importer.items.length) state.importer.error = "No monsters found in that JSON.";
  } catch (err) {
    state.importer.error = "Invalid JSON: " + (err?.message || String(err));
  }
  render({ labelEl, panelEl });
});

// Imported list selection
panelEl.querySelectorAll("[data-imp-idx]")?.forEach((btn) => {
  btn.addEventListener("click", () => {
    const idx = Number(btn.getAttribute("data-imp-idx"));
    if (!Number.isFinite(idx)) return;
    state.importer.selected = idx;
    render({ labelEl, panelEl });
  });
});

q("sbi-import-use")?.addEventListener("click", () => {
  if (!Number.isFinite(state.importer.selected)) return;
  const picked = state.importer.items?.[state.importer.selected];
  if (!picked) return;
  const normalized = toCanonicalMonster(picked, state.importer.fmt);
  state.parsed = normalized;
  state.ocrText = "";
  state.status = "done";
  state.activeTab = "ocr";
  state.lastInputMethod = "Import";
  render({ labelEl, panelEl });
});

q("sbi-import-save")?.addEventListener("click", () => {
  if (!Number.isFinite(state.importer.selected)) return;
  const picked = state.importer.items?.[state.importer.selected];
  if (!picked) return;
  const normalized = toCanonicalMonster(picked, state.importer.fmt);
  addDraft({ ...normalized, _savedAt: new Date().toISOString() });
  alert("Saved imported monster to Stat Block Importer drafts.");
  render({ labelEl, panelEl });
});

  }

  function render({ labelEl, panelEl }) {
    if (!panelEl) return;
    if (labelEl) labelEl.textContent = TOOL_NAME;

    // Preserve focus/cursor so typing in search boxes doesn't require re-clicks
    const ae = document.activeElement;
    const aeId = ae && ae.id ? ae.id : null;
    let selStart = null, selEnd = null;
    if (ae && aeId && typeof ae.selectionStart === "number") {
      selStart = ae.selectionStart;
      selEnd = ae.selectionEnd;
    }

    panelEl.innerHTML = template();
    bind(labelEl, panelEl);

    if (aeId) {
      const next = panelEl.querySelector(`#${CSS.escape(aeId)}`);
      if (next && typeof next.focus === "function") {
        next.focus();
        if (selStart !== null && typeof next.setSelectionRange === "function") {
          try { next.setSelectionRange(selStart, selEnd ?? selStart); } catch {}
        }
      }
    }
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


  
// ---- v5.6 parse normalization hardening ----
const __parseStatBlock_v55 = parseStatBlock;
parseStatBlock = function(rawText) {
  const result = __parseStatBlock_v55(rawText);
  try {
    const txt = String(rawText || "");
    const lines = splitLines(normalizeOcr(txt));
    const headerZone = lines.slice(0, Math.min(lines.length, 40));

    const acCandidates = [];
    for (const l of headerZone) {
      const line = repairNumericOCR(l);
      let m = line.match(/\b(?:AC|Armor\s*Class)\b\s*[:\-]?\s*(\d{1,2})\b/i);
      if (m) acCandidates.push(Number(m[1]));
      m = line.match(/\bAC\b\s*(\d{1,2})\b(?=[^\n]*(?:Initiative|HP|Speed|$))/i);
      if (m) acCandidates.push(Number(m[1]));
    }
    const acValid = acCandidates.filter(n=>n>=1&&n<=30);
    if (acValid.length) result.ac = acValid[0];

    if (!result.initiative) {
      const il = headerZone.find(l=>/\binitiative\b/i.test(l));
      if (il) {
        const m = repairNumericOCR(il).match(/\binitiative\b\s*[:\-]?\s*([+\-]?\d+(?:\s*\([^)]*\))?)/i);
        if (m) result.initiative = m[1].replace(/\s+/g," ").trim();
      }
    }

    const immLine = lines.find(l=>/^\s*Immunities\b/i.test(l));
    if (immLine) {
      const parsed = parseCompactImmunitiesLine(immLine);
      if (parsed) {
        result.immunities = uniq([...(result.immunities||[]), ...(parsed.damage||[])]);
        result.conditionImmunities = uniq([...(result.conditionImmunities||[]), ...(parsed.conditions||[])]);
      }
    }

    if (!result.languages || !result.languages.length) {
      const lang = lines.find(l=>/understands|can't speak|telepathy|languages?/i.test(l));
      if (lang) {
        const cleaned = lang.replace(/^\s*Languages?\b[:\s]*/i,"").trim();
        if (cleaned) result.languages = [cleaned];
      }
    }

    result.sizeType = sanitizeSizeType(result.sizeType);
    result.alignment = sanitizeAlignment(result.alignment);
    result.languages = sanitizeListField(result.languages||[], "languages");
    result.senses = sanitizeListField(result.senses||[], "senses");
  } catch(e) {}
  return result;
};

window.registerTool({
    id: TOOL_ID,
    name: TOOL_NAME,
    description: "Paste/upload screenshot, OCR locally, section-first parse with raw fallbacks.",
    render,
  });

/* v5.8.1 AC stability patch */
function parseACRobust(coreLines = [], allText = "") {
  const joinedCore = (coreLines || []).join("\n");
  const raw = `${joinedCore}\n${allText || ""}`;

  const norm = String(raw || "")
    .replace(/[|]/g, " ")
    .replace(/\bA\s*C\b/gi, "AC")
    .replace(/\bArmor\s*Class\b/gi, "Armor Class")
    .replace(/\bArmor\s*C1ass\b/gi, "Armor Class")
    .replace(/\bArmorClass\b/gi, "Armor Class")
    .replace(/\b([Il])(\d)\b/g, "1$2")
    .replace(/\b(\d)[Oo]\b/g, "$10")
    .replace(/\s+/g, " ")
    .trim();

  const lines = norm
    .split(/(?<=[.!?])\s+|\n/)
    .map(s => s.trim())
    .filter(Boolean);

  const isContaminated = (s) =>
    /\b(melee weapon attack|ranged weapon attack|attack roll|hit:|actions?|reactions?|legendary actions?)\b/i.test(s || "");

  const candidates = [];
  const push = (value, score, line, notes = "") => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1 || n > 30) return;
    candidates.push({ value: n, score, line, notes });
  };

  for (const line of lines) {
    if (!line || isContaminated(line)) continue;

    let m = /(?:^|\s)(?:AC|Armor\s*Class)\s*[:\-]?\s*(\d{1,2})(?=\b|\s|$)/i.exec(line);
    if (m) {
      const hasCoreNeighbors = /\b(initiative|hp|hit points|speed|cr|pb)\b/i.test(line);
      push(m[1], hasCoreNeighbors ? 100 : 95, line);
      continue;
    }

    m = /(?:^|\s)AC(\d{1,2})(?=\b|\s|$)/i.exec(line);
    if (m) {
      const hasCoreNeighbors = /\b(initiative|hp|hit points|speed|cr|pb)\b/i.test(line);
      push(m[1], hasCoreNeighbors ? 98 : 90, line);
      continue;
    }

    m = /(?:^|\s)Armor\s*Class(\d{1,2})(?=\b|\s|$)/i.exec(line);
    if (m) {
      const hasCoreNeighbors = /\b(initiative|hp|hit points|speed|cr|pb)\b/i.test(line);
      push(m[1], hasCoreNeighbors ? 98 : 88, line);
      continue;
    }
  }

  if (!candidates.length) {
    const top = norm.slice(0, 280);
    let m = /\b(?:AC|Armor\s*Class)\s*[:\-]?\s*(\d{1,2})\b/i.exec(top);
    if (!m) m = /\bAC(\d{1,2})\b/i.exec(top);
    if (!m) m = /\bArmor\s*Class(\d{1,2})\b/i.exec(top);
    if (m) push(m[1], 75, top);
  }

  if (candidates.length) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    return {
      value: best.value,
      notes: best.notes || "",
      confidence: best.score >= 95 ? "high" : best.score >= 80 ? "medium" : "low",
      sourceLine: best.line || ""
    };
  }

  return { value: 10, notes: "", confidence: "low", sourceLine: "" };
}

// keep parseAC name used elsewhere
parseAC = parseACRobust;

// harden final parse output with anchored AC overwrite
const __v58_prevParseStatBlock = parseStatBlock;
parseStatBlock = function(rawInput) {
  let result = __v58_prevParseStatBlock(rawInput);
  try {
    const cleaned = normalizeOcr(rawInput || "");
    const lines = splitLines(cleaned);
    const sliced = sliceByHeaders(lines);
    const preSplit = splitPreIntoCoreMetaTraits(sliced.pre || []);
    const ac = parseACRobust(preSplit.core || [], cleaned);

    result = result || {};
    result.confidence = result.confidence || {};

    const currentAc = Number(result.ac);
    const currentConf = String(result.confidence.ac || "").toLowerCase();
    const nextConf = String(ac.confidence || "").toLowerCase();

    const shouldOverwrite = (
      !Number.isFinite(currentAc) ||
      currentAc < 1 || currentAc > 30 ||
      currentConf !== "high" ||
      nextConf === "high"
    );

    if (shouldOverwrite) {
      result.ac = ac.value;
      result.acText = ac.notes || "";
      result.confidence.ac = ac.confidence;
    }
  } catch (e) { /* no-op */ }
  return result;
};

})();
