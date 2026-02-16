// tool-encounter.js
// Encounter / Initiative tracker for the Vrahune toolbox.

(function () {
  if (!window.registerTool) {
    console.warn("Encounter tool: registerTool not found yet.");
    return;
  }

  // ---- CSS injection (keeps tool styling self-contained) ----------
  const STYLE_ID = "vrahune-encounter-tool-style";

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .enc-layout {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .enc-left, .enc-right {
        flex: 1 1 260px;
        min-width: 260px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .enc-box {
        border-radius: var(--radius-md);
        border: 1px solid #222832;
        background: #05070c;
        padding: 6px 8px;
      }
      .enc-section-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8rem;
        color: var(--accent-soft);
        margin-bottom: 4px;
      }
      .enc-turn-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .enc-turn-header-left {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .enc-turn-label {
        font-size: 0.8rem;
        color: var(--accent-soft);
      }
      .enc-round {
        font-size: 0.9rem;
        color: var(--accent-strong);
      }
      .enc-turn-header-right {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .enc-current-tag {
        font-size: 0.75rem;
        padding: 2px 6px;
        border-radius: 999px;
        border: 1px solid #3b4656;
        color: var(--text-muted);
      }
      .enc-cards {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 260px;
        overflow-y: auto;
      }
      .enc-card {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 6px;
        align-items: center;
        padding: 6px 8px;
        border-radius: var(--radius-md);
        border: 1px solid #2b323e;
        background: #080b11;
      }
      .enc-card.pc {
        border-color: #4e8cff;
        background: #0b1020;
      }
      .enc-card.npc {
        border-color: #7c7c7c;
        background: #0b0f14;
      }
      .enc-card.enemy {
        border-color: #b84c4c;
        background: #14090c;
      }
      .enc-card.dead {
        opacity: 0.4;
        filter: grayscale(0.9);
      }
      .enc-card.active {
        box-shadow: 0 0 0 1px #c0c0c0;
      }
      .enc-avatar {
        width: 38px;
        height: 38px;
        border-radius: 999px;
        background: radial-gradient(circle at 30% 20%, #ffffff33, #000000);
        border: 1px solid #3b4656;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        color: var(--accent-strong);
      }
      .enc-avatar.pc { border-color: #4e8cff; }
      .enc-avatar.enemy { border-color: #b84c4c; }
      .enc-main {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .enc-name-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 4px;
      }
      .enc-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--accent-strong);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .enc-tag {
        font-size: 0.7rem;
        padding: 1px 6px;
        border-radius: 999px;
        border: 1px solid #3b4656;
        color: var(--text-muted);
      }
      .enc-hp-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
      }
      .enc-hp-label {
        color: var(--text-muted);
      }
      .enc-hp-val {
        font-weight: 600;
      }
      .enc-mini-input {
        width: 36px;
        padding: 2px 4px;
        font-size: 0.75rem;
      }
      .enc-side {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: flex-end;
        font-size: 0.75rem;
        color: var(--text-muted);
      }
      .enc-side-top {
        display: flex;
        flex-direction: column;
        gap: 2px;
        text-align: right;
      }
      .enc-side-bottom {
        display: flex;
        gap: 4px;
      }
      .enc-incard-btn {
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 999px;
      }
      .enc-form-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        margin-bottom: 4px;
      }
      .enc-form-row-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        margin-bottom: 4px;
      }
      .enc-saved-party {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 2px;
      }
      .enc-party-btn {
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid #3b4656;
        background: #080b11;
        color: var(--accent-strong);
        cursor: pointer;
      }
      .enc-party-btn:hover {
        background: #101621;
      }
    `;
    document.head.appendChild(style);
  }

  // ---- State -------------------------------------------------------

  const state = (window.encounterState = window.encounterState || {
    round: 1,
    activeCombatantId: null,
    nextId: 1,
    combatants: [],
    party: [] // saved party templates
  });

  function createCombatant(data) {
    return {
      id: state.nextId++,
      name: data.name || "Unknown",
      type: data.type || "pc", // "pc" | "npc" | "enemy"
      ac: Number(data.ac) || 10,
      speed: Number(data.speed) || 30,
      init: Number(data.init) || 0,
      hpMax: Math.max(1, Number(data.hpMax) || 1),
      hpCurrent: Math.max(0, Number(data.hpCurrent) || Number(data.hpMax) || 1),
      dead: !!data.dead
    };
  }

  function sortCombatants() {
    state.combatants.sort((a, b) => {
      if (b.init !== a.init) return b.init - a.init;
      return a.name.localeCompare(b.name);
    });
  }

  function findCombatant(id) {
    return state.combatants.find(c => c.id === id) || null;
  }

  function getOrderedCombatants() {
    sortCombatants();
    return state.combatants.slice();
  }

  function goToNextTurn() {
    const ordered = getOrderedCombatants().filter(c => !c.dead);
    if (!ordered.length) return;
    if (!state.activeCombatantId) {
      state.activeCombatantId = ordered[0].id;
      return;
    }
    const idx = ordered.findIndex(c => c.id === state.activeCombatantId);
    const next = idx === -1 || idx === ordered.length - 1 ? 0 : idx + 1;
    if (next === 0 && idx === ordered.length - 1) {
      state.round += 1;
    }
    state.activeCombatantId = ordered[next].id;
  }

  function goToPrevTurn() {
    const ordered = getOrderedCombatants().filter(c => !c.dead);
    if (!ordered.length) return;
    if (!state.activeCombatantId) {
      state.activeCombatantId = ordered[0].id;
      return;
    }
    const idx = ordered.findIndex(c => c.id === state.activeCombatantId);
    const prev = idx <= 0 ? ordered.length - 1 : idx - 1;
    if (prev === ordered.length - 1 && idx === 0) {
      state.round = Math.max(1, state.round - 1);
    }
    state.activeCombatantId = ordered[prev].id;
  }

  function resetEncounter() {
    state.combatants = [];
    state.activeCombatantId = null;
    state.round = 1;
  }

  function upsertPartyTemplate(c) {
    const idx = state.party.findIndex(p => p.name === c.name && p.type === c.type);
    const template = {
      name: c.name,
      type: c.type,
      ac: c.ac,
      speed: c.speed,
      hpMax: c.hpMax
    };
    if (idx === -1) state.party.push(template);
    else state.party[idx] = template;
  }

  function spawnFromTemplate(tpl) {
    const c = createCombatant({
      name: tpl.name,
      type: tpl.type,
      ac: tpl.ac,
      speed: tpl.speed,
      hpMax: tpl.hpMax,
      hpCurrent: tpl.hpMax,
      init: 0
    });
    state.combatants.push(c);
    sortCombatants();
    if (!state.activeCombatantId) state.activeCombatantId = c.id;
  }

  function showToast(panelEl, text) {
    const tip = panelEl.querySelector(".enc-toast");
    if (!tip) return;
    tip.textContent = text;
    tip.style.opacity = "1";
    setTimeout(() => {
      if (!tip.isConnected) return;
      tip.style.opacity = "0.0";
    }, 1800);
  }

  // ---- Render function passed to registerTool ----------------------

  window.registerTool({
    id: "encounter",
    name: "Encounter / Initiative",
    description: "Track combat order, HP, and rounds.",
    render({ panelEl }) {
      panelEl.innerHTML = `
        <div class="enc-layout">
          <div class="enc-left">
            <div class="enc-box">
              <div class="enc-section-title">
                <span>Encounter / Initiative</span>
              </div>

              <div class="enc-form-row">
                <div>
                  <label>Name</label>
                  <input id="encName" type="text" placeholder="Arannis, Goblin #1..." />
                </div>
                <div>
                  <label>Type</label>
                  <select id="encType">
                    <option value="pc">PC</option>
                    <option value="npc">NPC</option>
                    <option value="enemy">Enemy</option>
                  </select>
                </div>
                <div>
                  <label>Initiative</label>
                  <input id="encInit" type="number" inputmode="numeric" />
                </div>
              </div>

              <div class="enc-form-row">
                <div>
                  <label>Max HP</label>
                  <input id="encHpMax" type="number" inputmode="numeric" />
                </div>
                <div>
                  <label>Current HP</label>
                  <input id="encHpCurrent" type="number" inputmode="numeric" />
                </div>
                <div>
                  <label>AC</label>
                  <input id="encAC" type="number" inputmode="numeric" />
                </div>
              </div>

              <div class="enc-form-row-2">
                <div>
                  <label>Speed</label>
                  <input id="encSpeed" type="number" inputmode="numeric" />
                </div>
                <div>
                  <label>&nbsp;</label>
                  <div style="display:flex; gap:4px; justify-content:flex-end;">
                    <button id="encAddBtn" class="btn-primary btn-small">Add / Update</button>
                    <button id="encClearFormBtn" class="btn-secondary btn-small">Clear</button>
                  </div>
                </div>
              </div>

              <div class="muted" style="font-size:0.75rem; margin-top:2px;">
                Tip: Use this for players or monsters. Later you can save PCs into the Party strip below.
              </div>
            </div>

            <div class="enc-box">
              <div class="enc-section-title">
                <span>Saved Party</span>
                <button id="encSaveAsPartyBtn" class="btn-secondary btn-small" type="button">
                  Save current as party member
                </button>
              </div>
              <div class="muted" style="font-size:0.75rem;">
                Click a saved party member to add a fresh copy to this encounter.
              </div>
              <div id="encPartyStrip" class="enc-saved-party"></div>
            </div>

            <div class="muted enc-toast" style="font-size:0.75rem; min-height:1em; transition:opacity 0.2s; opacity:0;"></div>
          </div>

          <div class="enc-right">
            <div class="enc-box">
              <div class="enc-turn-header">
                <div class="enc-turn-header-left">
                  <span class="enc-turn-label">Turn & Round</span>
                  <span class="enc-round">Round <span id="encRoundVal"></span></span>
                </div>
                <div class="enc-turn-header-right">
                  <button id="encPrevBtn" class="btn-secondary btn-small" type="button">⟸ Prev</button>
                  <button id="encNextBtn" class="btn-primary btn-small" type="button">Next ⟹</button>
                  <span class="enc-current-tag" id="encCurrentLabel">No active turn</span>
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; margin-bottom:4px; gap:4px;">
                <div class="muted" style="font-size:0.75rem;">
                  Click damage/heal on a card to update HP. Dead creatures are dimmed.
                </div>
                <button id="encResetBtn" class="btn-secondary btn-small" type="button">Reset encounter</button>
              </div>

              <div id="encCards" class="enc-cards"></div>
            </div>
          </div>
        </div>
      `;

      const nameEl = panelEl.querySelector("#encName");
      const typeEl = panelEl.querySelector("#encType");
      const initEl = panelEl.querySelector("#encInit");
      const hpMaxEl = panelEl.querySelector("#encHpMax");
      const hpCurrentEl = panelEl.querySelector("#encHpCurrent");
      const acEl = panelEl.querySelector("#encAC");
      const speedEl = panelEl.querySelector("#encSpeed");

      const addBtn = panelEl.querySelector("#encAddBtn");
      const clearFormBtn = panelEl.querySelector("#encClearFormBtn");
      const saveAsPartyBtn = panelEl.querySelector("#encSaveAsPartyBtn");

      const partyStrip = panelEl.querySelector("#encPartyStrip");

      const roundVal = panelEl.querySelector("#encRoundVal");
      const currentLabel = panelEl.querySelector("#encCurrentLabel");
      const prevBtn = panelEl.querySelector("#encPrevBtn");
      const nextBtn = panelEl.querySelector("#encNextBtn");
      const resetBtn = panelEl.querySelector("#encResetBtn");
      const cardsContainer = panelEl.querySelector("#encCards");

      let editingId = null; // if set, Add/Update edits instead of creating

      function fillFormFromCombatant(c) {
        editingId = c.id;
        nameEl.value = c.name;
        typeEl.value = c.type;
        initEl.value = c.init || "";
        hpMaxEl.value = c.hpMax || "";
        hpCurrentEl.value = c.hpCurrent || "";
        acEl.value = c.ac || "";
        speedEl.value = c.speed || "";
      }

      function clearForm() {
        editingId = null;
        nameEl.value = "";
        initEl.value = "";
        hpMaxEl.value = "";
        hpCurrentEl.value = "";
        acEl.value = "";
        speedEl.value = "";
      }

      function renderPartyStrip() {
        partyStrip.innerHTML = "";
        if (!state.party.length) {
          partyStrip.innerHTML = `<span class="muted" style="font-size:0.75rem;">No saved party members yet.</span>`;
          return;
        }
        const frag = document.createDocumentFragment();
        state.party.forEach(tpl => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "enc-party-btn";
          btn.textContent = tpl.name;
          btn.dataset.name = tpl.name;
          frag.appendChild(btn);
        });
        partyStrip.appendChild(frag);
      }

      function renderCards() {
        roundVal.textContent = state.round.toString();

        const ordered = getOrderedCombatants();
        const activeId = state.activeCombatantId;

        if (!ordered.length) {
          cardsContainer.innerHTML = `<div class="muted" style="font-size:0.8rem;">No combatants yet. Add some on the left.</div>`;
          currentLabel.textContent = "No active turn";
          return;
        }

        const active = activeId ? ordered.find(c => c.id === activeId) : ordered[0];
        if (!state.activeCombatantId && active) state.activeCombatantId = active.id;
        currentLabel.textContent = active ? `Current: ${active.name}` : "No active turn";

        cardsContainer.innerHTML = "";
        const frag = document.createDocumentFragment();

        ordered.forEach(c => {
          const card = document.createElement("div");
          card.className = `enc-card ${c.type} ${c.dead ? "dead" : ""} ${
            c.id === state.activeCombatantId ? "active" : ""
          }`;
          card.dataset.id = String(c.id);

          const avatar = document.createElement("div");
          avatar.className = `enc-avatar ${c.type}`;
          avatar.textContent = c.type === "enemy" ? "EN" : c.type.toUpperCase();

          const main = document.createElement("div");
          main.className = "enc-main";

          const nameRow = document.createElement("div");
          nameRow.className = "enc-name-row";

          const nameSpan = document.createElement("div");
          nameSpan.className = "enc-name";
          nameSpan.textContent = c.name;

          const tag = document.createElement("span");
          tag.className = "enc-tag";
          tag.textContent = `Init ${c.init || 0}`;

          nameRow.appendChild(nameSpan);
          nameRow.appendChild(tag);

          const hpRow = document.createElement("div");
          hpRow.className = "enc-hp-row";

          const hpLabel = document.createElement("span");
          hpLabel.className = "enc-hp-label";
          hpLabel.textContent = "HP";

          const hpVal = document.createElement("span");
          hpVal.className = "enc-hp-val";
          hpVal.textContent = `${c.hpCurrent} / ${c.hpMax}`;

          const dmgInput = document.createElement("input");
          dmgInput.type = "number";
          dmgInput.inputMode = "numeric";
          dmgInput.className = "enc-mini-input";
          dmgInput.placeholder = "±";

          const dmgBtn = document.createElement("button");
          dmgBtn.type = "button";
          dmgBtn.className = "btn-secondary btn-small enc-incard-btn";
          dmgBtn.textContent = "Damage";

          const healBtn = document.createElement("button");
          healBtn.type = "button";
          healBtn.className = "btn-secondary btn-small enc-incard-btn";
          healBtn.textContent = "Heal";

          hpRow.appendChild(hpLabel);
          hpRow.appendChild(hpVal);
          hpRow.appendChild(dmgInput);
          hpRow.appendChild(dmgBtn);
          hpRow.appendChild(healBtn);

          main.appendChild(nameRow);
          main.appendChild(hpRow);

          const side = document.createElement("div");
          side.className = "enc-side";

          const sideTop = document.createElement("div");
          sideTop.className = "enc-side-top";
          sideTop.innerHTML = `
            <div>AC ${c.ac}</div>
            <div>SPD ${c.speed}</div>
          `;

          const sideBottom = document.createElement("div");
          sideBottom.className = "enc-side-bottom";

          const editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "btn-secondary btn-small enc-incard-btn";
          editBtn.textContent = "Edit";

          const killBtn = document.createElement("button");
          killBtn.type = "button";
          killBtn.className = "btn-secondary btn-small enc-incard-btn";
          killBtn.textContent = c.dead ? "Revive" : "Kill";

          sideBottom.appendChild(editBtn);
          sideBottom.appendChild(killBtn);

          side.appendChild(sideTop);
          side.appendChild(sideBottom);

          card.appendChild(avatar);
          card.appendChild(main);
          card.appendChild(side);

          // Wiring
          dmgBtn.addEventListener("click", () => {
            const val = Number(dmgInput.value || "0");
            if (!val) return;
            const target = findCombatant(c.id);
            if (!target) return;
            target.hpCurrent = Math.max(0, target.hpCurrent - val);
            if (target.hpCurrent === 0) target.dead = true;
            dmgInput.value = "";
            renderCards();
          });

          healBtn.addEventListener("click", () => {
            const val = Number(dmgInput.value || "0");
            if (!val) return;
            const target = findCombatant(c.id);
            if (!target) return;
            target.hpCurrent = Math.min(target.hpMax, target.hpCurrent + val);
            if (target.hpCurrent > 0) target.dead = false;
            dmgInput.value = "";
            renderCards();
          });

          editBtn.addEventListener("click", () => {
            const target = findCombatant(c.id);
            if (!target) return;
            fillFormFromCombatant(target);
          });

          killBtn.addEventListener("click", () => {
            const target = findCombatant(c.id);
            if (!target) return;
            target.dead = !target.dead;
            if (!target.dead && target.hpCurrent === 0) {
              target.hpCurrent = 1;
            }
            renderCards();
          });

          frag.appendChild(card);
        });

        cardsContainer.appendChild(frag);
      }

      // Initial render
      renderPartyStrip();
      renderCards();

      // ---- Event hooks --------------------------------------------

      addBtn.addEventListener("click", () => {
        const name = nameEl.value.trim();
        if (!name) {
          showToast(panelEl, "Name is required.");
          return;
        }
        const data = {
          name,
          type: typeEl.value,
          init: Number(initEl.value || "0"),
          hpMax: Number(hpMaxEl.value || "1"),
          hpCurrent: hpCurrentEl.value ? Number(hpCurrentEl.value) : Number(hpMaxEl.value || "1"),
          ac: Number(acEl.value || "10"),
          speed: Number(speedEl.value || "30")
        };

        if (editingId != null) {
          const existing = findCombatant(editingId);
          if (existing) {
            existing.name = data.name;
            existing.type = data.type;
            existing.init = data.init;
            existing.hpMax = Math.max(1, data.hpMax);
            existing.hpCurrent = Math.max(0, Math.min(existing.hpMax, data.hpCurrent));
            existing.ac = data.ac;
            existing.speed = data.speed;
          }
          editingId = null;
          showToast(panelEl, "Updated combatant.");
        } else {
          const c = createCombatant(data);
          state.combatants.push(c);
          if (!state.activeCombatantId) state.activeCombatantId = c.id;
          showToast(panelEl, "Added combatant.");
        }

        sortCombatants();
        renderCards();
      });

      clearFormBtn.addEventListener("click", () => {
        clearForm();
      });

      saveAsPartyBtn.addEventListener("click", () => {
        const name = nameEl.value.trim();
        if (!name) {
          showToast(panelEl, "Set up a combatant in the form, then save as party.");
          return;
        }
        const data = {
          name,
          type: typeEl.value,
          ac: Number(acEl.value || "10"),
          speed: Number(speedEl.value || "30"),
          hpMax: Number(hpMaxEl.value || "1")
        };
        const templateCombatant = createCombatant({
          ...data,
          init: 0,
          hpCurrent: data.hpMax
        });
        upsertPartyTemplate(templateCombatant);
        renderPartyStrip();
        showToast(panelEl, `Saved ${data.name} to party.`);
      });

      partyStrip.addEventListener("click", e => {
        const btn = e.target.closest(".enc-party-btn");
        if (!btn) return;
        const name = btn.dataset.name;
        const tpl = state.party.find(p => p.name === name);
        if (!tpl) return;
        spawnFromTemplate(tpl);
        renderCards();
        showToast(panelEl, `Added ${tpl.name} to encounter.`);
      });

      nextBtn.addEventListener("click", () => {
        goToNextTurn();
        renderCards();
      });

      prevBtn.addEventListener("click", () => {
        goToPrevTurn();
        renderCards();
      });

      resetBtn.addEventListener("click", () => {
        if (!window.confirm("Reset encounter? This clears combatants and round counter.")) return;
        resetEncounter();
        renderCards();
      });
    }
  });
})();
