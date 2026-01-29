/**
 * monster_builder.js
 * The Architect Tool for GMs to create, edit, and save stat blocks.
 * v4.0: Localized, Printing Fixed, Full Logic.
 */

import { I18n } from '../utils/i18n.js';
import { Storage } from '../utils/storage.js';
import { ImageStore } from '../utils/image_store.js';

/**
 * Calculates specific saves based on Role and Base DC.
 */
const calculateMonsterSaves = (role, baseDC) => {
    const r = (role || '').toLowerCase();
    let modF = 0; // Fortitude
    let modR = 0; // Reflex
    let modW = 0; // Will

    // Apply Role Modifiers (Based on Design Doc)
    if (r.includes('soldier') || r === 'soldado') {
        modF = 2; modW = -2;
    } else if (r.includes('brute') || r === 'bruto') {
        modF = 2; modR = -2; modW = -2;
    } else if (r.includes('skirmisher') || r === 'hostigador' || 
               r.includes('lurker') || r === 'acechador' || 
               r.includes('artillery') || r === 'artillería') {
        modF = -2; modR = 2;
    } else if (r.includes('controller') || r === 'controlador') {
        modF = -2; modW = 2;
    } else if (r.includes('solo')) {
        modF = 2; modW = 2;
    }
    // Minion / Default stays at Base DC

    return {
        fort: baseDC + modF,
        ref: baseDC + modR,
        will: baseDC + modW
    };
};

/**
 * Normalizes monster data into a standard renderable format.
 * v4.5: Calculates Fort/Ref/Will saves dynamically.
 */
const normalizeMonsterData = (m) => {
    // Deep copy
    const data = JSON.parse(JSON.stringify(m));

    // 1. Unify Stats
    const baseAtk = data.combat ? data.combat.atk_dc : data.stats.atk;
    const baseDef = data.combat ? data.combat.def_dc : data.stats.def;
    const baseSave = data.combat ? data.combat.save_dc : data.stats.save;
    
    // Calculate Saves (If not explicitly provided in a future update)
    let saves = data.stats.saves;
    if (!saves) {
        saves = calculateMonsterSaves(data.role, baseSave);
    }

    const stats = {
        hp: data.stats.hp,
        as: data.stats.as,
        speed: data.stats.speed,
        atk: baseAtk,
        def: baseDef,
        saves: saves, // Object { fort, ref, will }
        dmg: data.combat ? data.combat.dmg : data.stats.dmg
    };

    // 2. Unify Abilities (Buckets)
    let attacks = [];
    let traits = [];
    let actions = [];
    let dangers = [];

    // Check for explicit 'attacks' array
    if (data.attacks && Array.isArray(data.attacks)) {
        attacks.push(...data.attacks);
    }

    // Check if we have the NEW "abilities" array (Official Data)
    const hasNewAbilities = data.abilities && Array.isArray(data.abilities) && data.abilities.length > 0;

    if (hasNewAbilities) {
        data.abilities.forEach(a => {
            const t = a.type ? a.type.toLowerCase() : 'trait';
            
            if (t.includes('attack') || t.includes('ataque')) {
                if (!attacks.some(existing => existing.name === a.name)) {
                    attacks.push(a);
                }
            }
            else if (t.includes('passive') || t.includes('trait') || t.includes('rasgo') || t.includes('pasivo')) {
                traits.push(a);
            }
            else if (t.includes('danger') || t.includes('legendary') || t.includes('peligro') || a.cost) {
                dangers.push(a);
            }
            else {
                actions.push(a);
            }
        });

    } else {
        // Fallback: Old Builder Data
        if (data.traits) traits.push(...data.traits);
        if (data.actions) actions.push(...data.actions);
        if (data.danger_abilities) dangers.push(...data.danger_abilities);
    }
    
    if (data.custom_abilities) {
        data.custom_abilities.forEach(c => {
            if (c.type === 'Danger') dangers.push(c);
            else if (c.type === 'Trait') traits.push(c);
            else actions.push(c);
        });
    }

    // 3. Loot / Notes Deduplication
    let notes = data.notes || "";
    let loot = data.loot || "";

    if (loot && notes.includes(loot)) {
        notes = notes.replace(loot, "").replace(/Loot:\s*$/, "").trim();
    }
    notes = notes.replace(/^GM Notes \/\s*/i, "").trim();
    if (notes === "Loot:") notes = "";

    const imgPos = data.imgPos || { x: 0, y: 0, scale: 1.0 };

    return {
        ...data,
        derivedStats: stats,
        renderAttacks: attacks,
        renderTraits: traits,
        renderActions: actions,
        renderDangers: dangers,
        imgPos: imgPos,
        notes: notes,
        loot: loot
    };
};

