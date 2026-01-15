/**
 * monster_builder.js
 * The Architect Tool for GMs to create, edit, and save stat blocks.
 * v4.0: Localized, Printing Fixed, Full Logic.
 */

import { I18n } from '../utils/i18n.js';
import { Storage } from '../utils/storage.js';
import { ImageStore } from '../utils/image_store.js';

// --- SHARED RENDERER ---
export const MonsterRenderer = {
    getHTML: (m, imageSrc) => {
        const t = I18n.t;
        const fmt = I18n.fmt;
        
        // 1. Get Localized Data
        const data = I18n.getData('monsters');
        
        // Translate Role
        const rawRole = m.role ? m.role.toLowerCase() : 'soldier';
        const roleKey = `role_${rawRole}`;
        const roleName = t(roleKey) !== roleKey ? t(roleKey) : m.role;

        // Translate Family (Lookup from loaded JSON)
        let familyName = m.family; // Default to ID
        if (data && data.families && data.families[m.family]) {
            familyName = data.families[m.family].name;
        }
        // Capitalize
        familyName = familyName.charAt(0).toUpperCase() + familyName.slice(1);

        // Dynamic Meta Line
        const metaLine = fmt('mon_meta_fmt', { 
            lvl: m.level, 
            role: roleName, 
            family: familyName 
        });

        // Image Handling (with inline styles for Print safety)
        let imgHtml = '';
        if (imageSrc) {
            const pos = m.imgPos || { x: 0, y: 0, scale: 1.0 };
            // Ensure transforms are hardcoded for the printer
            const style = `transform: translate(${pos.x}px, ${pos.y}px) scale(${pos.scale}); width:100%; height:100%; object-fit:cover;`;
            imgHtml = `<div class="sb-image-container"><img src="${imageSrc}" style="${style}" draggable="false"></div>`;
        }

        // Abilities Rendering
        const renderRow = (list) => list.map(item => `
            <div class="sb-property">
                <div class="sb-prop-header">
                    <span class="sb-prop-name">${item.name}</span>
                    ${item.cost ? `<span class="sb-prop-cost">[${item.cost}]</span>` : ''}
                    ${item.id ? `<span class="del-custom" data-id="${item.id}" title="Remove">×</span>` : ''}
                </div>
                <div class="sb-prop-text">${item.effect}</div>
            </div>
        `).join('');

        // Merge Custom Abilities
        const traits = [...(m.traits || [])];
        const actions = [...(m.actions || [])];
        const dangers = [...(m.danger_abilities || [])];

        if (m.custom_abilities) {
            m.custom_abilities.forEach(c => {
                if (c.type === 'Trait' || c.type === 'Passive') traits.push(c);
                else if (c.type === 'Danger') dangers.push(c);
                else actions.push(c); 
            });
        }

        const attackLine = fmt('mon_atk_fmt', { dmg: `<strong>${m.stats.dmg}</strong>` });

        return `
            <div class="monster-card">
                <!-- Header -->
                <div class="mc-header">
                    <div class="mc-name">${m.name}</div>
                    <div class="mc-meta">${metaLine}</div>
                </div>
                
                <!-- Image -->
                ${imgHtml}

                <!-- Stats Grid -->
                <div class="mc-stats-grid">
                    <div class="mc-stat hp">
                        <div class="mc-stat-val">${m.stats.hp}</div>
                        <div class="mc-stat-label">${t('mon_stat_hp')}</div>
                    </div>
                    <div class="mc-stat">
                        <div class="mc-stat-val">${m.stats.as}</div>
                        <div class="mc-stat-label">${t('mon_stat_as')}</div>
                    </div>
                    <div class="mc-stat">
                        <div class="mc-stat-val">${m.stats.speed}</div>
                        <div class="mc-stat-label">${t('mon_stat_spd')}</div>
                    </div>
                    <div class="mc-stat atk">
                        <div class="mc-stat-val">${m.stats.atk}</div>
                        <div class="mc-stat-label">${t('mon_stat_atk')}</div>
                    </div>
                    <div class="mc-stat">
                        <div class="mc-stat-val">${m.stats.def}</div>
                        <div class="mc-stat-label">${t('mon_stat_def')}</div>
                    </div>
                    <div class="mc-stat">
                        <div class="mc-stat-val">${m.stats.save}</div>
                        <div class="mc-stat-label">${t('mon_stat_save')}</div>
                    </div>
                </div>

                <!-- Basic Attack -->
                <div class="mc-section main-attack">
                    <div class="mc-ability">${attackLine}</div>
                </div>

                <!-- Ability Sections -->
                ${traits.length > 0 ? `<div class="mc-section"><div class="mc-section-title">${t('mon_sect_traits')}</div>${renderRow(traits)}</div>` : ''}
                ${actions.length > 0 ? `<div class="mc-section"><div class="mc-section-title">${t('mon_sect_actions')}</div>${renderRow(actions)}</div>` : ''}
                ${dangers.length > 0 ? `<div class="mc-section danger"><div class="mc-section-title danger-title">${t('mon_sect_danger')}</div>${renderRow(dangers)}</div>` : ''}
                
                ${m.notes ? `<div class="mc-section notes"><strong>${t('mon_lbl_notes')}:</strong> ${m.notes}</div>` : ''}
            </div>
        `;
    }
};

