/**
 * monster_builder.js
 * The Architect Tool for GMs to create, edit, and save stat blocks.
 */

import { I18n } from '../utils/i18n.js';
import { Storage } from '../utils/storage.js';

export const MonsterBuilder = {
    
    // State Object
    currentMonster: {
        id: null,
        name: "Nameless Horror",
        role: "soldier",
        level: 1,
        family: "folk",
        stats: { hp: 0, as: 0, speed: 0, atk: 0, def: 0, save: 0, dmg: "" },
        traits: [], 
        actions: [], 
        danger_abilities: [],
        custom_abilities: [], 
        notes: ""
    },

    init: (container) => {
        MonsterBuilder.renderInterface(container);
        // Only calculate defaults if we are starting fresh (no ID set from a load)
        if (!MonsterBuilder.currentMonster.id) {
            MonsterBuilder.updateCalculation();
        } else {
            // If we have a loaded monster, just render it
            MonsterBuilder.renderAbilityPickers(MonsterBuilder.currentMonster.family);
            MonsterBuilder.renderCard();
        }
    },

    /**
     * Loads a monster object into the editor state.
     */
    loadMonster: (monsterData) => {
        // 1. Deep copy to prevent reference issues
        MonsterBuilder.currentMonster = JSON.parse(JSON.stringify(monsterData));
        
        // 2. DATA SANITIZATION (Fixing the crash)
        // Ensure arrays exist even if the JSON didn't have them
        if (!MonsterBuilder.currentMonster.traits) MonsterBuilder.currentMonster.traits = [];
        if (!MonsterBuilder.currentMonster.actions) MonsterBuilder.currentMonster.actions = [];
        if (!MonsterBuilder.currentMonster.danger_abilities) MonsterBuilder.currentMonster.danger_abilities = [];
        if (!MonsterBuilder.currentMonster.custom_abilities) MonsterBuilder.currentMonster.custom_abilities = [];
        if (!MonsterBuilder.currentMonster.notes) MonsterBuilder.currentMonster.notes = "";

        // 3. Handle "Clone" logic for official monsters
        if (monsterData.source === 'official') {
            MonsterBuilder.currentMonster.id = null;
            MonsterBuilder.currentMonster.name = `${monsterData.name} (Copy)`;
        }

        // 4. Update DOM Inputs (if the DOM is ready)
        // We check for an element to see if the view is active.
        const nameInput = document.getElementById('mb-name');
        if (nameInput) {
            const m = MonsterBuilder.currentMonster;
            
            document.getElementById('mb-name').value = m.name;
            document.getElementById('mb-role').value = m.role.toLowerCase();
            document.getElementById('mb-level').value = m.level;
            document.getElementById('mb-family').value = m.family;
            
            document.getElementById('mb-hp').value = m.stats.hp;
            document.getElementById('mb-as').value = m.stats.as;
            document.getElementById('mb-speed').value = m.stats.speed;
            document.getElementById('mb-atk').value = m.stats.atk;
            document.getElementById('mb-def').value = m.stats.def;
            document.getElementById('mb-save').value = m.stats.save;
            document.getElementById('mb-dmg').value = m.stats.dmg;
            document.getElementById('mb-notes').value = m.notes;

            // Render Pickers
            MonsterBuilder.renderAbilityPickers(m.family);
            MonsterBuilder.syncCheckboxes(); // New helper
            MonsterBuilder.renderCard();
        }
        
        console.log(`Loaded ${MonsterBuilder.currentMonster.name}`);
    },

    renderInterface: (container) => {
        const data = I18n.getData('monsters');
        if (!data) return container.innerHTML = "Error loading monster data.";

        const roles = Object.keys(data.chassis);
        const families = Object.keys(data.families);

        const html = `
            <div class="architect-layout">
                <!-- LEFT: THE LAB -->
                <div class="architect-controls">
                    <div class="form-group">
                        <label class="form-label">Name</label>
                        <input type="text" id="mb-name" value="${MonsterBuilder.currentMonster.name}">
                    </div>

                    <div class="split-view" style="gap:10px; margin-bottom:1rem;">
                        <div>
                            <label class="form-label">Role</label>
                            <select id="mb-role">
                                ${roles.map(r => `<option value="${r}">${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Level</label>
                            <select id="mb-level">
                                ${Array.from({length:10}, (_, i) => i+1).map(n => `<option value="${n}">${n}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Family</label>
                            <select id="mb-family">
                                ${families.map(f => `<option value="${f}">${data.families[f].name}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="info-box" style="margin-bottom:1rem;">
                        <h4 style="margin-top:0; color:var(--accent-blue); font-size:0.9rem; text-transform:uppercase;">Base Stats (Editable)</h4>
                        <div class="stat-grid" style="grid-template-columns: repeat(3, 1fr); gap:10px;">
                            <div class="stat-input"><label>HP</label><input type="number" id="mb-hp"></div>
                            <div class="stat-input"><label>AS</label><input type="number" id="mb-as"></div>
                            <div class="stat-input"><label>Speed</label><input type="text" id="mb-speed"></div>
                            <div class="stat-input"><label>Atk DC</label><input type="number" id="mb-atk"></div>
                            <div class="stat-input"><label>Def DC</label><input type="number" id="mb-def"></div>
                            <div class="stat-input"><label>Save DC</label><input type="number" id="mb-save"></div>
                        </div>
                        <div style="margin-top:10px;">
                            <label class="form-label">Damage Formula</label>
                            <input type="text" id="mb-dmg">
                        </div>
                    </div>

                    <div id="ability-section"></div>

                    <div class="custom-builder">
                        <h4 style="margin-top:0; color:var(--accent-gold); font-size:0.9rem; text-transform:uppercase;">Forge Ability</h4>
                        <div class="custom-row">
                            <input type="text" id="cust-name" placeholder="Ability Name" style="flex:2;">
                            <select id="cust-type" style="flex:1;">
                                <option value="trait">Trait/Passive</option>
                                <option value="action">Action</option>
                                <option value="danger">Danger Ability</option>
                            </select>
                        </div>
                        <div class="custom-row">
                            <textarea id="cust-effect" rows="2" placeholder="Effect description..." style="width:100%; background:#111; color:#eee; border:1px solid #444; padding:5px;"></textarea>
                        </div>
                         <div class="custom-row" id="cust-cost-row" style="display:none;">
                            <input type="text" id="cust-cost" placeholder="Cost (e.g. 1 DP)" value="1 DP">
                        </div>
                        <button id="btn-add-custom" class="btn-add">+ Add Custom Ability</button>
                    </div>

                    <div class="form-group" style="margin-top:1rem;">
                        <label class="form-label">Notes</label>
                        <textarea id="mb-notes" rows="3" style="width:100%; background:var(--bg-input); color:#eee; border:1px solid #333; padding:5px;"></textarea>
                    </div>
                </div>

                <!-- RIGHT: THE PREVIEW -->
                <div class="architect-preview">
                    <div id="monster-card-display" class="monster-card"></div>
                    <div style="margin-top:1rem; display:flex; gap:10px;">
                        <button id="btn-print-monster" class="btn-secondary">🖨️ Print</button>
                        <button id="btn-save-monster" class="btn-primary">💾 Save</button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        MonsterBuilder.attachListeners();
        
        // If state is loaded, populate values
        if(MonsterBuilder.currentMonster.id || MonsterBuilder.currentMonster.role) {
             // We trigger a UI update based on current state without recalculating defaults
             // This is tricky, so we manually set values
             const m = MonsterBuilder.currentMonster;
             document.getElementById('mb-role').value = m.role.toLowerCase();
             document.getElementById('mb-level').value = m.level;
             document.getElementById('mb-family').value = m.family;
             
             // Manually call renderAbilityPickers to ensure DOM exists
             MonsterBuilder.renderAbilityPickers(m.family);
             
             // Now sync stats to inputs
             document.getElementById('mb-hp').value = m.stats.hp;
             document.getElementById('mb-as').value = m.stats.as;
             document.getElementById('mb-speed').value = m.stats.speed;
             document.getElementById('mb-atk').value = m.stats.atk;
             document.getElementById('mb-def').value = m.stats.def;
             document.getElementById('mb-save').value = m.stats.save;
             document.getElementById('mb-dmg').value = m.stats.dmg;
             document.getElementById('mb-notes').value = m.notes;
             
             MonsterBuilder.syncCheckboxes();
             MonsterBuilder.renderCard();
        }
    },

    attachListeners: () => {
        ['mb-role', 'mb-level', 'mb-family'].forEach(id => {
            document.getElementById(id).addEventListener('change', MonsterBuilder.updateCalculation);
        });
        ['mb-hp', 'mb-as', 'mb-speed', 'mb-atk', 'mb-def', 'mb-save', 'mb-dmg'].forEach(id => {
            document.getElementById(id).addEventListener('input', MonsterBuilder.syncManualStats);
        });
        document.getElementById('mb-name').addEventListener('input', (e) => {
            MonsterBuilder.currentMonster.name = e.target.value;
            MonsterBuilder.renderCard();
        });
        document.getElementById('cust-type').addEventListener('change', (e) => {
            document.getElementById('cust-cost-row').style.display = e.target.value === 'danger' ? 'flex' : 'none';
        });
        document.getElementById('btn-add-custom').addEventListener('click', MonsterBuilder.addCustomAbility);
        document.getElementById('mb-notes').addEventListener('input', (e) => {
            MonsterBuilder.currentMonster.notes = e.target.value;
            MonsterBuilder.renderCard();
        });
        document.getElementById('btn-save-monster').addEventListener('click', MonsterBuilder.save);
        document.getElementById('btn-print-monster').addEventListener('click', () => window.print());
    },

    updateCalculation: () => {
        const data = I18n.getData('monsters');
        const role = document.getElementById('mb-role').value;
        const level = parseInt(document.getElementById('mb-level').value);
        const familyKey = document.getElementById('mb-family').value;
        
        const chassis = data.chassis[role].find(c => c.lvl === level);
        
        document.getElementById('mb-hp').value = chassis.hp;
        document.getElementById('mb-as').value = chassis.as;
        document.getElementById('mb-speed').value = chassis.speed;
        document.getElementById('mb-atk').value = chassis.atk_dc;
        document.getElementById('mb-def').value = chassis.def_dc;
        document.getElementById('mb-save').value = chassis.save_dc;
        document.getElementById('mb-dmg').value = chassis.dmg;

        const m = MonsterBuilder.currentMonster;
        m.role = role;
        m.level = level;
        m.family = familyKey;
        
        MonsterBuilder.syncManualStats();
        MonsterBuilder.renderAbilityPickers(familyKey);
    },

    syncManualStats: () => {
        const m = MonsterBuilder.currentMonster;
        m.stats.hp = document.getElementById('mb-hp').value;
        m.stats.as = document.getElementById('mb-as').value;
        m.stats.speed = document.getElementById('mb-speed').value;
        m.stats.atk = document.getElementById('mb-atk').value;
        m.stats.def = document.getElementById('mb-def').value;
        m.stats.save = document.getElementById('mb-save').value;
        m.stats.dmg = document.getElementById('mb-dmg').value;
        MonsterBuilder.renderCard();
    },

    renderAbilityPickers: (familyKey) => {
        const data = I18n.getData('monsters');
        const fam = data.families[familyKey];
        const container = document.getElementById('ability-section');
        
        // Clear standard arrays on re-render (Customs persist)
        const m = MonsterBuilder.currentMonster;
        m.traits = [];
        m.actions = [];
        m.danger_abilities = [];

        const createAccordion = (title, items, typeKey, isOpen) => {
            if (!items || items.length === 0) return '';
            const badgeId = `badge-${typeKey}`;
            let html = `
                <details class="arch-accordion" ${isOpen ? 'open' : ''}>
                    <summary class="arch-summary">${title} <span id="${badgeId}" class="count-badge">0</span></summary>
                    <div class="arch-content">
            `;
            items.forEach((item, idx) => {
                const cid = `chk-${typeKey}-${idx}`;
                // Universal traits default to Checked
                const isChecked = (typeKey === 'traits'); 
                html += `
                    <div class="picker-item">
                        <input type="checkbox" id="${cid}" data-type="${typeKey}" data-idx="${idx}" ${isChecked ? 'checked' : ''}>
                        <div class="picker-content">
                            <div class="picker-name">${item.name} ${item.cost ? `(${item.cost})` : ''}</div>
                            <div class="picker-desc">${item.effect}</div>
                        </div>
                    </div>
                `;
            });
            html += `</div></details>`;
            return html;
        };

        let html = "";
        html += createAccordion("Universal Traits", fam.universal_traits, "traits", false);
        html += createAccordion("Passive Traits", fam.passives, "passives", true);
        html += createAccordion("Actions", fam.actions, "actions", true);
        html += createAccordion("Danger Abilities", fam.danger_abilities, "danger", false);

        container.innerHTML = html;

        container.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', () => MonsterBuilder.scanSelections());
        });

        MonsterBuilder.scanSelections();
    },

    // Syncs the visual checkboxes with the loaded data in currentMonster
    syncCheckboxes: () => {
        const m = MonsterBuilder.currentMonster;
        // Flatten current selections for searching
        const allSel = [...m.traits, ...m.actions, ...m.danger_abilities];

        document.querySelectorAll('.arch-content input[type="checkbox"]').forEach(chk => {
            const nameEl = chk.nextElementSibling.querySelector('.picker-name');
            if (!nameEl) return;
            const name = nameEl.textContent.split(' (')[0].trim();
            
            const match = allSel.some(s => s.name === name);
            chk.checked = match;
        });
        // Re-scan to update badges and internal arrays
        MonsterBuilder.scanSelections();
    },

    scanSelections: () => {
        const m = MonsterBuilder.currentMonster;
        const data = I18n.getData('monsters');
        const fam = data.families[m.family];

        m.traits = [];
        m.actions = [];
        m.danger_abilities = [];

        const counts = { traits: 0, passives: 0, actions: 0, danger: 0 };

        document.querySelectorAll('.arch-content input:checked').forEach(chk => {
            const type = chk.dataset.type;
            const idx = parseInt(chk.dataset.idx);
            counts[type]++;

            if (type === 'traits') m.traits.push(fam.universal_traits[idx]);
            if (type === 'passives') m.traits.push(fam.passives[idx]); 
            if (type === 'actions') m.actions.push(fam.actions[idx]);
            if (type === 'danger') m.danger_abilities.push(fam.danger_abilities[idx]);
        });

        for (const [key, val] of Object.entries(counts)) {
            const badge = document.getElementById(`badge-${key}`);
            if(badge) {
                badge.textContent = val;
                badge.classList.toggle('active', val > 0);
            }
        }
        MonsterBuilder.renderCard();
    },

    addCustomAbility: () => {
        const nameEl = document.getElementById('cust-name');
        const typeEl = document.getElementById('cust-type');
        const effEl = document.getElementById('cust-effect');
        const costEl = document.getElementById('cust-cost');

        const name = nameEl.value.trim();
        const effect = effEl.value.trim();
        if (!name || !effect) return alert("Name and Effect required.");

        const newAb = {
            id: Date.now(),
            name: name,
            type: typeEl.value,
            effect: effect,
            cost: (typeEl.value === 'danger') ? costEl.value : null
        };

        MonsterBuilder.currentMonster.custom_abilities.push(newAb);
        nameEl.value = "";
        effEl.value = "";
        MonsterBuilder.renderCard();
    },

    removeCustomAbility: (id) => {
        const m = MonsterBuilder.currentMonster;
        m.custom_abilities = m.custom_abilities.filter(a => a.id !== id);
        MonsterBuilder.renderCard();
    },

    renderCard: () => {
        const m = MonsterBuilder.currentMonster;
        const card = document.getElementById('monster-card-display');
        if (!card) return;
        
        const roleCap = m.role.charAt(0).toUpperCase() + m.role.slice(1);
        
        // Safely merge arrays (Ensuring they exist)
        const displayTraits = [...(m.traits || [])];
        const displayActions = [...(m.actions || [])];
        const displayDanger = [...(m.danger_abilities || [])];

        // Add Customs
        if (m.custom_abilities) {
            m.custom_abilities.forEach(c => {
                if (c.type === 'trait') displayTraits.push(c);
                if (c.type === 'action') displayActions.push(c);
                if (c.type === 'danger') displayDanger.push(c);
            });
        }

        const renderRow = (item, isDanger) => {
             const delBtn = item.id ? `<span class="del-custom" data-id="${item.id}" style="cursor:pointer; color:red; margin-left:5px;">[×]</span>` : '';
             const cost = item.cost ? `(${item.cost})` : '';
             return `<div class="mc-ability ${isDanger ? 'mc-danger' : ''}">
                <span class="mc-ability-name">${item.name} ${cost}:</span> ${item.effect} ${delBtn}
             </div>`;
        };

        const html = `
            <div class="mc-header">
                <div class="mc-name">${m.name}</div>
                <div class="mc-meta">Lvl ${m.level} ${roleCap}</div>
            </div>
            <div class="mc-stats-grid">
                <div class="mc-stat"><div class="mc-stat-label">HP</div><div class="mc-stat-val" style="color:#8a2c2c;">${m.stats.hp}</div></div>
                <div class="mc-stat"><div class="mc-stat-label">Armor</div><div class="mc-stat-val">${m.stats.as}</div></div>
                <div class="mc-stat"><div class="mc-stat-label">Atk DC</div><div class="mc-stat-val">${m.stats.atk}</div></div>
                <div class="mc-stat"><div class="mc-stat-label">Def DC</div><div class="mc-stat-val">${m.stats.def}</div></div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #aaa; font-size:0.9rem;">
                <span><strong>Speed:</strong> ${m.stats.speed} ft</span>
                <span><strong>Save DC:</strong> ${m.stats.save}</span>
            </div>
            <div class="mc-section">
                <div class="mc-section-title">Standard Attack</div>
                <div class="mc-ability"><strong>Damage:</strong> ${m.stats.dmg}</div>
            </div>
            ${displayTraits.length ? `<div class="mc-section"><div class="mc-section-title">Traits</div>${displayTraits.map(t=>renderRow(t)).join('')}</div>` : ''}
            ${displayActions.length ? `<div class="mc-section"><div class="mc-section-title">Actions</div>${displayActions.map(a=>renderRow(a)).join('')}</div>` : ''}
            ${displayDanger.length ? `<div class="mc-section"><div class="mc-section-title" style="color:#8a2c2c;">Danger Abilities</div>${displayDanger.map(d=>renderRow(d,true)).join('')}</div>` : ''}
            ${m.notes ? `<div class="mc-section" style="border-top:1px dashed #aaa; margin-top:10px; font-style:italic;">${m.notes}</div>` : ''}
        `;

        card.innerHTML = html;
        
        card.querySelectorAll('.del-custom').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                MonsterBuilder.removeCustomAbility(parseInt(e.target.dataset.id));
            });
        });
    },

    save: () => {
        const m = MonsterBuilder.currentMonster;
        const saved = Storage.getLibrary('grim_monsters') || [];
        if (!m.id) m.id = 'mon_' + Date.now();
        
        const idx = saved.findIndex(x => x.id === m.id);
        if (idx > -1) saved[idx] = m;
        else saved.push(m);
        
        localStorage.setItem('grim_monsters', JSON.stringify(saved));
        alert(`Saved ${m.name} to Library.`);
    }
};