export const MonsterRenderer = {
    
    formatStat: (val) => {
        if (!val && val !== 0) return `<span class="stat-main">-</span>`;
        const str = String(val);
        const match = str.match(/^(\d+)\s*(.*)$/);
        if (match) {
            const main = match[1]; 
            let sub = match[2].trim();
            if (sub.startsWith('(') && sub.endsWith(')')) sub = sub.substring(1, sub.length - 1);
            if (sub) return `<span class="stat-main">${main}</span><span class="stat-sub">${sub}</span>`;
            else return `<span class="stat-main">${main}</span>`;
        }
        return `<span class="stat-main">${str}</span>`;
    },

getHTML: (rawMonster, imageSrc, forceLang = null) => {
        const t = I18n.t;
        
        const txt = (key) => forceLang ? I18n.force(key, forceLang) : t(key);
        const m = normalizeMonsterData(rawMonster);
        const s = m.derivedStats;

        const rawRole = m.role ? m.role.toLowerCase() : 'soldier';
        const roleKey = `role_${rawRole}`;
        
        let roleName = m.role;
        if (forceLang) {
             const dictRole = I18n.force(roleKey, forceLang);
             if (dictRole && dictRole !== roleKey) roleName = dictRole;
        } else {
             roleName = t(roleKey) !== roleKey ? t(roleKey) : m.role;
        }

        let familyName = m.family || "Unknown";
        const monsterData = I18n.getData('monsters');
        if (monsterData && monsterData.families && monsterData.families[m.family]) {
            familyName = monsterData.families[m.family].name;
        }

        const lang = forceLang || I18n.currentLang;
        let metaLine = "";
        if (lang === 'es') metaLine = `${roleName} ${familyName} de Nivel ${m.level}`; 
        else metaLine = `Level ${m.level} ${familyName} ${roleName}`;

        let imgHtml = '';
        if (imageSrc) {
            const style = `transform: translate(${m.imgPos.x}px, ${m.imgPos.y}px) scale(${m.imgPos.scale}); width:100%; height:100%; object-fit:cover;`;
            imgHtml = `<div class="sb-image-container"><img src="${imageSrc}" style="${style}" draggable="false"></div>`;
        }

        const renderRow = (list, cssClass = '') => list.map(item => {
            let text = item.effect || item.desc || '';
            if (s.dmg) {
                text = text.replace('{dmg}', `<strong>${s.dmg}</strong>`);
                text = text.replace('Weapon Damage', `<strong>${s.dmg}</strong>`); 
                text = text.replace('Daño de Arma', `<strong>${s.dmg}</strong>`); 
            }
            let tagHtml = '';
            if (item.tags) {
                let cleanTag = item.tags.replace(/^\(|\)$/g, '');
                tagHtml = `<span class="sb-prop-tags">(${cleanTag})</span>`;
            }
            return `
            <div class="sb-property ${cssClass}">
                <div class="sb-prop-header">
                    <span class="sb-prop-name">${item.name}</span>
                    ${tagHtml}
                    ${item.cost ? `<span class="sb-prop-cost">[${item.cost}]</span>` : ''}
                    ${item.id ? `<span class="del-custom" data-id="${item.id}" title="Remove">×</span>` : ''}
                </div>
                <div class="sb-prop-text">${text}</div>
            </div>`;
        }).join('');

        let mainAttackHtml = '';
        const atkLabel = txt('sheet_attacks').toUpperCase();

        if (m.renderAttacks.length > 0) {
             mainAttackHtml = `<div class="mc-section attacks-section"><div class="mc-section-title" style="color:#8a2c2c; border-bottom:1px solid #8a2c2c;">${atkLabel}</div>${renderRow(m.renderAttacks)}</div>`;
        } else if (s.dmg) {
             const atkName = txt('mon_default_atk_name');
             const atkDesc = txt('mon_default_atk_desc').replace('{dmg}', `<strong>${s.dmg}</strong>`);
             mainAttackHtml = `<div class="mc-section main-attack"><div class="mc-section-title" style="color:#8a2c2c; border-bottom:1px solid #8a2c2c;">${atkLabel}</div><div class="mc-ability"><strong>${atkName}</strong><br>${atkDesc}</div></div>`;
        }

        const headTraits = txt('mon_sect_traits');
        const headActions = txt('mon_sect_actions');
        const headDanger = txt('mon_sect_danger');

        // --- NEW 8-GRID LAYOUT ---
        return `
            <div class="monster-card">
                <div class="mc-header">
                    <div class="mc-name">${m.name}</div>
                    <div class="mc-meta">${metaLine}</div>
                </div>
                
                ${imgHtml}

                <div class="mc-stats-grid" style="grid-template-columns: repeat(4, 1fr);">
                    <!-- ROW 1 -->
                    <div class="mc-stat hp">
                        <div class="mc-stat-val">${MonsterRenderer.formatStat(s.hp)}</div>
                        <div class="mc-stat-label">${txt('mon_stat_hp')}</div>
                    </div>
                    <div class="mc-stat">
                        <div class="mc-stat-val">${MonsterRenderer.formatStat(s.as)}</div>
                        <div class="mc-stat-label">${txt('mon_stat_as')}</div>
                    </div>
                    <div class="mc-stat">
                        <div class="mc-stat-val">${MonsterRenderer.formatStat(s.speed)}</div>
                        <div class="mc-stat-label">${txt('mon_stat_spd')}</div>
                    </div>
                    <div class="mc-stat atk">
                        <div class="mc-stat-val">${MonsterRenderer.formatStat(s.atk)}</div>
                        <div class="mc-stat-label">${txt('mon_stat_atk')}</div>
                    </div>
                    
                    <!-- ROW 2: Defenses & Saves -->
                    <div class="mc-stat">
                        <div class="mc-stat-val" style="color:var(--accent-blue)">${MonsterRenderer.formatStat(s.def)}</div>
                        <div class="mc-stat-label">${txt('mon_stat_def')}</div>
                    </div>
                    <div class="mc-stat">
                        <div class="mc-stat-val">${MonsterRenderer.formatStat(s.saves.fort)}</div>
                        <div class="mc-stat-label">${txt('save_fort')}</div>
                    </div>
                    <div class="mc-stat">
                        <div class="mc-stat-val">${MonsterRenderer.formatStat(s.saves.ref)}</div>
                        <div class="mc-stat-label">${txt('save_ref')}</div>
                    </div>
                    <div class="mc-stat">
                        <div class="mc-stat-val">${MonsterRenderer.formatStat(s.saves.will)}</div>
                        <div class="mc-stat-label">${txt('save_will')}</div>
                    </div>
                </div>

                ${mainAttackHtml}

                ${m.renderTraits.length > 0 ? `<div class="mc-section"><div class="mc-section-title">${headTraits}</div>${renderRow(m.renderTraits)}</div>` : ''}
                ${m.renderActions.length > 0 ? `<div class="mc-section"><div class="mc-section-title">${headActions}</div>${renderRow(m.renderActions)}</div>` : ''}
                ${m.renderDangers.length > 0 ? `<div class="mc-section danger"><div class="mc-section-title danger-title">${headDanger}</div>${renderRow(m.renderDangers)}</div>` : ''}
                
                ${m.description ? `<div class="mc-section description" style="font-style:italic; font-size:0.9em; color:#444; border-top:1px solid #ccc; padding-top:5px;">${m.description}</div>` : ''}
                ${m.notes ? `<div class="mc-section notes"><strong>${txt('mon_lbl_notes')}:</strong> ${m.notes}</div>` : ''}
                ${m.loot ? `<div class="mc-section loot" style="font-size:0.85em; background:#eee; padding:5px;"><strong>Loot:</strong> ${m.loot}</div>` : ''}
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

        // Polyfill Saves if missing (Old Data)
        if (!m.stats.saves) {
             const baseSave = m.stats.save || 12; // Fallback
             m.stats.saves = calculateMonsterSaves(m.role, baseSave);
        }

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
                        <div id="img-controls" style="display:grid; grid-template-columns: 1fr 1fr 1fr auto; gap:5px; align-items:center;">
                            <div>
                                <label style="font-size:0.6rem; color:#aaa;">${t('lbl_zoom')}</label>
                                <input type="range" id="inp-img-scale" min="0.1" max="3.0" step="0.1" value="1" style="width:100%;">
                            </div>
                            <div>
                                <label style="font-size:0.6rem; color:#aaa;">${t('lbl_pan_x')}</label>
                                <input type="range" id="inp-img-x" min="-200" max="200" step="10" value="0" style="width:100%;">
                            </div>
                            <div>
                                <label style="font-size:0.6rem; color:#aaa;">${t('lbl_pan_y')}</label>
                                <input type="range" id="inp-img-y" min="-200" max="200" step="10" value="0" style="width:100%;">
                            </div>
                            <button id="btn-reset-img" class="btn-small" style="height:24px; margin-top:10px;">${t('lbl_reset')}</button>
                        </div>
                    </div>

                    <div class="split-view" style="gap:10px; margin-bottom:1rem;">
                        <div>
                            <label class="form-label">${t('mon_lbl_role')}</label>
                            <select id="mb-role">
                                ${roles.map(r => {
                                    const key = 'role_' + r.toLowerCase();
                                    const label = t(key) !== key ? t(key) : r;
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
                                    const famName = data.families[f].name || f.charAt(0).toUpperCase() + f.slice(1);
                                    return `<option value="${f}">${famName}</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Stats Section -->
                    <div class="info-box" style="margin-bottom:1rem;">
                        <h4 style="margin-top:0; color:var(--accent-blue); font-size:0.9rem; text-transform:uppercase;">${t('mon_chassis')}</h4>
                        
                        <!-- Core Stats -->
                        <div class="stat-grid" style="grid-template-columns: repeat(3, 1fr); gap:10px; margin-bottom:10px;">
                            <div class="stat-input"><label>${t('mon_stat_hp')}</label><input type="number" id="mb-hp"></div>
                            <div class="stat-input"><label>${t('mon_stat_as')}</label><input type="number" id="mb-as"></div>
                            <div class="stat-input"><label>${t('mon_stat_spd')}</label><input type="text" id="mb-speed"></div>
                            
                            <div class="stat-input"><label>${t('mon_stat_atk')}</label><input type="number" id="mb-atk"></div>
                            <div class="stat-input"><label>${t('mon_stat_def')}</label><input type="number" id="mb-def"></div>
                            <!-- Spacer for alignment -->
                            <div class="stat-input" style="opacity:0; pointer-events:none;"></div>
                        </div>

                        <!-- Saving Throws (New) -->
                        <h5 style="margin:10px 0 5px 0; color:#888; font-size:0.8rem; text-transform:uppercase; border-top:1px dashed #444; padding-top:5px;">${t('sheet_saves')}</h5>
                        <div class="stat-grid" style="grid-template-columns: repeat(3, 1fr); gap:10px;">
                            <div class="stat-input"><label>${t('save_fort').substring(0,4)}</label><input type="number" id="mb-save-fort"></div>
                            <div class="stat-input"><label>${t('save_ref').substring(0,3)}</label><input type="number" id="mb-save-ref"></div>
                            <div class="stat-input"><label>${t('save_will').substring(0,4)}</label><input type="number" id="mb-save-will"></div>
                        </div>
                        
                        <div style="margin-top:10px; border-top:1px solid #444; padding-top:10px;">
                            <label class="form-label" style="font-size:0.8rem;">${t('mon_lbl_basic_attack')}</label>
                            <select id="mb-basic-attack" style="margin-bottom:5px;">
                                <option value="">-- ${t('mon_lbl_manual_dmg')} --</option>
                            </select>
                            <input type="text" id="mb-dmg" placeholder="e.g. 1d8+2">
                        </div>
                    </div>

                    <div id="ability-section"></div>
                    
                    <!-- Flavor Section -->
                    <div class="info-box" style="margin-bottom:1rem;">
                        <h4 style="margin-top:0; color:var(--accent-gold); font-size:0.9rem; text-transform:uppercase;">${t('mon_lbl_flavor')}</h4>
                        <div style="display:flex; gap:5px; margin-bottom:5px;">
                            <button id="btn-roll-flavor" class="btn-small" style="width:100%;">🎲 ${t('mon_btn_roll_flavor')}</button>
                        </div>
                        <div id="flavor-display" style="font-style:italic; font-size:0.8rem; color:#aaa; min-height:40px;"></div>
                    </div>

                    <!-- Custom Builder -->
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
        // Basic Attack Dropdown
        const atkDrop = document.getElementById('mb-basic-attack');
        if (atkDrop) {
            atkDrop.addEventListener('change', () => {
                const idx = atkDrop.value;
                if (idx !== "") {
                    // Fetch attack data from family
                    const data = I18n.getData('monsters');
                    const fam = data.families[MonsterBuilder.currentMonster.family];
                    const atk = fam.basic_attacks[idx];
                    
                    // Inject into Monster object (we store it in a special slot or just overwrite 'attacks' array)
                    // Let's use a dedicated 'attacks' array like the new schema supports
                    MonsterBuilder.currentMonster.attacks = [atk]; 
                    
                    // Also auto-fill the DMG text box if empty, just for reference? 
                    // No, let the renderer handle it.
                } else {
                    MonsterBuilder.currentMonster.attacks = [];
                }
                MonsterBuilder.renderCard();
            });
        }

        // Flavor Roller
        document.getElementById('btn-roll-flavor').addEventListener('click', () => {
            const data = I18n.getData('monsters');
            const fam = data.families[MonsterBuilder.currentMonster.family];
            if (!fam || !fam.flavor) return;

            const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
            
            const activity = rand(fam.flavor.activity);
            const visual = rand(fam.flavor.visuals);
            const loot = rand(fam.flavor.loot);

            const text = `<strong>Activity:</strong> ${activity}<br><strong>Visual:</strong> ${visual}<br><strong>Loot:</strong> ${loot}`;
            
            document.getElementById('flavor-display').innerHTML = text;
            
            // Optional: Auto-append to Notes?
            // MonsterBuilder.currentMonster.notes += `\n${activity}`;
        });

        // Dropdowns
        ['mb-role', 'mb-level', 'mb-family'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', MonsterBuilder.updateCalculation);
        });

        // Stats Manual Edits
        const statIds = ['mb-hp', 'mb-as', 'mb-speed', 'mb-atk', 'mb-def', 'mb-dmg'];
        statIds.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', () => {
                const key = id.replace('mb-', '');
                MonsterBuilder.currentMonster.stats[key] = el.value;
                MonsterBuilder.renderCard();
            });
        });

        const saveIds = ['mb-save-fort', 'mb-save-ref', 'mb-save-will'];
        saveIds.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', () => {
                // Extract key: 'fort', 'ref', 'will'
                const key = id.replace('mb-save-', '');
                if (!MonsterBuilder.currentMonster.stats.saves) {
                    MonsterBuilder.currentMonster.stats.saves = { fort:0, ref:0, will:0 };
                }
                MonsterBuilder.currentMonster.stats.saves[key] = parseInt(el.value);
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
        set('mb-dmg', m.stats.dmg);
        
        // Sync Saves
        if (m.stats.saves) {
            set('mb-save-fort', m.stats.saves.fort);
            set('mb-save-ref', m.stats.saves.ref);
            set('mb-save-will', m.stats.saves.will);
        }

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
        m.stats.dmg = chassis.dmg;
        
        // New Save Calculation
        m.stats.saves = calculateMonsterSaves(role, chassis.save_dc);

        MonsterBuilder.syncDOMFromState();
        MonsterBuilder.renderAbilityPickers(familyKey);
    },

    renderAbilityPickers: (familyKey) => {
        const data = I18n.getData('monsters');
        const t = I18n.t;
        const m = MonsterBuilder.currentMonster;
        
        if (!data || !data.families[familyKey]) return;
        const fam = data.families[familyKey];
        const currentRole = m.role ? m.role.toLowerCase() : 'soldier';

        // 1. Populate Basic Attack Dropdown
        const atkSelect = document.getElementById('mb-basic-attack');
        if (atkSelect && fam.basic_attacks) {
            // Keep previous selection if possible, otherwise reset
            const prevVal = atkSelect.value;
            atkSelect.innerHTML = `<option value="">-- ${t('mon_lbl_manual_dmg')} --</option>`;
            
            fam.basic_attacks.forEach((atk, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = atk.name;
                atkSelect.appendChild(opt);
            });
            // Try to restore selection
            atkSelect.value = prevVal;
        }

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
                // If filtering logic below passed, item is valid
                const cid = `chk-${typeKey}-${idx}`;
                let originalIndex = idx;
                if (typeKey === 'passives') {
                    originalIndex = fam.role_passives.indexOf(item);
                }

                html += `
                    <div class="picker-item">
                        <input type="checkbox" id="${cid}" data-type="${typeKey}" data-idx="${originalIndex}">
                        <div class="picker-content">
                            <div class="picker-name">${item.name}</div>
                            <div class="picker-desc">${item.effect}</div>
                        </div>
                    </div>
                `;
            });
            html += `</div></details>`;
            return html;
        };

        let html = "";
        
        // 1. Universal Traits (Always Show)
        html += createAccordion(t('mon_sect_universal'), fam.universal_traits, "universal", false);

        // 2. Role Passives (STRICT FILTER)
        // Only show passives that match the currently selected role
        const filteredPassives = (fam.role_passives || []).filter(p => 
            p.role.toLowerCase() === currentRole
        );
        
        html += createAccordion(t('mon_sect_traits'), filteredPassives, "passives", true);
        html += createAccordion(t('mon_sect_actions'), fam.actions, "actions", true);
        html += createAccordion(t('mon_sect_danger'), fam.danger_abilities, "danger", false);

        container.innerHTML = html;

        // Bind checkboxes
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

        // Reset arrays (Keep Customs!)
        m.traits = []; 
        m.actions = []; 
        m.danger_abilities = [];
        
        // Note: Basic Attack is handled separately by the dropdown logic
        
        const counts = { universal: 0, passives: 0, actions: 0, danger: 0 };

        document.querySelectorAll('.arch-content input:checked').forEach(chk => {
            const type = chk.dataset.type;
            const idx = parseInt(chk.dataset.idx);
            counts[type]++;
            
            if (type === 'universal') m.traits.push(fam.universal_traits[idx]);
            else if (type === 'passives') m.traits.push({ ...fam.role_passives[idx], type: "Trait" }); 
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


