/**
 * item_builder.js
 * The Artificer module.
 * V2.0: Improved Styling & Layout
 */

import { I18n } from '../utils/i18n.js';
import { Dice } from '../utils/dice.js';

export const ItemBuilder = {
    
    container: null,
    state: {
        mode: 'forge', 
        baseCategory: 'weapon',
        filterText: ''
    },
    
    // Live Editable Object
    currentItem: {
        name: "New Item",
        type: "Weapon",
        cost: "-",
        slots: 1,
        damage: "",
        armor: "",
        tags: "",
        description: "Select a base item or edit fields to begin.",
        magicName: "",
        magicEffect: "",
        craftReq: "",
        isMagic: false
    },

    history: [],

    init: (container) => {
        ItemBuilder.container = container;
        ItemBuilder.renderInterface();
        ItemBuilder.loadBaseOptions();
        ItemBuilder.renderBlueprintList();
        ItemBuilder.syncDOMFromState();
        ItemBuilder.renderCard();
    },

    renderInterface: () => {
        const html = `
            <div class="artificer-layout">
                <!-- LEFT PANEL -->
                <div class="forge-controls">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h2 style="margin:0; border:none;">The Artificer</h2>
                        <div class="mode-toggle">
                            <button class="btn-small active" id="mode-forge">Forge</button>
                            <button class="btn-small" id="mode-loot">Loot</button>
                        </div>
                    </div>

                    <!-- FORGE UI -->
                    <div id="forge-ui">
                        <div class="forge-panel">
                            <h3>1. Base Item</h3>
                            <div class="form-group">
                                <select id="base-cat-select">
                                    <option value="weapon">Category: Weapon</option>
                                    <option value="armor">Category: Armor & Shields</option>
                                    <option value="trinket">Category: Wondrous Item</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <select id="base-item-select">
                                    <!-- Populated Dynamically -->
                                </select>
                            </div>
                        </div>

                        <div class="forge-panel" style="flex-grow:1; display:flex; flex-direction:column;">
                            <h3>2. Blueprint</h3>
                            <div class="blueprint-browser">
                                <div class="blueprint-filter">
                                    <input type="text" id="bp-search" placeholder="Search Effects..." style="width:100%;">
                                </div>
                                <div id="blueprint-list" class="blueprint-list">
                                    <!-- Populated Dynamically -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- LOOT GEN UI -->
                    <div id="loot-gen-ui" style="display:none;">
                        <div class="forge-panel">
                            <h3>Loot Tables</h3>
                            <div class="loot-btn-grid">
                                <button class="btn-loot tier-1" data-tier="tier_1">Tier 1<br><span>Scavenge</span></button>
                                <button class="btn-loot tier-2" data-tier="tier_2">Tier 2<br><span>Stash</span></button>
                                <button class="btn-loot tier-3" data-tier="tier_3">Tier 3<br><span>Hoard</span></button>
                            </div>
                        </div>
                         <div class="forge-panel" style="margin-top:1rem; flex-grow:1;">
                            <h3>Recent Finds</h3>
                            <div id="loot-log" class="loot-history"></div>
                        </div>
                    </div>

                    <!-- EDITOR (Always Visible) -->
                    <div class="forge-panel item-editor">
                        <h3>Item Editor</h3>
                        
                        <div class="editor-grid two-col">
                            <input type="text" id="edit-name" class="editor-input" placeholder="Item Name">
                            <input type="text" id="edit-type" class="editor-input" placeholder="Type">
                        </div>

                        <div class="editor-grid">
                            <input type="text" id="edit-damage" class="editor-input" placeholder="Dmg">
                            <input type="text" id="edit-armor" class="editor-input" placeholder="AS">
                            <input type="number" id="edit-slots" class="editor-input" placeholder="Slots">
                            <input type="text" id="edit-cost" class="editor-input" placeholder="Val">
                        </div>

                        <div style="margin-bottom:8px;">
                             <input type="text" id="edit-tags" class="editor-input" placeholder="Tags (Comma separated)">
                        </div>

                        <textarea id="edit-desc" class="editor-textarea" rows="2" placeholder="Description..."></textarea>
                        
                        <!-- Magic Section -->
                        <div style="border-top:1px dashed #444; padding-top:10px; margin-top:10px;">
                            <div style="display:flex; gap:10px; margin-bottom:8px;">
                                <input type="text" id="edit-magic-name" class="editor-input" placeholder="Magic Prefix/Name" style="flex-grow:1;">
                                <label style="display:flex; align-items:center; gap:5px; color:#aaa; font-size:0.8rem; white-space:nowrap;">
                                    <input type="checkbox" id="edit-is-magic"> Magic?
                                </label>
                            </div>
                            <textarea id="edit-magic-effect" class="editor-textarea" rows="2" placeholder="Magical Effect Description..."></textarea>
                            <input type="text" id="edit-craft-req" class="editor-input" placeholder="Crafting Cost" style="margin-top:8px;">
                        </div>
                    </div>
                </div>

                <!-- RIGHT PANEL: PREVIEW -->
                <div class="item-preview-container">
                    <div id="item-card-display" style="width:100%; display:flex; justify-content:center;">
                        <!-- Card renders here -->
                    </div>
                </div>
            </div>
        `;
        
        ItemBuilder.container.innerHTML = html;
        ItemBuilder.attachListeners();
    },

    attachListeners: () => {
        document.getElementById('mode-forge').onclick = () => ItemBuilder.toggleMode('forge');
        document.getElementById('mode-loot').onclick = () => ItemBuilder.toggleMode('loot');

        document.getElementById('base-cat-select').onchange = (e) => {
            ItemBuilder.state.baseCategory = e.target.value;
            ItemBuilder.loadBaseOptions();
            ItemBuilder.renderBlueprintList();
        };

        document.getElementById('base-item-select').onchange = (e) => {
            const idx = e.target.value;
            if (idx === "") return;
            
            const data = I18n.getData('items');
            let list = [];
            if (ItemBuilder.state.baseCategory === 'weapon') list = data.weapons;
            else if (ItemBuilder.state.baseCategory === 'armor') list = data.armor;
            else list = [{ name: "Fine Jewelry", type: "Trinket", cost: "50g", slots: 0, description: "High quality base for enchanting." }];

            const base = list[idx];
            
            const cur = ItemBuilder.currentItem;
            cur.name = base.name;
            cur.type = base.type || "Item";
            cur.cost = base.cost;
            cur.slots = base.slots;
            cur.damage = base.damage || "";
            cur.armor = base.as !== undefined ? base.as : "";
            cur.tags = base.tags ? base.tags.join(', ') : "";
            cur.description = base.description || base.effect || "";
            
            if(cur.magicName) cur.name = `${cur.magicName} ${base.name}`;

            ItemBuilder.syncDOMFromState();
            ItemBuilder.renderCard();
        };

        document.getElementById('bp-search').oninput = (e) => {
            ItemBuilder.state.filterText = e.target.value.toLowerCase();
            ItemBuilder.renderBlueprintList();
        };

        document.querySelectorAll('.btn-loot').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.btn-loot');
                ItemBuilder.generateRandomLoot(target.dataset.tier);
            });
        });

        // --- EDITOR INPUTS (Live Update) ---
        const bind = (id, key) => {
            document.getElementById(id).addEventListener('input', (e) => {
                ItemBuilder.currentItem[key] = e.target.value;
                ItemBuilder.renderCard();
            });
        };
        
        bind('edit-name', 'name');
        bind('edit-type', 'type');
        bind('edit-damage', 'damage');
        bind('edit-armor', 'armor');
        bind('edit-slots', 'slots');
        bind('edit-cost', 'cost');
        bind('edit-tags', 'tags');
        bind('edit-desc', 'description');
        bind('edit-magic-name', 'magicName');
        bind('edit-magic-effect', 'magicEffect');
        bind('edit-craft-req', 'craftReq');

        document.getElementById('edit-is-magic').addEventListener('change', (e) => {
            ItemBuilder.currentItem.isMagic = e.target.checked;
            ItemBuilder.renderCard();
        });
    },

    toggleMode: (mode) => {
        ItemBuilder.state.mode = mode;
        document.getElementById('mode-forge').classList.toggle('active', mode === 'forge');
        document.getElementById('mode-loot').classList.toggle('active', mode === 'loot');
        
        document.getElementById('forge-ui').style.display = mode === 'forge' ? 'flex' : 'none';
        if(mode === 'forge') document.getElementById('forge-ui').style.flexDirection = 'column';
        document.getElementById('loot-gen-ui').style.display = mode === 'loot' ? 'block' : 'none';
    },

    /* --- LOGIC: SYNC STATE <-> DOM --- */
    
    syncDOMFromState: () => {
        const c = ItemBuilder.currentItem;
        const set = (id, val) => { 
            const el = document.getElementById(id);
            if(el) el.value = val; 
        };

        set('edit-name', c.name);
        set('edit-type', c.type);
        set('edit-damage', c.damage);
        set('edit-armor', c.armor);
        set('edit-slots', c.slots);
        set('edit-cost', c.cost);
        set('edit-tags', c.tags);
        set('edit-desc', c.description);
        set('edit-magic-name', c.magicName);
        set('edit-magic-effect', c.magicEffect);
        set('edit-craft-req', c.craftReq);
        document.getElementById('edit-is-magic').checked = c.isMagic;
    },

    loadBaseOptions: () => {
        const data = I18n.getData('items');
        const select = document.getElementById('base-item-select');
        const cat = ItemBuilder.state.baseCategory;
        
        select.innerHTML = '<option value="">-- Select Base Item --</option>';
        
        if (cat === 'weapon') {
            data.weapons.forEach((w, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = `${w.name} (${w.damage})`;
                select.appendChild(opt);
            });
        } else if (cat === 'armor') {
            data.armor.forEach((a, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = `${a.name} (AS ${a.as})`;
                select.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.value = 0;
            opt.textContent = "Fine Jewelry / Clothing (50g)";
            select.appendChild(opt);
        }
    },

    renderBlueprintList: () => {
        const data = I18n.getData('items');
        const list = document.getElementById('blueprint-list');
        const cat = ItemBuilder.state.baseCategory;
        const filter = ItemBuilder.state.filterText;

        list.innerHTML = '';

        let effectsObj = {};
        if (cat === 'weapon') effectsObj = data.magic_effects.weapon;
        else if (cat === 'armor') effectsObj = data.magic_effects.armor;
        else effectsObj = data.magic_effects.wondrous;

        const tiers = [
            { id: 'tier_1', label: 'Common (Tier 1)' },
            { id: 'tier_2', label: 'Uncommon (Tier 2)' },
            { id: 'tier_3', label: 'Rare (Tier 3)' }
        ];

        tiers.forEach(tier => {
            const effectList = effectsObj[tier.id];
            if(!effectList) return;
            
            const visible = effectList.filter(e => e.name.toLowerCase().includes(filter) || e.effect.toLowerCase().includes(filter));

            if (visible.length > 0) {
                const header = document.createElement('div');
                header.className = 'blueprint-group-header';
                header.textContent = tier.label;
                list.appendChild(header);

                visible.forEach(eff => {
                    const el = document.createElement('div');
                    el.className = 'blueprint-item';
                    el.innerHTML = `
                        <div class="bp-name">
                            <span>${eff.name}</span>
                            <span class="bp-cost">DC ${eff.name === 'Common' ? 12 : (eff.name === 'Rare' ? 18 : 15)}</span> 
                        </div>
                        <div class="bp-desc">${eff.effect}</div>
                        <div class="bp-cost" style="margin-top:4px; color:var(--accent-gold);">Mat: ${eff.reagent}</div>
                    `;
                    
                    el.onclick = () => ItemBuilder.applyBlueprint(eff);
                    list.appendChild(el);
                });
            }
        });
    },

    applyBlueprint: (effect) => {
        const c = ItemBuilder.currentItem;
        c.magicName = effect.name;
        c.magicEffect = effect.effect;
        c.craftReq = `Requires 3x ${effect.reagent}`;
        c.isMagic = true;

        // Auto-rename hint
        const sel = document.getElementById('base-item-select');
        let baseName = "Item";
        if (sel.selectedIndex > 0) {
             baseName = sel.options[sel.selectedIndex].text.split(' (')[0];
        }
        c.name = `${effect.name} ${baseName}`;

        ItemBuilder.syncDOMFromState();
        ItemBuilder.renderCard();
    },

    generateRandomLoot: (tier) => {
        const data = I18n.getData('items');
        const table = data.loot_tables[tier];
        
        const roll = Dice.roll("1d20").total;
        let result = table.find(r => r.roll === roll);
        
        if (result.name === "JACKPOT") {
            const nextTier = tier === 'tier_1' ? 'tier_2' : 'tier_3';
            const nextRoll = Dice.roll("1d20").total;
            result = data.loot_tables[nextTier].find(r => r.roll === nextRoll);
            result.name = `JACKPOT! ${result.name}`; 
        }

        let details = result.desc;
        let type = "Loot";
        let isMagic = false;

        if (result.name.includes("Art") || result.name.includes("Idol")) {
            type = "Art Object";
            const gen = data.art_generator;
            const m = gen.materials[Dice.roll("1d20").total - 1];
            const f = gen.forms[Dice.roll("1d20").total - 1];
            const s = gen.subjects[Dice.roll("1d20").total - 1];
            details = `${m} ${f} depicting ${s}. (${result.desc})`;
        }

        if (result.name.includes("Curio") || result.name.includes("Relic")) {
             type = "Curio";
             const cRoll = Dice.roll("1d20").total;
             const curio = data.curios.find(c => c.roll === cRoll);
             result.name = curio.name;
             details = curio.effect;
             isMagic = true;
        }

        const itemObj = {
            name: result.name,
            type: type,
            description: details,
            value: result.value,
            slots: result.slots,
            cost: result.value
        };

        ItemBuilder.addToHistory(itemObj);
        
        // Overwrite state
        const c = ItemBuilder.currentItem;
        c.name = itemObj.name;
        c.type = itemObj.type;
        c.description = itemObj.description;
        c.cost = itemObj.value;
        c.slots = itemObj.slots;
        c.isMagic = isMagic;
        
        // Clear specifics
        c.damage = "";
        c.armor = "";
        c.tags = "";
        c.magicName = "";
        c.magicEffect = "";
        c.craftReq = "";

        ItemBuilder.syncDOMFromState();
        ItemBuilder.renderCard();
    },

    addToHistory: (item) => {
        const copy = JSON.parse(JSON.stringify(item));
        ItemBuilder.history.unshift(copy);
        if (ItemBuilder.history.length > 5) ItemBuilder.history.pop();
        
        const log = document.getElementById('loot-log');
        log.innerHTML = ItemBuilder.history.map((i, idx) => `
            <div class="history-item" onclick="import('./js/modules/item_builder.js').then(m => m.ItemBuilder.loadFromHistory(${idx}))">
                <span>${i.name}</span>
                <span class="history-val">${i.value || i.cost}</span>
            </div>
        `).join('');
    },

    loadFromHistory: (idx) => {
        const histItem = ItemBuilder.history[idx];
        // Map history item back to currentItem structure
        const c = ItemBuilder.currentItem;
        c.name = histItem.name;
        c.type = histItem.type;
        c.cost = histItem.cost || histItem.value;
        c.slots = histItem.slots;
        c.description = histItem.description;
        c.isMagic = histItem.isMagic || false;
        c.damage = "";
        c.armor = "";
        c.tags = "";
        c.magicName = "";
        c.magicEffect = "";
        
        ItemBuilder.syncDOMFromState();
        ItemBuilder.renderCard();
    },

    renderCard: () => {
        const c = ItemBuilder.currentItem;
        const container = document.getElementById('item-card-display');

        // Stats Logic
        let statsHtml = '';
        if (c.damage) statsHtml += `<div class="ic-stat-box"><div class="ic-label">Damage</div><div class="ic-val">${c.damage}</div></div>`;
        if (c.armor) statsHtml += `<div class="ic-stat-box"><div class="ic-label">Armor</div><div class="ic-val">${c.armor}</div></div>`;
        statsHtml += `<div class="ic-stat-box"><div class="ic-label">Slots</div><div class="ic-val">${c.slots}</div></div>`;
        statsHtml += `<div class="ic-stat-box"><div class="ic-label">Value</div><div class="ic-val">${c.cost}</div></div>`;

        // Tags
        let tagsHtml = '';
        if (c.tags && c.tags.trim() !== "") {
            tagsHtml = `<div class="ic-tags">${c.tags.split(',').map(t => `<span class="ic-tag">${t.trim()}</span>`).join('')}</div>`;
        }

        // Magic
        let magicHtml = '';
        if (c.isMagic && (c.magicEffect || c.magicName)) {
            magicHtml = `
                <div class="ic-magic-effect">
                    ${c.magicName ? `<span class="ic-magic-title">✨ ${c.magicName}</span>` : ''}
                    <div class="ic-magic-text">${c.magicEffect}</div>
                    ${c.craftReq ? `<div class="ic-craft-req">${c.craftReq}</div>` : ''}
                </div>
            `;
        }

        const html = `
            <div class="item-card ${c.isMagic ? 'magic' : ''}">
                <div class="ic-header">
                    <div class="ic-name">${c.name}</div>
                    <div class="ic-type">${c.type} ${c.isMagic ? '• Magic' : ''}</div>
                </div>
                
                <div class="ic-stats">
                    ${statsHtml}
                </div>

                <div class="ic-body">
                    ${tagsHtml}
                    <div class="ic-desc">${c.description}</div>
                    ${magicHtml}
                </div>

                <div class="ic-footer">
                    <span>Grim Delve RPG</span>
                    <span>${c.isMagic ? 'Artificed' : 'Standard'}</span>
                </div>
            </div>
             <div style="margin-top:10px; text-align:center;">
                 <button class="btn-secondary" onclick="window.print()">🖨️ Print Card</button>
            </div>
        `;
        container.innerHTML = html;
    }
};