/**
 * item_builder.js
 * The Artificer module.
 * v3.3: Refactored Renderer for Library Use
 */

import { I18n } from '../utils/i18n.js';
import { Dice } from '../utils/dice.js';
import { ImageStore } from '../utils/image_store.js';

// --- NEW EXPORT: SHARED RENDERER ---
export const ItemRenderer = {
    /**
     * Generates the HTML string for the Item Card.
     * @param {Object} c - The item data object.
     * @param {String|null} imageSrc - Resolved URL for the image (if any).
     * @returns {String} HTML content.
     */
    getHTML: (c, imageSrc) => {
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

        // Image Handling
        let imgHtml = '';
        if (imageSrc) {
            // Apply positioning if available
            const pos = c.imgPos || { x: 0, y: 0, scale: 1.0 };
            const style = `transform: translate(${pos.x}px, ${pos.y}px) scale(${pos.scale});`;
            
            imgHtml = `
                <div class="sb-image-container" style="height:150px; margin-bottom:0; border-bottom:none;">
                    <img src="${imageSrc}" style="${style}" draggable="false">
                </div>
            `;
        }

        return `
            <div class="item-card ${c.isMagic ? 'magic' : ''}">
                <div class="ic-header">
                    <div class="ic-name">${c.name}</div>
                    <div class="ic-type">${c.type} ${c.isMagic ? '• Magic' : ''}</div>
                </div>
                
                ${imgHtml}

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
        `;
    }
};

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
        // Image Data
        imageId: null,
        imageUrl: null,
        imgPos: { x: 0, y: 0, scale: 1.0 },
        // Magic Data
        magicName: "",
        magicEffect: "",
        craftReq: "",
        isMagic: false
    },

    // Expanded Base Item Database
    wondrousList: [
        { name: "Fine Jewelry (Ring)", type: "Trinket", cost: "50g", slots: 0, description: "A setting of gold or silver ready for enchantment." },
        { name: "Amulet / Pendant", type: "Trinket", cost: "50g", slots: 0, description: "A heavy chain or stone suitable for wards." },
        { name: "Brooch / Pin", type: "Trinket", cost: "40g", slots: 0, description: "Often used for resistance enchantments." },
        { name: "Circlet / Headband", type: "Trinket", cost: "40g", slots: 0, description: "Fits snugly on the brow. Mental enhancements." },
        { name: "Fine Cloak", type: "Clothing", cost: "25g", slots: 1, description: "High quality fabric woven with mana-threads." },
        { name: "Heavy Cape", type: "Clothing", cost: "20g", slots: 1, description: "Thick wool or fur. Protection enchantments." },
        { name: "Leather Boots", type: "Clothing", cost: "15g", slots: 0, description: "Sturdy boots. Movement enchantments." },
        { name: "Silk Slippers", type: "Clothing", cost: "20g", slots: 0, description: "Quiet footwear for stealth enchantments." },
        { name: "Gloves / Gauntlets", type: "Clothing", cost: "15g", slots: 0, description: "Dexterous crafting gloves or plated gauntlets." },
        { name: "Heavy Belt", type: "Clothing", cost: "10g", slots: 0, description: "Thick leather with an iron buckle." },
        { name: "Wizard's Robe", type: "Clothing", cost: "30g", slots: 1, description: "Embroidered silk robes." },
        { name: "Arcane Wand", type: "Focus", cost: "25g", slots: 1, description: "Carved wood or bone, tipped with crystal." },
        { name: "Quarterstaff", type: "Weapon/Focus", cost: "5g", slots: 1, description: "Simple wood. Can be enchanted as a weapon or staff." },
        { name: "Crystal Orb", type: "Focus", cost: "50g", slots: 1, description: "Polished quartz for scrying or channeling." },
        { name: "Iron Rod", type: "Focus", cost: "40g", slots: 1, description: "Solid bar of cold iron for offensive magic." },
        { name: "Grimoire", type: "Book", cost: "50g", slots: 1, description: "Empty vellum pages bound in treated leather." },
        { name: "Bone Totem", type: "Trinket", cost: "5g", slots: 0, description: "Carved bone fetish for primal magic." },
        { name: "Glass Flask", type: "Container", cost: "1g", slots: 0, description: "Reinforced glass for volatile liquids." },
        { name: "Silver Mirror", type: "Tool", cost: "25g", slots: 0, description: "Hand mirror for scrying or illusion." },
        { name: "Musical Instrument", type: "Tool", cost: "20g", slots: 1, description: "Lute, flute, or drum of masterwork quality." },
        { name: "Thieves' Tools", type: "Kit", cost: "25g", slots: 1, description: "High quality picks and tension wrenches." },
        { name: "Spyglass", type: "Tool", cost: "20g", slots: 0, description: "Brass lenses for vision enhancements." },
        { name: "Lantern", type: "Tool", cost: "10g", slots: 1, description: "Hooded lantern suitable for magical light." },
        { name: "Mask", type: "Clothing", cost: "15g", slots: 0, description: "Porcelain or leather face covering." },
        { name: "Goggles", type: "Clothing", cost: "10g", slots: 0, description: "Protective lenses." },
        { name: "Hourglass", type: "Tool", cost: "25g", slots: 1, description: "Time-keeping device." },
        { name: "Carved Idol", type: "Statue", cost: "10g", slots: 1, description: "Small statue of a deity or beast." },
        { name: "Bag / Pouch", type: "Container", cost: "2g", slots: 0, description: "Leather or silk container." },
        { name: "Rug / Carpet", type: "Furnishing", cost: "50g", slots: 3, description: "Heavy woven tapestry." }
    ],

    history: [],
    
    // Drag State for Image
    dragState: { isDragging: false, startX: 0, startY: 0, initialImgX: 0, initialImgY: 0 },

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
                        
                        <!-- Image Controls -->
                        <div style="background:rgba(0,0,0,0.3); padding:8px; border:1px dashed #444; border-radius:4px; margin-bottom:10px;">
                            <div style="display:flex; gap:5px; margin-bottom:8px;">
                                <input type="text" id="edit-img-url" placeholder="Image URL..." class="editor-input" style="flex:1;">
                                <button id="btn-upload-img" class="btn-small" style="font-size:0.7rem;">📁</button>
                                <input type="file" id="file-upload-item" style="display:none" accept="image/*">
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr auto; gap:5px; align-items:center;">
                                <div>
                                    <label style="font-size:0.6rem; color:#aaa; display:block;">Zoom</label>
                                    <input type="range" id="inp-img-scale" min="0.1" max="3.0" step="0.1" value="1" style="width:100%;">
                                </div>
                                <div>
                                    <label style="font-size:0.6rem; color:#aaa; display:block;">X</label>
                                    <input type="range" id="inp-img-x" min="-200" max="200" step="10" value="0" style="width:100%;">
                                </div>
                                <div>
                                    <label style="font-size:0.6rem; color:#aaa; display:block;">Y</label>
                                    <input type="range" id="inp-img-y" min="-200" max="200" step="10" value="0" style="width:100%;">
                                </div>
                                <button id="btn-reset-img" class="btn-small" style="height:24px; margin-top:10px;">↺</button>
                            </div>
                        </div>

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
                    <div style="margin-top:10px; text-align:center;">
                        <button id="btn-save-item" class="btn-primary" style="margin-right:10px;">💾 Save to Library</button>
                        <button class="btn-secondary" onclick="window.print()">🖨️ Print Card</button>
                    </div>
                </div>
            </div>
        `;
        
        ItemBuilder.container.innerHTML = html;
        ItemBuilder.attachListeners();
    },

    attachListeners: () => {
        // Mode Toggles
        document.getElementById('mode-forge').onclick = () => ItemBuilder.toggleMode('forge');
        document.getElementById('mode-loot').onclick = () => ItemBuilder.toggleMode('loot');

        // Dropdowns
        document.getElementById('base-cat-select').onchange = (e) => {
            ItemBuilder.state.baseCategory = e.target.value;
            ItemBuilder.loadBaseOptions();
            ItemBuilder.renderBlueprintList();
        };

        // Base Item Selection Logic
        document.getElementById('base-item-select').onchange = (e) => {
            const idx = e.target.value;
            if (idx === "") return;
            
            const data = I18n.getData('items');
            let list = [];
            
            if (ItemBuilder.state.baseCategory === 'weapon') list = data.weapons;
            else if (ItemBuilder.state.baseCategory === 'armor') list = data.armor;
            else list = ItemBuilder.wondrousList;

            const base = list[idx];
            const cur = ItemBuilder.currentItem;
            
            cur.name = base.name;
            cur.type = base.type || "Item";
            cur.cost = base.cost;
            cur.slots = base.slots !== undefined ? base.slots : 1;
            cur.damage = base.damage || "";
            cur.armor = base.as !== undefined ? base.as : "";
            cur.tags = base.tags ? (Array.isArray(base.tags) ? base.tags.join(', ') : base.tags) : "";
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

        // --- IMAGE CONTROLS ---
        const urlInput = document.getElementById('edit-img-url');
        const fileInput = document.getElementById('file-upload-item');
        const uploadBtn = document.getElementById('btn-upload-img');
        const sScale = document.getElementById('inp-img-scale');
        const sX = document.getElementById('inp-img-x');
        const sY = document.getElementById('inp-img-y');
        const btnReset = document.getElementById('btn-reset-img');

        const updateImgState = () => {
            const c = ItemBuilder.currentItem;
            c.imgPos.scale = parseFloat(sScale.value);
            c.imgPos.x = parseInt(sX.value);
            c.imgPos.y = parseInt(sY.value);
            ItemBuilder.applyImageTransform();
        };

        sScale.addEventListener('input', updateImgState);
        sX.addEventListener('input', updateImgState);
        sY.addEventListener('input', updateImgState);

        btnReset.addEventListener('click', () => {
            ItemBuilder.currentItem.imgPos = { x: 0, y: 0, scale: 1.0 };
            ItemBuilder.syncDOMFromState();
            ItemBuilder.applyImageTransform();
        });

        urlInput.addEventListener('change', (e) => {
            ItemBuilder.currentItem.imageUrl = e.target.value;
            ItemBuilder.currentItem.imageId = null;
            ItemBuilder.renderCard();
        });

        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                try {
                    const id = await ImageStore.saveImage(e.target.files[0]);
                    ItemBuilder.currentItem.imageId = id;
                    ItemBuilder.currentItem.imageUrl = null;
                    urlInput.value = "[Uploaded Image]";
                    ItemBuilder.renderCard();
                } catch (err) {
                    console.error(err);
                    alert("Failed to save image.");
                }
            }
        });

        // --- TEXT INPUTS ---
        const bind = (id, key) => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('input', (e) => {
                    ItemBuilder.currentItem[key] = e.target.value;
                    ItemBuilder.renderCard();
                });
            }
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

        // SAVE BUTTON
        document.getElementById('btn-save-item').onclick = ItemBuilder.save;
    },

    toggleMode: (mode) => {
        ItemBuilder.state.mode = mode;
        document.getElementById('mode-forge').classList.toggle('active', mode === 'forge');
        document.getElementById('mode-loot').classList.toggle('active', mode === 'loot');
        
        document.getElementById('forge-ui').style.display = mode === 'forge' ? 'flex' : 'none';
        if(mode === 'forge') document.getElementById('forge-ui').style.flexDirection = 'column';
        document.getElementById('loot-gen-ui').style.display = mode === 'loot' ? 'block' : 'none';
    },

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

        // Image Controls
        if(c.imgPos) {
            set('inp-img-scale', c.imgPos.scale);
            set('inp-img-x', c.imgPos.x);
            set('inp-img-y', c.imgPos.y);
        }
        if (c.imageUrl) set('edit-img-url', c.imageUrl);
        else if (c.imageId) set('edit-img-url', "[Uploaded Image]");
    },

    applyImageTransform: () => {
        const img = document.querySelector('.sb-image-container img');
        const c = ItemBuilder.currentItem;
        if(img && c.imgPos) {
            img.style.transform = `translate(${c.imgPos.x}px, ${c.imgPos.y}px) scale(${c.imgPos.scale})`;
        }
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
            // Wondrous Items List
            ItemBuilder.wondrousList.forEach((item, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = item.name;
                select.appendChild(opt);
            });
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
            { id: 'tier_1', label: 'Common (Tier 1)', open: true },
            { id: 'tier_2', label: 'Uncommon (Tier 2)', open: false },
            { id: 'tier_3', label: 'Rare (Tier 3)', open: false }
        ];

        tiers.forEach(tier => {
            const effectList = effectsObj[tier.id];
            if(!effectList) return;
            
            const visibleItems = effectList.filter(e => 
                e.name.toLowerCase().includes(filter) || 
                e.effect.toLowerCase().includes(filter)
            );

            if (visibleItems.length > 0) {
                // Collapsible Details
                const details = document.createElement('details');
                details.className = 'blueprint-details';
                if (filter || tier.open) details.open = true;

                const summary = document.createElement('summary');
                summary.className = 'blueprint-summary';
                summary.textContent = tier.label;
                details.appendChild(summary);

                const container = document.createElement('div');
                
                visibleItems.forEach(eff => {
                    const el = document.createElement('div');
                    el.className = 'blueprint-item';
                    el.innerHTML = `
                        <div class="bp-name">
                            <span>${eff.name}</span>
                            <span class="bp-cost">DC ${tier.id === 'tier_1' ? 12 : (tier.id === 'tier_2' ? 15 : 18)}</span> 
                        </div>
                        <div class="bp-desc">${eff.effect}</div>
                        <div class="bp-cost" style="margin-top:4px; color:var(--accent-gold);">Mat: ${eff.reagent}</div>
                    `;
                    el.onclick = () => ItemBuilder.applyBlueprint(eff);
                    container.appendChild(el);
                });

                details.appendChild(container);
                list.appendChild(details);
            }
        });
    },

    applyBlueprint: (effect) => {
        const c = ItemBuilder.currentItem;
        c.magicName = effect.name;
        c.magicEffect = effect.effect;
        c.craftReq = `Requires 3x ${effect.reagent}`;
        c.isMagic = true;

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
        
        const c = ItemBuilder.currentItem;
        c.name = itemObj.name;
        c.type = itemObj.type;
        c.description = itemObj.description;
        c.cost = itemObj.value;
        c.slots = itemObj.slots;
        c.isMagic = isMagic;
        c.imageId = null;
        c.imageUrl = null;
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
        c.imageId = null;
        c.imageUrl = null;
        
        ItemBuilder.syncDOMFromState();
        ItemBuilder.renderCard();
    },

    save: () => {
        const c = ItemBuilder.currentItem;
        if (!c.name) return alert("Item needs a name.");
        
        // Ensure ID
        if (!c.id) c.id = 'item_' + Date.now();

        // Get Library
        const KEY = 'grim_delve_items';
        const lib = localStorage.getItem(KEY) ? JSON.parse(localStorage.getItem(KEY)) : [];
        
        // Update or Add
        const idx = lib.findIndex(i => i.id === c.id);
        if (idx > -1) lib[idx] = c;
        else lib.push(c);
        
        localStorage.setItem(KEY, JSON.stringify(lib));
        alert(`Saved ${c.name} to Library.`);
    },

    renderCard: async () => {
        const c = ItemBuilder.currentItem;
        const container = document.getElementById('item-card-display');
        if(!container) return;

        // Resolve Image (Async)
        let src = c.imageUrl;
        if (c.imageId) src = await ImageStore.getUrl(c.imageId);

        // Generate HTML using Shared Renderer
        container.innerHTML = ItemRenderer.getHTML(c, src);

        // --- BIND IMAGE DRAG INTERACTIONS ---
        const imgBox = container.querySelector('.sb-image-container');
        if (imgBox) {
            imgBox.addEventListener('mousedown', (e) => {
                e.preventDefault();
                ItemBuilder.dragState.isDragging = true;
                ItemBuilder.dragState.startX = e.clientX;
                ItemBuilder.dragState.startY = e.clientY;
                ItemBuilder.dragState.initialImgX = c.imgPos.x;
                ItemBuilder.dragState.initialImgY = c.imgPos.y;
                imgBox.style.cursor = 'grabbing';
            });

            window.addEventListener('mouseup', () => {
                if (ItemBuilder.dragState.isDragging) {
                    ItemBuilder.dragState.isDragging = false;
                    imgBox.style.cursor = 'grab';
                    ItemBuilder.syncDOMFromState();
                }
            });

            window.addEventListener('mousemove', (e) => {
                if (!ItemBuilder.dragState.isDragging) return;
                
                const dx = e.clientX - ItemBuilder.dragState.startX;
                const dy = e.clientY - ItemBuilder.dragState.startY;

                c.imgPos.x = ItemBuilder.dragState.initialImgX + dx;
                c.imgPos.y = ItemBuilder.dragState.initialImgY + dy;
                
                ItemBuilder.applyImageTransform();
            });

            imgBox.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                let newScale = c.imgPos.scale + delta;
                if (newScale < 0.1) newScale = 0.1;
                if (newScale > 3.0) newScale = 3.0;
                
                c.imgPos.scale = parseFloat(newScale.toFixed(1));
                ItemBuilder.applyImageTransform();
                ItemBuilder.syncDOMFromState();
            });
        }
    }
};