export const MonsterBuilder = {
    
    container: null,

    // State Object
    currentMonster: {
        id: null,
        name: "Nameless Horror",
        role: "soldier",
        level: 1,
        family: "folk",
        imageId: null,
        imageUrl: null,
        imgPos: { x: 0, y: 0, scale: 1.0 }, 
        stats: { hp: 0, as: 0, speed: 0, atk: 0, def: 0, save: 0, dmg: "" },
        traits: [], 
        actions: [], 
        danger_abilities: [],
        custom_abilities: [], 
        notes: ""
    },

    dragState: { isDragging: false, startX: 0, startY: 0, initialImgX: 0, initialImgY: 0 },

    init: (container) => {
        MonsterBuilder.container = container;
        MonsterBuilder.renderInterface(container);
        
        // If it's a new monster, calc default stats
        if (!MonsterBuilder.currentMonster.id) {
            MonsterBuilder.updateCalculation();
        } else {
            // If loading existing, give DOM time to render before syncing
            setTimeout(() => {
                MonsterBuilder.renderAbilityPickers(MonsterBuilder.currentMonster.family);
                MonsterBuilder.syncDOMFromState();
                MonsterBuilder.syncCheckboxes();
                MonsterBuilder.renderCard();
            }, 50);
        }
    },

    loadMonster: (monsterData) => {
        MonsterBuilder.currentMonster = JSON.parse(JSON.stringify(monsterData));
        const m = MonsterBuilder.currentMonster;
        
        // Ensure data integrity
        if (!m.imgPos) m.imgPos = { x: 0, y: 0, scale: 1.0 };
        if (!m.traits) m.traits = [];
        if (!m.actions) m.actions = [];
        if (!m.danger_abilities) m.danger_abilities = [];
        if (!m.custom_abilities) m.custom_abilities = [];
        if (!m.notes) m.notes = "";

        // If official, treat as a copy
        if (monsterData.source === 'official') {
            m.id = null;
            m.name = `${monsterData.name} (Copy)`;
            m.imageId = null;
            m.imgPos = { x: 0, y: 0, scale: 1.0 };
        }
        
        // Logic to refresh if module is already active
        const nameInput = document.getElementById('mb-name');
        if (nameInput) {
            MonsterBuilder.syncDOMFromState();
            MonsterBuilder.renderAbilityPickers(m.family);
            MonsterBuilder.syncCheckboxes();
            MonsterBuilder.renderCard();
        }
    },

    renderInterface: (container) => {
        const data = I18n.getData('monsters');
        const t = I18n.t;

        if (!data) return container.innerHTML = `<p>${t('lbl_loading')}</p>`;

        const roles = Object.keys(data.chassis);
        const families = Object.keys(data.families);

        const html = `
            <div class="architect-layout">
                <!-- LEFT: THE LAB -->
                <div class="architect-controls">
                    
                    <div class="form-group">
                        <label class="form-label">${t('lbl_name')}</label>
                        <input type="text" id="mb-name" value="${MonsterBuilder.currentMonster.name}">
                    </div>

                    <!-- Image Uploader & Controls -->
                    <div class="form-group" style="background:rgba(0,0,0,0.2); padding:10px; border:1px dashed #444;">
                        <label class="form-label" style="font-size:0.8rem;">${t('cg_lbl_portrait')}</label>
                        <div style="display:flex; gap:5px; margin-bottom:10px;">
                            <input type="text" id="mb-img-url" placeholder="${t('lbl_paste_url')}" style="flex:1; font-size:0.8rem;">
                            <button id="btn-upload-img" class="btn-small">📁 ${t('lbl_upload')}</button>
                            <input type="file" id="mb-file-input" style="display:none" accept="image/*">
                        </div>
                        
                        <!-- Image Adjustments -->
                        <div id="img-controls" style="display:flex; gap:10px; align-items:center;">
                            <div style="flex:1;">
                                <label style="font-size:0.7rem; color:#aaa;">${t('lbl_zoom')}</label>
                                <input type="range" id="inp-img-scale" min="0.1" max="3.0" step="0.1" value="1" style="width:100%;">
                            </div>
                            <div style="flex:1;">
                                <label style="font-size:0.7rem; color:#aaa;">${t('lbl_pan_x')}</label>
                                <input type="range" id="inp-img-x" min="-200" max="200" step="10" value="0" style="width:100%;">
                            </div>
                            <div style="flex:1;">
                                <label style="font-size:0.7rem; color:#aaa;">${t('lbl_pan_y')}</label>
                                <input type="range" id="inp-img-y" min="-200" max="200" step="10" value="0" style="width:100%;">
                            </div>
                            <button id="btn-reset-img" class="btn-small" style="height:30px; margin-top:12px;">${t('lbl_reset')}</button>
                        </div>
                    </div>

                    <div class="split-view" style="gap:10px; margin-bottom:1rem;">
                        <div>
                            <label class="form-label">${t('mon_lbl_role')}</label>
                            <select id="mb-role">
                                ${roles.map(r => {
                                    const key = 'role_' + r.toLowerCase();
                                    const label = t(key);
                                    return `<option value="${r}">${label}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">${t('mon_lbl_level')}</label>
                            <select id="mb-level">
                                ${Array.from({length:10}, (_, i) => i+1).map(n => `<option value="${n}">${n}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">${t('mon_lbl_family')}</label>
                            <select id="mb-family">
                                ${families.map(f => {
                                    // Capitalize first letter if name is missing in json
                                    const famName = data.families[f].name || f.charAt(0).toUpperCase() + f.slice(1);
                                    return `<option value="${f}">${famName}</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Stats Section -->
                    <div class="info-box" style="margin-bottom:1rem;">
                        <h4 style="margin-top:0; color:var(--accent-blue); font-size:0.9rem; text-transform:uppercase;">${t('mon_chassis')}</h4>
                        <div class="stat-grid" style="grid-template-columns: repeat(3, 1fr); gap:10px;">
                            <div class="stat-input"><label>${t('mon_stat_hp')}</label><input type="number" id="mb-hp"></div>
                            <div class="stat-input"><label>${t('mon_stat_as')}</label><input type="number" id="mb-as"></div>
                            <div class="stat-input"><label>${t('mon_stat_spd')}</label><input type="text" id="mb-speed"></div>
                            <div class="stat-input"><label>${t('mon_stat_atk')}</label><input type="number" id="mb-atk"></div>
                            <div class="stat-input"><label>${t('mon_stat_def')}</label><input type="number" id="mb-def"></div>
                            <div class="stat-input"><label>${t('mon_stat_save')}</label><input type="number" id="mb-save"></div>
                        </div>
                        <div style="margin-top:10px;">
                            <label class="form-label">${t('mon_stat_dmg')}</label>
                            <input type="text" id="mb-dmg">
                        </div>
                    </div>

                    <div id="ability-section"></div>

                    <div class="custom-builder">
                        <h4 style="margin-top:0; color:var(--accent-gold); font-size:0.9rem; text-transform:uppercase;">${t('mon_lbl_custom')}</h4>
                        <div class="custom-row">
                            <input type="text" id="cust-name" placeholder="${t('lbl_name')}" style="flex:2;">
                            <select id="cust-type" style="flex:1;">
                                <option value="Action">${t('mon_type_action')}</option>
                                <option value="Trait">${t('mon_type_trait')}</option>
                                <option value="Reaction">${t('mon_type_reaction')}</option>
                                <option value="Danger">${t('mon_type_danger')}</option>
                            </select>
                        </div>
                        <div class="custom-row" id="cust-cost-row" style="display:none;">
                            <input type="text" id="cust-cost" placeholder="${t('lbl_cost')} (e.g. 1 DP)" value="1 DP">
                        </div>
                        <div class="custom-row">
                            <textarea id="cust-effect" rows="2" placeholder="${t('lbl_desc')}" style="width:100%; background:#111; color:#eee; border:1px solid #444; padding:5px;"></textarea>
                        </div>
                        <button id="btn-add-custom" class="btn-add">+ ${t('mon_btn_add')}</button>
                    </div>

                    <div class="form-group" style="margin-top:1rem;">
                        <label class="form-label">${t('mon_lbl_notes')}</label>
                        <textarea id="mb-notes" rows="3" style="width:100%; background:var(--bg-input); color:#eee; border:1px solid #333; padding:5px;"></textarea>
                    </div>
                </div>

                <!-- RIGHT: THE PREVIEW -->
                <div class="architect-preview">
                    <div id="monster-card-display"></div>
                    <div style="margin-top:1rem; display:flex; gap:10px;">
                        <button id="btn-print-monster" class="btn-secondary">🖨️ ${t('btn_print')}</button>
                        <button id="btn-save-monster" class="btn-primary">💾 ${t('btn_save_lib')}</button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        MonsterBuilder.attachListeners();
        MonsterBuilder.syncDOMFromState();
    },

    attachListeners: () => {
        // Dropdowns
        ['mb-role', 'mb-level', 'mb-family'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', MonsterBuilder.updateCalculation);
        });

        // Stats Manual Edits
        const statIds = ['mb-hp', 'mb-as', 'mb-speed', 'mb-atk', 'mb-def', 'mb-save', 'mb-dmg'];
        statIds.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', () => {
                const key = id.replace('mb-', '');
                MonsterBuilder.currentMonster.stats[key] = el.value;
                MonsterBuilder.renderCard();
            });
        });

        // Text Inputs
        document.getElementById('mb-name').addEventListener('input', (e) => {
            MonsterBuilder.currentMonster.name = e.target.value;
            MonsterBuilder.renderCard();
        });
        document.getElementById('mb-notes').addEventListener('input', (e) => {
            MonsterBuilder.currentMonster.notes = e.target.value;
            MonsterBuilder.renderCard();
        });

        // --- IMAGE HANDLING ---
        const urlInput = document.getElementById('mb-img-url');
        const fileInput = document.getElementById('mb-file-input');
        const uploadBtn = document.getElementById('btn-upload-img');
        const sScale = document.getElementById('inp-img-scale');
        const sX = document.getElementById('inp-img-x');
        const sY = document.getElementById('inp-img-y');
        const btnReset = document.getElementById('btn-reset-img');

        const updateImgState = () => {
            const m = MonsterBuilder.currentMonster;
            m.imgPos.scale = parseFloat(sScale.value);
            m.imgPos.x = parseInt(sX.value);
            m.imgPos.y = parseInt(sY.value);
            MonsterBuilder.applyImageTransform(); 
        };

        sScale.addEventListener('input', updateImgState);
        sX.addEventListener('input', updateImgState);
        sY.addEventListener('input', updateImgState);

        btnReset.addEventListener('click', () => {
            MonsterBuilder.currentMonster.imgPos = { x: 0, y: 0, scale: 1.0 };
            MonsterBuilder.syncDOMFromState();
            MonsterBuilder.applyImageTransform();
        });

        urlInput.addEventListener('change', (e) => {
            MonsterBuilder.currentMonster.imageUrl = e.target.value;
            MonsterBuilder.currentMonster.imageId = null;
            MonsterBuilder.renderCard(); 
        });

        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                try {
                    const id = await ImageStore.saveImage(e.target.files[0]);
                    MonsterBuilder.currentMonster.imageId = id;
                    MonsterBuilder.currentMonster.imageUrl = null;
                    urlInput.value = "[Uploaded Image]";
                    MonsterBuilder.renderCard();
                } catch (err) {
                    console.error("Image Save Error", err);
                    alert("Failed to save image.");
                }
            }
        });

        // --- CUSTOM ABILITIES ---
        document.getElementById('cust-type').addEventListener('change', (e) => {
            const isDanger = e.target.value === 'Danger';
            document.getElementById('cust-cost-row').style.display = isDanger ? 'flex' : 'none';
        });
        document.getElementById('btn-add-custom').addEventListener('click', MonsterBuilder.addCustomAbility);
        
        // --- FOOTER BUTTONS ---
        document.getElementById('btn-save-monster').addEventListener('click', MonsterBuilder.save);
        
        // --- FIXED PRINT LOGIC ---
        document.getElementById('btn-print-monster').addEventListener('click', () => {
            const cardContent = document.getElementById('monster-card-display').innerHTML;
            
            // 1. Ensure Print Root Exists
            let printRoot = document.getElementById('print-sheet-root');
            if (!printRoot) {
                printRoot = document.createElement('div');
                printRoot.id = 'print-sheet-root';
                printRoot.className = 'print-only';
                document.body.appendChild(printRoot);
            }
            
            // 2. Clean and Inject Wrapper
            printRoot.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'center';
            wrapper.style.paddingTop = '2cm';
            wrapper.innerHTML = cardContent;
            
            printRoot.appendChild(wrapper);
            
            // 3. Trigger Print
            window.print();
        });
    },

    syncDOMFromState: () => {
        const m = MonsterBuilder.currentMonster;
        const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };

        set('mb-name', m.name);
        set('mb-role', m.role.toLowerCase());
        set('mb-level', m.level);
        set('mb-family', m.family);
        set('mb-hp', m.stats.hp);
        set('mb-as', m.stats.as);
        set('mb-speed', m.stats.speed);
        set('mb-atk', m.stats.atk);
        set('mb-def', m.stats.def);
        set('mb-save', m.stats.save);
        set('mb-dmg', m.stats.dmg);
        set('mb-notes', m.notes);

        if (m.imageUrl) set('mb-img-url', m.imageUrl);
        else if (m.imageId) set('mb-img-url', "[Uploaded Image]");

        if(m.imgPos) {
            set('inp-img-scale', m.imgPos.scale);
            set('inp-img-x', m.imgPos.x);
            set('inp-img-y', m.imgPos.y);
        }
    },

    applyImageTransform: () => {
        const img = document.querySelector('.sb-image-container img');
        const m = MonsterBuilder.currentMonster;
        if(img && m.imgPos) {
            img.style.transform = `translate(${m.imgPos.x}px, ${m.imgPos.y}px) scale(${m.imgPos.scale})`;
        }
    },

    updateCalculation: () => {
        const data = I18n.getData('monsters');
        const roleEl = document.getElementById('mb-role');
        const levelEl = document.getElementById('mb-level');
        const familyEl = document.getElementById('mb-family');

        if(!roleEl || !levelEl || !familyEl) return;

        const role = roleEl.value;
        const level = parseInt(levelEl.value);
        const familyKey = familyEl.value;
        
        // Safe access in case role key doesn't exist yet
        const chassisList = data.chassis[role] || data.chassis['soldier'];
        const chassis = chassisList.find(c => c.lvl === level) || chassisList[0];
        
        const m = MonsterBuilder.currentMonster;
        m.role = role;
        m.level = level;
        m.family = familyKey;
        
        m.stats.hp = chassis.hp;
        m.stats.as = chassis.as;
        m.stats.speed = chassis.speed;
        m.stats.atk = chassis.atk_dc;
        m.stats.def = chassis.def_dc;
        m.stats.save = chassis.save_dc;
        m.stats.dmg = chassis.dmg;

        MonsterBuilder.syncDOMFromState();
        MonsterBuilder.renderAbilityPickers(familyKey);
    },

    renderAbilityPickers: (familyKey) => {
        const data = I18n.getData('monsters');
        const t = I18n.t;
        
        // Fallback if family not found
        if (!data || !data.families[familyKey]) return;

        const fam = data.families[familyKey];
        const container = document.getElementById('ability-section');
        if(!container) return;

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
                html += `
                    <div class="picker-item">
                        <input type="checkbox" id="${cid}" data-type="${typeKey}" data-idx="${idx}">
                        <div class="picker-content">
                            <div class="picker-name">${item.name} <span style="font-weight:normal; font-size:0.8em; color:#888;">${item.type || ""}</span></div>
                            <div class="picker-desc">${item.effect}</div>
                        </div>
                    </div>
                `;
            });
            html += `</div></details>`;
            return html;
        };

        let html = "";
        html += createAccordion(t('mon_sect_traits'), fam.universal_traits, "traits", false);
        // Sometimes passives are under 'passives', sometimes 'traits' in JSON logic
        const passives = fam.passives || [];
        html += createAccordion(t('mon_sect_traits') + " (" + fam.name + ")", passives, "passives", true);
        html += createAccordion(t('mon_sect_actions'), fam.actions, "actions", true);
        html += createAccordion(t('mon_sect_danger'), fam.danger_abilities, "danger", false);

        container.innerHTML = html;

        container.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', () => MonsterBuilder.scanSelections());
        });

        MonsterBuilder.syncCheckboxes();
    },

    syncCheckboxes: () => {
        const m = MonsterBuilder.currentMonster;
        const allSel = [...m.traits, ...m.actions, ...m.danger_abilities];

        document.querySelectorAll('.arch-content input[type="checkbox"]').forEach(chk => {
            const nameEl = chk.nextElementSibling.querySelector('.picker-name');
            if (!nameEl) return;
            const name = nameEl.textContent.split(' (')[0].trim(); 
            const match = allSel.some(s => s.name === name); // Strict name match
            chk.checked = match;
        });
        MonsterBuilder.scanSelections();
    },

    scanSelections: () => {
        const m = MonsterBuilder.currentMonster;
        const data = I18n.getData('monsters');
        if (!data.families[m.family]) return;
        const fam = data.families[m.family];

        // Reset standard arrays, keep customs
        m.traits = []; 
        m.actions = []; 
        m.danger_abilities = [];
        
        const counts = { traits: 0, passives: 0, actions: 0, danger: 0 };

        document.querySelectorAll('.arch-content input:checked').forEach(chk => {
            const type = chk.dataset.type;
            const idx = parseInt(chk.dataset.idx);
            counts[type]++;
            
            if (type === 'traits') m.traits.push(fam.universal_traits[idx]);
            else if (type === 'passives') m.traits.push({ ...fam.passives[idx], type: "Trait" }); 
            else if (type === 'actions') m.actions.push({ ...fam.actions[idx], type: "Action" });
            else if (type === 'danger') m.danger_abilities.push({ ...fam.danger_abilities[idx], type: "Danger" });
        });

        // Update UI Badges
        for (const [key, val] of Object.entries(counts)) {
            const badge = document.getElementById(`badge-${key}`);
            if(badge) { 
                badge.textContent = val; 
                badge.classList.toggle('active', val > 0); 
                badge.style.opacity = val > 0 ? '1' : '0';
            }
        }
        MonsterBuilder.renderCard();
    },

    addCustomAbility: () => {
        const name = document.getElementById('cust-name').value.trim();
        const effect = document.getElementById('cust-effect').value.trim();
        const type = document.getElementById('cust-type').value;
        const cost = document.getElementById('cust-cost').value;
        
        if (!name || !effect) return alert("Name and Effect required.");

        MonsterBuilder.currentMonster.custom_abilities.push({
            id: Date.now(), name, type, effect,
            cost: (type === 'Danger') ? cost : null
        });
        
        document.getElementById('cust-name').value = "";
        document.getElementById('cust-effect').value = "";
        MonsterBuilder.renderCard();
    },

    removeCustomAbility: (id) => {
        MonsterBuilder.currentMonster.custom_abilities = MonsterBuilder.currentMonster.custom_abilities.filter(a => a.id !== id);
        MonsterBuilder.renderCard();
    },

    renderCard: async () => {
        const m = MonsterBuilder.currentMonster;
        const container = document.getElementById('monster-card-display');
        if (!container) return;

        let src = m.imageUrl;
        if (m.imageId) {
             try {
                const { ImageStore } = await import('../utils/image_store.js');
                src = await ImageStore.getUrl(m.imageId);
             } catch(e) { console.warn("Image load error", e); }
        }

        container.innerHTML = MonsterRenderer.getHTML(m, src);

        // Re-bind delete buttons for customs
        container.querySelectorAll('.del-custom').forEach(btn => {
            btn.addEventListener('click', (e) => MonsterBuilder.removeCustomAbility(parseInt(e.target.dataset.id)));
        });

        // Image Drag Logic
        const imgBox = container.querySelector('.sb-image-container');
        if (imgBox) {
            const updateTransform = () => {
                 const img = imgBox.querySelector('img');
                 if(img) img.style.transform = `translate(${m.imgPos.x}px, ${m.imgPos.y}px) scale(${m.imgPos.scale})`;
            };
            
            // Initial Apply
            updateTransform();

            imgBox.addEventListener('mousedown', (e) => {
                e.preventDefault();
                MonsterBuilder.dragState.isDragging = true;
                MonsterBuilder.dragState.startX = e.clientX;
                MonsterBuilder.dragState.startY = e.clientY;
                MonsterBuilder.dragState.initialImgX = m.imgPos.x;
                MonsterBuilder.dragState.initialImgY = m.imgPos.y;
                imgBox.style.cursor = 'grabbing';
            });

            window.addEventListener('mouseup', () => {
                if (MonsterBuilder.dragState.isDragging) {
                    MonsterBuilder.dragState.isDragging = false;
                    imgBox.style.cursor = 'grab';
                    MonsterBuilder.syncDOMFromState();
                }
            });

            window.addEventListener('mousemove', (e) => {
                if (!MonsterBuilder.dragState.isDragging) return;
                const dx = e.clientX - MonsterBuilder.dragState.startX;
                const dy = e.clientY - MonsterBuilder.dragState.startY;
                m.imgPos.x = MonsterBuilder.dragState.initialImgX + dx;
                m.imgPos.y = MonsterBuilder.dragState.initialImgY + dy;
                updateTransform();
            });

            imgBox.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                let newScale = m.imgPos.scale + delta;
                if (newScale < 0.1) newScale = 0.1;
                if (newScale > 3.0) newScale = 3.0;
                m.imgPos.scale = parseFloat(newScale.toFixed(1));
                updateTransform();
                MonsterBuilder.syncDOMFromState();
            });
        }
        
        container.querySelectorAll('.del-custom').forEach(btn => {
            btn.addEventListener('click', (e) => MonsterBuilder.removeCustomAbility(parseInt(e.target.dataset.id)));
        });
    },

    save: () => {
        const m = MonsterBuilder.currentMonster;
        if (!m.name) return alert("Monster needs a name.");
        if (!m.id) m.id = 'mon_' + Date.now();
        m.source = 'custom';

        const lib = Storage.getLibrary('grim_monsters');
        const idx = lib.findIndex(x => x.id === m.id);
        if (idx > -1) lib[idx] = m;
        else lib.push(m);
        
        localStorage.setItem('grim_monsters', JSON.stringify(lib));
        alert(`Saved ${m.name} to Library.`);
    }
};


