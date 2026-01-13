/**
 * monster_builder.js
 * The Architect Tool for GMs to create, edit, and save stat blocks.
 * v3.3: Refactored Renderer for Library Use
 */

import { I18n } from '../utils/i18n.js';
import { Storage } from '../utils/storage.js';
import { ImageStore } from '../utils/image_store.js';

// --- NEW EXPORT: SHARED RENDERER ---
export const MonsterRenderer = {
    /**
     * Generates the HTML string for the Parchment Stat Block.
     * @param {Object} m - The monster data object.
     * @param {String|null} imageSrc - Resolved URL for the image (if any).
     * @returns {String} HTML content.
     */
    getHTML: (m, imageSrc) => {
        // Image Handling
        let imgHtml = '';
        if (imageSrc) {
            // Apply positioning if available, default otherwise
            const pos = m.imgPos || { x: 0, y: 0, scale: 1.0 };
            const style = `transform: translate(${pos.x}px, ${pos.y}px) scale(${pos.scale});`;
            // Note: draggable="false" allows the user to scroll/drag the container in the editor, 
            // but in View mode (Library), it will just be static.
            imgHtml = `<div class="sb-image-container"><img src="${imageSrc}" style="${style}" draggable="false"></div>`;
        }

        // Merge Standard + Custom Abilities
        const traits = [...(m.traits || [])];
        const actions = [...(m.actions || [])];
        const dangers = [...(m.danger_abilities || [])];

        if (m.custom_abilities) {
            m.custom_abilities.forEach(c => {
                if (c.type === 'Trait') traits.push(c);
                else if (c.type === 'Danger') dangers.push(c);
                else actions.push(c); // Actions and Reactions
            });
        }

        const renderRow = (list) => list.map(item => `
            <div class="sb-property">
                <span class="sb-prop-name">${item.name} ${item.cost ? `(${item.cost})` : ''}.</span>
                <span class="sb-prop-text">${item.effect}</span>
                ${item.id ? `<span class="del-custom" data-id="${item.id}" style="color:red; cursor:pointer; font-size:0.8em; margin-left:5px;">[×]</span>` : ''}
            </div>
        `).join('');

        return `
            <div class="stat-block-classic">
                <div class="sb-name-bar">${m.name}</div>
                <div class="sb-meta">Level ${m.level} ${m.family.charAt(0).toUpperCase() + m.family.slice(1)} ${m.role.charAt(0).toUpperCase() + m.role.slice(1)}</div>
                
                ${imgHtml}

                <div class="sb-red-line"></div>
                <div class="sb-stats-grid">
                    <div class="sb-stat-box"><span class="sb-stat-val" style="color:#8a2c2c;">${m.stats.hp}</span><span>HP</span></div>
                    <div class="sb-stat-box"><span class="sb-stat-val">${m.stats.as}</span><span>Armor</span></div>
                    <div class="sb-stat-box"><span class="sb-stat-val">${m.stats.speed}</span><span>Speed</span></div>
                </div>
                <div class="sb-stats-grid" style="background:rgba(0,0,0,0.05); padding:5px;">
                    <div class="sb-stat-box"><span>ATK DC</span><span class="sb-stat-val">${m.stats.atk}</span></div>
                    <div class="sb-stat-box"><span>DEF DC</span><span class="sb-stat-val">${m.stats.def}</span></div>
                    <div class="sb-stat-box"><span>SAVE DC</span><span class="sb-stat-val">${m.stats.save}</span></div>
                </div>
                <div class="sb-red-line"></div>

                <div class="sb-property">
                    <span class="sb-prop-name">Standard Attack.</span>
                    <span class="sb-prop-text">Deals <strong>${m.stats.dmg}</strong> damage.</span>
                </div>

                ${traits.length > 0 ? `<div class="sb-section-header">Traits</div>${renderRow(traits)}` : ''}
                ${actions.length > 0 ? `<div class="sb-section-header">Actions</div>${renderRow(actions)}` : ''}
                ${dangers.length > 0 ? `<div class="sb-danger-section"><div class="sb-danger-title">Danger Abilities</div>${renderRow(dangers)}</div>` : ''}
                
                ${m.notes ? `<div class="sb-red-line"></div><div class="sb-property" style="font-style:italic; font-size:0.9em;"><strong>GM Notes:</strong> ${m.notes}</div>` : ''}
            </div>
        `;
    }
};

