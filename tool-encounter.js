// encounter-fix-r4
// tool-encounter.js
// Encounter / Initiative tool for Vrahune Toolbox
(function () {
  if (window.__vrahuneEncounterToolActive) return;
  window.__vrahuneEncounterToolActive = true;

  const TOOL_ID = "encounterTool";
  const TOOL_NAME = "Encounter / Initiative";
  const STORAGE_KEY = "vrahuneEncounterToolStateV7";
  const LEGACY_KEYS = ["vrahuneEncounterToolStateV6", "vrahuneEncounterToolStateV4", "vrahuneEncounterToolStateV3", "vrahuneEncounterToolStateV2"];

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

  const CONDITIONS_2024 = [
    "Blinded",
    "Charmed",
    "Deafened",
    "Exhaustion",
    "Frightened",
    "Grappled",
    "Incapacitated",
    "Invisible",
    "Paralyzed",
    "Petrified",
    "Poisoned",
    "Prone",
    "Restrained",
    "Stunned",
    "Unconscious"
  ];

  const CONDITION_INFO_2024 = {
    Blinded: "Can’t see and fails sight checks. Attack rolls against it have advantage, and its attacks have disadvantage.",
    Charmed: "Can’t attack the charmer or target it with harmful effects, and the charmer has advantage on social checks.",
    Deafened: "Can’t hear and fails hearing checks.",
    Exhaustion: "Each level applies −2 to D20 tests and −5 speed. At level 6, the creature dies.",
    Frightened: "Has disadvantage on checks and attacks while it can see the source, and can’t willingly move closer.",
    Grappled: "Speed is 0 while grappled.",
    Incapacitated: "Can’t take actions, bonus actions, or reactions.",
    Invisible: "Can’t be seen without special senses or magic. Its attacks have advantage; attacks against it have disadvantage.",
    Paralyzed: "Incapacitated, speed 0, fails Str/Dex saves; attacks against it have advantage; nearby hits are critical.",
    Petrified: "Incapacitated and transformed to an inanimate substance, with heavy defenses and immunities.",
    Poisoned: "Has disadvantage on attack rolls and ability checks.",
    Prone: "Can crawl unless it stands; nearby attackers gain advantage and distant attacks have disadvantage.",
    Restrained: "Speed 0; attacks have disadvantage; attacks against it have advantage; Dex saves have disadvantage.",
    Stunned: "Incapacitated, speed 0, fails Str/Dex saves; attacks against it have advantage.",
    Unconscious: "Incapacitated and unaware; drops held items, falls prone, and nearby hits are critical."
  };



  let encounterUiRefreshHook = null;
  function requestEncounterUiRefreshFromVault() {
    if (typeof encounterUiRefreshHook === "function") {
      try {
        encounterUiRefreshHook();
      } catch (_) {}
    }
  }

  function toPlainText(value, depth = 0) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value).trim();
    }
    if (Array.isArray(value)) {
      return value
        .map((v) => toPlainText(v, depth + 1))
        .filter(Boolean)
        .join(" ")
        .trim();
    }
    if (typeof value === "object") {
      if (depth > 4) return "";
      const preferred = [
        value.text,
        value.description,
        value.desc,
        value.effect,
        value.summary,
        value.note,
        value.value,
        value.entries
      ];
      const picked = preferred.map((v) => toPlainText(v, depth + 1)).filter(Boolean).join(" ").trim();
      if (picked) return picked;
      return Object.values(value)
        .map((v) => toPlainText(v, depth + 1))
        .filter(Boolean)
        .join(" ")
        .trim();
    }
    return "";
  }

  const CR_XP_BY_RATING = {
    "0": 0,
    "1/8": 25,
    "1/4": 50,
    "1/2": 100,
    "1": 200,
    "2": 450,
    "3": 700,
    "4": 1100,
    "5": 1800,
    "6": 2300,
    "7": 2900,
    "8": 3900,
    "9": 5000,
    "10": 5900,
    "11": 7200,
    "12": 8400,
    "13": 10000,
    "14": 11500,
    "15": 13000,
    "16": 15000,
    "17": 18000,
    "18": 20000,
    "19": 22000,
    "20": 25000,
    "21": 33000,
    "22": 41000,
    "23": 50000,
    "24": 62000,
    "25": 75000,
    "26": 90000,
    "27": 105000,
    "28": 120000,
    "29": 135000,
    "30": 155000
  };

  const XP_BUDGET_2024_BY_LEVEL = {
    1: { low: 50, moderate: 75, high: 100 },
    2: { low: 100, moderate: 150, high: 200 },
    3: { low: 150, moderate: 225, high: 400 },
    4: { low: 250, moderate: 375, high: 500 },
    5: { low: 500, moderate: 750, high: 1100 },
    6: { low: 600, moderate: 1000, high: 1400 },
    7: { low: 750, moderate: 1300, high: 1700 },
    8: { low: 1000, moderate: 1700, high: 2100 },
    9: { low: 1300, moderate: 2000, high: 2600 },
    10: { low: 1600, moderate: 2300, high: 3100 },
    11: { low: 1900, moderate: 2900, high: 4100 },
    12: { low: 2200, moderate: 3700, high: 4700 },
    13: { low: 2600, moderate: 4200, high: 5400 },
    14: { low: 2900, moderate: 4900, high: 6200 },
    15: { low: 3300, moderate: 5400, high: 7800 },
    16: { low: 3800, moderate: 6100, high: 9800 },
    17: { low: 4500, moderate: 7200, high: 11700 },
    18: { low: 5000, moderate: 8700, high: 14200 },
    19: { low: 5500, moderate: 10700, high: 17200 },
    20: { low: 6400, moderate: 13200, high: 22000 }
  };

  function normalizeLevel(value, fallback = 1) {
    return clamp(Math.max(1, intOr(value, fallback)), 1, 20);
  }

  function normalizeCR(value, fallback = "0") {
    const raw = String(value ?? "").trim();
    if (!raw) return fallback;

    const direct = raw.toLowerCase().replace(/\s+/g, "");
    if (direct === "1/8" || direct === "1/4" || direct === "1/2") return direct;
    if (/^\d+$/.test(direct)) {
      const n = clamp(intOr(direct, 0), 0, 30);
      return String(n);
    }
    const fractionMatch = direct.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const num = Number(fractionMatch[1]);
      const den = Number(fractionMatch[2]);
      if (den > 0) {
        const v = num / den;
        if (v <= 0.125) return "1/8";
        if (v <= 0.25) return "1/4";
        if (v <= 0.5) return "1/2";
        const n = clamp(Math.round(v), 0, 30);
        return String(n);
      }
    }

    const n = Number(direct);
    if (!Number.isFinite(n)) return fallback;
    if (n <= 0) return "0";
    if (n <= 0.125) return "1/8";
    if (n <= 0.25) return "1/4";
    if (n <= 0.5) return "1/2";
    return String(clamp(Math.round(n), 0, 30));
  }

  function crToXP(cr) {
    return CR_XP_BY_RATING[normalizeCR(cr, "0")] || 0;
  }
  function crToFloat(cr) {
  const s = String(cr ?? "").trim();
  if (!s) return -1;

  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length !== 2) return -1;
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return -1;
    return num / den;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : -1;
}


  function canonicalConditionName(value) {
    const s = String(value || "").trim().toLowerCase();
    if (!s) return "";
    const hit = CONDITIONS_2024.find((c) => c.toLowerCase() === s);
    return hit || "";
  }

  function normalizeConditions(rawConditions) {
    if (!Array.isArray(rawConditions)) return [];
    const out = [];
    const seen = new Set();
    for (const entry of rawConditions) {
      const name = canonicalConditionName(typeof entry === "string" ? entry : entry?.name);
      if (!name || name === "Exhaustion" || seen.has(name)) continue;
      const duration = Math.max(0, intOr(entry?.duration, 0));
      out.push({ name, duration: duration > 0 ? duration : null });
      seen.add(name);
    }
    return out;
  }

  function exhaustionEffects(level) {
    const lv = clamp(intOr(level, 0), 0, 6);
    if (!lv) return "No exhaustion penalties.";
    const d20Penalty = lv * 2;
    const speedPenalty = lv * 5;
    return lv >= 6
      ? `Level ${lv}: D20 tests −${d20Penalty}, Speed −${speedPenalty} ft, and the creature dies.`
      : `Level ${lv}: D20 tests −${d20Penalty}, Speed −${speedPenalty} ft.`;
  }

  function normalizePortrait(value) {
    const s = String(value || "").trim();
    if (!s) return "";
    return /^data:image\//i.test(s) ? s : "";
  }


  function isMonsterVaultLike(candidate) {
    if (!candidate || typeof candidate !== "object") return false;
    if (
      typeof candidate.getMonsterIndex === "function" ||
      typeof candidate.getAllMonsters === "function" ||
      typeof candidate.searchMonsters === "function" ||
      typeof candidate.getMonsterById === "function" ||
      Array.isArray(candidate.monsters) ||
      Array.isArray(candidate.items) ||
      Array.isArray(candidate.results) ||
      Array.isArray(candidate.data) ||
      Array.isArray(candidate.list)
    ) {
      return true;
    }
    return false;
  }

  function monsterVaultApi() {
  const candidates = [
    window.VrahuneMonsterVault,
    window.MonsterVault,
    window.vrahuneMonsterVault
  ];
  for (const candidate of candidates) {
    if (isMonsterVaultLike(candidate)) return candidate;
  }

  // Fallback for older/partial vault builds that only expose snapshots
  const snapIndex = pickArrayish(window.__vrahuneMonsterVaultIndex);
  const snapAll = pickArrayish(window.__vrahuneMonsterVaultMonsters);

  if (snapIndex.length || snapAll.length) {
    return {
      monsters: snapAll,
      items: snapIndex,
      index: snapIndex,
      data: snapAll,
      results: snapIndex,
      list: snapIndex,
      getMonsterIndex() {
        return snapIndex;
      },
      getAllMonsters() {
        return snapAll.length ? snapAll : snapIndex;
      }
    };
  }

  return null;
}


  function pickArrayish(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    const buckets = [
      payload.monsters,
      payload.items,
      payload.data,
      payload.results,
      payload.list,
      payload.index,
      payload.rows,
      payload.values
    ];
    for (const bucket of buckets) {
      if (Array.isArray(bucket)) return bucket;
    }
    if (payload.monstersById && typeof payload.monstersById === "object") {
      const vals = Object.values(payload.monstersById).filter((x) => x && typeof x === "object");
      if (vals.length) return vals;
    }
    return [];
  }

  function isThenable(value) {
    return !!value && (typeof value === "object" || typeof value === "function") && typeof value.then === "function";
  }

  let vaultAsyncRequestSeq = 0;
  function tryResolveAsyncVaultPayload(value, reason = "") {
    if (!isThenable(value)) return;
    const seq = ++vaultAsyncRequestSeq;
    Promise.resolve(value)
      .then((resolved) => {
        if (seq !== vaultAsyncRequestSeq) return;
        const arr = pickArrayish(resolved);
        if (!arr.length) return;

        const list = arr
          .map((m) => {
            const sourceType = m?.sourceType
              ? String(m.sourceType).toLowerCase()
              : (m?.isHomebrew || /homebrew/i.test(String(m?.source || "")) ? "homebrew" : "srd");
            const source = sourceType === "homebrew" ? "Homebrew" : String(m?.source || "SRD 2024");
            const details = m?.details && typeof m.details === "object" ? m.details : null;
            const actionsCount =
              Math.max(0, intOr(m?.actionsCount, 0)) ||
              ((details?.actions?.length || 0) +
                (details?.bonusActions?.length || 0) +
                (details?.reactions?.length || 0) +
                (details?.legendaryActions?.length || 0));

            return {
              id: String(m?.id || m?.index || m?.slug || m?.monsterId || m?.monster_id || (typeof m?.url === "string" ? m.url.split("/").filter(Boolean).pop() : "") || "").trim(),
              name: String(m?.name || "Unnamed Monster"),
              type: ["PC", "NPC", "Enemy"].includes(m?.type) ? m.type : "Enemy",
              cr: normalizeCR(m?.cr, "1/8"),
              ac: Math.max(0, intOr(m?.ac, 10)),
              hp: Math.max(1, intOr(m?.hp ?? m?.hpMax ?? m?.hpCurrent, 1)),
              speed: Math.max(0, intOr(m?.speed, 30)),
              initiative: Math.max(0, intOr(m?.initiative, 10)),
              source,
              sourceType,
              sizeType: String(m?.sizeType || ""),
              actionsCount
            };
          })
          .filter((m) => m.id && m.name);

        if (!list.length) return;

        monsterVaultIndexCache.list = list;
        monsterVaultIndexCache.crValues = [...new Set(list.map((m) => m.cr).filter(Boolean))].sort((a, b) => crToFloat(a) - crToFloat(b));
        monsterVaultIndexCache.ready = true;
        requestEncounterUiRefreshFromVault();
      })
      .catch(() => {});
  }

  function getVaultRawList(api) {
    // If an API object already carries arrays, use those first.
    const directFromApi = pickArrayish(api);
    if (directFromApi.length) return directFromApi;

    // Global snapshots published by tool-monster-vault.js (cross-version safety net).
    const globalSnapshots = [
      window.__vrahuneMonsterVaultIndex,
      window.__vrahuneMonsterVaultMonsters
    ];
    for (const snapshot of globalSnapshots) {
      const arr = pickArrayish(snapshot);
      if (arr.length) return arr;
    }

    if (!api || typeof api !== "object") return [];
    const attempts = [
      () => (typeof api.getMonsterIndex === "function" ? api.getMonsterIndex() : null),
      () => (typeof api.getAllMonsters === "function" ? api.getAllMonsters() : null),
      () => (typeof api.searchMonsters === "function" ? api.searchMonsters("") : null)
    ];

    for (const fn of attempts) {
      try {
        const value = fn();
        if (isThenable(value)) {
          tryResolveAsyncVaultPayload(value, "method");
          continue;
        }
        const arr = pickArrayish(value);
        if (arr.length) return arr;
      } catch (_) {}
    }

    return [];
  }

  function toEncounterFromRawMonster(rawMonster, fallbackId = null) {

    const src = rawMonster && typeof rawMonster === "object" ? rawMonster : {};
    const details = src.details && typeof src.details === "object" ? JSON.parse(JSON.stringify(src.details)) : null;
    return {
      id: uid("c"),
      name: String(src.name || "Monster"),
      type: ["PC", "NPC", "Enemy"].includes(src.type) ? src.type : "Enemy",
      ac: Math.max(0, intOr(src.ac, 10)),
      hpCurrent: Math.max(1, intOr(src.hpCurrent ?? src.hpMax ?? src.hp, 1)),
      hpMax: Math.max(1, intOr(src.hpMax ?? src.hp ?? src.hpCurrent, 1)),
      speed: Math.max(0, intOr(src.speed, 30)),
      initiative: Math.max(0, intOr(src.initiative, 10)),
      level: src.type === "Enemy" ? 1 : 3,
      cr: normalizeCR(src.cr, "1/8"),
      sourceMonsterId: String(src?.id || src?.index || src?.slug || src?.monsterId || src?.monster_id || (typeof src?.url === "string" ? src.url.split("/").filter(Boolean).pop() : "") || fallbackId || ""),
      sourceMonsterName: String(src.name || ""),
      source: src.isHomebrew ? "Homebrew" : String(src.source || "SRD 2024"),
      xp: Math.max(0, intOr(src.xp, 0)),
      sizeType: String(src.sizeType || ""),
      details,
      traits: JSON.parse(JSON.stringify(src.traits || details?.traits || [])),
      actions: JSON.parse(JSON.stringify(src.actions || details?.actions || [])),
      bonusActions: JSON.parse(JSON.stringify(src.bonusActions || details?.bonusActions || [])),
      reactions: JSON.parse(JSON.stringify(src.reactions || details?.reactions || [])),
      legendaryActions: JSON.parse(JSON.stringify(src.legendaryActions || details?.legendaryActions || [])),
      conditions: []
    };
  }

  function hasMonsterVaultApi() {
    const api = monsterVaultApi();
    if (api && getVaultRawList(api).length > 0) return true;
    const snapshot = pickArrayish(window.__vrahuneMonsterVaultIndex).length
      ? pickArrayish(window.__vrahuneMonsterVaultIndex)
      : pickArrayish(window.__vrahuneMonsterVaultMonsters);
    return Array.isArray(snapshot) && snapshot.length > 0;
  }

  const monsterVaultIndexCache = {
    list: [],
    crValues: [],
    ready: false
  };

  function resetMonsterVaultCache() {
    monsterVaultIndexCache.list = [];
    monsterVaultIndexCache.crValues = [];
    monsterVaultIndexCache.ready = false;
  }

  function monsterVaultMonsters(forceRefresh = false) {
    const api = monsterVaultApi();
    if (!api) {
      const fallbackRaw =
        pickArrayish(window.__vrahuneMonsterVaultIndex).length
          ? pickArrayish(window.__vrahuneMonsterVaultIndex)
          : pickArrayish(window.__vrahuneMonsterVaultMonsters);
      if (!fallbackRaw.length) {
        resetMonsterVaultCache();
        return [];
      }
      try {
        const list = (fallbackRaw || [])
          .map((m) => {
            const sourceType = m.sourceType
              ? String(m.sourceType).toLowerCase()
              : (m.isHomebrew || /homebrew/i.test(String(m.source || "")) ? "homebrew" : "srd");
            const source = sourceType === "homebrew" ? "Homebrew" : String(m.source || "SRD 2024");
            const details = m.details && typeof m.details === "object" ? m.details : null;
            const actionsCount =
              Math.max(0, intOr(m.actionsCount, 0)) ||
              ((details?.actions?.length || 0) +
                (details?.bonusActions?.length || 0) +
                (details?.reactions?.length || 0) +
                (details?.legendaryActions?.length || 0));

            return {
              id: String(m?.id || m?.index || m?.slug || m?.monsterId || m?.monster_id || (typeof m?.url === "string" ? m.url.split("/").filter(Boolean).pop() : "") || "").trim(),
              name: String(m.name || "Unnamed Monster"),
              type: ["PC", "NPC", "Enemy"].includes(m.type) ? m.type : "Enemy",
              cr: normalizeCR(m.cr, "1/8"),
              ac: Math.max(0, intOr(m.ac, 10)),
              hp: Math.max(1, intOr(m.hp ?? m.hpMax ?? m.hpCurrent, 1)),
              speed: Math.max(0, intOr(m.speed, 30)),
              initiative: Math.max(0, intOr(m.initiative, 10)),
              source,
              sourceType,
              sizeType: String(m.sizeType || ""),
              actionsCount
            };
          })
          .filter((m) => m.id && m.name);
        monsterVaultIndexCache.list = list;
        monsterVaultIndexCache.crValues = [...new Set(list.map((m) => m.cr).filter(Boolean))].sort((a, b) => crToFloat(a) - crToFloat(b));
        monsterVaultIndexCache.ready = list.length > 0;
        return list;
      } catch (_) {
        resetMonsterVaultCache();
        return [];
      }
    }

    if (!forceRefresh && monsterVaultIndexCache.ready) {
      return monsterVaultIndexCache.list;
    }

    try {
      const raw = getVaultRawList(api);
      const list = (raw || [])
        .map((m) => {
          const sourceType = m.sourceType
            ? String(m.sourceType).toLowerCase()
            : (m.isHomebrew || /homebrew/i.test(String(m.source || "")) ? "homebrew" : "srd");
          const source = sourceType === "homebrew" ? "Homebrew" : String(m.source || "SRD 2024");
          const details = m.details && typeof m.details === "object" ? m.details : null;
          const actionsCount =
            Math.max(0, intOr(m.actionsCount, 0)) ||
            ((details?.actions?.length || 0) +
              (details?.bonusActions?.length || 0) +
              (details?.reactions?.length || 0) +
              (details?.legendaryActions?.length || 0));

          return {
            id: String(
  m?.id ||
  m?.index ||
  m?.slug ||
  m?.monsterId ||
  m?.monster_id ||
  (typeof m?.url === "string" ? m.url.split("/").filter(Boolean).pop() : "") ||
  ""
).trim(),

            name: String(m.name || "Unnamed Monster"),
            type: ["PC", "NPC", "Enemy"].includes(m.type) ? m.type : "Enemy",
            cr: normalizeCR(m.cr, "1/8"),
            ac: Math.max(0, intOr(m.ac, 10)),
            hp: Math.max(1, intOr(m.hp ?? m.hpMax ?? m.hpCurrent, 1)),
            speed: Math.max(0, intOr(m.speed, 30)),
            initiative: Math.max(0, intOr(m.initiative, 10)),
            source,
            sourceType,
            sizeType: String(m.sizeType || ""),
            actionsCount
          };
        })
        .filter((m) => m.id && m.name);

      const crValues = [...new Set(list.map((m) => m.cr).filter(Boolean))].sort((a, b) => crToFloat(a) - crToFloat(b));
      monsterVaultIndexCache.list = list;
      monsterVaultIndexCache.crValues = crValues;
      monsterVaultIndexCache.ready = list.length > 0;
      return list;
    } catch (_) {
      resetMonsterVaultCache();
      return [];
    }
  }

  function hasMonsterDetails(c) {
    if (!c || c.type !== "Enemy") return false;
    return [c.traits, c.actions, c.bonusActions, c.reactions, c.legendaryActions].some((arr) => Array.isArray(arr) && arr.length);
  }

  window.addEventListener("vrahune-monster-vault-updated", () => {
    resetMonsterVaultCache();
    requestEncounterUiRefreshFromVault();
  });
  window.addEventListener("vrahune-monster-vault-ready", () => {
    resetMonsterVaultCache();
    requestEncounterUiRefreshFromVault();
  });

  function initialParties() {
    return [
      {
        id: uid("party"),
        name: "Frostclaw Cell",
        members: [
          { id: uid("m"), name: "Vesper", type: "PC", level: 5, ac: 16, speed: 30, hpCurrent: 27, hpMax: 35 },
          { id: uid("m"), name: "Arelix", type: "PC", level: 5, ac: 15, speed: 30, hpCurrent: 31, hpMax: 31 },
          { id: uid("m"), name: "Lirael", type: "PC", level: 5, ac: 14, speed: 30, hpCurrent: 24, hpMax: 24 },
          { id: uid("m"), name: "Thamar", type: "PC", level: 5, ac: 18, speed: 25, hpCurrent: 39, hpMax: 39 }
        ]
      }
    ];
  }

  function mkCombatant(raw = {}) {
    const hpMax = Math.max(0, intOr(raw.hpMax, 10));
    const hpCurrent = clamp(intOr(raw.hpCurrent, hpMax), 0, hpMax);
    const type = ["PC", "NPC", "Enemy"].includes(raw.type) ? raw.type : "NPC";
    const initiative = Math.max(0, intOr(raw.initiative, 10));
    const levelDefault = type === "Enemy" ? 1 : 3;

    const details = raw.details && typeof raw.details === "object" ? JSON.parse(JSON.stringify(raw.details)) : null;
    const normalizeFeatures = (list) =>
      (Array.isArray(list) ? list : [])
        .map((entry) => {
          const name = String(entry?.name || "").trim();
          const text = toPlainText(entry?.text ?? entry?.description ?? entry?.desc ?? entry?.effect ?? entry?.entries ?? entry);
          if (!name && !text) return null;
          return { name: name || "Feature", text };
        })
        .filter(Boolean);

    const traits = normalizeFeatures(raw.traits || details?.traits);
    const actions = normalizeFeatures(raw.actions || details?.actions);
    const bonusActions = normalizeFeatures(raw.bonusActions || details?.bonusActions);
    const reactions = normalizeFeatures(raw.reactions || details?.reactions);
    const legendaryActions = normalizeFeatures(raw.legendaryActions || details?.legendaryActions);

    return {
      id: raw.id || uid("c"),
      name: String(raw.name || "Unnamed").trim() || "Unnamed",
      type,
      initiative,
      ac: Math.max(0, intOr(raw.ac, 10)),
      speed: Math.max(0, intOr(raw.speed, 30)),
      hpCurrent,
      hpMax,
      level: normalizeLevel(raw.level, levelDefault),
      cr: normalizeCR(raw.cr, type === "Enemy" ? "1" : "0"),
      conditions: normalizeConditions(raw.conditions),
      exhaustionLevel: clamp(intOr(raw.exhaustionLevel, 0), 0, 6),
      portrait: normalizePortrait(raw.portrait),
      sourceMonsterId: raw.sourceMonsterId ? String(raw.sourceMonsterId) : "",
      sourceMonsterName: raw.sourceMonsterName ? String(raw.sourceMonsterName) : "",
      source: raw.source ? String(raw.source) : "",
      xp: Math.max(0, intOr(raw.xp, raw.cr ? crToXP(raw.cr) : 0)),
      sizeType: raw.sizeType ? String(raw.sizeType) : "",
      details,
      traits,
      actions,
      bonusActions,
      reactions,
      legendaryActions,
      showMonsterDetails: !!raw.showMonsterDetails
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
          mkCombatant({ name: "Bandit Captain", type: "Enemy", cr: "2", ac: 15, speed: 30, hpCurrent: 65, hpMax: 65 }),
          mkCombatant({ name: "Bandit", type: "Enemy", cr: "1/8", ac: 12, speed: 30, hpCurrent: 11, hpMax: 11 }),
          mkCombatant({ name: "Bandit", type: "Enemy", cr: "1/8", ac: 12, speed: 30, hpCurrent: 11, hpMax: 11 }),
          mkCombatant({ name: "Bandit", type: "Enemy", cr: "1/8", ac: 12, speed: 30, hpCurrent: 11, hpMax: 11 })
        ]
      },
      {
        id: uid("enc"),
        name: "Frostclaw Gulf Patrol",
        tags: "Ambush",
        location: "Frostclaw Wilds · Coastal ice",
        combatants: [
          mkCombatant({ name: "Frostclaw Wolf", type: "Enemy", cr: "3", ac: 13, speed: 40, hpCurrent: 55, hpMax: 55 }),
          mkCombatant({ name: "Frostclaw Wolf", type: "Enemy", cr: "3", ac: 13, speed: 40, hpCurrent: 55, hpMax: 55 }),
          mkCombatant({ name: "Clan Hunter", type: "NPC", ac: 14, speed: 30, hpCurrent: 32, hpMax: 32 })
        ]
      }
    ];
  }

  function defaultState() {
    const parties = initialParties();
    const activeCombatants = [
      mkCombatant({ name: "Vesper", type: "PC", level: 5, ac: 16, speed: 30, hpCurrent: 27, hpMax: 35 }),
      mkCombatant({ name: "Frostclaw Wolf", type: "Enemy", cr: "3", ac: 13, speed: 40, hpCurrent: 55, hpMax: 55 }),
      mkCombatant({ name: "Bandit Captain", type: "Enemy", cr: "2", ac: 15, speed: 30, hpCurrent: 0, hpMax: 65 })
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
        hpMax: 12,
        level: 3,
        cr: "1"
      },
      libraryAddDraft: {
        name: "",
        type: "Enemy",
        initiative: 10,
        ac: 13,
        speed: 30,
        hpCurrent: 10,
        hpMax: 10,
        level: 3,
        cr: "1"
      },
      // editor modal
      editorOpen: false,
      editorEncounterId: null,
      editor: {
        name: "",
        tags: "",
        location: "",
        combatants: [],
        addDraft: { name: "", type: "Enemy", initiative: 10, ac: 13, speed: 30, hpCurrent: 10, hpMax: 10, level: 3, cr: "1" }
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
      hpMax: Math.max(0, intOr(state.addDraft?.hpMax, 10)),
      level: normalizeLevel(state.addDraft?.level, 3),
      cr: normalizeCR(state.addDraft?.cr, "1")
    };

    state.libraryAddDraft = {
      name: String(state.libraryAddDraft?.name || ""),
      type: ["PC", "NPC", "Enemy"].includes(state.libraryAddDraft?.type) ? state.libraryAddDraft.type : "Enemy",
      initiative: Math.max(0, intOr(state.libraryAddDraft?.initiative, 10)),
      ac: Math.max(0, intOr(state.libraryAddDraft?.ac, 13)),
      speed: Math.max(0, intOr(state.libraryAddDraft?.speed, 30)),
      hpCurrent: Math.max(0, intOr(state.libraryAddDraft?.hpCurrent, 10)),
      hpMax: Math.max(0, intOr(state.libraryAddDraft?.hpMax, 10)),
      level: normalizeLevel(state.libraryAddDraft?.level, 3),
      cr: normalizeCR(state.libraryAddDraft?.cr, "1")
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
        hpMax: Math.max(0, intOr(ed.addDraft?.hpMax, 10)),
        level: normalizeLevel(ed.addDraft?.level, 3),
        cr: normalizeCR(ed.addDraft?.cr, "1")
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
    encounterUiRefreshHook = null;

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

    const conditionEditor = {
      open: false,
      cardId: null
    };

    const monsterPicker = {
      open: false,
      scope: "active",
      encounterId: null,
      query: "",
      cr: "all",
      source: "all"
    };

    encounterUiRefreshHook = () => {
      if (monsterPicker.open) render();
    };

    function openMonsterPicker(scope, encounterId = null) {
      monsterPicker.open = true;
      monsterPicker.scope = scope === "library" ? "library" : "active";
      monsterPicker.encounterId = encounterId || null;
      monsterPicker.query = "";
      monsterPicker.cr = "all";
      monsterPicker.source = "all";

      // Force refresh and auto-recover if stale filters/search would show no rows.
      const all = monsterVaultMonsters(true);
      if (Array.isArray(all) && all.length) {
        const visible = all.filter((m) => {
          if (monsterPicker.source !== "all" && m.sourceType !== monsterPicker.source) return false;
          if (monsterPicker.cr !== "all" && m.cr !== monsterPicker.cr) return false;
          if (!monsterPicker.query) return true;
          const hay = `${m.name} ${m.cr} ${m.sizeType || ""} ${m.source || ""}`.toLowerCase();
          return hay.includes(String(monsterPicker.query).toLowerCase());
        });
        if (!visible.length) {
          monsterPicker.query = "";
          monsterPicker.cr = "all";
          monsterPicker.source = "all";
        }
      }

      render();
    }

    function closeMonsterPicker() {
      monsterPicker.open = false;
      monsterPicker.encounterId = null;
      render();
    }

    function addMonsterFromVault(monsterId) {
      const api = monsterVaultApi();
      if (!api || !monsterId) return;

      let created = null;

      if (typeof api.toEncounterCombatant === "function") {
        try {
          created = api.toEncounterCombatant(monsterId);
        } catch (_) {
          created = null;
        }
      }

      if (!created && typeof api.getMonsterById === "function") {
        try {
          const rawMonster = api.getMonsterById(monsterId);
          if (rawMonster) created = toEncounterFromRawMonster(rawMonster, monsterId);
        } catch (_) {}
      }

      if (!created) {
        const indexed = monsterVaultMonsters().find((m) => String(m.id) === String(monsterId)) || null;
        if (indexed) {
          created = toEncounterFromRawMonster(indexed, monsterId);
        }
      }

      if (!created) {
        const allRaw = getVaultRawList(api);
        const rawMonster = allRaw.find((m) => String(m?.id || m?.index || m?.slug || m?.monsterId || m?.monster_id || (typeof m?.url === "string" ? m.url.split("/").filter(Boolean).pop() : "") || "").trim() === String(monsterId));
        if (rawMonster) created = toEncounterFromRawMonster(rawMonster, monsterId);
      }

      if (!created) {
        monsterVaultMonsters(true);
        render();
        return;
      }

      if (created.hp != null && created.hpMax == null) created.hpMax = created.hp;
      if (created.hpMax != null && created.hpCurrent == null) created.hpCurrent = created.hpMax;
      if (created.initiative == null) created.initiative = 10;
      created.id = uid("c");

      const next = mkCombatant(created);
      if (monsterPicker.scope === "library") {
        const enc = state.library.find((e) => e.id === monsterPicker.encounterId);
        if (!enc) return;
        enc.combatants.push(next);
        enc.combatants = sortByInitiativeDesc(enc.combatants);
      } else {
        state.activeCombatants.push(next);
        state.activeCombatants = sortByInitiativeDesc(state.activeCombatants);
        if (state.turnIndex >= state.activeCombatants.length) {
          state.turnIndex = Math.max(0, state.activeCombatants.length - 1);
        }
      }
      persistAndRender();
    }


    function getActiveCombatantById(cardId) {
      return state.activeCombatants.find((c) => c.id === cardId) || null;
    }

    function getConditionTargetCombatant() {
      return conditionEditor.cardId ? getActiveCombatantById(conditionEditor.cardId) : null;
    }

    function openConditionEditor(cardId) {
      if (!cardId) return;
      const c = getActiveCombatantById(cardId);
      if (!c) return;
      conditionEditor.open = true;
      conditionEditor.cardId = cardId;
      render();
    }

    function closeConditionEditor() {
      if (!conditionEditor.open) return;
      conditionEditor.open = false;
      conditionEditor.cardId = null;
      render();
    }

    function toggleCondition(cardId, conditionName) {
      const c = getActiveCombatantById(cardId);
      const name = canonicalConditionName(conditionName);
      if (!c || !name || name === "Exhaustion") return;
      const idx = c.conditions.findIndex((x) => x.name === name);
      if (idx >= 0) {
        c.conditions.splice(idx, 1);
      } else {
        c.conditions.push({ name, duration: null });
      }
      c.conditions = normalizeConditions(c.conditions);
      persistAndRender();
    }

    function setConditionDuration(cardId, conditionName, rawValue) {
      const c = getActiveCombatantById(cardId);
      const name = canonicalConditionName(conditionName);
      if (!c || !name || name === "Exhaustion") return;
      const entry = c.conditions.find((x) => x.name === name);
      if (!entry) return;
      const trimmed = String(rawValue ?? "").trim();
      if (!trimmed) {
        entry.duration = null;
      } else {
        const n = Math.max(1, intOr(trimmed, entry.duration || 1));
        entry.duration = n;
      }
      saveState(state);
      render();
    }

    function removeCondition(cardId, conditionName) {
      const c = getActiveCombatantById(cardId);
      const name = canonicalConditionName(conditionName);
      if (!c || !name) return;
      c.conditions = c.conditions.filter((x) => x.name !== name);
      persistAndRender();
    }

    function clearAllConditions(cardId) {
      const c = getActiveCombatantById(cardId);
      if (!c) return;
      c.conditions = [];
      c.exhaustionLevel = 0;
      persistAndRender();
    }

    function setExhaustionLevel(cardId, value) {
      const c = getActiveCombatantById(cardId);
      if (!c) return;
      c.exhaustionLevel = clamp(intOr(value, c.exhaustionLevel), 0, 6);
      persistAndRender();
    }

    function persistAndRender() {
      saveState(state);
      render();
    }

    function sortByInitiativeDesc(arr) {
      return [...arr].sort((a, b) => {
        const diff = intOr(b.initiative, 0) - intOr(a.initiative, 0);
        return diff;
      });
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

    function getEncounterDifficulty(combatants = state.activeCombatants) {
      const roster = Array.isArray(combatants) ? combatants : [];
      const allies = roster.filter((c) => c.type !== "Enemy");
      const enemies = roster.filter((c) => c.type === "Enemy");

      const partyLevels = allies.map((c) => normalizeLevel(c.level, 1));
      const partyCount = partyLevels.length;
      const enemyCount = enemies.length;
      const enemyXP = enemies.reduce((sum, c) => sum + crToXP(c.cr), 0);

      const budget = partyLevels.reduce(
        (acc, lv) => {
          const row = XP_BUDGET_2024_BY_LEVEL[lv] || XP_BUDGET_2024_BY_LEVEL[1];
          acc.low += row.low;
          acc.moderate += row.moderate;
          acc.high += row.high;
          return acc;
        },
        { low: 0, moderate: 0, high: 0 }
      );

      let tier = "Not enough data";
      let tierClass = "tier-none";

      if (!partyCount || !enemyCount) {
        tier = !partyCount ? "Add PCs/NPCs with levels" : "Add enemies with CR";
      } else if (enemyXP <= budget.low) {
        tier = "Low";
        tierClass = "tier-low";
      } else if (enemyXP <= budget.moderate) {
        tier = "Moderate";
        tierClass = "tier-moderate";
      } else if (enemyXP <= budget.high) {
        tier = "High";
        tierClass = "tier-high";
      } else if (enemyXP <= budget.high * 1.5) {
        tier = "Above High";
        tierClass = "tier-above";
      } else {
        tier = "Extreme";
        tierClass = "tier-extreme";
      }

      const pctOfHigh = budget.high > 0 ? Math.round((enemyXP / budget.high) * 100) : 0;
      const lowPct = budget.high > 0 ? Math.round((budget.low / budget.high) * 100) : 0;
      const moderatePct = budget.high > 0 ? Math.round((budget.moderate / budget.high) * 100) : 0;

      return {
        partyCount,
        enemyCount,
        enemyXP,
        budget,
        tier,
        tierClass,
        pctOfHigh: clamp(pctOfHigh, 0, 300),
        lowPct: clamp(lowPct, 0, 100),
        moderatePct: clamp(moderatePct, 0, 100)
      };
    }

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

    function clampPortraitEditorOffsets() {
      const m = portraitEditorMetrics();
      portraitEditor.offsetX = clamp(portraitEditor.offsetX, -m.maxOffsetX, m.maxOffsetX);
      portraitEditor.offsetY = clamp(portraitEditor.offsetY, -m.maxOffsetY, m.maxOffsetY);
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

    async function processPortraitFile(file) {
      if (!file) return "";
      const raw = await readFileAsDataUrl(file);
      if (!/^data:image\//i.test(raw)) return "";
      const optimized = await resizeImageDataUrl(raw, 1024, 0.9);
      return normalizePortrait(optimized || raw);
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

    function openEditor(encounter) {
      const enc = encounter || { id: null, name: "", tags: "", location: "", combatants: [] };
      state.editorOpen = true;
      state.editorEncounterId = enc.id || null;
      state.editor = {
        name: enc.name || "",
        tags: enc.tags || "",
        location: enc.location || "",
        combatants: (enc.combatants || []).map((c) => cloneCombatant(c, true)),
        addDraft: { name: "", type: "Enemy", initiative: 10, ac: 13, speed: 30, hpCurrent: 10, hpMax: 10, level: 3, cr: "1" }
      };
      persistAndRender();
    }

    function closeEditor() {
      state.editorOpen = false;
      state.editorEncounterId = null;
      persistAndRender();
    }

    function ensureTurnIndex() {
      if (!state.activeCombatants.length) {
        state.turnIndex = 0;
      } else {
        state.turnIndex = clamp(state.turnIndex, 0, state.activeCombatants.length - 1);
      }
    }

    function getConditionBadges(c) {
      const badges = [];

      (Array.isArray(c?.conditions) ? c.conditions : []).forEach((cond) => {
        const name = String(cond?.name || "").trim();
        if (!name) return;
        const duration = Math.max(0, intOr(cond?.duration, 0));
        badges.push(duration > 0 ? `${name} · ${duration}r` : name);
      });

      const exhaustion = Math.max(0, intOr(c?.exhaustionLevel, 0));
      if (exhaustion > 0) badges.push(`Exhaustion ${exhaustion}`);

      return badges;
    }

    function renderConditionInline(c) {
      const badges = getConditionBadges(c);
      if (!badges.length) return "";

      return `
        <span class="enc-cond-inline" style="display:inline-flex;flex-wrap:wrap;gap:6px;margin-left:8px;vertical-align:middle;">
          ${badges
            .map(
              (text) =>
                `<span class="enc-cond-chip" style="display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;border:1px solid var(--vt-line, rgba(255,255,255,.25));font-size:12px;line-height:1.6;">${esc(text)}</span>`
            )
            .join("")}
        </span>
      `;
    }

    // Legacy output location (right-side meta) intentionally blank now.
    function renderConditionPopover(c) {
      return "";
    }

    function renderMonsterDetailsPanel(c) {
      if (!hasMonsterDetails(c) || !c.showMonsterDetails) return "";
      const groups = [
        { title: "Traits", entries: c.traits || [] },
        { title: "Actions", entries: c.actions || [] },
        { title: "Bonus Actions", entries: c.bonusActions || [] },
        { title: "Reactions", entries: c.reactions || [] },
        { title: "Legendary", entries: c.legendaryActions || [] }
      ].filter((g) => Array.isArray(g.entries) && g.entries.length);

      if (!groups.length) return "";
      return `
        <div class="monster-details">
          ${groups
            .map(
              (group) => `
                <div class="monster-detail-group">
                  <div class="monster-detail-title">${esc(group.title)}</div>
                  ${group.entries
                    .map(
                      (entry) => `
                        <div class="monster-detail-entry">
                          <span class="monster-detail-name">${esc(toPlainText(entry?.name) || "Feature")}</span>
                          <span class="monster-detail-text">${esc(toPlainText(entry?.text ?? entry?.description ?? entry))}</span>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
            )
            .join("")}
        </div>
      `;
    }

    function renderConditionEditorModal() {
      if (!conditionEditor.open) return "";
      const combatant = getConditionTargetCombatant();
      if (!combatant) {
        conditionEditor.open = false;
        conditionEditor.cardId = null;
        return "";
      }

      const conditionButtons = CONDITIONS_2024.filter((name) => name !== "Exhaustion")
        .map((name) => {
          const active = combatant.conditions.some((c) => c.name === name);
          return `<button type="button" class="condition-toggle ${active ? "active" : ""}" data-cond-toggle="${esc(name)}" title="${esc(CONDITION_INFO_2024[name] || "")}">${esc(name)}</button>`;
        })
        .join("");

      const activeRows = combatant.conditions.length
        ? combatant.conditions
            .map(
              (cond) => `
                <div class="condition-active-row">
                  <span class="condition-active-name">${esc(cond.name)}</span>
                  <label>Rounds</label>
                  <input type="number" min="1" data-cond-duration="${esc(cond.name)}" value="${cond.duration || ""}" placeholder="∞">
                  <button class="btn btn-secondary btn-xs" type="button" data-cond-remove="${esc(cond.name)}">Remove</button>
                </div>
              `
            )
            .join("")
        : `<div class="hint-text">No non-exhaustion conditions on this combatant.</div>`;

      return `
        <div class="condition-editor-backdrop" id="conditionEditorBackdrop">
          <div class="condition-editor-modal" role="dialog" aria-modal="true" aria-label="Condition editor">
            <div class="condition-editor-head">
              <div class="portrait-editor-title">Conditions — ${esc(combatant.name)}</div>
              <div class="hint-text">Active encounter only • 2024 condition list</div>
            </div>

            <div class="condition-picker-grid">
              ${conditionButtons}
            </div>

            <div class="condition-editor-block">
              <div class="boxed-subsection-title">Applied conditions</div>
              ${activeRows}
            </div>

            <div class="condition-editor-block">
              <div class="boxed-subsection-title">Exhaustion level</div>
              <div class="row">
                <div class="col" style="max-width:90px;">
                  <input type="number" min="0" max="6" id="condExhaustionInput" value="${clamp(intOr(combatant.exhaustionLevel, 0), 0, 6)}">
                </div>
                <div class="col">
                  <div class="hint-text">${esc(exhaustionEffects(combatant.exhaustionLevel))}</div>
                </div>
              </div>
            </div>

            <div class="portrait-editor-actions">
              <button type="button" class="btn btn-secondary btn-xs" id="condClearAllBtn">Clear all</button>
              <button type="button" class="btn btn-secondary btn-xs" id="condCloseBtn">Close</button>
            </div>
          </div>
        </div>
      `;
    }

    function renderMonsterVaultPickerModal() {
      if (!monsterPicker.open) return "";

      const allMonsters = monsterVaultMonsters();
      const query = String(monsterPicker.query || "").trim().toLowerCase();
      const crFilter = String(monsterPicker.cr || "all");
      const sourceFilter = String(monsterPicker.source || "all");
      const crValues = monsterVaultIndexCache.crValues.length
        ? monsterVaultIndexCache.crValues
        : [...new Set(allMonsters.map((m) => m.cr).filter(Boolean))].sort((a, b) => crToFloat(a) - crToFloat(b));

      const filtered = allMonsters.filter((m) => {
        if (crFilter !== "all" && m.cr !== crFilter) return false;
        if (sourceFilter !== "all" && m.sourceType !== sourceFilter) return false;
        if (!query) return true;
        const hay = `${m.name} ${m.cr} ${m.sizeType} ${m.source}`.toLowerCase();
        return hay.includes(query);
      });

      const targetLabel =
        monsterPicker.scope === "library"
          ? (() => {
              const enc = state.library.find((e) => e.id === monsterPicker.encounterId);
              return enc ? `${enc.name} · ${enc.combatants.length} saved` : "Encounter Library";
            })()
          : `${state.activeEncounterName || "Active Encounter"} · ${state.activeCombatants.length} active`;

      return `
        <div class="monster-picker-backdrop" id="monsterPickerBackdrop">
          <div class="monster-picker-modal" role="dialog" aria-modal="true" aria-label="Add from Monster Vault">
            <div class="monster-picker-head">
              <div class="portrait-editor-title">Add from Monster Vault</div>
              <div class="hint-text">${esc(targetLabel)}</div>
            </div>

            <div class="monster-picker-filters">
              <div class="col">
                <label for="monsterPickerSearch">Search</label>
                <input id="monsterPickerSearch" type="text" placeholder="Goblin, Dragon, CR 5..." value="${esc(monsterPicker.query)}">
              </div>
              <div class="col" style="max-width:120px;">
                <label for="monsterPickerCr">CR</label>
                <select id="monsterPickerCr">
                  <option value="all" ${crFilter === "all" ? "selected" : ""}>All</option>
                  ${crValues.map((cr) => `<option value="${esc(cr)}" ${crFilter === cr ? "selected" : ""}>${esc(cr)}</option>`).join("")}
                </select>
              </div>
              <div class="col" style="max-width:140px;">
                <label for="monsterPickerSource">Source</label>
                <select id="monsterPickerSource">
                  <option value="all" ${sourceFilter === "all" ? "selected" : ""}>All</option>
                  <option value="srd" ${sourceFilter === "srd" ? "selected" : ""}>SRD 2024</option>
                  <option value="homebrew" ${sourceFilter === "homebrew" ? "selected" : ""}>Homebrew</option>
                </select>
              </div>
            </div>

            <div class="monster-picker-count">${filtered.length} result${filtered.length === 1 ? "" : "s"}${filtered.length > 300 ? " (showing first 300)" : ""}</div>

            <div class="monster-picker-list">
              ${
                filtered.length
                  ? filtered
                      .slice(0, 300)
                      .map(
                        (m) => `
                          <div class="monster-picker-row">
                            <div class="monster-picker-main">
                              <div class="monster-picker-name">${esc(m.name)}</div>
                              <div class="monster-picker-meta">CR ${esc(m.cr)} · AC ${m.ac} · HP ${m.hp} · Spd ${m.speed} · Init ${m.initiative} · ${esc(m.source)}${m.actionsCount ? ` · Details ${m.actionsCount}` : ""}</div>
                            </div>
                            <button class="btn btn-xs" data-picker-add-monster="${esc(m.id)}">Add</button>
                          </div>
                        `
                      )
                      .join("")
                  : `<div class="hint-text" style="padding:8px;">${hasMonsterVaultApi() ? "No monsters match your filters." : "Monster Vault data unavailable (hard refresh if needed)."}</div>`
              }
            </div>

            <div class="portrait-editor-actions" style="justify-content:flex-end;">
              <button type="button" class="btn btn-secondary btn-xs" id="monsterPickerCloseBtn">Done</button>
            </div>
          </div>
        </div>
      `;
    }

    function renderPartyManager(party) {
      if (!party || !state.partyManagerOpen) return "";

      const rows = party.members
        .map((m) => {
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
              <div class="col" style="max-width:74px;"><label>Lvl</label><input type="number" min="1" max="20" data-party-field="level" data-member-id="${esc(m.id)}" value="${normalizeLevel(m.level, 3)}"></div>
              <div class="col" style="max-width:82px;"><label>CR</label><input type="text" data-party-field="cr" data-member-id="${esc(m.id)}" value="${esc(normalizeCR(m.cr, "1"))}"></div>
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
            <span class="hint-text">Portraits + level/CR persist for future encounter prep.</span>
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
            <div class="col" style="max-width:78px;">
              <label>Lvl</label>
              <input type="number" min="1" max="20" id="addLevel" value="${normalizeLevel(state.addDraft.level, 3)}">
            </div>
            <div class="col" style="max-width:90px;">
              <label>CR</label>
              <input type="text" id="addCR" value="${esc(normalizeCR(state.addDraft.cr, "1"))}" placeholder="1/2">
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
          const auxLabel = c.type === "Enemy" ? "CR" : "Lvl";
          const auxValue = c.type === "Enemy" ? normalizeCR(c.cr, "1") : normalizeLevel(c.level, 3);
          const auxField = c.type === "Enemy" ? "cr" : "level";
          const auxType = c.type === "Enemy" ? "text" : "number";
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
                    <div class="card-submeta">${esc(c.sizeType || "—")} · ${esc(c.source || (c.type === "Enemy" ? "Monster Vault" : c.type))}${hasMonsterDetails(c) ? ` · Details ${(c.actions?.length || 0) + (c.bonusActions?.length || 0) + (c.reactions?.length || 0) + (c.legendaryActions?.length || 0)}` : ""}</div>
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
                      <button class="btn btn-secondary btn-xs" data-open-conds="${esc(c.id)}">Conditions</button>${renderConditionInline(c)}
                      ${hasMonsterDetails(c) ? `<button class="btn btn-secondary btn-xs" data-toggle-monster-details="${esc(c.id)}" data-toggle-scope="active">${c.showMonsterDetails ? "Hide" : "Info"}</button>` : ""}
                    </div>
                  </div>

                  ${renderMonsterDetailsPanel(c)}

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
                        <div class="meta-read-line">
                          <span class="meta-k">${auxLabel}</span>
                          <span class="inline-edit inline-edit-meta" data-inline-edit data-scope="active" data-card-id="${esc(c.id)}" data-field="${auxField}" data-type="${auxType}">
                            <span class="inline-view meta-v" title="Click to edit">${esc(String(auxValue))}</span>
                            <input class="inline-input inline-input-meta" ${auxType === "number" ? 'type="number" min="1" max="20"' : 'type="text"'} value="${esc(String(auxValue))}" aria-label="Edit ${auxLabel}">
                          </span>
                        </div>
                      </div>
                      ${renderConditionPopover(c)}
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
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="hint-text">Preload monsters or drop in ad-hoc PCs/NPCs.</span>
              <button class="btn btn-secondary btn-xs" id="openVaultActiveBtn" ${hasMonsterVaultApi() ? "" : 'title="Load Monster Vault tool first"'}>Add from Monster Vault</button>
            </div>
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
      const builderDifficulty = getEncounterDifficulty(enc.combatants);

      const editorCards = isEditing
        ? enc.combatants
            .map((c) => {
              const downed = c.hpCurrent <= 0;
              const auxLabel = c.type === "Enemy" ? "CR" : "Lvl";
              const auxValue = c.type === "Enemy" ? normalizeCR(c.cr, "1") : normalizeLevel(c.level, 3);
              const auxField = c.type === "Enemy" ? "cr" : "level";
              const auxType = c.type === "Enemy" ? "text" : "number";

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
                        <div class="card-submeta">${esc(c.sizeType || "—")} · ${esc(c.source || (c.type === "Enemy" ? "Monster Vault" : c.type))}${hasMonsterDetails(c) ? ` · Details ${(c.actions?.length || 0) + (c.bonusActions?.length || 0) + (c.reactions?.length || 0) + (c.legendaryActions?.length || 0)}` : ""}</div>
                      </div>
                      <div class="hp-block">
                        <span class="hp-label">HP:</span>
                        <input class="tiny-num" type="number" min="0" data-lib-card-field="hpCurrent" data-lib-card-id="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}" value="${c.hpCurrent}">
                        <span>/</span>
                        <input class="tiny-num" type="number" min="0" data-lib-card-field="hpMax" data-lib-card-id="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}" value="${c.hpMax}">
                                            <div class="hp-buttons">
                        ${hasMonsterDetails(c) ? `<button class="btn btn-secondary btn-xs" data-toggle-monster-details="${esc(c.id)}" data-toggle-scope="library" data-lib-enc-id="${esc(enc.id)}">${c.showMonsterDetails ? "Hide" : "Info"}</button>` : ""}
                      </div>
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
                            <div class="meta-read-line">
                              <span class="meta-k">${auxLabel}</span>
                              <span class="inline-edit inline-edit-meta" data-inline-edit data-scope="library" data-lib-enc-id="${esc(enc.id)}" data-card-id="${esc(c.id)}" data-field="${auxField}" data-type="${auxType}">
                                <span class="inline-view meta-v" title="Click to edit">${esc(String(auxValue))}</span>
                                <input class="inline-input inline-input-meta" ${auxType === "number" ? 'type="number" min="1" max="20"' : 'type="text"'} value="${esc(String(auxValue))}" aria-label="Edit ${auxLabel}">
                              </span>
                            </div>
                          </div>
                          ${renderConditionPopover(c)}
                          <button class="btn-icon" title="Remove" data-lib-remove-card="${esc(c.id)}" data-lib-enc-id="${esc(enc.id)}">×</button>
                        </div>
                      </div>

                      ${renderMonsterDetailsPanel(c)}
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

            <div class="boxed-subsection" style="margin-top:6px;">
              <div class="boxed-subsection-header">
                <div class="boxed-subsection-title">Encounter Calculator (2024)</div>
                <span class="hint-text">Prep balance here before activating this encounter.</span>
              </div>
              <div class="difficulty-summary">
                <div class="difficulty-line">
                  <span><b>Party:</b> ${builderDifficulty.partyCount} combatant${builderDifficulty.partyCount === 1 ? "" : "s"}</span>
                  <span><b>Enemies:</b> ${builderDifficulty.enemyCount}</span>
                  <span><b>Enemy XP:</b> ${builderDifficulty.enemyXP.toLocaleString()}</span>
                  <span class="difficulty-pill ${builderDifficulty.tierClass}">${builderDifficulty.tier}</span>
                </div>
                <div class="difficulty-track">
                  <div class="difficulty-threshold low" style="left:${builderDifficulty.lowPct}%"></div>
                  <div class="difficulty-threshold moderate" style="left:${builderDifficulty.moderatePct}%"></div>
                  <div class="difficulty-fill ${builderDifficulty.tierClass}" style="width:${Math.min(100, builderDifficulty.pctOfHigh)}%"></div>
                </div>
                <div class="difficulty-legend">
                  <span>Low ${builderDifficulty.budget.low.toLocaleString()}</span>
                  <span>Moderate ${builderDifficulty.budget.moderate.toLocaleString()}</span>
                  <span>High ${builderDifficulty.budget.high.toLocaleString()}</span>
                  <span>${builderDifficulty.pctOfHigh}% of High</span>
                </div>
              </div>
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
                <div style="display:flex; gap:6px; align-items:center;">
                  <span class="hint-text">Auto-sorts by initiative. Use Lvl for PCs/NPCs, CR for enemies.</span>
                  <button class="btn btn-secondary btn-xs" data-lib-open-vault="${esc(enc.id)}" ${hasMonsterVaultApi() ? "" : 'title="Load Monster Vault tool first"'}>Add from Monster Vault</button>
                </div>
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
                <div class="col" style="max-width:74px;"><label>Lvl</label><input type="number" min="1" max="20" id="libAddLevel_${esc(enc.id)}" value="${normalizeLevel(state.libraryAddDraft.level, 3)}"></div>
                <div class="col" style="max-width:80px;"><label>CR</label><input type="text" id="libAddCR_${esc(enc.id)}" value="${esc(normalizeCR(state.libraryAddDraft.cr, "1"))}" placeholder="1/4"></div>
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
        <div class="boxed-subsection-title">Quick create encounter</div>
        <span class="hint-text">Create a shell entry now, then edit combatants below.</span>
      </div>
      <div class="row">
        <div class="col"><label>Name</label><input type="text" id="createName" placeholder="Ruined Tower Ambush" value="${esc(state.createName)}"></div>
        <div class="col"><label>Location</label><input type="text" id="createLocation" placeholder="Onyx frontier road" value="${esc(state.createLocation)}"></div>
        <div class="col" style="max-width:180px; display:flex; gap:6px; align-items:flex-end;">
          <button class="btn btn-xs" id="quickCreateEncounterBtn">Create</button>
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
          grid-template-columns: minmax(220px,1.55fr) minmax(290px,1.1fr) minmax(136px,0.9fr);
          grid-template-areas: "name hp meta";
          align-items: center;
          column-gap: 8px;
          row-gap: 3px;
        }

        .name-block {
          min-width: 0;
          grid-area: name;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          gap: 2px;
        }
        .name-row {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          min-width: 0;
          width: 100%;
        }

        .card-name {
          min-width: 0;
          font-weight: 680;
          font-size: 0.98rem;
          letter-spacing: 0.01em;
          color: #eef3ff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: inline-block;
          max-width: 100%;
          text-align: left;
        }

        .card-submeta {
          font-size: 0.68rem;
          color: #9aa9c3;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
          grid-area: hp;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          justify-self: start;
          min-width: 0;
          flex-wrap: wrap;
          margin: 0;
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
          grid-area: meta;
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

        .condition-pop-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .condition-pop-trigger {
          font-size: 0.64rem;
          line-height: 1;
          padding: 4px 6px;
          border-radius: 999px;
          border: 1px solid #3a4760;
          color: #dce6f7;
          background: #0b1018;
          text-transform: uppercase;
          letter-spacing: .04em;
          cursor: default;
          white-space: nowrap;
        }

        .condition-pop-panel {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          z-index: 12;
          min-width: 170px;
          max-width: 260px;
          border-radius: 10px;
          border: 1px solid #354055;
          background: #070c15;
          box-shadow: 0 10px 24px rgba(0,0,0,0.4);
          padding: 7px;
          display: none;
          flex-wrap: wrap;
          gap: 5px;
        }

        .condition-pop-wrap:hover .condition-pop-panel,
        .condition-pop-wrap:focus-within .condition-pop-panel {
          display: flex;
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
          min-width: 68px;
        }

        .meta-read-line {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-width: 68px;
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

        .monster-details {
          grid-column: 1 / -1;
          margin-top: 6px;
          border-top: 1px solid #27303d;
          padding-top: 7px;
          display: grid;
          gap: 6px;
        }

        .monster-detail-group {
          border: 1px solid #2a3648;
          background: #080f17;
          border-radius: 8px;
          padding: 6px 8px;
        }

        .monster-detail-title {
          font-size: 0.68rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #84b4f1;
          margin-bottom: 4px;
          font-weight: 700;
        }

        .monster-detail-entry {
          font-size: 0.72rem;
          color: #d8dee8;
          line-height: 1.35;
          margin-bottom: 4px;
        }

        .monster-detail-entry:last-child {
          margin-bottom: 0;
        }

        .monster-detail-name {
          font-weight: 700;
          margin-right: 4px;
          color: #f1f4f8;
        }

        .monster-detail-text {
          color: #c7d0de;
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

        .monster-picker-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.72);
          display: grid;
          place-items: center;
          z-index: 1700;
          padding: 14px;
        }

        .monster-picker-modal {
          width: min(920px, calc(100vw - 20px));
          max-height: min(780px, calc(100vh - 20px));
          overflow: hidden;
          display: grid;
          grid-template-rows: auto auto auto minmax(160px, 1fr) auto;
          gap: 8px;
          background: #0a0f15;
          border: 1px solid #2b3644;
          border-radius: 14px;
          box-shadow: 0 20px 46px rgba(0,0,0,0.5);
          padding: 10px;
        }

        .monster-picker-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 2px;
        }

        .monster-picker-filters {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: end;
        }

        .monster-picker-count {
          font-size: 0.72rem;
          color: #9aa6b5;
        }

        .monster-picker-list {
          border: 1px solid #263141;
          border-radius: 10px;
          background: #070b10;
          overflow: auto;
          padding: 6px;
          display: grid;
          gap: 6px;
        }

        .monster-picker-row {
          border: 1px solid #263344;
          background: #0c1219;
          border-radius: 8px;
          padding: 7px 8px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
        }

        .monster-picker-main {
          min-width: 0;
        }

        .monster-picker-name {
          font-size: 0.86rem;
          font-weight: 700;
          color: #e9edf4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .monster-picker-meta {
          font-size: 0.68rem;
          color: #9fb0c4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .condition-row {
          display: none;
        }

        .condition-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          border: 1px solid #2f3845;
          background: #0a1018;
          color: #d6e2f8;
          font-size: 0.68rem;
          line-height: 1;
          padding: 3px 7px;
          white-space: nowrap;
        }

        .condition-chip.exhaustion {
          border-color: #7d5e2f;
          background: #1a1408;
          color: #ffdca3;
        }

        .condition-editor-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: rgba(2, 4, 8, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          backdrop-filter: blur(3px);
        }

        .condition-editor-modal {
          width: min(94vw, 560px);
          max-height: 90vh;
          overflow: auto;
          border-radius: 12px;
          border: 1px solid #2b3444;
          background: linear-gradient(150deg, #0d131d, #06090f 70%);
          box-shadow: 0 12px 38px rgba(0, 0, 0, 0.55);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .condition-editor-head {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .condition-picker-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
          gap: 6px;
        }

        .condition-toggle {
          border: 1px solid #303845;
          background: #0a1018;
          color: #d6dfef;
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 0.75rem;
          text-align: center;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .condition-toggle:hover {
          border-color: #4b5b74;
          background: #101725;
        }

        .condition-toggle.active {
          border-color: #5e7cac;
          background: #18253b;
          color: #edf4ff;
          box-shadow: 0 0 0 1px rgba(94,124,172,0.33);
        }

        .condition-editor-block {
          border: 1px solid #222a36;
          border-radius: 10px;
          background: #05080f;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .condition-active-row {
          display: grid;
          grid-template-columns: minmax(80px, 1fr) auto minmax(72px, 90px) auto;
          gap: 6px;
          align-items: center;
        }

        .condition-active-name {
          font-size: 0.78rem;
          color: #ebf2ff;
          font-weight: 500;
        }

        .condition-active-row label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .difficulty-summary {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .difficulty-line {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          font-size: 0.78rem;
          color: #d8e1f1;
        }

        .difficulty-pill {
          margin-left: auto;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid #374153;
          background: #0a1018;
          font-size: 0.72rem;
          font-weight: 650;
          letter-spacing: 0.01em;
        }

        .tier-none { border-color: #4d5562; color: #d0d7e2; }
        .tier-low { border-color: #2f6b56; color: #b7ffe2; background: #082117; }
        .tier-moderate { border-color: #5d6f33; color: #e4f2b8; background: #1a220b; }
        .tier-high { border-color: #8b6d2d; color: #ffe5aa; background: #261b08; }
        .tier-above { border-color: #8b4f2d; color: #ffd1ad; background: #2a1308; }
        .tier-extreme { border-color: #8f2e2e; color: #ffc7c7; background: #2b0b0b; }

        .difficulty-track {
          position: relative;
          height: 10px;
          border-radius: 999px;
          border: 1px solid #2a3342;
          background: #09101a;
          overflow: hidden;
        }

        .difficulty-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 0;
          background: linear-gradient(90deg, #3b8f7a, #8f8d3b);
        }

        .difficulty-fill.tier-high,
        .difficulty-fill.tier-above {
          background: linear-gradient(90deg, #8f7c3b, #8f503b);
        }

        .difficulty-fill.tier-extreme {
          background: linear-gradient(90deg, #8f4f3b, #8f2f3b);
        }

        .difficulty-threshold {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: rgba(220, 232, 255, 0.75);
          transform: translateX(-1px);
          z-index: 2;
        }

        .difficulty-threshold.low { background: rgba(164, 236, 199, 0.9); }
        .difficulty-threshold.moderate { background: rgba(252, 238, 159, 0.9); }

        .difficulty-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        @media (max-width: 860px) {
          .card-content {
            grid-template-columns: 1fr;
            grid-template-areas:
              "name"
              "hp"
              "meta";
            row-gap: 6px;
          }
          .name-block {
            justify-content: flex-start;
            align-items: flex-start;
          }
          .name-row { justify-content: flex-start; }
          .card-meta { justify-self: flex-start; align-items: flex-start; }
          .hp-block { justify-self: flex-start; }
          .monster-picker-filters { grid-template-columns: 1fr; }
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
      ${renderConditionEditorModal()}
      ${renderMonsterVaultPickerModal()}
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
          if (field === "name") {
            nextValue = String(input.value || "").trim() || "Unnamed";
          } else if (field === "cr") {
            nextValue = normalizeCR(input.value, target.cr || "1");
          } else if (field === "level") {
            nextValue = normalizeLevel(input.value, target.level || 3);
          } else if (type === "text") {
            nextValue = String(input.value || "").trim();
          } else {
            nextValue = Math.max(0, intOr(input.value, target[field]));
          }

          target[field] = nextValue;
          if (field === "hpMax") target.hpCurrent = clamp(target.hpCurrent, 0, target.hpMax);
          if (field === "hpCurrent") target.hpCurrent = clamp(target.hpCurrent, 0, target.hpMax);
          if (field === "type") {
            if (target.type === "Enemy") target.cr = normalizeCR(target.cr, "1");
            else target.level = normalizeLevel(target.level, 3);
          }
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
          state.activeCombatants.forEach((c) => {
            c.conditions = (c.conditions || [])
              .map((cond) => {
                if (!cond.duration || cond.duration <= 0) return { ...cond, duration: cond.duration || null };
                const next = cond.duration - 1;
                return next > 0 ? { ...cond, duration: next } : null;
              })
              .filter(Boolean);
          });
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

      const openVaultActiveBtn = shadow.getElementById("openVaultActiveBtn");
      if (openVaultActiveBtn) {
        openVaultActiveBtn.addEventListener("click", () => {
          if (!hasMonsterVaultApi()) {
            window.alert("Open the Monster Vault tool first, then try again.");
            return;
          }
          openMonsterPicker("active");
        });
      }

      // add combatant draft sync
      const addInputs = [
        ["addName", "name", (v) => v],
        ["addInit", "initiative", (v) => Math.max(0, intOr(v, 10))],
        ["addAC", "ac", (v) => Math.max(0, intOr(v, 15))],
        ["addSpeed", "speed", (v) => Math.max(0, intOr(v, 30))],
        ["addLevel", "level", (v) => normalizeLevel(v, state.addDraft.level || 3)],
        ["addCR", "cr", (v) => normalizeCR(v, state.addDraft.cr || "1")],
        ["addHpCur", "hpCurrent", (v) => Math.max(0, intOr(v, state.addDraft.hpCurrent))],
        ["addHpMax", "hpMax", (v) => Math.max(0, intOr(v, state.addDraft.hpMax))]
      ];
      addInputs.forEach(([id, key, transform]) => {
        const el = shadow.getElementById(id);
        if (!el) return;
        el.addEventListener("input", () => {
          const next = transform ? transform(el.value) : el.value;
          if (key === "name") state.addDraft.name = String(next);
          else if (key === "cr") state.addDraft.cr = normalizeCR(next, state.addDraft.cr || "1");
          else if (key === "level") state.addDraft.level = normalizeLevel(next, state.addDraft.level || 3);
          else state.addDraft[key] = next;
          saveState(state);
        });
      });

      const addTypeEl = shadow.getElementById("addType");
      if (addTypeEl) {
        addTypeEl.addEventListener("change", () => {
          state.addDraft.type = addTypeEl.value;
          if (state.addDraft.type === "Enemy") state.addDraft.cr = normalizeCR(state.addDraft.cr, "1");
          else state.addDraft.level = normalizeLevel(state.addDraft.level, 3);
          saveState(state);
        });
      }

      const addCombatantBtn = shadow.getElementById("addCombatantBtn");
      if (addCombatantBtn) {
        addCombatantBtn.addEventListener("click", () => {
          const nameEl = shadow.getElementById("addName");
          const initEl = shadow.getElementById("addInit");
          const acEl = shadow.getElementById("addAC");
          const speedEl = shadow.getElementById("addSpeed");
          const levelEl = shadow.getElementById("addLevel");
          const crEl = shadow.getElementById("addCR");
          const hpCurEl = shadow.getElementById("addHpCur");
          const hpMaxEl = shadow.getElementById("addHpMax");
          const typeEl = shadow.getElementById("addType");

          state.addDraft.name = String(nameEl?.value ?? state.addDraft.name);
          state.addDraft.initiative = Math.max(0, intOr(initEl?.value, state.addDraft.initiative));
          state.addDraft.ac = Math.max(0, intOr(acEl?.value, state.addDraft.ac));
          state.addDraft.speed = Math.max(0, intOr(speedEl?.value, state.addDraft.speed));
          state.addDraft.level = normalizeLevel(levelEl?.value, state.addDraft.level || 3);
          state.addDraft.cr = normalizeCR(crEl?.value, state.addDraft.cr || "1");
          state.addDraft.hpCurrent = Math.max(0, intOr(hpCurEl?.value, state.addDraft.hpCurrent));
          state.addDraft.hpMax = Math.max(0, intOr(hpMaxEl?.value, state.addDraft.hpMax));
          state.addDraft.type = typeEl?.value || state.addDraft.type || "NPC";

          const hpMax = Math.max(0, state.addDraft.hpMax);
          const hpCur = clamp(Math.max(0, state.addDraft.hpCurrent), 0, hpMax);

          const c = mkCombatant({
            name: state.addDraft.name || "New Combatant",
            type: state.addDraft.type || "NPC",
            initiative: state.addDraft.initiative,
            ac: state.addDraft.ac,
            speed: state.addDraft.speed,
            level: state.addDraft.level,
            cr: state.addDraft.cr,
            hpCurrent: hpCur,
            hpMax
          });

          state.activeCombatants.push(c);
          sortByInitiativeDesc(state.activeCombatants);
          if (state.turnIndex >= state.activeCombatants.length) state.turnIndex = Math.max(0, state.activeCombatants.length - 1);
          persistAndRender();
        });
      }
      const addNameEl = shadow.getElementById("addName");
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
            m[field] = String(el.value);
          } else if (field === "cr") {
            m.cr = normalizeCR(el.value, m.cr || "1");
          } else if (field === "level") {
            m.level = normalizeLevel(el.value, m.level || 3);
          } else {
            m[field] = Math.max(0, intOr(el.value, m[field]));
            if (field === "hpMax") m.hpCurrent = clamp(m.hpCurrent, 0, m.hpMax);
            if (field === "hpCurrent") m.hpCurrent = clamp(m.hpCurrent, 0, m.hpMax);
          }

          if (field === "type") {
            if (m.type === "Enemy") {
              m.cr = normalizeCR(m.cr, "1");
            } else {
              m.level = normalizeLevel(m.level, 3);
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

      shadow.querySelectorAll("[data-toggle-monster-details]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const scope = btn.getAttribute("data-toggle-scope") || "active";
          const cardId = btn.getAttribute("data-toggle-monster-details");
          if (!cardId) return;

          if (scope === "library") {
            const encId = btn.getAttribute("data-lib-enc-id");
            const enc = state.library.find((e) => e.id === encId);
            const c = enc?.combatants?.find((x) => x.id === cardId);
            if (!c) return;
            c.showMonsterDetails = !c.showMonsterDetails;
            persistAndRender();
            return;
          }

          const c = state.activeCombatants.find((x) => x.id === cardId);
          if (!c) return;
          c.showMonsterDetails = !c.showMonsterDetails;
          persistAndRender();
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

      shadow.querySelectorAll("[data-open-conds]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-open-conds");
          if (!id) return;
          openConditionEditor(id);
        });
      });

      const conditionBackdrop = shadow.getElementById("conditionEditorBackdrop");
      if (conditionBackdrop) {
        conditionBackdrop.addEventListener("click", (e) => {
          if (e.target === conditionBackdrop) closeConditionEditor();
        });
      }

      const condCloseBtn = shadow.getElementById("condCloseBtn");
      if (condCloseBtn) condCloseBtn.addEventListener("click", closeConditionEditor);

      const condClearAllBtn = shadow.getElementById("condClearAllBtn");
      if (condClearAllBtn) {
        condClearAllBtn.addEventListener("click", () => {
          if (!conditionEditor.cardId) return;
          clearAllConditions(conditionEditor.cardId);
        });
      }

      const condExhaustionInput = shadow.getElementById("condExhaustionInput");
      if (condExhaustionInput) {
        condExhaustionInput.addEventListener("input", () => {
          if (!conditionEditor.cardId) return;
          setExhaustionLevel(conditionEditor.cardId, condExhaustionInput.value);
        });
      }

      shadow.querySelectorAll("[data-cond-toggle]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!conditionEditor.cardId) return;
          toggleCondition(conditionEditor.cardId, btn.getAttribute("data-cond-toggle"));
        });
      });

      shadow.querySelectorAll("[data-cond-duration]").forEach((input) => {
        input.addEventListener("input", () => {
          if (!conditionEditor.cardId) return;
          setConditionDuration(conditionEditor.cardId, input.getAttribute("data-cond-duration"), input.value);
        });
      });

      shadow.querySelectorAll("[data-cond-remove]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!conditionEditor.cardId) return;
          removeCondition(conditionEditor.cardId, btn.getAttribute("data-cond-remove"));
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


  const monsterPickerBackdrop = shadow.getElementById("monsterPickerBackdrop");
  if (monsterPickerBackdrop) {
    monsterPickerBackdrop.addEventListener("click", (e) => {
      if (e.target === monsterPickerBackdrop) closeMonsterPicker();
    });
  }

  const monsterPickerCloseBtn = shadow.getElementById("monsterPickerCloseBtn");
  if (monsterPickerCloseBtn) {
    monsterPickerCloseBtn.addEventListener("click", () => closeMonsterPicker());
  }

  const monsterPickerSearch = shadow.getElementById("monsterPickerSearch");
  if (monsterPickerSearch) {
    monsterPickerSearch.addEventListener("input", () => {
      monsterPicker.query = monsterPickerSearch.value || "";
      render();
    });
  }

  const monsterPickerCr = shadow.getElementById("monsterPickerCr");
  if (monsterPickerCr) {
    monsterPickerCr.addEventListener("change", () => {
      monsterPicker.cr = monsterPickerCr.value || "all";
      render();
    });
  }

  const monsterPickerSource = shadow.getElementById("monsterPickerSource");
  if (monsterPickerSource) {
    monsterPickerSource.addEventListener("change", () => {
      monsterPicker.source = monsterPickerSource.value || "all";
      render();
    });
  }

  shadow.querySelectorAll("[data-picker-add-monster]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-picker-add-monster");
      addMonsterFromVault(id);
    });
  });

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

  const quickCreateEncounterBtn = shadow.getElementById("quickCreateEncounterBtn");
  if (quickCreateEncounterBtn) {
    quickCreateEncounterBtn.addEventListener("click", () => {
      const name = String(state.createName || "Untitled Encounter").trim() || "Untitled Encounter";
      const location = String(state.createLocation || "").trim();
      const encounter = { id: uid("e"), name, location, combatants: [] };
      state.library.push(encounter);
      state.libraryEditId = encounter.id;
      state.tab = "library";
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
      if (monsterPicker.scope === "library" && monsterPicker.encounterId === id) {
        monsterPicker.open = false;
        monsterPicker.encounterId = null;
      }
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

  state.library.forEach((enc) => {
    const libAddInputs = [
      ["libAddName", "name", (v) => v],
      ["libAddInit", "initiative", (v) => Math.max(0, intOr(v, 10))],
      ["libAddAC", "ac", (v) => Math.max(0, intOr(v, 13))],
      ["libAddSpeed", "speed", (v) => Math.max(0, intOr(v, 30))],
      ["libAddLevel", "level", (v) => normalizeLevel(v, state.libraryAddDraft.level || 3)],
      ["libAddCR", "cr", (v) => normalizeCR(v, state.libraryAddDraft.cr || "1")],
      ["libAddHpCur", "hpCurrent", (v) => Math.max(0, intOr(v, state.libraryAddDraft.hpCurrent))],
      ["libAddHpMax", "hpMax", (v) => Math.max(0, intOr(v, state.libraryAddDraft.hpMax))]
    ];

    libAddInputs.forEach(([baseId, key, transform]) => {
      const el = shadow.getElementById(`${baseId}_${enc.id}`);
      if (!el) return;
      el.addEventListener("input", () => {
        const next = transform(el.value);
        if (key === "name" || key === "cr") state.libraryAddDraft[key] = String(next);
        else state.libraryAddDraft[key] = next;
        saveState(state);
      });
    });

    const typeEl = shadow.getElementById(`libAddType_${enc.id}`);
    if (typeEl) {
      typeEl.addEventListener("change", () => {
        state.libraryAddDraft.type = typeEl.value;
        saveState(state);
      });
    }
  });

  shadow.querySelectorAll("[data-lib-open-vault]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const encId = btn.getAttribute("data-lib-open-vault");
      if (!hasMonsterVaultApi()) {
        window.alert("Open the Monster Vault tool first, then try again.");
        return;
      }
      if (!encId || !state.library.some((e) => e.id === encId)) return;
      openMonsterPicker("library", encId);
    });
  });

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
        level: normalizeLevel(getVal("libAddLevel", state.libraryAddDraft.level), state.libraryAddDraft.level || 3),
        cr: normalizeCR(getVal("libAddCR", state.libraryAddDraft.cr), state.libraryAddDraft.cr || "1"),
        hpCurrent: intOr(getVal("libAddHpCur", state.libraryAddDraft.hpCurrent), state.libraryAddDraft.hpCurrent),
        hpMax: intOr(getVal("libAddHpMax", state.libraryAddDraft.hpMax), state.libraryAddDraft.hpMax)
      };

      state.libraryAddDraft = {
        name: draft.name,
        type: ["PC", "NPC", "Enemy"].includes(draft.type) ? draft.type : "Enemy",
        initiative: Math.max(0, intOr(draft.initiative, 10)),
        ac: Math.max(0, intOr(draft.ac, 13)),
        speed: Math.max(0, intOr(draft.speed, 30)),
        level: normalizeLevel(draft.level, 3),
        cr: normalizeCR(draft.cr, "1"),
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
          level: draft.level,
          cr: draft.cr,
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
