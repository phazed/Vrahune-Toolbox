// tool-encounter.js
(function () {
  const STORAGE_ENCOUNTER_KEY = "vrahuneEncounterV1";
  const STORAGE_PARTY_KEY = "vrahunePartyV1";

  function loadStoredEncounter() {
    try {
      const raw = localStorage.getItem(STORAGE_ENCOUNTER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveStoredEncounter(data) {
    try {
      localStorage.setItem(STORAGE_ENCOUNTER_KEY, JSON.stringify(data));
    } catch {}
  }

  function loadStoredParty() {
    try {
      const raw = localStorage.getItem(STORAGE_PARTY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveStoredParty(party) {
    try {
      localStorage.setItem(STORAGE_PARTY_KEY, JSON.stringify(party));
    } catch {}
  }

  window.registerTool({
    id: "encounterInitiative",
    name: "Encounter / Initiative",
    description: "Track combat rounds, initiative, HP, AC, and speed for PCs and enemies.",
    render(panel) {
      const saved = loadStoredEncounter();

      let combatants = saved?.combatants || [];
      let round = saved?.round || 1;
      let activeIndex = saved?.activeIndex || 0;

      let editingId = null;

      const party = loadStoredParty();

      panel.innerHTML = `
        <div class="muted" style="margin-bottom:4px;">
          Track encounters: initiative, HP, AC, speed, and rounds. PCs and enemies in one place.
        </div>

        <div class="row">
          <div class="col">
            <label>Round</label>
            <div style="display:flex; align-items:center; gap:4px;">
              <button id="encRoundDown" class="btn-secondary btn-small" type="button">–</button>
              <input id="encRoundInput" type="number" min="1" value="${round}" style="width:60px; text-align:center;">
              <button id="encRoundUp" class="btn-secondary btn-small" type="button">+</button>
              <button id="encNextTurn" class="btn-primary btn-small" type="button">Next turn</button>
            </div>
          </div>
          <div class="col">
            <label>Encounter controls</label>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">
              <button id="encAddFormToggle" class="btn-primary btn-small" type="button">Add / Edit combatant</button>
              <button id="encSortInit" class="btn-secondary btn-small" type="button">Sort by initiative</button>
              <button id="encClear" class="btn-secondary btn-small danger" type="button">Clear encounter</button>
            </div>
          </div>
        </div>

        <div id="encForm" style="margin-top:6px; border:1px solid #222832; border-radius:10px; padding:8px 8px; display:none; background:#05070c;">
          <div class="row">
            <div class="col">
              <label for="encName">Name</label>
              <input id="encName" type="text" placeholder="Character / monster name">
            </div>
            <div class="col">
              <label for="encSide">Side</label>
              <select id="encSide">
                <option value="pc">PC / Ally</option>
                <option value="enemy">Enemy</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="col">
              <label for="encInit">Initiative</label>
              <input id="encInit" type="number" step="0.1" placeholder="e.g. 15" />
            </div>
          </div>

          <div class="row">
            <div class="col">
              <label for="encHPMax">HP Max</label>
              <input id="encHPMax" type="number" min="0" placeholder="e.g. 38" />
            </div>
            <div class="col">
              <label for="encHPCurrent">HP Current</label>
              <input id="encHPCurrent" type="number" min="0" placeholder="current" />
            </div>
            <div class="col">
              <label for="encAC">AC</label>
              <input id="encAC" type="number" min="0" placeholder="Armor Class" />
            </div>
            <div class="col">
              <label for="encSpeed">Speed</label>
              <input id="encSpeed" type="text" placeholder="e.g. 30 ft." />
            </div>
          </div>

          <div class="row" style="margin-top:4px; justify-content:space-between;">
            <div class="col">
              <button id="encFormCancel" class="btn-secondary btn-small" type="button">Cancel</button>
            </div>
            <div class="col" style="text-align:right;">
              <button id="encFormSave" class="btn-primary btn-small" type="button">Save combatant</button>
            </div>
          </div>
        </div>

        <div class="row" style="margin-top:6px;">
          <div class="col">
            <label>Party</label>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">
              <button id="encAddParty" class="btn-secondary btn-small" type="button">Add saved party</button>
              <button id="encSaveParty" class="btn-secondary btn-small" type="button">Save PCs as party</button>
            </div>
            <div id="encPartyHint" class="muted" style="font-size:0.75rem; margin-top:2px;">
              Saved party has ${party.length} member(s).
            </div>
          </div>
        </div>

        <div class="muted" style="margin-top:6px; font-size:0.75rem;">
          Click HP numbers to edit directly. Use the small box + Damage / Heal to apply changes quickly.
        </div>

        <div id="encList" class="generated-list" style="margin-top:4px;"></div>
      `;

      const encRoundInput = panel.querySelector("#encRoundInput");
      const encRoundUp = panel.querySelector("#encRoundUp");
      const encRoundDown = panel.querySelector("#encRoundDown");
      const encNextTurn = panel.querySelector("#encNextTurn");
      const encFormToggle = panel.querySelector("#encAddFormToggle");
      const encForm = panel.querySelector("#encForm");
      const encFormSave = panel.querySelector("#encFormSave");
      const encFormCancel = panel.querySelector("#encFormCancel");
      const encSortInit = panel.querySelector("#encSortInit");
      const encClear = panel.querySelector("#encClear");
      const encList = panel.querySelector("#encList");
      const encAddPartyBtn = panel.querySelector("#encAddParty");
      const encSavePartyBtn = panel.querySelector("#encSaveParty");
      const encPartyHint = panel.querySelector("#encPartyHint");

      const encName = panel.querySelector("#encName");
      const encSide = panel.querySelector("#encSide");
      const encInit = panel.querySelector("#encInit");
      const encHPMax = panel.querySelector("#encHPMax");
      const encHPCurrent = panel.querySelector("#encHPCurrent");
      const encAC = panel.querySelector("#encAC");
      const encSpeed = panel.querySelector("#encSpeed");

      function persist() {
        saveStoredEncounter({
          combatants,
          round,
          activeIndex
        });
      }

      function openFormForNew() {
        editingId = null;
        encName.value = "";
        encSide.value = "pc";
        encInit.value = "";
        encHPMax.value = "";
        encHPCurrent.value = "";
        encAC.value = "";
        encSpeed.value = "";
        encForm.style.display = "block";
      }

      function openFormForEdit(id) {
        const c = combatants.find(x => x.id === id);
        if (!c) return;
        editingId = id;
        encName.value = c.name || "";
        encSide.value = c.side || "pc";
        encInit.value = c.init ?? "";
        encHPMax.value = c.hpMax ?? "";
        encHPCurrent.value = c.hpCurrent ?? "";
        encAC.value = c.ac ?? "";
        encSpeed.value = c.speed || "";
        encForm.style.display = "block";
      }

      function closeForm() {
        editingId = null;
        encForm.style.display = "none";
      }

      function setRoundFromInput() {
        const v = parseInt(encRoundInput.value || "1", 10);
        round = isNaN(v) || v < 1 ? 1 : v;
        encRoundInput.value = String(round);
        persist();
      }

      encRoundUp.addEventListener("click", () => {
        round += 1;
        encRoundInput.value = String(round);
        persist();
      });

      encRoundDown.addEventListener("click", () => {
        round = Math.max(1, round - 1);
        encRoundInput.value = String(round);
        persist();
      });

      encRoundInput.addEventListener("change", setRoundFromInput);

      function nextTurn() {
        if (!combatants.length) return;
        activeIndex = (activeIndex + 1) % combatants.length;
        if (activeIndex === 0) {
          round += 1;
          encRoundInput.value = String(round);
        }
        persist();
        renderList();
      }

      encNextTurn.addEventListener("click", nextTurn);

      encFormToggle.addEventListener("click", () => {
        if (encForm.style.display === "none") {
          openFormForNew();
        } else {
          closeForm();
        }
      });

      encFormCancel.addEventListener("click", closeForm);

      encFormSave.addEventListener("click", () => {
        const name = (encName.value || "").trim() || "Unnamed";
        const side = encSide.value || "pc";
        const init = encInit.value === "" ? null : Number(encInit.value);
        const hpMax = encHPMax.value === "" ? null : Number(encHPMax.value);
        const hpCurrent = encHPCurrent.value === "" ? hpMax : Number(encHPCurrent.value);
        const ac = encAC.value === "" ? null : Number(encAC.value);
        const speed = encSpeed.value || "";

        if (editingId) {
          const idx = combatants.findIndex(c => c.id === editingId);
          if (idx !== -1) {
            combatants[idx] = {
              ...combatants[idx],
              name,
              side,
              init,
              hpMax,
              hpCurrent,
              ac,
              speed
            };
          }
        } else {
          const id = "c-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
          combatants.push({
            id,
            name,
            side,
            init,
            hpMax,
            hpCurrent,
            ac,
            speed
          });
          if (combatants.length === 1) {
            activeIndex = 0;
          }
        }

        persist();
        renderList();
        closeForm();
      });

      encSortInit.addEventListener("click", () => {
        combatants.sort((a, b) => {
          const ai = a.init ?? -Infinity;
          const bi = b.init ?? -Infinity;
          if (bi !== ai) return bi - ai;
          return (a.name || "").localeCompare(b.name || "");
        });
        activeIndex = 0;
        persist();
        renderList();
      });

      encClear.addEventListener("click", () => {
        if (!combatants.length) return;
        if (!window.confirm("Clear this encounter? This only affects the encounter, not the saved party.")) return;
        combatants = [];
        activeIndex = 0;
        persist();
        renderList();
      });

      encAddPartyBtn.addEventListener("click", () => {
        const stored = loadStoredParty();
        if (!stored.length) return;
        stored.forEach(p => {
          const id = "c-" + Date.now() + "-" + Math.floor(Math.random() * 10000) + "-" + Math.floor(Math.random() * 1000);
          combatants.push({ ...p, id });
        });
        if (combatants.length && activeIndex >= combatants.length) {
          activeIndex = 0;
        }
        persist();
        renderList();
      });

      encSavePartyBtn.addEventListener("click", () => {
        const pcs = combatants.filter(c => c.side === "pc");
        saveStoredParty(
          pcs.map(c => ({
            name: c.name,
            side: "pc",
            init: c.init ?? null,
            hpMax: c.hpMax ?? null,
            hpCurrent: c.hpCurrent ?? null,
            ac: c.ac ?? null,
            speed: c.speed || ""
          }))
        );
        if (encPartyHint) {
          encPartyHint.textContent = `Saved party has ${pcs.length} member(s).`;
        }
      });

      function renderList() {
        encList.innerHTML = "";
        if (!combatants.length) {
          encList.innerHTML = `<div class="muted">No combatants yet. Click “Add / Edit combatant” to begin.</div>`;
          return;
        }

        combatants.forEach((c, index) => {
          const isActive = index === activeIndex;
          const isDead = c.hpCurrent !== null && c.hpCurrent !== undefined && c.hpCurrent <= 0;
          const bg = isActive
            ? "linear-gradient(135deg, #283345, #151a22)"
            : "#05070c";
          const borderColor =
            isDead ? "#ff5c5c" :
            c.side === "enemy" ? "#733030" :
            "#222832";

          const card = document.createElement("div");
          card.className = "generated-item";
          card.dataset.id = c.id;
          card.style.marginBottom = "4px";
          card.style.padding = "6px 8px";
          card.style.borderRadius = "10px";
          card.style.border = `1px solid ${borderColor}`;
          card.style.background = bg;
          card.style.display = "flex";
          card.style.alignItems = "center";
          card.style.justifyContent = "space-between";
          card.style.gap = "8px";

          const left = document.createElement("div");
          left.style.display = "flex";
          left.style.flexDirection = "column";
          left.style.minWidth = "0";

          const nameRow = document.createElement("div");
          nameRow.style.display = "flex";
          nameRow.style.alignItems = "center";
          nameRow.style.gap = "6px";

          const nameEl = document.createElement("div");
          nameEl.textContent = c.name || "Unnamed";
          nameEl.style.fontWeight = "600";
          nameEl.style.fontSize = "0.9rem";

          const tag = document.createElement("span");
          tag.style.fontSize = "0.7rem";
          tag.style.padding = "1px 6px";
          tag.style.borderRadius = "999px";
          tag.style.border = "1px solid rgba(255,255,255,0.12)";
          tag.style.color = "#c0c0c0";
          tag.textContent = c.side === "enemy" ? "Enemy"
                          : c.side === "other" ? "Other"
                          : "PC";

          if (isDead) {
            const deadTag = document.createElement("span");
            deadTag.style.fontSize = "0.7rem";
            deadTag.style.padding = "1px 6px";
            deadTag.style.borderRadius = "999px";
            deadTag.style.border = "1px solid rgba(255,0,0,0.6)";
            deadTag.style.color = "#ff8a8a";
            deadTag.textContent = "DEAD";
            nameRow.appendChild(deadTag);
          }

          nameRow.appendChild(nameEl);
          nameRow.appendChild(tag);
          left.appendChild(nameRow);

          const mid = document.createElement("div");
          mid.style.display = "flex";
          mid.style.flexDirection = "column";
          mid.style.alignItems = "flex-start";
          mid.style.gap = "2px";

          // HP row
          const hpRow = document.createElement("div");
          hpRow.style.display = "flex";
          hpRow.style.alignItems = "center";
          hpRow.style.gap = "4px";

          const hpLabel = document.createElement("span");
          hpLabel.style.fontSize = "0.75rem";
          hpLabel.textContent = "HP:";

          const hpCurrent = document.createElement("span");
          hpCurrent.style.fontSize = "0.8rem";
          hpCurrent.style.fontWeight = "600";
          hpCurrent.style.cursor = "pointer";
          hpCurrent.title = "Click to edit current HP";
          hpCurrent.textContent = c.hpCurrent != null ? c.hpCurrent : "-";

          const hpSlash = document.createElement("span");
          hpSlash.style.fontSize = "0.8rem";
          hpSlash.textContent = "/";

          const hpMax = document.createElement("span");
          hpMax.style.fontSize = "0.8rem";
          hpMax.textContent = c.hpMax != null ? c.hpMax : "-";

          const dmgInput = document.createElement("input");
          dmgInput.type = "number";
          dmgInput.min = "0";
          dmgInput.placeholder = "#";
          dmgInput.style.width = "42px";
          dmgInput.style.fontSize = "0.75rem";
          dmgInput.style.padding = "2px 4px";
          dmgInput.style.borderRadius = "6px";
          dmgInput.style.border = "1px solid #232a33";
          dmgInput.style.background = "#05070c";
          dmgInput.style.color = "#e6e6e6";

          const dmgBtn = document.createElement("button");
          dmgBtn.type = "button";
          dmgBtn.className = "btn-secondary btn-small";
          dmgBtn.textContent = "Damage";

          const healBtn = document.createElement("button");
          healBtn.type = "button";
          healBtn.className = "btn-secondary btn-small";
          healBtn.textContent = "Heal";

          hpRow.appendChild(hpLabel);
          hpRow.appendChild(hpCurrent);
          hpRow.appendChild(hpSlash);
          hpRow.appendChild(hpMax);
          hpRow.appendChild(dmgInput);
          hpRow.appendChild(dmgBtn);
          hpRow.appendChild(healBtn);

          // AC / speed / init row
          const statsRow = document.createElement("div");
          statsRow.style.display = "flex";
          statsRow.style.flexWrap = "wrap";
          statsRow.style.gap = "6px";
          statsRow.style.fontSize = "0.75rem";
          statsRow.style.color = "#9ba1aa";

          const statAC = document.createElement("span");
          statAC.textContent = `AC: ${c.ac != null ? c.ac : "-"}`;

          const statSpeed = document.createElement("span");
          statSpeed.textContent = `Speed: ${c.speed || "-"}`;

          const statInit = document.createElement("span");
          statInit.textContent = `Init: ${c.init != null ? c.init : "-"}`;

          statsRow.appendChild(statAC);
          statsRow.appendChild(statSpeed);
          statsRow.appendChild(statInit);

          mid.appendChild(hpRow);
          mid.appendChild(statsRow);

          const right = document.createElement("div");
          right.style.display = "flex";
          right.style.flexDirection = "column";
          right.style.alignItems = "flex-end";
          right.style.gap = "4px";

          const turnBadge = document.createElement("span");
          turnBadge.style.fontSize = "0.7rem";
          turnBadge.style.padding = "1px 6px";
          turnBadge.style.borderRadius = "999px";
          turnBadge.style.border = "1px solid rgba(255,255,255,0.12)";
          turnBadge.style.color = "#c0c0c0";
          turnBadge.textContent = isActive ? `Turn ${index + 1}` : `#${index + 1}`;

          const btnRow = document.createElement("div");
          btnRow.style.display = "flex";
          btnRow.style.gap = "4px";

          const editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "btn-secondary btn-small";
          editBtn.textContent = "Edit";

          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "btn-secondary btn-small";
          removeBtn.textContent = "✕";

          btnRow.appendChild(editBtn);
          btnRow.appendChild(removeBtn);

          right.appendChild(turnBadge);
          right.appendChild(btnRow);

          card.appendChild(left);
          card.appendChild(mid);
          card.appendChild(right);

          // HP click to edit
          hpCurrent.addEventListener("click", () => {
            const newVal = window.prompt("Set current HP:", c.hpCurrent != null ? c.hpCurrent : "");
            if (newVal === null) return;
            const num = Number(newVal);
            if (!isNaN(num)) {
              c.hpCurrent = num;
              persist();
              renderList();
            }
          });

          // Damage / heal
          dmgBtn.addEventListener("click", () => {
            const v = Number(dmgInput.value);
            if (isNaN(v) || v <= 0) return;
            const cur = c.hpCurrent != null ? c.hpCurrent : c.hpMax ?? 0;
            c.hpCurrent = cur - v;
            dmgInput.value = "";
            persist();
            renderList();
          });

          healBtn.addEventListener("click", () => {
            const v = Number(dmgInput.value);
            if (isNaN(v) || v <= 0) return;
            const cur = c.hpCurrent != null ? c.hpCurrent : 0;
            const max = c.hpMax != null ? c.hpMax : cur + v;
            let next = cur + v;
            if (next > max) next = max;
            c.hpCurrent = next;
            dmgInput.value = "";
            persist();
            renderList();
          });

          // Edit / remove
          editBtn.addEventListener("click", () => {
            openFormForEdit(c.id);
          });

          removeBtn.addEventListener("click", () => {
            if (!window.confirm(`Remove ${c.name || "this combatant"} from encounter?`)) return;
            const idx = combatants.findIndex(x => x.id === c.id);
            if (idx !== -1) {
              combatants.splice(idx, 1);
              if (combatants.length === 0) {
                activeIndex = 0;
              } else if (activeIndex >= combatants.length) {
                activeIndex = combatants.length - 1;
              }
              persist();
              renderList();
            }
          });

          encList.appendChild(card);
        });
      }

      // Initial render
      encRoundInput.value = String(round);
      renderList();
    }
  });
})();
