// tool-hex-stocker.js
// Hex Stocker v2
// Drop this file in your repo root and load it from main.js.
// Cloud save: make sure "daggerCraftHexStockerStateV1" is listed in DB_BUNDLE_KEYS inside cloud-save.js.

(function () {
  if (!window.registerTool) {
    console.warn("Hex Stocker tool: registerTool not found yet.");
    return;
  }

  if (window.__daggerCraftHexStockerV2Active) return;
  window.__daggerCraftHexStockerV2Active = true;

  const STORAGE_KEY = "daggerCraftHexStockerStateV1";
  const ANY_TERRAIN = "__any__";

  function uid(prefix = "id") {
    return prefix + "_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now().toString(36);
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function randInt(max) {
    return Math.floor(Math.random() * max);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function normalizeTags(value) {
    return String(value || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function dieMax(die) {
    const match = String(die || "").match(/d(\d+)/i);
    return match ? Number(match[1]) : 20;
  }

  const DEFAULT_TERRAIN = [
    "Plains / Grassland",
    "Farmland / Settled Countryside",
    "Light Forest",
    "Deep Forest",
    "Hills",
    "Mountains",
    "Swamp / Wetlands",
    "Riverlands / Lake Country",
    "Coast / Islands / Cliffs",
    "Desert / Badlands / Wasteland",
    "Cold Lands / Tundra / Snowfields",
    "Magical / Cursed / Warped Terrain"
  ];

  const CORE_TABLE_DEFS = [
    { key: "density", label: "Hex Density", die: "d6", core: true },
    { key: "role", label: "Hex Role", die: "d20", core: true },
    { key: "feature_empty", label: "Feature: Empty / Travel Space", die: "d12", core: true },
    { key: "feature_landmark", label: "Feature: Natural Landmark", die: "d12", core: true },
    { key: "feature_resource", label: "Feature: Resource", die: "d12", core: true },
    { key: "feature_hazard", label: "Feature: Hazard", die: "d12", core: true },
    { key: "feature_shelter", label: "Feature: Shelter / Waystation", die: "d12", core: true },
    { key: "feature_settlement", label: "Feature: Settlement", die: "d12", core: true },
    { key: "feature_fort", label: "Feature: Fort / Watchpost", die: "d12", core: true },
    { key: "feature_ruin", label: "Feature: Ruin", die: "d12", core: true },
    { key: "feature_dungeon", label: "Feature: Dungeon Entrance", die: "d12", core: true },
    { key: "feature_lair", label: "Feature: Monster Lair", die: "d12", core: true },
    { key: "feature_faction", label: "Feature: Faction Activity", die: "d12", core: true },
    { key: "feature_sacred", label: "Feature: Sacred / Religious Site", die: "d12", core: true },
    { key: "feature_magical", label: "Feature: Magical Site", die: "d12", core: true },
    { key: "feature_battlefield", label: "Feature: Battlefield / Grave / Memorial", die: "d12", core: true },
    { key: "feature_traveler", label: "Feature: Traveler / Social Encounter", die: "d12", core: true },
    { key: "feature_mystery", label: "Feature: Mystery / Strange Sign", die: "d12", core: true },
    { key: "feature_threat", label: "Feature: Regional Threat", die: "d12", core: true },
    { key: "feature_unique", label: "Feature: Major Unique Feature", die: "d12", core: true },
    { key: "state", label: "Current State", die: "d12", core: true },
    { key: "actor", label: "Actor / Occupant", die: "d12", core: true },
    { key: "activity", label: "Activity", die: "d12", core: true },
    { key: "twist", label: "Twist", die: "d12", core: true },
    { key: "hook", label: "Hook", die: "d10", core: true },
    { key: "connection", label: "Connection", die: "d8", core: true },
    { key: "history", label: "History Layer", die: "d10", core: true },
    { key: "danger", label: "Danger Level", die: "d6", core: true },
    { key: "reward", label: "Reward", die: "d10", core: true }
  ];

  const DEFAULT_TABLES = {
    density: [
      "Quiet — mostly wilderness, signs, mood, or travel space",
      "Light — one minor feature",
      "Standard — one main stocked feature",
      "Standard — one main stocked feature",
      "Dense — main feature plus secondary detail or complication",
      "Loaded — main feature, complication, connection, and active situation"
    ],
    role: [
      "Empty / Travel Space",
      "Empty / Travel Space",
      "Natural Landmark",
      "Resource",
      "Hazard",
      "Shelter / Camp / Waystation",
      "Settlement",
      "Fort / Watchpost / Checkpoint",
      "Ruin",
      "Dungeon Entrance",
      "Monster Lair",
      "Faction Activity",
      "Sacred / Religious Site",
      "Magical Site",
      "Battlefield / Grave / Memorial",
      "Traveler / Social Encounter",
      "Mystery / Strange Sign",
      "Regional Threat",
      "Major Unique Feature",
      "Roll twice and combine"
    ],
    feature_empty: [
      "Open stretch of normal terrain",
      "Animal trails or migration signs",
      "Good campsite with water and shelter",
      "Beautiful view or overlook",
      "Old road, trail marker, or forgotten path",
      "Minor ruin too small to explore deeply",
      "Strange silence or lack of wildlife",
      "Bones, broken gear, or signs of danger",
      "Weather-exposed clearing",
      "Natural choke point or crossing",
      "Evidence of nearby faction movement",
      "Hidden detail connected to another hex"
    ],
    feature_landmark: [
      "Massive ancient tree",
      "Waterfall, spring, or hot spring",
      "Unusual rock formation",
      "Canyon, ravine, sinkhole, or gorge",
      "Cave mouth or cliff hollow",
      "Crystal field or mineral formation",
      "Natural bridge",
      "Huge animal nesting ground",
      "Strange flowers, fungi, or glowing plants",
      "Hill, peak, or island visible for miles",
      "Place where weather behaves strangely",
      "Landmark shaped by ancient magic, gods, giants, or old war"
    ],
    feature_resource: [
      "Iron, copper, silver, gold, or gemstone vein",
      "Rare herbs or alchemical plants",
      "Timber, giant trees, or special wood",
      "Stone quarry or marble outcrop",
      "Fresh water source",
      "Game animals, fishery, or hunting grounds",
      "Salt, sulfur, coal, peat, tar, or oil-like substance",
      "Monster parts used for crafting",
      "Magical crystal, ore, or reagent",
      "Ancient salvage from a ruined civilization",
      "Fertile soil or unusually abundant crops",
      "Resource that is valuable but dangerous to harvest"
    ],
    feature_hazard: [
      "Landslide, avalanche, or collapsing ground",
      "Flooded crossing or flash flood zone",
      "Dense fog or blinding mist",
      "Quicksand, bog, sucking mud, or unstable sand",
      "Predator hunting ground",
      "Extreme wind, storm path, or dangerous weather",
      "Poison plants, spores, insects, or disease",
      "Unstable cliffs, loose stones, or crumbling paths",
      "Magical weather",
      "Terrain loops, confuses, or misleads travelers",
      "Area drains resources: food, water, torches, or mounts",
      "Hazard hides something valuable or important"
    ],
    feature_shelter: [
      "Abandoned campsite",
      "Hunter's shelter",
      "Roadside inn or wayhouse",
      "Caravan camp",
      "Shrine for travelers",
      "Ferry house, dock, or bridge shelter",
      "Cave used as shelter",
      "Ranger post",
      "Hermit hut",
      "Ruined building still usable as shelter",
      "Hidden safehouse",
      "Shelter with a secret, curse, or unusual rule"
    ],
    feature_settlement: [
      "Isolated farmstead",
      "Tiny hamlet",
      "Village",
      "Fishing village",
      "Mining camp",
      "Logging camp",
      "Hunting lodge or trapper settlement",
      "Religious commune",
      "Noble estate or manor village",
      "Market town",
      "Hidden settlement",
      "Strange settlement shaped by magic, monsters, ancient law, or unusual tradition"
    ],
    feature_fort: [
      "Border watchtower",
      "Patrol camp",
      "Fortified bridge",
      "Old battlefield fort",
      "Road checkpoint",
      "Toll station",
      "Military supply depot",
      "Monster-hunting lodge",
      "Abandoned fortress",
      "Secret faction base",
      "Prison camp or holding post",
      "Ancient defensive site, magical ward, or war machine"
    ],
    feature_ruin: [
      "Collapsed watchtower",
      "Abandoned shrine",
      "Forgotten tomb",
      "Broken bridge, aqueduct, or roadwork",
      "Ruined village",
      "Wizard laboratory",
      "Abandoned mine",
      "Broken fortress",
      "Sunken or buried structure",
      "Giant-made, dragon-made, or pre-human structure",
      "Lost city fragment",
      "Ancient magical, divine, or planar ruin"
    ],
    feature_dungeon: [
      "Cave system",
      "Tomb entrance",
      "Mine shaft",
      "Ruined cellar or buried basement",
      "Temple stairs descending underground",
      "Sinkhole exposing old halls",
      "Monster-dug tunnel",
      "Smuggler passage",
      "Sewer, drainage tunnel, or old waterway",
      "Door sealed by magic, puzzle, or ancient mechanism",
      "Entrance only visible at certain times",
      "Entrance to something much larger than expected"
    ],
    feature_lair: [
      "Natural predator den",
      "Giant animal nest",
      "Bandit or raider hideout",
      "Goblinoid, kobold, or small monstrous tribe",
      "Undead nest",
      "Fey-touched grove or den",
      "Elemental intrusion",
      "Monstrosity hunting ground",
      "Dragon sign, lesser dragon, or draconic servant",
      "Cursed humanoid group",
      "Intelligent monster society",
      "Apex creature or regional signature monster"
    ],
    feature_faction: [
      "Scouts watching the road",
      "Smugglers moving goods",
      "Cult ritual site",
      "Noble agents collecting taxes, secrets, or favors",
      "Merchant guild operation",
      "Military patrol",
      "Religious mission",
      "Criminal hideout",
      "Magical researchers",
      "Excavation or treasure hunt",
      "Two factions in conflict",
      "Secret meeting involving powerful people"
    ],
    feature_sacred: [
      "Roadside shrine",
      "Pilgrim camp",
      "Small temple",
      "Holy spring",
      "Sacred grove",
      "Burial mound",
      "Saint's tomb or hero's grave",
      "Abandoned temple",
      "Desecrated holy site",
      "Place of sacrifice, oath, or judgment",
      "Site where a divine servant appeared",
      "Site where a god, fiend, celestial, or primordial once acted"
    ],
    feature_magical: [
      "Wild magic pocket",
      "Leyline crossing or magical current",
      "Gravity behaves strangely",
      "Time feels wrong",
      "Dreams become vivid, shared, or prophetic",
      "Dead magic zone",
      "Plants or animals grow unnaturally fast",
      "Spirits repeat old memories",
      "Crystals, runes, sigils, or glyphs appear naturally",
      "Magic is stronger but dangerous",
      "Ancient device still functioning",
      "Hidden piece of a larger magical network"
    ],
    feature_battlefield: [
      "Old battlefield",
      "Mass grave",
      "Soldier memorial",
      "Broken siege weapons",
      "Cursed war dead",
      "Lost banner, weapon, armor, or standard",
      "Ghostly reenactment",
      "Battlefield from an ancient war",
      "Execution ground",
      "Unmarked graves of unknown people",
      "Memorial maintained by locals",
      "Grave site hiding a secret, relic, or betrayal"
    ],
    feature_traveler: [
      "Merchant caravan",
      "Pilgrims",
      "Refugees",
      "Hunters or trappers",
      "Traveling priest",
      "Noble retinue",
      "Injured messenger",
      "Adventuring party",
      "Suspicious strangers",
      "Escaped prisoner",
      "Entertainers, storytellers, or performers",
      "Someone fleeing the next hex over"
    ],
    feature_mystery: [
      "Strange tracks",
      "Dead animals with no visible wounds",
      "Burned campsite",
      "Repeating symbol carved into trees, stone, or bone",
      "Blood trail",
      "Half-buried relic",
      "Whispering voices at night",
      "Belongings abandoned in a hurry",
      "Local landmark moved or changed",
      "Impossible weather or unnatural silence",
      "Someone has been here before the party",
      "Clue pointing to a major faction, villain, dungeon, or secret"
    ],
    feature_threat: [
      "Monster attacks spreading",
      "Banditry increasing",
      "Disease, curse, or magical sickness",
      "Crop failure, famine, or poisoned water",
      "Cult influence",
      "Undead rising",
      "Faction occupation",
      "Magical corruption",
      "Refugee movement",
      "Sign of a much larger coming disaster",
      "War, rebellion, or border violence",
      "Ancient danger awakening"
    ],
    feature_unique: [
      "Capital city or major town",
      "Famous fortress",
      "Legendary dungeon",
      "Ancient wonder",
      "Massive temple complex",
      "Great magical anomaly",
      "Dragon lair or mythic monster territory",
      "Lost civilization site",
      "Major trade hub",
      "Active warfront",
      "Region-defining natural wonder",
      "Something tied directly to the campaign's main mystery"
    ],
    state: [
      "Abandoned long ago",
      "Abandoned recently",
      "Occupied by something new",
      "Being repaired or rebuilt",
      "Being looted or harvested",
      "Being watched",
      "Hidden, sealed, or hard to access",
      "Damaged by weather",
      "Damaged by war or violence",
      "Corrupted by magic, curse, disease, or planar influence",
      "Actively changing",
      "Not what it appears to be"
    ],
    actor: [
      "No one, only traces",
      "Local commoners",
      "Travelers, merchants, or pilgrims",
      "Bandits, smugglers, or criminals",
      "Soldiers, scouts, guards, or mercenaries",
      "Priests, cultists, druids, or zealots",
      "Scholars, mages, sages, or magical researchers",
      "Monsters or beasts",
      "Undead or spirits",
      "Fey, elementals, fiends, celestials, or planar beings",
      "Regional faction",
      "Major villain's agents"
    ],
    activity: [
      "Hiding",
      "Searching",
      "Guarding",
      "Fleeing",
      "Hunting",
      "Building, repairing, or fortifying",
      "Digging, excavating, or harvesting",
      "Performing a ritual",
      "Trading, bargaining, or transporting goods",
      "Fighting another group",
      "Recovering from disaster",
      "Preparing for something soon"
    ],
    twist: [
      "It is hidden from normal sight",
      "Locals are wrong about it",
      "It is built over something older",
      "It connects to another hex underground, by road, by river, or by magic",
      "A faction has already claimed it",
      "It is valuable but dangerous",
      "It becomes worse at night",
      "It is slowly spreading corruption",
      "It contains a false clue",
      "It contains a true clue to a larger secret",
      "It is about to be destroyed, moved, opened, sealed, or changed",
      "It is tied to a PC, patron, deity, villain, or campaign mystery"
    ],
    hook: [
      "Someone is missing here",
      "It blocks travel",
      "It threatens a nearby settlement",
      "It contains treasure",
      "It contains supplies, shelter, or healing",
      "It contains a rare ingredient or crafting material",
      "It reveals regional history",
      "It gives faction leverage",
      "It points to another hex",
      "It connects to a major campaign mystery"
    ],
    connection: [
      "Tracks lead to a neighboring hex",
      "Survivors or refugees came from a neighboring hex",
      "Same faction controls or wants another nearby hex",
      "Same monster hunts across several hexes",
      "Tunnel, road, river, bridge, trail, or portal connects them",
      "Clue here points somewhere else",
      "Problem here started somewhere else",
      "This hex is one piece of a larger site, route, mystery, or conflict"
    ],
    history: [
      "A home",
      "A battlefield",
      "A shrine or holy place",
      "A prison",
      "A trade stop",
      "A noble holding",
      "A magical worksite",
      "A monster's territory",
      "A place of execution, sacrifice, or judgment",
      "Part of something much larger"
    ],
    danger: [
      "Safe",
      "Mostly safe, minor risk",
      "Dangerous if careless",
      "Dangerous even when prepared",
      "Deadly without planning",
      "Overwhelming; meant to be avoided, negotiated with, or returned to later"
    ],
    reward: [
      "No treasure, only information",
      "Food, water, shelter, or rest",
      "Coins or trade goods",
      "Useful equipment",
      "Rare crafting material",
      "Potion, scroll, charm, or minor magic item",
      "Map, key, password, safe route, or secret entrance",
      "Faction favor or new ally",
      "Lore about the region, dungeon, monster, or villain",
      "Unique relic, rare magic item, or campaign-important object"
    ]
  };

  const ROLE_TO_FEATURE = {
    "Empty / Travel Space": "feature_empty",
    "Natural Landmark": "feature_landmark",
    "Resource": "feature_resource",
    "Hazard": "feature_hazard",
    "Shelter / Camp / Waystation": "feature_shelter",
    "Settlement": "feature_settlement",
    "Fort / Watchpost / Checkpoint": "feature_fort",
    "Ruin": "feature_ruin",
    "Dungeon Entrance": "feature_dungeon",
    "Monster Lair": "feature_lair",
    "Faction Activity": "feature_faction",
    "Sacred / Religious Site": "feature_sacred",
    "Magical Site": "feature_magical",
    "Battlefield / Grave / Memorial": "feature_battlefield",
    "Traveler / Social Encounter": "feature_traveler",
    "Mystery / Strange Sign": "feature_mystery",
    "Regional Threat": "feature_threat",
    "Major Unique Feature": "feature_unique",
    "Roll twice and combine": "feature_unique"
  };

  const CORE_ROLL_ORDER = [
    { key: "density", label: "Density" },
    { key: "role", label: "Hex Role" },
    { key: "feature", label: "Specific Feature" },
    { key: "state", label: "Current State" },
    { key: "actor", label: "Actor / Occupant" },
    { key: "activity", label: "Activity" },
    { key: "twist", label: "Twist" },
    { key: "hook", label: "Hook" },
    { key: "connection", label: "Connection" },
    { key: "history", label: "History Layer" },
    { key: "danger", label: "Danger Level" },
    { key: "reward", label: "Reward" }
  ];

  const DICE_ROWS = [
    { key: "density", label: "Density", die: 6, tableKey: "density" },
    { key: "role", label: "Hex Role", die: 20, tableKey: "role" },
    { key: "feature", label: "Specific Feature", die: 12, tableKey: "feature_dynamic" },
    { key: "state", label: "Current State", die: 12, tableKey: "state" },
    { key: "actor", label: "Actor / Occupant", die: 12, tableKey: "actor" },
    { key: "activity", label: "Activity", die: 12, tableKey: "activity" },
    { key: "twist", label: "Twist", die: 12, tableKey: "twist" },
    { key: "hook", label: "Hook", die: 10, tableKey: "hook" },
    { key: "connection", label: "Connection", die: 8, tableKey: "connection" },
    { key: "history", label: "History Layer", die: 10, tableKey: "history" },
    { key: "danger", label: "Danger Level", die: 6, tableKey: "danger" },
    { key: "reward", label: "Reward", die: 10, tableKey: "reward" }
  ];

  function defaultState() {
    return {
      customTables: {},
      customTableDefs: [],
      customTerrains: [],
      savedHexes: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        customTables: parsed.customTables && typeof parsed.customTables === "object" ? parsed.customTables : {},
        customTableDefs: Array.isArray(parsed.customTableDefs) ? parsed.customTableDefs : [],
        customTerrains: Array.isArray(parsed.customTerrains) ? parsed.customTerrains : [],
        savedHexes: Array.isArray(parsed.savedHexes) ? parsed.savedHexes : []
      };
    } catch (err) {
      console.warn("Hex Stocker: failed to load state.", err);
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Hex Stocker: failed to save state.", err);
    }
  }

  function allTableDefs(state) {
    const customs = (state.customTableDefs || []).map((def) => ({
      key: def.key,
      label: def.label,
      die: def.die || "d20",
      custom: true,
      includeInHex: !!def.includeInHex
    }));
    return CORE_TABLE_DEFS.concat(customs);
  }

  function findTableDef(state, key) {
    return allTableDefs(state).find((def) => def.key === key);
  }

  function allTerrains(state) {
    const customs = (state.customTerrains || []).map((terrain) => String(terrain || "").trim()).filter(Boolean);
    return DEFAULT_TERRAIN.concat(customs);
  }

  function randomTerrain(state) {
    const terrains = allTerrains(state);
    return terrains[randInt(terrains.length)] || DEFAULT_TERRAIN[0];
  }

  function defaultEntries(tableKey) {
    return DEFAULT_TABLES[tableKey] || [];
  }

  function customEntries(state, tableKey) {
    const arr = state.customTables && Array.isArray(state.customTables[tableKey]) ? state.customTables[tableKey] : [];
    return arr.filter((x) => x && x.text);
  }

  function combinedEntries(state, tableKey) {
    const defaults = defaultEntries(tableKey).map((text, index) => ({
      id: "default_" + tableKey + "_" + index,
      text,
      source: "Default",
      rollLabel: String(index + 1)
    }));

    const customs = customEntries(state, tableKey).map((entry, index) => ({
      ...entry,
      source: "My Custom",
      rollLabel: DEFAULT_TABLES[tableKey] ? "C" + (index + 1) : String(index + 1)
    }));

    return defaults.concat(customs);
  }

  function getEntryByRoll(state, tableKey, rollNumber) {
    const defaults = defaultEntries(tableKey);
    const customs = customEntries(state, tableKey);

    if (defaults.length) {
      const defaultIndex = clamp((Number(rollNumber) || 1) - 1, 0, defaults.length - 1);
      return defaults[defaultIndex] || defaults[0] || "";
    }

    if (customs.length) {
      const customIndex = clamp((Number(rollNumber) || 1) - 1, 0, customs.length - 1);
      return customs[customIndex].text || "";
    }

    return "";
  }

  function pickEntry(state, tableKey) {
    const entries = combinedEntries(state, tableKey);
    if (!entries.length) return "";
    return entries[randInt(entries.length)].text;
  }

  function featureTableForRole(role) {
    return ROLE_TO_FEATURE[role] || "feature_empty";
  }

  function customDefsIncludedInHex(state) {
    return (state.customTableDefs || []).filter((def) => def.includeInHex);
  }

  function buildDescription(hex) {
    const terrain = String(hex.terrain || "the wilderness").toLowerCase();
    const feature = String(hex.feature || "notable feature").toLowerCase();
    const state = String(hex.state || "present").toLowerCase();
    const actor = String(hex.actor || "someone");
    const activity = String(hex.activity || "active here").toLowerCase();
    const twist = String(hex.twist || "something is complicated").toLowerCase();
    const hook = String(hex.hook || "it may matter").toLowerCase();
    const connection = String(hex.connection || "it connects to the wider area").toLowerCase();

    return "In the " + terrain + ", there is a " + feature + ". It is currently " + state +
      ". " + actor + " are " + activity + ". The complication is that " + twist +
      ". The players may care because " + hook + ". It connects to the wider region because " +
      connection + ".";
  }

  function buildNotes(hex) {
    const lines = [
      "Hex Notes",
      "",
      "Terrain: " + (hex.terrain || ""),
      "Density: " + (hex.density || ""),
      "Main Role: " + (hex.role || ""),
      "Specific Feature: " + (hex.feature || ""),
      "Current State: " + (hex.state || ""),
      "Actor / Occupant: " + (hex.actor || ""),
      "Activity: " + (hex.activity || ""),
      "Twist: " + (hex.twist || ""),
      "Hook: " + (hex.hook || ""),
      "Connection: " + (hex.connection || ""),
      "History Layer: " + (hex.history || ""),
      "Danger Level: " + (hex.danger || ""),
      "Reward: " + (hex.reward || "")
    ];

    if (Array.isArray(hex.extraRolls) && hex.extraRolls.length) {
      lines.push("", "Custom Table Rolls:");
      hex.extraRolls.forEach((roll) => {
        lines.push((roll.label || roll.tableKey) + ": " + (roll.value || ""));
      });
    }

    lines.push(
      "",
      "Final Description:",
      buildDescription(hex),
      "",
      "Possible Encounters:",
      "- ",
      "- ",
      "- ",
      "",
      "Clues:",
      "- ",
      "- ",
      "- ",
      "",
      "Tags: " + buildTags(hex).join(" ")
    );

    return lines.join("\n");
  }

  function buildTags(hex) {
    const tags = ["#hex"];

    if (hex.terrain) tags.push("#" + slug(hex.terrain));
    if (hex.role && hex.role !== "Roll twice and combine") tags.push("#" + slug(hex.role));
    if (hex.feature && hex.feature !== "—") tags.push("#" + slug(hex.feature));
    if (hex.danger && hex.danger !== "—") tags.push("#" + slug(hex.danger));

    return tags.filter(Boolean).filter((tag) => tag !== "#").slice(0, 6);
  }

  function emptyHex(state) {
    return {
      id: "",
      createdAt: "",
      terrain: ANY_TERRAIN,
      density: "—",
      role: "—",
      feature: "—",
      state: "—",
      actor: "—",
      activity: "—",
      twist: "—",
      hook: "—",
      connection: "—",
      history: "—",
      danger: "—",
      reward: "—",
      extraRolls: []
    };
  }

  function rollRole(state) {
    const first = pickEntry(state, "role");
    if (first !== "Roll twice and combine") return first;

    const a = pickEntry(state, "role");
    const b = pickEntry(state, "role");
    const cleanA = a === "Roll twice and combine" ? "Major Unique Feature" : a;
    const cleanB = b === "Roll twice and combine" ? "Regional Threat" : b;
    return cleanA + " + " + cleanB;
  }

  function featureForRolledRole(state, role) {
    const primaryRole = String(role || "").split("+")[0].trim();
    const featureKey = featureTableForRole(primaryRole);
    return pickEntry(state, featureKey);
  }

  function rollExtraTables(state) {
    return customDefsIncludedInHex(state).map((def) => ({
      tableKey: def.key,
      label: def.label,
      value: pickEntry(state, def.key)
    })).filter((x) => x.value);
  }

  function rollHex(state, terrainChoice) {
    const terrain = terrainChoice === ANY_TERRAIN ? randomTerrain(state) : terrainChoice;
    const role = rollRole(state);

    return {
      id: uid("hex"),
      createdAt: new Date().toISOString(),
      terrain,
      density: pickEntry(state, "density"),
      role,
      feature: featureForRolledRole(state, role),
      state: pickEntry(state, "state"),
      actor: pickEntry(state, "actor"),
      activity: pickEntry(state, "activity"),
      twist: pickEntry(state, "twist"),
      hook: pickEntry(state, "hook"),
      connection: pickEntry(state, "connection"),
      history: pickEntry(state, "history"),
      danger: pickEntry(state, "danger"),
      reward: pickEntry(state, "reward"),
      extraRolls: rollExtraTables(state)
    };
  }

  function copyText(text, panelEl, message = "Copied.") {
    const status = panelEl.querySelector("#hexStatus");
    function done() {
      if (status) {
        status.textContent = message;
        setTimeout(() => {
          if (status.isConnected) status.textContent = "Default tables are built in. Custom tables, custom terrain, and saved hexes are saved with your toolbox data.";
        }, 2200);
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      done();
    }
  }

  function renderTableOptions(state) {
    const core = CORE_TABLE_DEFS.map((def) => `<option value="${esc(def.key)}">${esc(def.label)} (${esc(def.die)})</option>`).join("");
    const customs = (state.customTableDefs || []).map((def) => `<option value="${esc(def.key)}">${esc(def.label)} (${esc(def.die || "d20")}) · Custom</option>`).join("");
    return core + customs;
  }

  function renderTerrainOptions(state) {
    const defaultOpts = DEFAULT_TERRAIN.map((terrain) => `<option value="${esc(terrain)}">${esc(terrain)}</option>`).join("");
    const customOpts = (state.customTerrains || []).map((terrain) => `<option value="${esc(terrain)}">${esc(terrain)} · Custom</option>`).join("");
    return `<option value="${ANY_TERRAIN}">Any (roll terrain)</option>` + defaultOpts + customOpts;
  }

  function renderTerrainManageOptions(state) {
    const customs = state.customTerrains || [];
    if (!customs.length) return `<div class="muted">No custom terrain options yet.</div>`;
    return customs.map((terrain, index) => `
      <div class="hex-terrain-item">
        <span>${esc(terrain)}</span>
        <button class="btn-secondary btn-small hex-delete-terrain" type="button" data-index="${index}">Delete</button>
      </div>
    `).join("");
  }

  window.registerTool({
    id: "hexStocker",
    name: "Hex Stocker",
    description: "Generate fantasy wilderness hexes with auto-rolls, real dice input, custom tables, custom terrain, and saved hexes.",
    render({ panelEl }) {
      const activeLabel = document.getElementById("activeGeneratorLabel");
      if (activeLabel) activeLabel.textContent = "Hex Stocker";

      let state = loadState();
      let currentHex = emptyHex(state);

      panelEl.innerHTML = `
        <style>
          .hex-tool {
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-height: 100%;
          }
          .hex-tool .hex-top {
            border-radius: var(--radius-md);
            border: 1px solid #222832;
            background: radial-gradient(circle at top left, #10151f, #05070c 70%);
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .hex-tool .hex-title-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            flex-wrap: wrap;
          }
          .hex-tool .hex-title {
            font-size: 1rem;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--accent-strong);
          }
          .hex-tool .hex-help {
            color: var(--text-muted);
            font-size: 0.78rem;
            line-height: 1.4;
            margin-top: 3px;
            max-width: 920px;
          }
          .hex-tool .hex-controls {
            display: grid;
            grid-template-columns: minmax(190px, 0.7fr) minmax(430px, 1.3fr);
            gap: 8px;
            align-items: end;
          }
          .hex-tool .hex-section {
            border-radius: var(--radius-md);
            border: 1px solid #222832;
            background: #05070c;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .hex-tool details.hex-section {
            padding: 0;
            overflow: hidden;
          }
          .hex-tool details.hex-section > summary {
            list-style: none;
            cursor: pointer;
            padding: 10px;
            border-bottom: 1px solid #1a2028;
            color: var(--accent-soft);
            font-size: 0.8rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            display: flex;
            justify-content: space-between;
            gap: 8px;
          }
          .hex-tool details.hex-section > summary::-webkit-details-marker {
            display: none;
          }
          .hex-tool details.hex-section > summary::after {
            content: "Open";
            color: var(--text-muted);
            letter-spacing: 0;
            text-transform: none;
            font-size: 0.74rem;
          }
          .hex-tool details.hex-section[open] > summary::after {
            content: "Close";
          }
          .hex-tool .hex-details-body {
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .hex-tool .hex-section-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid #1a2028;
            font-size: 0.8rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--accent-soft);
          }
          .hex-tool .hex-note {
            color: var(--text-muted);
            font-size: 0.74rem;
            letter-spacing: 0;
            text-transform: none;
            line-height: 1.35;
          }
          .hex-tool .hex-grid {
            display: grid;
            grid-template-columns: minmax(260px, 0.9fr) minmax(320px, 1.2fr);
            gap: 10px;
          }
          .hex-tool .hex-result-list {
            display: grid;
            gap: 4px;
          }
          .hex-tool .hex-result-row {
            display: grid;
            grid-template-columns: 120px minmax(0, 1fr) 32px;
            gap: 8px;
            align-items: center;
            border: 1px solid #141a22;
            background: #080c12;
            border-radius: var(--radius-sm);
            padding: 5px 6px;
            font-size: 0.78rem;
          }
          .hex-tool .hex-key {
            color: var(--text-muted);
            white-space: nowrap;
          }
          .hex-tool .hex-value {
            color: var(--accent-strong);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .hex-tool .hex-reroll {
            height: 24px;
            width: 30px;
            border-radius: 999px;
            border: 1px solid #303641;
            background: #05070c;
            color: var(--text-muted);
            cursor: pointer;
          }
          .hex-tool .hex-reroll:hover {
            background: #10141d;
            color: var(--accent-strong);
          }
          .hex-tool .hex-description {
            min-height: 150px;
            border-radius: var(--radius-md);
            border: 1px solid #1c222c;
            background: radial-gradient(circle at top left, #0f141d, #05070c 70%);
            padding: 10px;
            font-size: 0.86rem;
            line-height: 1.5;
            color: var(--text-main);
          }
          .hex-tool .hex-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
          }
          .hex-tool .hex-tag {
            border-radius: 999px;
            border: 1px solid #303641;
            background: #080c12;
            color: var(--text-muted);
            padding: 2px 7px;
            font-size: 0.72rem;
          }
          .hex-tool .hex-notes-preview {
            font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
            white-space: pre-wrap;
            background: #050608;
            border: 1px solid #1c222c;
            border-radius: var(--radius-md);
            padding: 10px;
            color: #cfd3da;
            font-size: 0.76rem;
            line-height: 1.45;
            max-height: 230px;
            overflow: auto;
          }
          .hex-tool .hex-dice-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(230px, 1fr));
            gap: 8px;
          }
          .hex-tool .hex-dice-row {
            display: grid;
            grid-template-columns: 52px 72px minmax(0, 1fr);
            gap: 8px;
            align-items: center;
            background: #080c12;
            border: 1px solid #141a22;
            border-radius: var(--radius-sm);
            padding: 6px;
            font-size: 0.78rem;
          }
          .hex-tool .hex-die {
            color: var(--accent-soft);
            font-weight: 700;
          }
          .hex-tool .hex-dice-out {
            color: var(--accent-strong);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .hex-tool .hex-table-grid {
            display: grid;
            grid-template-columns: minmax(260px, 0.75fr) minmax(360px, 1.25fr);
            gap: 10px;
          }
          .hex-tool .hex-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.78rem;
          }
          .hex-tool .hex-table th,
          .hex-tool .hex-table td {
            border: 1px solid #232a33;
            padding: 5px 6px;
            vertical-align: top;
          }
          .hex-tool .hex-table th {
            background: #0b1017;
            color: var(--accent-soft);
            font-weight: 500;
            text-align: left;
          }
          .hex-tool .hex-table td {
            background: #05070c;
          }
          .hex-tool .hex-source {
            border-radius: 999px;
            border: 1px solid #303641;
            color: var(--text-muted);
            padding: 1px 6px;
            font-size: 0.7rem;
            white-space: nowrap;
          }
          .hex-tool .hex-source-custom {
            color: #8adf9f;
            border-color: rgba(138, 223, 159, 0.45);
          }
          .hex-tool .hex-saved-list,
          .hex-tool .hex-terrain-list {
            display: grid;
            gap: 5px;
          }
          .hex-tool .hex-saved-item,
          .hex-tool .hex-terrain-item {
            border: 1px solid #141a22;
            border-radius: var(--radius-sm);
            background: #080c12;
            padding: 7px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px;
            align-items: center;
          }
          .hex-tool .hex-saved-title {
            color: var(--accent-strong);
            font-size: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .hex-tool .hex-saved-meta {
            color: var(--text-muted);
            font-size: 0.72rem;
            margin-top: 2px;
          }
          @media (max-width: 980px) {
            .hex-tool .hex-controls,
            .hex-tool .hex-grid,
            .hex-tool .hex-table-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 720px) {
            .hex-tool .hex-dice-grid {
              grid-template-columns: 1fr;
            }
            .hex-tool .hex-result-row {
              grid-template-columns: 100px minmax(0, 1fr) 32px;
            }
            .hex-tool .hex-saved-item,
            .hex-tool .hex-terrain-item {
              grid-template-columns: 1fr;
            }
          }
        </style>

        <div class="hex-tool">
          <div class="hex-top">
            <div class="hex-title-row">
              <div>
                <div class="hex-title">Hex Stocker</div>
                <div class="hex-help">
                  Generate fantasy wilderness hexes from modular tables. Start with Any terrain, roll a full hex, then customize tables and terrain as needed.
                </div>
              </div>
              <span id="hexStatus" class="copy-tip">Default tables are built in. Custom tables, custom terrain, and saved hexes are saved with your toolbox data.</span>
            </div>

            <div class="hex-controls">
              <div>
                <label for="hexTerrainSelect">Terrain</label>
                <select id="hexTerrainSelect">${renderTerrainOptions(state)}</select>
              </div>
              <div class="row" style="margin-bottom:0;">
                <button id="hexRollBtn" class="btn-primary btn-small" type="button">Roll Full Hex</button>
                <button id="hexRollTerrainBtn" class="btn-secondary btn-small" type="button">Roll Terrain</button>
                <button id="hexClearBtn" class="btn-secondary btn-small" type="button">Clear</button>
                <button id="hexCopyNotesBtn" class="btn-primary btn-small" type="button">Copy Full Notes</button>
                <button id="hexSaveCurrentBtn" class="btn-secondary btn-small" type="button">Save Hex</button>
              </div>
            </div>
          </div>

          <div class="hex-grid">
            <div class="hex-section">
              <div class="hex-section-title">
                <span>Generated Hex</span>
                <span class="hex-note">Reroll individual pieces with ↻</span>
              </div>
              <div id="hexResultList" class="hex-result-list"></div>
            </div>

            <div class="hex-section">
              <div class="hex-section-title">
                <span>Final Hex Notes</span>
                <span class="hex-note">Plain text output</span>
              </div>
              <div id="hexDescription" class="hex-description"></div>
              <div id="hexTags" class="hex-tags"></div>
              <div id="hexNotesPreview" class="hex-notes-preview"></div>
            </div>
          </div>

          <details class="hex-section">
            <summary>Real Dice Builder</summary>
            <div class="hex-details-body">
              <div class="hex-note">Roll physical dice, type the numbers, then build the hex. The Feature roll uses the feature table that matches your Role result.</div>
              <div id="hexDiceGrid" class="hex-dice-grid"></div>
              <div class="row" style="margin-bottom:0;">
                <button id="hexBuildDiceBtn" class="btn-primary btn-small" type="button">Build Hex From Rolls</button>
                <button id="hexFillDiceExampleBtn" class="btn-secondary btn-small" type="button">Fill Example Rolls</button>
                <button id="hexClearDiceBtn" class="btn-secondary btn-small" type="button">Clear Dice</button>
              </div>
            </div>
          </details>

          <details class="hex-section">
            <summary>Table & Terrain Editor</summary>
            <div class="hex-details-body">
              <div class="hex-table-grid">
                <div>
                  <label for="hexTableSelect">Table</label>
                  <select id="hexTableSelect">${renderTableOptions(state)}</select>

                  <label for="hexNewEntryText" style="margin-top:8px;">New Entry</label>
                  <textarea id="hexNewEntryText" placeholder="Example: The ruins rearrange whenever someone sleeps inside them."></textarea>

                  <label for="hexNewEntryTags" style="margin-top:8px;">Tags</label>
                  <input id="hexNewEntryTags" type="text" placeholder="magical, ruin, mystery" />

                  <div class="row" style="margin-top:8px; margin-bottom:0;">
                    <button id="hexAddEntryBtn" class="btn-primary btn-small" type="button">Add Entry</button>
                    <button id="hexRollSelectedTableBtn" class="btn-secondary btn-small" type="button">Roll This Table</button>
                    <button id="hexClearEntryBtn" class="btn-secondary btn-small" type="button">Clear Entry</button>
                  </div>

                  <hr>

                  <div class="section-title"><span>Create Custom Table</span></div>
                  <label for="hexNewTableName">Table Name</label>
                  <input id="hexNewTableName" type="text" placeholder="Weather, Road Details, Fey Crossing Features..." />

                  <div class="row" style="margin-bottom:0;">
                    <div class="col">
                      <label for="hexNewTableDie">Die</label>
                      <select id="hexNewTableDie">
                        <option value="d4">d4</option>
                        <option value="d6">d6</option>
                        <option value="d8">d8</option>
                        <option value="d10">d10</option>
                        <option value="d12" selected>d12</option>
                        <option value="d20">d20</option>
                        <option value="d100">d100</option>
                      </select>
                    </div>
                    <div class="col">
                      <label for="hexIncludeCustomTable">Include in generated hex?</label>
                      <select id="hexIncludeCustomTable">
                        <option value="false" selected>No, roll only when selected</option>
                        <option value="true">Yes, add to every generated hex</option>
                      </select>
                    </div>
                  </div>

                  <div class="row" style="margin-bottom:0;">
                    <button id="hexCreateTableBtn" class="btn-primary btn-small" type="button">Create Custom Table</button>
                    <button id="hexDeleteTableBtn" class="btn-secondary btn-small danger" type="button">Delete Selected Custom Table</button>
                  </div>

                  <hr>

                  <div class="section-title"><span>Custom Terrain</span></div>
                  <label for="hexNewTerrain">New Terrain Option</label>
                  <input id="hexNewTerrain" type="text" placeholder="Volcanic Flats, Feywood, Underdark, Floating Isles..." />
                  <div class="row" style="margin-bottom:0;">
                    <button id="hexAddTerrainBtn" class="btn-primary btn-small" type="button">Add Terrain</button>
                  </div>
                  <div id="hexTerrainList" class="hex-terrain-list"></div>
                </div>

                <div>
                  <table class="hex-table">
                    <thead>
                      <tr>
                        <th style="width:56px;">Roll</th>
                        <th>Entry</th>
                        <th style="width:95px;">Source</th>
                        <th style="width:62px;">Action</th>
                      </tr>
                    </thead>
                    <tbody id="hexTablePreview"></tbody>
                  </table>
                </div>
              </div>
            </div>
          </details>

          <details class="hex-section">
            <summary>Saved Hexes</summary>
            <div class="hex-details-body">
              <div id="hexSavedList" class="hex-saved-list"></div>
            </div>
          </details>
        </div>
      `;

      const terrainSelect = panelEl.querySelector("#hexTerrainSelect");
      const resultList = panelEl.querySelector("#hexResultList");
      const descriptionEl = panelEl.querySelector("#hexDescription");
      const tagsEl = panelEl.querySelector("#hexTags");
      const notesEl = panelEl.querySelector("#hexNotesPreview");
      const diceGrid = panelEl.querySelector("#hexDiceGrid");
      const tableSelect = panelEl.querySelector("#hexTableSelect");
      const tablePreview = panelEl.querySelector("#hexTablePreview");
      const savedList = panelEl.querySelector("#hexSavedList");
      const terrainList = panelEl.querySelector("#hexTerrainList");

      function selectedTerrainChoice() {
        return terrainSelect.value || ANY_TERRAIN;
      }

      function saveAndRefreshState() {
        saveState(state);
      }

      function refreshTerrainSelect(keepValue) {
        const old = keepValue || terrainSelect.value || ANY_TERRAIN;
        terrainSelect.innerHTML = renderTerrainOptions(state);
        terrainSelect.value = allTerrains(state).includes(old) || old === ANY_TERRAIN ? old : ANY_TERRAIN;
      }

      function refreshTableSelect(keepValue) {
        const old = keepValue || tableSelect.value;
        tableSelect.innerHTML = renderTableOptions(state);
        const keys = allTableDefs(state).map((def) => def.key);
        tableSelect.value = keys.includes(old) ? old : "twist";
      }

      function setCurrentHex(hex) {
        currentHex = { ...hex };
        if (currentHex.terrain && currentHex.terrain !== ANY_TERRAIN && allTerrains(state).includes(currentHex.terrain)) {
          terrainSelect.value = currentHex.terrain;
        }
        renderCurrentHex();
      }

      function rollSinglePart(partKey) {
        if (partKey === "terrain") {
          currentHex.terrain = randomTerrain(state);
          terrainSelect.value = currentHex.terrain;
        } else if (partKey === "feature") {
          currentHex.feature = featureForRolledRole(state, currentHex.role);
        } else if (partKey === "role") {
          currentHex.role = rollRole(state);
          currentHex.feature = featureForRolledRole(state, currentHex.role);
        } else if (partKey === "extraRolls") {
          currentHex.extraRolls = rollExtraTables(state);
        } else {
          currentHex[partKey] = pickEntry(state, partKey);
        }
        renderCurrentHex();
      }

      function displayedRollRows() {
        const rows = [{ key: "terrain", label: "Terrain" }].concat(CORE_ROLL_ORDER);
        if (Array.isArray(currentHex.extraRolls) && currentHex.extraRolls.length) {
          rows.push({ key: "extraRolls", label: "Custom Rolls" });
        }
        return rows;
      }

      function valueForRow(row) {
        if (row.key === "extraRolls") {
          return currentHex.extraRolls.map((x) => x.label + ": " + x.value).join(" | ");
        }
        return currentHex[row.key] || "—";
      }

      function renderCurrentHex() {
        if (terrainSelect.value !== ANY_TERRAIN && terrainSelect.value) {
          currentHex.terrain = terrainSelect.value;
        }

        resultList.innerHTML = displayedRollRows().map((row) => {
          const value = valueForRow(row);
          return `
            <div class="hex-result-row">
              <div class="hex-key">${esc(row.label)}</div>
              <div class="hex-value" title="${esc(value)}">${esc(value)}</div>
              <button class="hex-reroll" type="button" data-part="${esc(row.key)}" title="Reroll ${esc(row.label)}">↻</button>
            </div>
          `;
        }).join("");

        descriptionEl.textContent = buildDescription(currentHex);
        tagsEl.innerHTML = buildTags(currentHex).map((tag) => `<span class="hex-tag">${esc(tag)}</span>`).join("");
        notesEl.textContent = buildNotes(currentHex);
      }

      function renderDiceGrid() {
        diceGrid.innerHTML = DICE_ROWS.map((row) => `
          <div class="hex-dice-row">
            <div class="hex-die">d${row.die}</div>
            <input type="number" min="1" max="${row.die}" data-key="${esc(row.key)}" data-table="${esc(row.tableKey)}" data-die="${row.die}" placeholder="Roll">
            <div class="hex-dice-out">— ${esc(row.label)}</div>
          </div>
        `).join("");
        updateAllDiceOutputs();
      }

      function currentDiceRoleText() {
        const roleInput = diceGrid.querySelector('input[data-key="role"]');
        const raw = roleInput ? Number(roleInput.value) : 0;
        if (!raw) return currentHex.role && currentHex.role !== "—" ? currentHex.role : "Empty / Travel Space";
        return getEntryByRoll(state, "role", raw);
      }

      function tableForDiceRow(rowTableKey) {
        if (rowTableKey !== "feature_dynamic") return rowTableKey;
        return featureTableForRole(currentDiceRoleText());
      }

      function updateDiceOutput(input) {
        const die = Number(input.dataset.die || 0);
        const value = Number(input.value || 0);
        const tableKey = tableForDiceRow(input.dataset.table);
        const output = input.parentElement.querySelector(".hex-dice-out");
        const key = input.dataset.key;
        const row = DICE_ROWS.find((x) => x.key === key);
        const label = row ? row.label : key;

        if (!value || value < 1 || value > die) {
          output.textContent = "— " + label;
          return;
        }

        output.textContent = getEntryByRoll(state, tableKey, value);
      }

      function updateAllDiceOutputs() {
        diceGrid.querySelectorAll("input").forEach(updateDiceOutput);
      }

      function buildHexFromDice() {
        const terrainChoice = selectedTerrainChoice();
        const next = {
          id: uid("hex"),
          createdAt: new Date().toISOString(),
          terrain: terrainChoice === ANY_TERRAIN ? randomTerrain(state) : terrainChoice
        };

        const roleInput = diceGrid.querySelector('input[data-key="role"]');
        const roleRoll = roleInput ? Number(roleInput.value || 0) : 0;
        next.role = roleRoll ? getEntryByRoll(state, "role", roleRoll) : rollRole(state);

        diceGrid.querySelectorAll("input").forEach((input) => {
          const key = input.dataset.key;
          if (key === "role") return;

          const value = Number(input.value || 0);
          const tableKey = key === "feature" ? featureTableForRole(next.role) : input.dataset.table;

          next[key] = value ? getEntryByRoll(state, tableKey, value) : pickEntry(state, tableKey);
        });

        next.extraRolls = rollExtraTables(state);
        currentHex = next;
        renderCurrentHex();
      }

      function renderTablePreview() {
        const key = tableSelect.value;
        const def = findTableDef(state, key);
        const defaults = defaultEntries(key);
        const customs = customEntries(state, key);
        const rows = [];
        const isCustomTable = def && def.custom;

        defaults.forEach((text, index) => {
          rows.push(`
            <tr>
              <td>${index + 1}</td>
              <td>${esc(text)}</td>
              <td><span class="hex-source">Default</span></td>
              <td></td>
            </tr>
          `);
        });

        customs.forEach((entry, index) => {
          rows.push(`
            <tr>
              <td>${isCustomTable ? index + 1 : "C" + (index + 1)}</td>
              <td>
                ${esc(entry.text)}
                ${entry.tags && entry.tags.length ? `<div class="hex-note">${entry.tags.map((tag) => "#" + esc(tag)).join(" ")}</div>` : ""}
              </td>
              <td><span class="hex-source hex-source-custom">${isCustomTable ? "Custom Table" : "My Custom"}</span></td>
              <td><button class="btn-secondary btn-small hex-delete-entry" type="button" data-id="${esc(entry.id)}">Delete</button></td>
            </tr>
          `);
        });

        if (!rows.length) {
          rows.push(`<tr><td colspan="4" class="muted">No entries found. Add the first entry on the left.</td></tr>`);
        }

        tablePreview.innerHTML = rows.join("");

        const deleteTableBtn = panelEl.querySelector("#hexDeleteTableBtn");
        if (deleteTableBtn) deleteTableBtn.disabled = !(def && def.custom);
      }

      function renderSavedHexes() {
        const saved = state.savedHexes || [];
        if (!saved.length) {
          savedList.innerHTML = `<div class="muted">No saved hexes yet. Roll a hex, then click Save Hex.</div>`;
          return;
        }

        savedList.innerHTML = saved.map((hex) => {
          const title = (hex.terrain || "Hex") + " · " + (hex.role || "Unknown Role") + " · " + (hex.feature || "Feature");
          const date = hex.createdAt ? new Date(hex.createdAt).toLocaleString() : "Unknown date";
          return `
            <div class="hex-saved-item">
              <div>
                <div class="hex-saved-title" title="${esc(title)}">${esc(title)}</div>
                <div class="hex-saved-meta">${esc(date)} · ${esc(hex.danger || "")}</div>
              </div>
              <div class="row" style="margin-bottom:0; justify-content:flex-end;">
                <button class="btn-secondary btn-small hex-open-saved" type="button" data-id="${esc(hex.id)}">Open</button>
                <button class="btn-secondary btn-small hex-copy-saved" type="button" data-id="${esc(hex.id)}">Copy</button>
                <button class="btn-secondary btn-small hex-delete-saved danger" type="button" data-id="${esc(hex.id)}">Delete</button>
              </div>
            </div>
          `;
        }).join("");
      }

      function renderTerrainList() {
        terrainList.innerHTML = renderTerrainManageOptions(state);
      }

      function refreshAll() {
        refreshTerrainSelect(terrainSelect.value || ANY_TERRAIN);
        refreshTableSelect(tableSelect.value || "twist");
        renderCurrentHex();
        renderDiceGrid();
        renderTablePreview();
        renderSavedHexes();
        renderTerrainList();
      }

      panelEl.querySelector("#hexRollBtn").addEventListener("click", () => {
        setCurrentHex(rollHex(state, selectedTerrainChoice()));
      });

      panelEl.querySelector("#hexRollTerrainBtn").addEventListener("click", () => {
        const terrain = randomTerrain(state);
        terrainSelect.value = terrain;
        currentHex.terrain = terrain;
        renderCurrentHex();
      });

      panelEl.querySelector("#hexClearBtn").addEventListener("click", () => {
        currentHex = emptyHex(state);
        terrainSelect.value = ANY_TERRAIN;
        renderCurrentHex();
      });

      panelEl.querySelector("#hexCopyNotesBtn").addEventListener("click", () => {
        copyText(buildNotes(currentHex), panelEl, "Copied full hex notes.");
      });

      panelEl.querySelector("#hexSaveCurrentBtn").addEventListener("click", () => {
        const hexToSave = {
          ...currentHex,
          id: currentHex.id && currentHex.id !== "" ? currentHex.id : uid("hex"),
          createdAt: currentHex.createdAt || new Date().toISOString()
        };

        state.savedHexes = [hexToSave].concat(state.savedHexes || []).slice(0, 100);
        currentHex = hexToSave;
        saveAndRefreshState();
        renderSavedHexes();
        copyText("Saved hex.", panelEl, "Hex saved.");
      });

      resultList.addEventListener("click", (event) => {
        const btn = event.target.closest(".hex-reroll");
        if (!btn) return;
        rollSinglePart(btn.dataset.part);
      });

      terrainSelect.addEventListener("change", () => {
        if (terrainSelect.value !== ANY_TERRAIN) {
          currentHex.terrain = terrainSelect.value;
        }
        renderCurrentHex();
      });

      diceGrid.addEventListener("input", (event) => {
        if (!event.target.matches("input")) return;
        if (event.target.dataset.key === "role") updateAllDiceOutputs();
        else updateDiceOutput(event.target);
      });

      panelEl.querySelector("#hexBuildDiceBtn").addEventListener("click", buildHexFromDice);

      panelEl.querySelector("#hexFillDiceExampleBtn").addEventListener("click", () => {
        const example = [5, 9, 2, 3, 4, 1, 2, 1, 1, 3, 3, 7];
        diceGrid.querySelectorAll("input").forEach((input, index) => {
          input.value = example[index] || "";
        });
        updateAllDiceOutputs();
      });

      panelEl.querySelector("#hexClearDiceBtn").addEventListener("click", () => {
        diceGrid.querySelectorAll("input").forEach((input) => {
          input.value = "";
        });
        updateAllDiceOutputs();
      });

      tableSelect.addEventListener("change", renderTablePreview);

      panelEl.querySelector("#hexAddEntryBtn").addEventListener("click", () => {
        const key = tableSelect.value;
        const textEl = panelEl.querySelector("#hexNewEntryText");
        const tagsEl = panelEl.querySelector("#hexNewEntryTags");
        const text = (textEl.value || "").trim();

        if (!text) {
          copyText("No entry added.", panelEl, "Type an entry first.");
          return;
        }

        if (!state.customTables[key]) state.customTables[key] = [];
        state.customTables[key].push({
          id: uid("entry"),
          text,
          tags: normalizeTags(tagsEl.value),
          createdAt: new Date().toISOString()
        });

        textEl.value = "";
        tagsEl.value = "";
        saveAndRefreshState();
        renderTablePreview();
        copyText("Added entry.", panelEl, "Entry added.");
      });

      panelEl.querySelector("#hexRollSelectedTableBtn").addEventListener("click", () => {
        const key = tableSelect.value;
        const def = findTableDef(state, key);
        const value = pickEntry(state, key);
        copyText((def ? def.label : key) + ": " + value, panelEl, "Rolled table: " + value);
      });

      panelEl.querySelector("#hexClearEntryBtn").addEventListener("click", () => {
        panelEl.querySelector("#hexNewEntryText").value = "";
        panelEl.querySelector("#hexNewEntryTags").value = "";
      });

      panelEl.querySelector("#hexCreateTableBtn").addEventListener("click", () => {
        const nameEl = panelEl.querySelector("#hexNewTableName");
        const dieEl = panelEl.querySelector("#hexNewTableDie");
        const includeEl = panelEl.querySelector("#hexIncludeCustomTable");
        const label = (nameEl.value || "").trim();

        if (!label) {
          copyText("No table created.", panelEl, "Type a table name first.");
          return;
        }

        const key = "custom_" + slug(label) + "_" + Date.now().toString(36);
        state.customTableDefs.push({
          key,
          label,
          die: dieEl.value || "d12",
          includeInHex: includeEl.value === "true"
        });
        state.customTables[key] = [];

        nameEl.value = "";
        saveAndRefreshState();
        refreshTableSelect(key);
        renderTablePreview();
        copyText("Created custom table.", panelEl, "Custom table created.");
      });

      panelEl.querySelector("#hexDeleteTableBtn").addEventListener("click", () => {
        const key = tableSelect.value;
        const def = findTableDef(state, key);
        if (!def || !def.custom) {
          copyText("Default tables cannot be deleted.", panelEl, "Only custom tables can be deleted.");
          return;
        }

        const ok = confirm("Delete custom table '" + def.label + "' and all of its entries?");
        if (!ok) return;

        state.customTableDefs = state.customTableDefs.filter((item) => item.key !== key);
        delete state.customTables[key];

        saveAndRefreshState();
        refreshTableSelect("twist");
        renderTablePreview();
        renderCurrentHex();
      });

      panelEl.querySelector("#hexAddTerrainBtn").addEventListener("click", () => {
        const terrainEl = panelEl.querySelector("#hexNewTerrain");
        const terrain = (terrainEl.value || "").trim();

        if (!terrain) {
          copyText("No terrain added.", panelEl, "Type a terrain name first.");
          return;
        }

        const existing = allTerrains(state).map((x) => x.toLowerCase());
        if (existing.includes(terrain.toLowerCase())) {
          copyText("Terrain already exists.", panelEl, "That terrain already exists.");
          return;
        }

        state.customTerrains.push(terrain);
        terrainEl.value = "";
        saveAndRefreshState();
        refreshTerrainSelect(terrain);
        renderTerrainList();
        copyText("Added terrain.", panelEl, "Custom terrain added.");
      });

      terrainList.addEventListener("click", (event) => {
        const btn = event.target.closest(".hex-delete-terrain");
        if (!btn) return;
        const index = Number(btn.dataset.index);
        state.customTerrains.splice(index, 1);
        saveAndRefreshState();
        refreshTerrainSelect(ANY_TERRAIN);
        renderTerrainList();
        renderCurrentHex();
      });

      tablePreview.addEventListener("click", (event) => {
        const btn = event.target.closest(".hex-delete-entry");
        if (!btn) return;

        const key = tableSelect.value;
        const id = btn.dataset.id;
        state.customTables[key] = customEntries(state, key).filter((entry) => entry.id !== id);
        saveAndRefreshState();
        renderTablePreview();
      });

      savedList.addEventListener("click", (event) => {
        const openBtn = event.target.closest(".hex-open-saved");
        const copyBtn = event.target.closest(".hex-copy-saved");
        const deleteBtn = event.target.closest(".hex-delete-saved");

        if (openBtn) {
          const hit = (state.savedHexes || []).find((hex) => hex.id === openBtn.dataset.id);
          if (hit) setCurrentHex(hit);
          return;
        }

        if (copyBtn) {
          const hit = (state.savedHexes || []).find((hex) => hex.id === copyBtn.dataset.id);
          if (hit) copyText(buildNotes(hit), panelEl, "Copied saved hex notes.");
          return;
        }

        if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          state.savedHexes = (state.savedHexes || []).filter((hex) => hex.id !== id);
          saveAndRefreshState();
          renderSavedHexes();
        }
      });

      refreshAll();
      setCurrentHex(rollHex(state, selectedTerrainChoice()));
    }
  });
})();