export const MonsterBuilder = {
    
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
        MonsterBuilder.renderInterface(container);
        if (!MonsterBuilder.currentMonster.id) {
            MonsterBuilder.updateCalculation();
        } else {
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
        
        // Data Integrity Checks
        if (!m.imgPos) m.imgPos = { x: 0, y: 0, scale: 1.0 };
        if (!m.traits) m.traits = [];
        if (!m.actions) m.actions = [];
        if (!m.danger_abilities) m.danger_abilities = [];
        if (!m.custom_abilities) m.custom_abilities = [];
        if (!m.notes) m.notes = "";

        if (monsterData.source === 'official') {
            m.id = null;
            m.name = `${monsterData.name} (Copy)`;
            m.imageId = null;
            m.imgPos = { x: 0, y: 0, scale: 1.0 };
        }
        
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
        if (!data) return container.innerHTML = "<p>Error: Monster data not loaded.</p>";

        const roles = Object.keys(data.chassis);
        const families = Object.keys(data.families);
        const t = I18n.t; // Localization Helper

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
                        <label class="form-label" style="font-size:0.8rem;">${t('lbl_portrait')}</label>
                        <div style="display:flex; gap:5px; margin-bottom:10px;">
                            <input type="text" id="mb-img-url" placeholder="Image URL..." style="flex:1; font-size:0.8rem;">
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
                            <label class="form-label">${t('lbl_role')}</label>
                            <select id="mb-role">
                                ${roles.map(r => `<option value="${r}">${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">${t('lbl_level')}</label>
                            <select id="mb-level">
                                ${Array.from({length:10}, (_, i) => i+1).map(n => `<option value="${n}">${n}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">${t('lbl_family')}</label>
                            <select id="mb-family">
                                ${families.map(f => `<option value="${f}">${data.families[f].name}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Stats Section -->
                    <div class="info-box" style="margin-bottom:1rem;">
                        <h4 style="margin-top:0; color:var(--accent-blue); font-size:0.9rem; text-transform:uppercase;">${t('mon_chassis')}</h4>
                        <div class="stat-grid" style="grid-template-columns: repeat(3, 1fr); gap:10px;">
                            <div class="stat-input"><label>HP</label><input type="number" id="mb-hp"></div>
                            <div class="stat-input"><label>AS</label><input type="number" id="mb-as"></div>
                            <div class="stat-input"><label>Speed</label><input type="text" id="mb-speed"></div>
                            <div class="stat-input"><label>Atk</label><input type="number" id="mb-atk"></div>
                            <div class="stat-input"><label>Def</label><input type="number" id="mb-def"></div>
                            <div class="stat-input"><label>Save</label><input type="number" id="mb-save"></div>
                        </div>
                        <div style="margin-top:10px;">
                            <label class="form-label">Damage Formula</label>
                            <input type="text" id="mb-dmg">
                        </div>
                    </div>

                    <div id="ability-section"></div>

                    <div class="custom-builder">
                        <h4 style="margin-top:0; color:var(--accent-gold); font-size:0.9rem; text-transform:uppercase;">${t('mon_custom')}</h4>
                        <div class="custom-row">
                            <input type="text" id="cust-name" placeholder="Ability Name" style="flex:2;">
                            <select id="cust-type" style="flex:1;">
                                <option value="Action">Action</option>
                                <option value="Trait">Trait</option>
                                <option value="Reaction">Reaction</option>
                                <option value="Danger">Danger (DP)</option>
                            </select>
                        </div>
                        <div class="custom-row" id="cust-cost-row" style="display:none;">
                            <input type="text" id="cust-cost" placeholder="Cost (e.g. 1 DP)" value="1 DP">
                        </div>
                        <div class="custom-row">
                            <textarea id="cust-effect" rows="2" placeholder="Effect description..." style="width:100%; background:#111; color:#eee; border:1px solid #444; padding:5px;"></textarea>
                        </div>
                        <button id="btn-add-custom" class="btn-add">+ ${t('mon_add_btn')}</button>
                    </div>

                    <div class="form-group" style="margin-top:1rem;">
                        <label class="form-label">${t('lbl_notes')}</label>
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
        ['mb-role', 'mb-level', 'mb-family'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', MonsterBuilder.updateCalculation);
        });

        const statIds = ['mb-hp', 'mb-as', 'mb-speed', 'mb-atk', 'mb-def', 'mb-save', 'mb-dmg'];
        statIds.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', () => {
                const key = id.replace('mb-', '');
                MonsterBuilder.currentMonster.stats[key] = el.value;
                MonsterBuilder.renderCard();
            });
        });

        document.getElementById('mb-name').addEventListener('input', (e) => {
            MonsterBuilder.currentMonster.name = e.target.value;
            MonsterBuilder.renderCard();
        });
        document.getElementById('mb-notes').addEventListener('input', (e) => {
            MonsterBuilder.currentMonster.notes = e.target.value;
            MonsterBuilder.renderCard();
        });

        // Image Handling
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

        document.getElementById('cust-type').addEventListener('change', (e) => {
            const isDanger = e.target.value === 'Danger';
            document.getElementById('cust-cost-row').style.display = isDanger ? 'flex' : 'none';
        });
        document.getElementById('btn-add-custom').addEventListener('click', MonsterBuilder.addCustomAbility);
        document.getElementById('btn-save-monster').addEventListener('click', MonsterBuilder.save);
        document.getElementById('btn-print-monster').addEventListener('click', () => window.print());
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
        
        const chassis = data.chassis[role].find(c => c.lvl === level);
        
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
        const fam = data.families[familyKey];
        const container = document.getElementById('ability-section');
        if(!container) return;

        // Reset arrays, keep customs
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
                const isChecked = (typeKey === 'traits'); 
                
                html += `
                    <div class="picker-item">
                        <input type="checkbox" id="${cid}" data-type="${typeKey}" data-idx="${idx}" ${isChecked ? 'checked' : ''}>
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

    syncCheckboxes: () => {
        const m = MonsterBuilder.currentMonster;
        const allSel = [...m.traits, ...m.actions, ...m.danger_abilities];

        document.querySelectorAll('.arch-content input[type="checkbox"]').forEach(chk => {
            const nameEl = chk.nextElementSibling.querySelector('.picker-name');
            if (!nameEl) return;
            const name = nameEl.textContent.split(' (')[0].trim(); 
            const match = allSel.some(s => s.name.includes(name)); 
            chk.checked = match;
        });
        MonsterBuilder.scanSelections();
    },

    scanSelections: () => {
        const m = MonsterBuilder.currentMonster;
        const data = I18n.getData('monsters');
        const fam = data.families[m.family];

        m.traits = []; m.actions = []; m.danger_abilities = [];
        const counts = { traits: 0, passives: 0, actions: 0, danger: 0 };

        document.querySelectorAll('.arch-content input:checked').forEach(chk => {
            const type = chk.dataset.type;
            const idx = parseInt(chk.dataset.idx);
            counts[type]++;
            if (type === 'traits') m.traits.push(fam.universal_traits[idx]);
            if (type === 'passives') m.traits.push({ ...fam.passives[idx], type: "Trait" }); 
            if (type === 'actions') m.actions.push({ ...fam.actions[idx], type: "Action" });
            if (type === 'danger') m.danger_abilities.push({ ...fam.danger_abilities[idx], type: "Danger" });
        });

        for (const [key, val] of Object.entries(counts)) {
            const badge = document.getElementById(`badge-${key}`);
            if(badge) { badge.textContent = val; badge.classList.toggle('active', val > 0); }
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

        // Resolve Image
        let src = m.imageUrl;
        if (m.imageId) src = await ImageStore.getUrl(m.imageId);

        // Generate HTML using Shared Renderer
        container.innerHTML = MonsterRenderer.getHTML(m, src);

        // Bind Custom Delete Buttons
        container.querySelectorAll('.del-custom').forEach(btn => {
            btn.addEventListener('click', (e) => MonsterBuilder.removeCustomAbility(parseInt(e.target.dataset.id)));
        });

        // --- BIND IMAGE DRAG INTERACTIONS ---
        const imgBox = container.querySelector('.sb-image-container');
        if (imgBox) {
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
                MonsterBuilder.applyImageTransform();
            });

            imgBox.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                let newScale = m.imgPos.scale + delta;
                if (newScale < 0.1) newScale = 0.1;
                if (newScale > 3.0) newScale = 3.0;
                m.imgPos.scale = parseFloat(newScale.toFixed(1));
                MonsterBuilder.applyImageTransform();
                MonsterBuilder.syncDOMFromState();
            });
        }
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