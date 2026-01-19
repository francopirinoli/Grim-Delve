/* --- START OF FILE chargen.js --- */

import { I18n } from '../utils/i18n.js';
import { Dice } from '../utils/dice.js';
import { Storage } from '../utils/storage.js';
import { DiceUI } from './dice_ui.js';

export const CharGen = {

    // State Tracking
    container: null,
    currentStep: 1,
    isEditMode: false,
    
    // The Character Data Object (The Truth)
    char: {
        id: null,
        name: "",
        level: 1,
        ancestry: null,  // ID string
        background: null, // ID string
        archA: null,     // ID string
        archB: null,     // ID string
        classId: null,   // e.g., "cls_spellblade"
        className: "",
        stats: { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null },
        derived: { maxHP: 0, maxMP: 0, maxSTA: 0, maxLuck: 0, slots: 8 },
        // Calculated Base values (before overrides)
        calculated: { maxHP: 0, maxMP: 0, maxSTA: 0, maxLuck: 0, slots: 8 },
        // Manual Overrides ("God Mode")
        overrides: {
            maxHP: null, maxMP: null, maxSTA: null, maxLuck: null,
            ac: null, initiative: null, speed: null
        },
        baseHP: 0, // The rolled base HP (Hit Dice + Con)
        
        // Live State
        current: { hp: null, mp: null, sta: null, luck: null, xp: 0 }, 
        activeConditions: [], 
        notes: "",
        
        defenses: { dodge: {val:0, die:"-"}, parry: {val:0, die:"-"}, block: {val:0, die:"-"} },
        inventory: [],
        currency: { g: 0, s: 0, c: 0 },
        talents: [], // Array of Talent Objects
        
        // Temp/Creation Data
        ancestryFeatIndex: null,
        ancestryChoice: null, 
        ancestrySkill: null,
        ancestryElement: null,
        imageId: null,
        imageUrl: null
    },

    // Temporary state for Step 3 (Stats)
    statState: {
        manualMode: false,
        arrayValues: [],
        assignedIndices: {}, 
        selectedValIndex: null
    },

    // Temporary state for Leveling
    levelState: {
        newHP: 0,
        selectedTalent: null,
        selectedStat: null,
        hitDie: 8,
        nextLevel: 0
    },

    /**
     * Load an existing character object into the editor
     */
    loadCharacter: (savedChar) => {
        // Deep copy
        CharGen.char = JSON.parse(JSON.stringify(savedChar));
        
        // --- DATA MIGRATION FIXES ---
        
        // Ensure Overrides exist
        if (!CharGen.char.overrides) {
            CharGen.char.overrides = { maxHP: null, maxMP: null, maxSTA: null, maxLuck: null, ac: null, initiative: null, speed: null };
        }
        
        // Ensure new deep overrides exist (Fixes the "undefined reading dodge" error)
        if (!CharGen.char.overrides.defenses) CharGen.char.overrides.defenses = {};
        if (!CharGen.char.overrides.skills) CharGen.char.overrides.skills = {};

        // Ensure Calculated exists
        if (!CharGen.char.calculated) {
            CharGen.char.calculated = { ...CharGen.char.derived };
        }

        // Ensure Defenses structure exists
        if (!CharGen.char.defenses) {
            CharGen.char.defenses = { dodge: {val:0, die:"-"}, parry: {val:0, die:"-"}, block: {val:0, die:"-"} };
        }
        
        console.log("Character Loaded & Patched:", CharGen.char.name);
    },

    /**
     * Reset character state to defaults
     */
    resetChar: () => {
        CharGen.char = {
            id: null,
            name: "",
            level: 1,
            ancestry: null, background: null,
            archA: null, archB: null, classId: null, className: "",
            stats: { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null },
            derived: { maxHP: 0, maxMP: 0, maxSTA: 0, maxLuck: 0, slots: 8 },
            calculated: { maxHP: 0, maxMP: 0, maxSTA: 0, maxLuck: 0, slots: 8 },
            overrides: { maxHP: null, maxMP: null, maxSTA: null, maxLuck: null, ac: null },
            baseHP: 0,
            current: { hp: null, mp: null, sta: null, luck: null, xp: 0 }, 
            defenses: { dodge: {val:0, die:"-"}, parry: {val:0, die:"-"}, block: {val:0, die:"-"} },
            inventory: [],
            currency: { g: 0, s: 0, c: 0 },
            talents: [],
            ancestryFeatIndex: null,
            overrides: {
                maxHP: null, maxMP: null, maxSTA: null, maxLuck: null,
                ac: null,
                initiative: null, 
                speed: null,
                skills: {},   // Format: { "athletics": { val: 5, die: "1d6" } }
                defenses: {},  // Format: { "dodge": { val: 12, die: "1d4" } }
                attacks: {}
            },
        };
        CharGen.statState = { manualMode: false, arrayValues: [], assignedIndices: {}, selectedValIndex: null };
        CharGen.isEditMode = false;
    },

    /**
     * Initialize the Character Creator Module
     */
    init: (container) => {
        CharGen.container = container;
        
        // Initialize Dice UI
        DiceUI.init(); 

        if (!CharGen.char.id) {
            CharGen.resetChar();
            CharGen.currentStep = 1;
        } else {
            CharGen.currentStep = 1;
        }
        
        CharGen.renderShell();
    },

    /**
     * PLAY MODE ENTRY
     */
    initPlayMode: (charData) => {
        if (!CharGen.container) CharGen.container = document.getElementById('main-content');
        
        DiceUI.init(); 
        CharGen.loadCharacter(charData);
        document.body.classList.add('mode-play');
        
        // FIX: Call renderSheet directly, passing the container
        CharGen.renderSheet(CharGen.container);
    },

    exitPlayMode: () => {
        // 1. Save
        import('../utils/storage.js').then(m => m.Storage.saveCharacter(CharGen.char));
        
        // 2. Remove "Mode Play" class (This restores the sidebar visibility via CSS)
        document.body.classList.remove('mode-play');
        
        // 3. Clear container
        CharGen.container.innerHTML = "";
        
        // 4. Return to Library
        const libBtn = document.querySelector('[data-module="library"]');
        if(libBtn) libBtn.click();
    },

    /**
     * Renders the outer layout
     */
    renderShell: () => {
        const t = I18n.t;
        const html = `
            <div class="chargen-layout">
                <div class="chargen-sidebar">
                    <h3>${t('nav_chargen')}</h3>
                    <ul class="step-list">
                        <li class="step-item active" data-step="1">1. ${t('cg_step_bio')}</li>
                        <li class="step-item" data-step="2">2. ${t('cg_step_class')}</li>
                        <li class="step-item" data-step="3">3. ${t('cg_step_stats')}</li>
                        <li class="step-item" data-step="4">4. ${t('cg_step_gear')}</li>
                        <li class="step-item" data-step="5">5. ${t('cg_step_sheet')}</li>
                    </ul>
                </div>
                <div class="chargen-content">
                    <div id="step-container"></div>
                    <div class="chargen-footer">
                        <button id="btn-prev" class="btn-secondary" disabled>${t('cg_btn_back')}</button>
                        <button id="btn-next" class="btn-primary">${t('cg_btn_next')}</button>
                    </div>
                </div>
            </div>
        `;
        CharGen.container.innerHTML = html;
        document.getElementById('btn-prev').onclick = CharGen.prevStep;
        document.getElementById('btn-next').onclick = CharGen.nextStep;
        CharGen.renderStep();
    },

    renderStep: () => {
        const container = document.getElementById('step-container');
        const t = I18n.t;
        container.innerHTML = ''; 

        document.querySelectorAll('.step-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.step) === CharGen.currentStep);
        });

        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if (prevBtn && nextBtn) {
            prevBtn.disabled = (CharGen.currentStep === 1);
            nextBtn.disabled = false; 
            nextBtn.textContent = (CharGen.currentStep === 5) ? t('cg_btn_finish') : t('cg_btn_next');
        }

        switch(CharGen.currentStep) {
            case 1: CharGen.renderBio(container); break;
            case 2: CharGen.renderClass(container); break;
            case 3: CharGen.renderStats(container); break;
            case 4: CharGen.renderGear(container); break;
            case 5: CharGen.renderSheet(container); break;
        }
    },

    nextStep: () => {
        // Validation
        if (CharGen.currentStep === 1 && (!CharGen.char.ancestry || !CharGen.char.background)) {
            return alert("Please select an Ancestry and Background.");
        }
        if (CharGen.currentStep === 2) {
            if (!CharGen.char.archA || !CharGen.char.archB) return alert("Select two Archetypes.");
            // Determine limit based on Pure vs Hybrid
            const limit = (CharGen.char.archA === CharGen.char.archB) ? 2 : 2; 
            if (CharGen.char.talents.length < limit) return alert(`Please select your ${limit} Starting Talents.`);
        }
        if (CharGen.currentStep === 3) {
            const allAssigned = Object.values(CharGen.char.stats).every(v => v !== null);
            if (!allAssigned && !CharGen.statState.manualMode) return alert("Please assign all stat values.");
        }

        if (CharGen.currentStep === 5) {
            CharGen.saveCharacter();
            document.querySelector('[data-module="library"]').click();
            return;
        }

        if (CharGen.currentStep < 5) {
            CharGen.currentStep++;
            CharGen.renderStep();
        }
    },

    prevStep: () => {
        if (CharGen.currentStep > 1) {
            CharGen.currentStep--;
            CharGen.renderStep();
        }
    },

    /* ------------------------------------------------------------------
       STEP 1: BIO & ORIGINS
       ------------------------------------------------------------------ */
    
    renderBio: (el) => {
        const data = I18n.getData('options');
        const t = I18n.t;
        
        // Skill Helper (Localized manually here for the dropdowns)
        const allSkills = [
            {id: "athletics", name: "Athletics (STR)"},
            {id: "acrobatics", name: "Acrobatics (DEX)"},
            {id: "stealth", name: "Stealth (DEX)"},
            {id: "craft", name: "Craft (INT)"},
            {id: "lore", name: "Lore (INT)"},
            {id: "investigate", name: "Investigate (INT)"},
            {id: "scrutiny", name: "Scrutiny (WIS)"},
            {id: "survival", name: "Survival (WIS)"},
            {id: "medicine", name: "Medicine (WIS)"},
            {id: "influence", name: "Influence (CHA)"},
            {id: "deception", name: "Deception (CHA)"},
            {id: "intimidation", name: "Intimidation (CHA)"}
        ];

        const html = `
            <div class="split-view">
                <!-- Inputs -->
                <div class="input-column">
                    
                    <!-- Identity Section -->
                    <div class="form-section" style="border-bottom:1px solid #333; padding-bottom:1rem; margin-bottom:1rem;">
                        <h4 style="color:var(--accent-gold); margin-top:0;">${t('cg_lbl_identity')}</h4>
                        
                        <div class="form-group">
                            <label class="form-label">${t('cg_lbl_name')}</label>
                            <input type="text" id="char-name" value="${CharGen.char.name}" placeholder="...">
                        </div>

                        <div class="form-group">
                            <label class="form-label">${t('cg_lbl_portrait')}</label>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <div id="img-preview-box" style="width:60px; height:60px; background:#000; border:1px solid #444; border-radius:50%; overflow:hidden; display:flex; justify-content:center; align-items:center;">
                                    <span style="font-size:2rem;">👤</span>
                                </div>
                                <div style="flex-grow:1;">
                                    <input type="text" id="img-url-input" placeholder="${t('cg_ph_url')}" value="${CharGen.char.imageUrl || ''}" style="width:100%; margin-bottom:5px;">
                                    <button id="btn-upload-img" class="btn-small" style="width:100%;">${t('cg_btn_upload')}</button>
                                    <input type="file" id="file-upload-hidden" accept="image/*" style="display:none;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Origins Section -->
                    <div class="form-group">
                        <label class="form-label">${t('cg_lbl_ancestry')}</label>
                        <select id="sel-ancestry">
                            <option value="">-- ${t('btn_view')} --</option>
                            ${data.ancestries.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Dynamic Feat Selector -->
                    <div class="form-group" id="feat-group" style="display:none; border-left: 2px solid var(--accent-blue); padding-left: 10px;">
                        <label class="form-label">${t('cg_lbl_anc_feat')}</label>
                        <select id="sel-anc-feat">
                            <option value="">-- ${t('btn_view')} --</option>
                        </select>
                        <div id="feat-desc-tiny" style="font-size:0.8rem; color:#888; margin-top:5px; font-style:italic;"></div>
                    </div>

                    <!-- Dynamic Bonus Choice (Stats) -->
                    <div id="ancestry-options" style="display:none; margin-bottom:1.5rem; padding:10px; border:1px dashed var(--accent-gold); border-radius:4px;">
                        <label class="form-label" style="font-size:0.9rem;">${t('cg_sel_bonus')}</label>
                        <select id="sel-anc-choice">
                            <option value="">-- ${t('btn_view')} --</option>
                            <option value="hp_flat">+4 ${t('mon_stat_hp')}</option>
                            <option value="mp_flat">+2 ${t('sheet_mp')}</option>
                            <option value="sta_flat">+1 ${t('sheet_sta')}</option>
                            <option value="slots_flat">+1 ${t('cg_lbl_slots')}</option>
                        </select>
                    </div>

                    <!-- Dynamic Skill Choice -->
                    <div id="ancestry-skill-options" style="display:none; margin-bottom:1.5rem; padding:10px; border:1px dashed var(--accent-blue); border-radius:4px;">
                        <label class="form-label" style="font-size:0.9rem;">${t('cg_sel_skill')}</label>
                        <select id="sel-anc-skill">
                            <option value="">-- ${t('btn_view')} --</option>
                        </select>
                    </div>

                    <!-- Dynamic Element Choice -->
                    <div id="ancestry-element-options" style="display:none; margin-bottom:1.5rem; padding:10px; border:1px dashed var(--accent-crimson); border-radius:4px;">
                        <label class="form-label" style="font-size:0.9rem;">${t('cg_sel_resist')}</label>
                        <select id="sel-anc-element">
                            <option value="">-- ${t('btn_view')} --</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${t('cg_lbl_background')}</label>
                        <select id="sel-background">
                            <option value="">-- ${t('btn_view')} --</option>
                            ${data.backgrounds.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                        </select>
                    </div>

                    <button id="btn-random-bio" class="roll-btn">🎲 ${t('cg_btn_roll_bio')}</button>
                </div>

                <!-- Preview Card -->
                <div class="info-column">
                    <div id="bio-preview" class="preview-card">
                        <p class="text-muted" style="text-align:center; margin-top:2rem;">${t('lbl_desc')}</p>
                    </div>
                </div>
            </div>
        `;
        
        el.innerHTML = html;
        
        const ancSelect = document.getElementById('sel-ancestry');
        const featGroup = document.getElementById('feat-group');
        const featSelect = document.getElementById('sel-anc-feat');
        
        const optDiv = document.getElementById('ancestry-options');
        const optSelect = document.getElementById('sel-anc-choice');
        
        const skillDiv = document.getElementById('ancestry-skill-options');
        const skillSelect = document.getElementById('sel-anc-skill');
        
        const elemDiv = document.getElementById('ancestry-element-options');
        const elemSelect = document.getElementById('sel-anc-element');
        
        const bgSelect = document.getElementById('sel-background');
        const urlInput = document.getElementById('img-url-input');
        const uploadBtn = document.getElementById('btn-upload-img');
        const fileInput = document.getElementById('file-upload-hidden');

        // Helpers
        const populateFeats = (ancId) => {
            featSelect.innerHTML = `<option value="">-- ${t('btn_view')} --</option>`;
            if (!ancId) {
                featGroup.style.display = 'none';
                return;
            }
            const anc = data.ancestries.find(a => a.id === ancId);
            if (anc && anc.feats) {
                featGroup.style.display = 'block';
                anc.feats.forEach((f, idx) => {
                    const opt = document.createElement('option');
                    opt.value = idx;
                    opt.textContent = f.name;
                    featSelect.appendChild(opt);
                });
            }
        };

        const checkDynamicOptions = () => {
            const ancId = ancSelect.value;
            const featIdx = featSelect.value;
            
            optDiv.style.display = 'none';
            if (skillDiv) skillDiv.style.display = 'none';
            if (elemDiv) elemDiv.style.display = 'none';

            if (ancId && featIdx !== "") {
                const anc = data.ancestries.find(a => a.id === ancId);
                const feat = anc.feats[featIdx];
                const mods = feat.modifiers;

                if (mods) {
                    if (mods.select_bonus) {
                        optDiv.style.display = 'block';
                    } else {
                        CharGen.char.ancestryChoice = null; 
                        optSelect.value = ""; 
                    }

                    if (mods.select_element && elemDiv) {
                        elemDiv.style.display = 'block';
                        elemSelect.innerHTML = `<option value="">-- ${t('btn_view')} --</option>`;
                        mods.select_element.forEach(el => {
                            const opt = document.createElement('option');
                            opt.value = el; opt.textContent = el;
                            elemSelect.appendChild(opt);
                        });
                        if (CharGen.char.ancestryElement) elemSelect.value = CharGen.char.ancestryElement;
                    }

                    if (mods.select_skill && skillDiv) {
                        skillDiv.style.display = 'block';
                        skillSelect.innerHTML = `<option value="">-- ${t('btn_view')} --</option>`;
                        let options = (mods.select_skill === "any") ? allSkills : allSkills.filter(s => mods.select_skill.includes(s.id));
                        options.forEach(s => {
                            const opt = document.createElement('option');
                            opt.value = s.id; opt.textContent = s.name;
                            skillSelect.appendChild(opt);
                        });
                        if (CharGen.char.ancestrySkill) skillSelect.value = CharGen.char.ancestrySkill;
                    } else {
                        CharGen.char.ancestrySkill = null;
                    }
                }
            }
        };

        const updateImagePreview = async () => {
            const box = document.getElementById('img-preview-box');
            let src = null;

            if (CharGen.char.imageId) {
                const { ImageStore } = await import('../utils/image_store.js');
                src = await ImageStore.getUrl(CharGen.char.imageId);
            } else if (CharGen.char.imageUrl) {
                src = CharGen.char.imageUrl;
            }

            if (src) box.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover;">`;
            else box.innerHTML = `<span style="font-size:2rem;">👤</span>`;
        };

        // Restore State
        updateImagePreview();
        
        if (CharGen.char.ancestry) {
            ancSelect.value = CharGen.char.ancestry;
            populateFeats(CharGen.char.ancestry);
            if (CharGen.char.ancestryFeatIndex !== null) featSelect.value = CharGen.char.ancestryFeatIndex;
            checkDynamicOptions();
            if (CharGen.char.ancestryChoice) optSelect.value = CharGen.char.ancestryChoice;
        }
        
        if (CharGen.char.background) bgSelect.value = CharGen.char.background;
        
        CharGen.updateBioPreview();

        // Listeners
        document.getElementById('char-name').addEventListener('input', (e) => CharGen.char.name = e.target.value);

        ancSelect.addEventListener('change', (e) => {
            CharGen.char.ancestry = e.target.value;
            CharGen.char.ancestryFeatIndex = null;
            CharGen.char.ancestryChoice = null;
            CharGen.char.ancestrySkill = null;
            populateFeats(e.target.value);
            checkDynamicOptions();
            CharGen.updateBioPreview();
        });

        featSelect.addEventListener('change', (e) => {
            CharGen.char.ancestryFeatIndex = e.target.value;
            checkDynamicOptions();
            const anc = data.ancestries.find(a => a.id === CharGen.char.ancestry);
            const feat = anc ? anc.feats[e.target.value] : null;
            document.getElementById('feat-desc-tiny').textContent = feat ? feat.effect : "";
        });

        optSelect.addEventListener('change', (e) => CharGen.char.ancestryChoice = e.target.value);
        if(skillSelect) skillSelect.addEventListener('change', (e) => CharGen.char.ancestrySkill = e.target.value);
        if(elemSelect) elemSelect.addEventListener('change', (e) => CharGen.char.ancestryElement = e.target.value);

        bgSelect.addEventListener('change', (e) => {
            CharGen.char.background = e.target.value;
            CharGen.updateBioPreview();
        });

        urlInput.addEventListener('change', (e) => {
            CharGen.char.imageUrl = e.target.value;
            CharGen.char.imageId = null;
            updateImagePreview();
        });

        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const { ImageStore } = await import('../utils/image_store.js');
                try {
                    const id = await ImageStore.saveImage(file);
                    CharGen.char.imageId = id;
                    CharGen.char.imageUrl = null;
                    updateImagePreview();
                    urlInput.value = "[Image Uploaded]";
                } catch (err) {
                    console.error(err);
                    alert("Failed to save image.");
                }
            }
        });

        document.getElementById('btn-random-bio').addEventListener('click', () => {
            CharGen.rollRandomBio();
            ancSelect.value = CharGen.char.ancestry;
            populateFeats(CharGen.char.ancestry);
            bgSelect.value = CharGen.char.background;
            checkDynamicOptions();
            CharGen.updateBioPreview();
        });
    },

    updateBioPreview: () => {
        const data = I18n.getData('options');
        const ancId = CharGen.char.ancestry;
        const bgId = CharGen.char.background;
        const previewEl = document.getElementById('bio-preview');
        const t = I18n.t; 
        
        if (!ancId && !bgId) {
            previewEl.innerHTML = `<p class="text-muted" style="text-align:center; margin-top:2rem;">${t('lbl_desc')}</p>`;
            return;
        }

        let html = '';
        if (ancId) {
            const anc = data.ancestries.find(a => a.id === ancId);
            if (anc) {
                html += `
                    <div class="preview-section">
                        <div class="preview-header">${anc.name}</div>
                        <div class="preview-text"><em>${anc.description}</em></div>
                        <div class="preview-label" style="margin-top:10px;">${t('cg_lbl_anc_feat')}:</div>
                        <ul style="padding-left: 20px; font-size: 0.85rem;">
                            ${anc.feats.map(f => `<li><strong>${f.name}:</strong> ${f.effect}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
        }
        if (bgId) {
            const bg = data.backgrounds.find(b => b.id === bgId);
            if (bg) {
                html += `
                    <div class="preview-section" style="border-top: 1px solid #333; padding-top: 1rem;">
                        <div class="preview-header">${bg.name}</div>
                        <div class="preview-text"><em>${bg.description}</em></div>
                        <div class="split-view" style="gap: 10px; margin-top:10px;">
                            <div><div class="preview-label">${t('cg_lbl_skill_training')}</div><div class="preview-text">${bg.skill}</div></div>
                            <div><div class="preview-label">${t('cg_lbl_wealth')}</div><div class="preview-text">${bg.gear[bg.gear.length-1]}</div></div>
                        </div>
                        <div class="feat-box">
                            <div style="font-weight:bold; color:var(--accent-blue);">${bg.feat.name}</div>
                            <div>${bg.feat.effect}</div>
                        </div>
                        <div class="preview-label" style="margin-top:10px;">${t('cg_lbl_starting_gear')}:</div>
                        <div class="preview-text" style="font-size: 0.8rem;">${bg.gear.slice(0, -1).join(', ')}</div>
                    </div>
                `;
            }
        }
        previewEl.innerHTML = html;
    },

    rollRandomBio: () => {
        const data = I18n.getData('options');
        const randAnc = data.ancestries[Math.floor(Math.random() * data.ancestries.length)];
        const randBg = data.backgrounds[Math.floor(Math.random() * data.backgrounds.length)];
        CharGen.char.ancestry = randAnc.id;
        CharGen.char.background = randBg.id;
        CharGen.char.ancestryFeatIndex = 0; 
        document.getElementById('sel-ancestry').value = randAnc.id;
        document.getElementById('sel-background').value = randBg.id;
    },

    /* ------------------------------------------------------------------
       STEP 2: CLASS & TALENTS
       ------------------------------------------------------------------ */

    renderClass: (el) => {
        const data = I18n.getData('options');
        const t = I18n.t;
        const html = `
            <div class="split-view">
                <div class="input-column">
                    <div class="form-group">
                        <label class="form-label">${t('cg_lbl_arch_a')}</label>
                        <select id="sel-arch-a">
                            <option value="">-- Select --</option>
                            ${data.archetypes.map(a => `<option value="${a.id}">${a.name} (${a.role})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('cg_lbl_arch_b')}</label>
                        <select id="sel-arch-b">
                            <option value="">-- Select --</option>
                            ${data.archetypes.map(a => `<option value="${a.id}">${a.name} (${a.role})</option>`).join('')}
                        </select>
                    </div>
                    <button id="btn-random-class" class="roll-btn">🎲 ${t('cg_btn_roll_class')}</button>
                </div>
                <div class="info-column">
                    <div id="class-preview" class="preview-card"></div>
                </div>
            </div>
            <div id="talent-selection-ui" class="talent-section" style="display:none;">
                <div style="margin-bottom:10px;">
                    <h3 style="margin:0;">${t('cg_lbl_talents')}</h3>
                    <p class="text-muted" style="font-size:0.85rem;">
                        <span id="talent-instruction"></span>
                        <span id="talent-count" style="float:right; font-weight:bold;">0/2</span>
                    </p>
                </div>
                <div id="talent-columns" class="talent-columns"></div>
            </div>
        `;
        el.innerHTML = html;

        if (CharGen.char.archA) document.getElementById('sel-arch-a').value = CharGen.char.archA;
        if (CharGen.char.archB) document.getElementById('sel-arch-b').value = CharGen.char.archB;

        CharGen.updateClassPreview();

        document.getElementById('sel-arch-a').addEventListener('change', (e) => {
            CharGen.char.archA = e.target.value;
            CharGen.char.talents = []; 
            CharGen.updateClassPreview();
        });
        document.getElementById('sel-arch-b').addEventListener('change', (e) => {
            CharGen.char.archB = e.target.value;
            CharGen.char.talents = []; 
            CharGen.updateClassPreview();
        });
        document.getElementById('btn-random-class').addEventListener('click', (e) => {
            e.preventDefault();
            CharGen.rollRandomClass();
        });
    },

    updateClassPreview: () => {
        const data = I18n.getData('options');
        const idA = CharGen.char.archA;
        const idB = CharGen.char.archB;
        const previewEl = document.getElementById('class-preview');
        const talentUI = document.getElementById('talent-selection-ui');
        const t = I18n.t;
        const fmt = I18n.fmt;

        if (!idA || !idB) {
            previewEl.innerHTML = `<p style="color:#666; text-align:center; margin-top:2rem;">${t('lbl_desc')}</p>`;
            talentUI.style.display = 'none';
            return;
        }

        const archA = data.archetypes.find(a => a.id === idA);
        const archB = data.archetypes.find(a => a.id === idB);
        const foundClass = data.classes.find(c => 
            (c.components[0] === archA.name && c.components[1] === archB.name) ||
            (c.components[0] === archB.name && c.components[1] === archA.name)
        );

        if (!foundClass) return;

        CharGen.char.classId = foundClass.id;
        CharGen.char.className = foundClass.name;

        const renderArchDetail = (arch) => {
            const translatedStats = arch.primary_stats.map(s => t('stat_' + I18n.normalize('stats', s).toLowerCase())).join(', ');
            return `
            <div style="padding:10px; font-size:0.85rem; color:#ccc; border-top:1px solid #444;">
                <div style="margin-bottom:8px; font-style:italic;">${arch.description}</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:8px; font-family:var(--font-mono); font-size:0.75rem;">
                    <div><span style="color:var(--accent-blue);">${t('cg_lbl_role')}:</span> ${t('role_' + I18n.normalize('roles', arch.role).toLowerCase())}</div>
                    <div><span style="color:var(--accent-blue);">${t('cg_lbl_resource')}:</span> ${arch.resource}</div>
                    <div><span style="color:var(--accent-blue);">${t('cg_lbl_stats')}:</span> ${translatedStats}</div>
                    <div><span style="color:var(--accent-blue);">${t('cg_lbl_skill')}:</span> ${arch.proficiencies.skills.join(', ')}</div>
                </div>
            </div>`;
        };

        let featsHtml = '';
        if (foundClass.synergy_feats) {
            foundClass.synergy_feats.forEach(feat => {
                let badgeColor = '#888';
                if (feat.level === 1) badgeColor = 'var(--accent-blue)';
                if (feat.level === 5) badgeColor = 'var(--accent-gold)';
                if (feat.level === 10) badgeColor = 'var(--accent-crimson)';
                featsHtml += `
                    <div style="margin-bottom:10px; padding-bottom:10px; border-bottom:1px dashed #444;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <span style="font-size:0.75rem; color:${badgeColor}; font-weight:bold; text-transform:uppercase;">${fmt('cg_lbl_synergy_lvl', {lvl: feat.level})}</span>
                            ${feat.cost ? `<span style="font-size:0.7rem; color:#666;">${feat.cost}</span>` : ''}
                        </div>
                        <div style="font-weight:bold; font-size:0.9rem; color:var(--text-main);">${feat.name}</div>
                        <div style="font-size:0.8rem; color:#bbb; line-height:1.4;">${feat.effect}</div>
                    </div>
                `;
            });
        }

        previewEl.innerHTML = `
            <div class="preview-section">
                <div class="preview-header" style="color:var(--accent-gold); border-bottom: 2px solid var(--accent-gold); padding-bottom:5px; margin-bottom:10px;">
                    <span style="font-size:1.6rem; text-transform:uppercase; letter-spacing:1px;">${foundClass.name}</span>
                </div>
                <div class="preview-text" style="margin-bottom:1.5rem; font-style:italic; color:#aaa;">${foundClass.description}</div>
                <details class="accordion-box" open><summary class="accordion-header">${t('cg_class_features')}</summary><div class="accordion-content">${featsHtml}</div></details>
                <details class="accordion-box"><summary class="accordion-header">${archA.name}</summary>${renderArchDetail(archA)}</details>
                <details class="accordion-box"><summary class="accordion-header">${archB.name}</summary>${renderArchDetail(archB)}</details>
            </div>
        `;
        talentUI.style.display = 'block';
        CharGen.renderTalentSelectors(archA, archB);
    },

    renderTalentSelectors: (archA, archB) => {
        const container = document.getElementById('talent-columns');
        const instruct = document.getElementById('talent-instruction');
        const isPure = (archA.id === archB.id);
        const t = I18n.t;
        const fmt = I18n.fmt;
        
        container.innerHTML = '';
        const makeList = (arch, colId) => {
            let html = `<div class="talent-col" id="${colId}"><h4>${fmt('cg_lbl_talents_header', {name: arch.name})}</h4>`;
            arch.talents.forEach((t, idx) => {
                const isSelected = CharGen.char.talents.some(sel => sel.name === t.name);
                html += `
                    <div class="talent-opt ${isSelected ? 'selected' : ''}" data-arch="${arch.id}" data-idx="${idx}" data-col="${colId}">
                        <div><span class="talent-opt-name">${t.name}</span><span class="talent-opt-cost">${t.cost}</span></div>
                        <span class="talent-opt-desc">${t.effect}</span>
                    </div>
                `;
            });
            return html + `</div>`;
        };

        if (isPure) {
            instruct.textContent = t('cg_txt_pure');
            container.innerHTML = makeList(archA, 'col-pure');
            container.style.gridTemplateColumns = "1fr";
        } else {
            instruct.textContent = t('cg_txt_hybrid');
            container.innerHTML = makeList(archA, 'col-a') + makeList(archB, 'col-b');
            container.style.gridTemplateColumns = "1fr 1fr";
        }

        container.querySelectorAll('.talent-opt').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget; 
                CharGen.toggleTalent(target.dataset.arch, parseInt(target.dataset.idx), target.dataset.col);
            });
        });
        CharGen.updateTalentCount();
    },

    toggleTalent: (archId, talentIdx, colId) => {
        const data = I18n.getData('options');
        const arch = data.archetypes.find(a => a.id === archId);
        const talent = arch.talents[talentIdx];
        const existIdx = CharGen.char.talents.findIndex(t => t.name === talent.name);

        if (existIdx > -1) {
            CharGen.char.talents.splice(existIdx, 1);
            CharGen.renderTalentSelectors(data.archetypes.find(a => a.id === CharGen.char.archA), data.archetypes.find(a => a.id === CharGen.char.archB));
            return;
        } 
        
        if (talent.flags && (talent.flags.select_skill || talent.flags.select_mod || talent.flags.select_property)) {
            CharGen.renderChoiceModal(talent, archId, talentIdx, colId);
            return; 
        }

        CharGen.confirmTalentAdd(talent, archId, null);
        CharGen.renderTalentSelectors(data.archetypes.find(a => a.id === CharGen.char.archA), data.archetypes.find(a => a.id === CharGen.char.archB));
    },

    updateTalentCount: () => {
        const countEl = document.getElementById('talent-count');
        const count = CharGen.char.talents.length;
        if(countEl) {
            countEl.textContent = `${count}/2 Selected`;
            countEl.style.color = (count === 2) ? 'var(--accent-gold)' : 'var(--text-muted)';
        }
    },

    rollRandomClass: () => {
        const data = I18n.getData('options');
        const rollA = Math.floor(Math.random() * data.archetypes.length);
        const rollB = Math.floor(Math.random() * data.archetypes.length);
        const archA = data.archetypes[rollA];
        const archB = data.archetypes[rollB];
        CharGen.char.archA = archA.id;
        CharGen.char.archB = archB.id;
        CharGen.char.talents = []; 
        document.getElementById('sel-arch-a').value = archA.id;
        document.getElementById('sel-arch-b').value = archB.id;
        CharGen.updateClassPreview();
    },

    handleLevelUpChoice: (talent) => {
        const data = I18n.getData('options');
        // Find Archetype ID based on source Name (stored in talent object during selection)
        let arch = data.archetypes.find(a => a.name === talent.sourceName);
        
        // Fallback: If sourceName is missing (Milestone), defaults to Arch A
        if (!arch) arch = data.archetypes.find(a => a.id === CharGen.char.archA);
        
        // Call the existing Choice Modal, passing 'levelup' as the context ID
        // Signature: (talent, archId, talentIdx, context)
        CharGen.renderChoiceModal(talent, arch.id, 0, 'levelup');
    },

    renderChoiceModal: (talent, archId, talentIdx, colId) => {
        let title = `Choice Required: ${talent.name}`;
        let options = [];

        // A. Skill Choice
        if (talent.flags.select_skill) {
            const currentSkills = CharGen.calculateSkills(); // Helper defined in later batch
            
            if (talent.name === "Expertise") {
                // Upgrade Trained (d4) to Expert (d6)
                options = currentSkills
                    .filter(s => s.count === 1) 
                    .map(s => ({ val: s.id, label: `${s.name} (Upgrade to d6)` }));
                
                if (options.length === 0) {
                    alert("You don't have any Trained skills eligible for Expertise yet.");
                    return;
                }
            } else {
                // Pick any skill
                 const allSkillIds = ["athletics", "acrobatics", "stealth", "craft", "lore", "investigate", "scrutiny", "survival", "medicine", "influence", "deception", "intimidation"];
                 options = allSkillIds.map(id => ({ val: id, label: id.charAt(0).toUpperCase() + id.slice(1) }));
            }
        }
        // B. Stat/Mod Choice
        else if (talent.flags.select_mod) {
            options = [
                { val: "empower", label: "Empower (+1 Die)" },
                { val: "range", label: "Reach (Double Range)" },
                { val: "widen", label: "Widen (Area +5ft)" },
                { val: "subtle", label: "Subtle (No Components)" }
            ];
        }
        // C. Weapon Property Choice
        else if (talent.flags.select_property) {
            options = [
                { val: "sunder", label: "Sunder (Armor Break)" },
                { val: "reach", label: "Reach (Long Weapons)" },
                { val: "guard", label: "Guard (Defense)" },
                { val: "heavy", label: "Heavy (Knockdown)" },
                { val: "finesse", label: "Finesse (Dex Weapons)" }
            ];
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content" style="width: 400px;">
                <div class="modal-header">${title}</div>
                <div style="padding:1rem;">
                    <p style="margin-bottom:10px;">${talent.effect}</p>
                    <label class="form-label">Make your selection:</label>
                    <select id="modal-choice" style="width:100%; padding:8px; margin-bottom:20px;">
                        ${options.map(o => `<option value="${o.val}">${o.label}</option>`).join('')}
                    </select>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button id="btn-modal-cancel" class="btn-secondary">Cancel</button>
                        <button id="btn-modal-confirm" class="btn-primary">Confirm</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-modal-cancel').onclick = () => document.body.removeChild(overlay);
        
        document.getElementById('btn-modal-confirm').onclick = () => {
            const choice = document.getElementById('modal-choice').value;
            document.body.removeChild(overlay);

            // BRANCH LOGIC BASED ON CONTEXT
            if (colId === 'levelup') {
                // 1. Update the Level State with the choice
                // We create a new object to ensure the choice is baked in
                CharGen.levelState.selectedTalent = {
                    ...talent,
                    choice: choice
                };
                
                // 2. Resume Level Up Application
                CharGen.applyLevelUp();
            } 
            else {
                // Standard Creation/Edit Mode Logic
                CharGen.confirmTalentAdd(talent, archId, choice);
                
                if (CharGen.currentStep === 2) {
                    CharGen.renderTalentSelectorsFromIDs(CharGen.char.archA, CharGen.char.archB);
                } else {
                    CharGen.recalcAll();
                    CharGen.renderSheet(CharGen.container);
                }
            }
        };
    },

    renderTalentSelectorsFromIDs: (idA, idB) => {
        const data = I18n.getData('options');
        const a = data.archetypes.find(x => x.id === idA);
        const b = data.archetypes.find(x => x.id === idB);
        CharGen.renderTalentSelectors(a, b);
    },

    confirmTalentAdd: (talent, archId, choiceValue) => {
        const data = I18n.getData('options');
        const arch = data.archetypes.find(a => a.id === archId);
        
        if (CharGen.currentStep === 2) {
            const isPure = (CharGen.char.archA === CharGen.char.archB);
            if (isPure) {
                if (CharGen.char.talents.length >= 2) return alert("Limit reached.");
                CharGen.char.talents.push({...talent, source: arch.name, choice: choiceValue});
            } else {
                // Hybrid Logic: Replace existing from same source or add new
                const existingFromSourceIdx = CharGen.char.talents.findIndex(t => t.source === arch.name);
                if (existingFromSourceIdx > -1) CharGen.char.talents.splice(existingFromSourceIdx, 1);
                CharGen.char.talents.push({...talent, source: arch.name, choice: choiceValue});
            }
        } else {
            CharGen.char.talents.push({...talent, source: arch.name, choice: choiceValue});
        }
    },

    /* ------------------------------------------------------------------
       STEP 3: ATTRIBUTES
       ------------------------------------------------------------------ */
    
    renderStats: (el) => {
        const t = I18n.t;
        const isManual = CharGen.statState.manualMode;
        const statKeys = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

        const html = `
            <div class="split-view">
                <div class="input-column">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h3 style="margin:0;">${t('cg_lbl_array')}</h3>
                        <div class="mode-toggle">
                            <span>${t('cg_lbl_manual')}</span>
                            <label class="switch">
                                <input type="checkbox" id="toggle-manual" ${isManual ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <div id="standard-controls" style="display: ${isManual ? 'none' : 'block'}">
                        <div class="info-box" id="array-name" style="text-align:center; margin-bottom:10px; font-style:italic;">
                            ${CharGen.statState.arrayValues.length > 0 ? t('cg_txt_array') : ""}
                        </div>
                        <div id="pool-container" class="stat-pool">${CharGen.renderPoolButtons()}</div>
                        <button id="btn-roll-stats" class="roll-btn" style="width:100%; margin-bottom:1rem;">🎲 ${t('cg_btn_roll_stats')}</button>
                    </div>

                    <div class="stat-grid">
                        ${statKeys.map(stat => `
                            <div class="stat-box ${!isManual ? 'interactive' : ''} ${CharGen.char.stats[stat] !== null ? 'filled' : ''}" data-stat="${stat}">
                                <label style="color:var(--accent-gold); font-weight:bold; display:block; margin-bottom:5px;">${t('stat_' + stat.toLowerCase())}</label>
                                ${isManual 
                                    ? `<input type="number" class="manual-input" data-stat="${stat}" value="${CharGen.char.stats[stat] || 0}">`
                                    : `<div class="stat-value-display">${CharGen.char.stats[stat] !== null ? (CharGen.char.stats[stat] >= 0 ? '+'+CharGen.char.stats[stat] : CharGen.char.stats[stat]) : '--'}</div>`
                                }
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="info-column">
                    <div id="stats-preview" class="preview-card"></div>
                </div>
            </div>
        `;
        el.innerHTML = html;

        document.getElementById('toggle-manual').addEventListener('change', (e) => {
            CharGen.statState.manualMode = e.target.checked;
            CharGen.statState.assignedIndices = {};
            CharGen.char.stats = { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null };
            CharGen.renderStats(el);
        });

        if (!isManual) {
            document.getElementById('btn-roll-stats').addEventListener('click', CharGen.rollStats);
            el.querySelectorAll('.pool-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    CharGen.statState.selectedValIndex = parseInt(e.target.dataset.idx);
                    CharGen.renderStats(el);
                });
            });
            el.querySelectorAll('.stat-box').forEach(box => {
                box.addEventListener('click', () => CharGen.assignStatFromPool(box.dataset.stat));
            });
        } else {
            el.querySelectorAll('.manual-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    CharGen.char.stats[e.target.dataset.stat] = parseInt(e.target.value) || 0;
                    CharGen.calculateDerived(); 
                    CharGen.validateStats();
                });
            });
        }
        CharGen.calculateDerived();
        CharGen.validateStats();
    },

    renderPoolButtons: () => {
        if (CharGen.statState.arrayValues.length === 0) return '<span class="text-muted">- No Array -</span>';
        
        return CharGen.statState.arrayValues.map((val, idx) => {
            const isUsed = Object.keys(CharGen.statState.assignedIndices).includes(String(idx));
            const isSelected = (CharGen.statState.selectedValIndex === idx);
            let classes = "pool-btn" + (isUsed ? " used" : "") + (isSelected ? " selected" : "");
            return `<button class="${classes}" data-idx="${idx}" ${isUsed ? 'disabled' : ''}>${val >= 0 ? '+'+val : val}</button>`;
        }).join('');
    },

    rollStats: () => {
        const roll = Math.floor(Math.random() * 12) + 1;
        let values = [];
        let name = "";

        switch(roll) {
            case 1: values = [1,1,1,1,1,0]; name = "The Jack"; break;
            case 2: values = [2,1,1,1,0,0]; name = "The Standard"; break;
            case 3: values = [2,2,1,0,0,0]; name = "The Dualist"; break;
            case 4: values = [3,1,1,0,0,0]; name = "The Savant"; break;
            case 5: values = [3,2,0,0,0,0]; name = "The Specialist"; break;
            case 6: values = [3,2,1,0,0,-1]; name = "Hero with a Flaw"; break;
            case 7: values = [3,3,0,0,0,-1]; name = "The Min-Max"; break;
            case 8: values = [2,2,2,0,0,-1]; name = "The Triad"; break;
            case 9: values = [3,2,2,-1,-1,0]; name = "The Wild Card"; break;
            case 10: values = [3,3,1,-1,-1,0]; name = "The Focused"; break;
            case 11: values = [2,2,2,1,-1,-1]; name = "The Complex"; break;
            case 12: values = [3,3,2,-1,-1,-1]; name = "The High Stakes"; break;
            default: values = [1,1,1,1,1,1]; name = "Standard"; break;
        }

        CharGen.statState.arrayValues = values;
        CharGen.statState.assignedIndices = {};
        CharGen.char.stats = { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null };
        
        const arrayNameEl = document.getElementById('array-name');
        if(arrayNameEl) arrayNameEl.innerHTML = `<strong>Roll ${roll}: ${name}</strong>`;
        CharGen.renderStats(document.getElementById('step-container'));
    },

    assignStatFromPool: (statKey) => {
        const state = CharGen.statState;
        if (CharGen.char.stats[statKey] !== null) {
            const idxToRemove = Object.keys(state.assignedIndices).find(key => state.assignedIndices[key] === statKey);
            if (idxToRemove) {
                delete state.assignedIndices[idxToRemove];
                CharGen.char.stats[statKey] = null;
                state.selectedValIndex = null;
                CharGen.renderStats(document.getElementById('step-container'));
                return;
            }
        }
        if (state.selectedValIndex !== null) {
            const val = state.arrayValues[state.selectedValIndex];
            state.assignedIndices[state.selectedValIndex] = statKey;
            CharGen.char.stats[statKey] = val;
            state.selectedValIndex = null;
            CharGen.renderStats(document.getElementById('step-container'));
        }
    },

    validateStats: () => {
        const btnNext = document.getElementById('btn-next');
        if (!btnNext) return;
        if (CharGen.statState.manualMode) btnNext.disabled = false;
        else btnNext.disabled = !Object.values(CharGen.char.stats).every(v => v !== null);
    },

    /**
     * Scans equipped items for passive bonuses.
     */
    /**
     * Scans equipped items for passive bonuses.
     * Robust Regex to catch "Max HP +5", "Armor Score +1", etc.
     */
    getMagicItemBonuses: () => {
        const c = CharGen.char;
        const bonuses = { hp: 0, mp: 0, sta: 0, luck: 0, as: 0, slots: 0 };
        
        // 1. Filter: Equipped items that might be magical
        // We check isMagic flag, specific types, or if it has a magicEffect string
        const itemsToCheck = c.inventory.filter(i => 
            i.equipped && (i.isMagic || i.type === "Trinket" || i.type === "Wondrous" || i.magicEffect)
        );

        itemsToCheck.forEach(item => {
            // Combine all text fields
            const text = `${item.name} ${item.description || ''} ${item.effect || ''} ${item.magicEffect || ''}`.toLowerCase();

            // --- REGEX PARSERS ---
            
            // HP: Matches "Max HP +5", "+5 HP", "Health +10"
            const matchHP = text.match(/(?:max\s*hp|health|hit\s*points?)\s*(?:\+|:|\sby)?\s*(\d+)/);
            
            // MP: Matches "Max MP +2", "Mana +2"
            const matchMP = text.match(/(?:max\s*mp|mana)\s*(?:\+|:|\sby)?\s*(\d+)/);
            
            // STA: Matches "Max Stamina +1", "Stamina +1", "STA +1"
            const matchSTA = text.match(/(?:max\s*stamina|sta)\s*(?:\+|:|\sby)?\s*(\d+)/);
            
            // Luck: Matches "Max Luck +1", "Luck +1"
            const matchLuck = text.match(/(?:max\s*luck|luck)\s*(?:\+|:|\sby)?\s*(\d+)/);
            
            // Armor: Matches "Armor Score +1", "AS +1", "AC +1", "+1 Armor"
            const matchAS = text.match(/(?:armor|ac|as)\s*(?:score)?\s*(?:\+|:|\sby)?\s*(\d+)/);
            
            // Slots: Matches "Inventory +2", "Slots +2"
            const matchSlots = text.match(/(?:inventory|slots)\s*(?:\+|:|\sby)?\s*(\d+)/);

            if (matchHP) bonuses.hp += parseInt(matchHP[1]);
            if (matchMP) bonuses.mp += parseInt(matchMP[1]);
            if (matchSTA) bonuses.sta += parseInt(matchSTA[1]);
            if (matchLuck) bonuses.luck += parseInt(matchLuck[1]);
            if (matchAS) bonuses.as += parseInt(matchAS[1]);
            if (matchSlots) bonuses.slots += parseInt(matchSlots[1]);
        });

        return bonuses;
    },

    getArchetypeDisplay: () => {
        const c = CharGen.char;
        const data = I18n.getData('options');
        if (!data || !c.archA || !c.archB) return "";

        // Find names (e.g., "The Arcanist") and strip "The " for brevity if desired, 
        // or just use full names. Let's use full names from JSON.
        const a = data.archetypes.find(x => x.id === c.archA)?.name || "?";
        const b = data.archetypes.find(x => x.id === c.archB)?.name || "?";
        
        return `${a} + ${b}`;
    },

    /**
     * CORE CALCULATION PIPELINE
     */
    calculateDerived: () => {
        const c = CharGen.char;
        const s = c.stats;
        const data = I18n.getData('options');
        if (!data) return;

        // --- PHASE 1: CLASS LOGIC ---
        let isFullWarrior = false, isFullCaster = false, isFullSpecialist = false;
        let hasWarrior = false, hasCaster = false, hasSpecialist = false;
        let archA = null, archB = null;

        const checkRole = (arch, targetRole) => {
            if (!arch) return false;
            const normRole = I18n.normalize('roles', arch.role);
            return normRole && normRole.toLowerCase() === targetRole.toLowerCase();
        };

        if (c.archA && c.archB) {
            archA = data.archetypes.find(a => a.id === c.archA);
            archB = data.archetypes.find(a => a.id === c.archB);
            if (archA && archB) {
                const isWarA = checkRole(archA, "Warrior");
                const isWarB = checkRole(archB, "Warrior");
                const isCastA = checkRole(archA, "Spellcaster");
                const isCastB = checkRole(archB, "Spellcaster");
                const isSpecA = checkRole(archA, "Specialist");
                const isSpecB = checkRole(archB, "Specialist");

                isFullWarrior = (isWarA && isWarB);
                isFullCaster = (isCastA && isCastB);
                isFullSpecialist = (isSpecA && isSpecB);
                hasWarrior = (isWarA || isWarB);
                hasCaster = (isCastA || isCastB);
                hasSpecialist = (isSpecA || isSpecB);
            }
        }

        // --- PHASE 2: CALCULATE BASE TOTALS ---
        let hitDie = 8;
        if (isFullWarrior) hitDie = 10;
        if (isFullCaster) hitDie = 6;

        // Level 1: HP is deterministic (Max Die + CON). 
        // We recalculate this constantly to ensure Stats changes in the Wizard update the HP.
        if (c.level === 1) {
            c.baseHP = Math.max(1, hitDie + (s.CON || 0));
        } 
        // Higher Levels: Rely on stored cumulative rolls. 
        // Safety fallback if data is missing.
        else if (!c.baseHP) {
            c.baseHP = Math.max(1, hitDie + (s.CON || 0));
        }
        
        let calcHP = c.baseHP;

        let calcSTA = 0;
        if (isFullWarrior) {
            const phys = [(s.STR||0), (s.DEX||0), (s.CON||0)].sort((a,b) => b - a);
            calcSTA = Math.max(1, phys[0] + phys[1]);
        } else if (hasWarrior) calcSTA = Math.max(1, (s.STR||0), (s.DEX||0), (s.CON||0));

        let calcMP = 0;
        if (hasCaster) {
            const getCastStat = (arch) => {
                if (!arch || !arch.primary_stats) return 0;
                for (let rawStat of arch.primary_stats) {
                    const normStat = I18n.normalize('stats', rawStat);
                    if (["INT", "WIS", "CHA"].includes(normStat)) return s[normStat] || 0;
                }
                return 0;
            };
            const modA = getCastStat(archA);
            const modB = getCastStat(archB);
            let castMod = Math.max(modA, modB);
            if (castMod === 0) castMod = Math.max((s.INT||0), (s.WIS||0), (s.CHA||0));
            if (isFullCaster) calcMP = ((c.level + 1) * 2) + castMod;
            else calcMP = (c.level + 1) + castMod;
        }

        let calcLuck = 1;
        if (isFullSpecialist) calcLuck = Math.max(1, (s.CHA||0) * 2);
        else if (hasSpecialist) calcLuck = Math.max(1, (s.CHA||0));

        let calcSlots = 8 + (s.STR||0) + (s.CON||0);

        // --- PHASE 3: APPLY BONUSES (Feats/Items) ---
        const applyModifiers = (mods) => {
            if (!mods) return;
            if (mods.hp_flat) calcHP += mods.hp_flat;
            if (mods.hp_per_level) calcHP += (mods.hp_per_level * c.level);
            if (mods.mp_flat) calcMP += mods.mp_flat;
            if (mods.sta_flat) calcSTA += mods.sta_flat;
            if (mods.luck_flat) calcLuck += mods.luck_flat;
            if (mods.slots_flat) calcSlots += mods.slots_flat;
            if (mods.sta_mod) {
                const normStat = I18n.normalize('stats', mods.sta_mod);
                calcSTA += (s[normStat] || 0);
            }
        };

        if (c.ancestry) {
            const anc = data.ancestries.find(a => a.id === c.ancestry);
            if (anc && c.ancestryFeatIndex !== null) applyModifiers(anc.feats[c.ancestryFeatIndex].modifiers);
            if (c.ancestryChoice) {
                if (c.ancestryChoice === "hp_flat") calcHP += 4;
                if (c.ancestryChoice === "mp_flat") calcMP += 2;
                if (c.ancestryChoice === "sta_flat") calcSTA += 1;
                if (c.ancestryChoice === "slots_flat") calcSlots += 1;
            }
        }
        
        c.talents.forEach(t => { if(t.modifiers) applyModifiers(t.modifiers); });
        if (c.classId) {
             const cls = data.classes.find(cl => cl.id === c.classId);
             if (cls) cls.synergy_feats.filter(f => f.level <= c.level).forEach(f => {
                 if(f.modifiers) applyModifiers(f.modifiers);
             });
        }

        // --- PHASE 3.5: MAGIC ITEMS ---
        const itemMods = CharGen.getMagicItemBonuses();
        calcHP += itemMods.hp;
        calcMP += itemMods.mp;
        calcSTA += itemMods.sta;
        calcLuck += itemMods.luck;
        calcSlots += itemMods.slots;

        // --- PHASE 4: RESOLVE OVERRIDES ---
        c.calculated = {
            maxHP: Math.max(1, calcHP),
            maxMP: Math.max(0, calcMP),
            maxSTA: Math.max(0, calcSTA),
            maxLuck: Math.max(1, calcLuck),
            slots: Math.max(8, calcSlots)
        };

        c.derived.maxHP = c.overrides.maxHP !== null ? c.overrides.maxHP : c.calculated.maxHP;
        c.derived.maxMP = c.overrides.maxMP !== null ? c.overrides.maxMP : c.calculated.maxMP;
        c.derived.maxSTA = c.overrides.maxSTA !== null ? c.overrides.maxSTA : c.calculated.maxSTA;
        c.derived.maxLuck = c.overrides.maxLuck !== null ? c.overrides.maxLuck : c.calculated.maxLuck;
        c.derived.slots = c.calculated.slots;

        const stepContainer = document.getElementById('step-container');
        if (stepContainer && CharGen.currentStep === 3) CharGen.updateStatPreview(hitDie);
    },

    updateStatPreview: (hitDie) => {
        const d = CharGen.char.derived;
        const el = document.getElementById('stats-preview');
        const t = I18n.t;
        if (!el) return;
        
        el.innerHTML = `
            <div class="preview-header" style="color:var(--accent-gold); border-bottom:1px solid #444; margin-bottom:1rem; padding-bottom:5px;">${t('mon_chassis')}</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 1rem;">
                <div class="resource-box" style="border:1px solid var(--accent-crimson); background:rgba(138, 44, 44, 0.1); padding:10px; text-align:center;">
                    <div style="font-size:0.7rem; color:#aaa; text-transform:uppercase;">${t('sheet_hp')}</div>
                    <div style="font-family:var(--font-mono); font-size:1.8rem; font-weight:bold; color:#eee;">${d.maxHP}</div>
                    <div style="font-size:0.7rem; color:#888;">(HD: d${hitDie})</div>
                </div>
                <div class="resource-box" style="border:1px solid #eee; background:rgba(255,255,255,0.05); padding:10px; text-align:center;">
                    <div style="font-size:0.7rem; color:#aaa; text-transform:uppercase;">${t('cg_lbl_slots')}</div>
                    <div style="font-family:var(--font-mono); font-size:1.8rem; font-weight:bold; color:#eee;">${d.slots}</div>
                </div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px;">
                <div class="resource-box" style="border:1px solid ${d.maxSTA > 0 ? '#388e3c' : '#333'}; padding:8px; text-align:center; opacity: ${d.maxSTA > 0 ? 1 : 0.4};">
                    <div style="font-size:0.6rem; color:#aaa;">${t('sheet_sta')}</div>
                    <div style="font-family:var(--font-mono); font-size:1.2rem; font-weight:bold;">${d.maxSTA}</div>
                </div>
                <div class="resource-box" style="border:1px solid ${d.maxMP > 0 ? '#1976d2' : '#333'}; padding:8px; text-align:center; opacity: ${d.maxMP > 0 ? 1 : 0.4};">
                    <div style="font-size:0.6rem; color:#aaa;">${t('sheet_mp')}</div>
                    <div style="font-family:var(--font-mono); font-size:1.2rem; font-weight:bold;">${d.maxMP}</div>
                </div>
                <div class="resource-box" style="border:1px solid ${d.maxLuck > 1 ? '#fbc02d' : '#333'}; padding:8px; text-align:center; opacity: ${d.maxLuck > 1 ? 1 : 0.6};">
                    <div style="font-size:0.6rem; color:#aaa;">${t('sheet_luck')}</div>
                    <div style="font-family:var(--font-mono); font-size:1.2rem; font-weight:bold;">${d.maxLuck}</div>
                </div>
            </div>
        `;
    },

    /* ------------------------------------------------------------------
       STEP 4: GEAR (Shop & Inventory)
       ------------------------------------------------------------------ */

    renderGear: (el) => {
        const t = I18n.t;
        const w = CharGen.char.currency || { g: 0, s: 0, c: 0 };
        const fmt = I18n.fmt;
        
        const html = `
            <div class="split-view">
                <div class="input-column">
                    <div class="shop-header">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <h3 style="margin:0;">${t('cg_shop_title')}</h3>
                            <div id="wallet-display" style="font-family:var(--font-mono); font-size:1.1rem; color:var(--accent-gold);">
                                💰 ${fmt('cg_currency', {g: w.g, s: w.s, c: w.c})}
                            </div>
                        </div>
                        <div class="shop-tabs">
                            <button class="tab-btn active" data-tab="weapons">${t('cg_tab_wep')}</button>
                            <button class="tab-btn" data-tab="armor">${t('cg_tab_arm')}</button>
                            <button class="tab-btn" data-tab="gear">${t('cg_tab_gear')}</button>
                        </div>
                    </div>
                    <div id="shop-container" class="shop-list"></div>
                    <div id="bg-gear-section" style="margin-top:10px; border-top:1px solid #333; padding-top:10px;">
                        <button id="btn-bg-gear" class="roll-btn" style="width:100%;">🎁 ${t('cg_btn_kit')}</button>
                    </div>
                </div>
                <div class="info-column">
                    <h3>${t('sheet_inv')}</h3>
                    <div class="slot-meter-container">
                        <div id="slot-fill" class="slot-meter-fill"></div>
                        <div id="slot-text" class="slot-text">0 / 8 ${t('cg_lbl_slots')}</div>
                    </div>
                    <div id="encumbrance-warning" style="color: var(--accent-crimson); display: none; margin-bottom: 5px; font-weight: bold; font-size: 0.8rem; text-align:center;">
                        ⚠️ ${t('cg_warn_enc')}
                    </div>
                    <div id="inv-list-container" class="shop-list" style="height: 300px;"></div>
                </div>
            </div>
        `;
        el.innerHTML = html;
        
        el.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                CharGen.renderShopList(e.target.dataset.tab);
            });
        });

        const bgBtn = document.getElementById('btn-bg-gear');
        const hasBgItems = CharGen.char.inventory.some(i => i.type === "Background" || i.description === "Background Item");
        if(hasBgItems) {
            bgBtn.disabled = true;
            bgBtn.textContent = `✅ ${t('cg_btn_kit_added')}`;
        } else {
            bgBtn.addEventListener('click', () => {
                CharGen.equipBackgroundGear(); 
            });
        }

        CharGen.renderShopList('weapons');
        CharGen.updateInventoryUI();
    },

    renderShopList: (category) => {
        const data = I18n.getData('items');
        const container = document.getElementById('shop-container');
        if (!data || !container) return;

        let items = [];
        if (category === 'weapons') items = data.weapons;
        else if (category === 'armor') items = data.armor;
        else if (category === 'gear') items = [...data.gear, ...data.materials, ...data.reagents];

        const html = items.map((item, idx) => `
            <div class="shop-item">
                <div style="flex-grow:1;">
                    <div style="font-weight:bold; color:var(--accent-gold);">${item.name}</div>
                    <div style="font-size:0.75rem; color:#888;">
                        ${item.cost || '-'} | ${item.slots || 0} Slot(s) 
                        ${item.damage ? `| ${item.damage}` : ''}
                        ${item.as ? `| AS ${item.as}` : ''}
                    </div>
                    <div style="font-size:0.7rem; font-style:italic; color:#666;">
                        ${item.effect || item.description || ''}
                    </div>
                </div>
                <button class="add-btn" data-cat="${category}" data-idx="${idx}">+</button>
            </div>
        `).join('');

        container.innerHTML = html;

        container.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                let list = [];
                if (btn.dataset.cat === 'weapons') list = data.weapons;
                else if (btn.dataset.cat === 'armor') list = data.armor;
                else list = [...data.gear, ...data.materials, ...data.reagents];
                
                const item = list[btn.dataset.idx];
                CharGen.addToInventory(item);
            });
        });
    },

    /* --- ECONOMY HELPERS --- */
    
    parseCostToCopper: (costStr) => {
        if (!costStr || costStr === "-") return 0;
        const clean = String(costStr).toLowerCase().replace(/,/g, '').trim();
        const match = clean.match(/(\d+)\s*([a-zñ]+)/); 
        if (!match) return 0;

        const val = parseInt(match[1], 10);
        const unit = match[2]; 

        // Gold / Oro
        if (unit.startsWith('g') || unit.startsWith('o')) return val * 100;
        // Silver / Plata
        if (unit.startsWith('s') || unit.startsWith('p')) return val * 10;
        
        return val; // Copper
    },

    getWalletTotal: () => {
        const w = CharGen.char.currency || { g: 0, s: 0, c: 0 };
        return (w.g * 100) + (w.s * 10) + (w.c);
    },

    updateWallet: (totalCopper) => {
        const g = Math.floor(totalCopper / 100);
        const rem1 = totalCopper % 100;
        const s = Math.floor(rem1 / 10);
        const c = rem1 % 10;

        CharGen.char.currency = { g, s, c };

        const walletEl = document.getElementById('wallet-display');
        if (walletEl) {
            walletEl.innerHTML = `💰 ${g}g ${s}s ${c}c`;
            walletEl.style.transition = "color 0.2s";
            walletEl.style.color = "#fff"; 
            setTimeout(() => {
                walletEl.style.color = "var(--accent-gold)"; 
            }, 300);
        }
    },

    /* --- INVENTORY LOGIC --- */

    _sanitizeItem: (item) => {
        // If it already has a valid magic type, leave it alone
        if (item.type === "Trinket" || item.type === "Wondrous" || item.type === "Potion" || item.type === "Scroll") {
            return item;
        }

        const name = item.name.toLowerCase();
        
        // Auto-detect type if missing
        if (!item.type) {
            if (name.includes("shield") || name.includes("escudo")) item.type = "Shield";
            else if (item.as > 0) item.type = "Armor";
            else if (item.isMagic) item.type = "Trinket"; // Default magic to Trinket
            else item.type = "Gear";
        }
        
        // Normalize combat types for logic checks
        const typeLower = item.type.toLowerCase();
        if (typeLower.includes("shield") || typeLower.includes("escudo")) item.type = "Shield";
        else if (typeLower.includes("armor") || typeLower.includes("armadura")) item.type = "Armor";
        else if (typeLower.includes("melee") || typeLower.includes("cuerpo")) item.type = "Melee";
        else if (typeLower.includes("ranged") || typeLower.includes("distancia")) item.type = "Ranged";

        return item;
    },

    equipBackgroundGear: () => {
        const bgId = CharGen.char.background;
        const options = I18n.getData('options');
        const bg = options.backgrounds.find(b => b.id === bgId);
        const itemsData = I18n.getData('items');
        const t = I18n.t;

        if (!bg || !bg.gear) return;

        let currentCopper = CharGen.getWalletTotal();
        const existingNames = CharGen.char.inventory.map(i => i.name);

        bg.gear.forEach(gearStr => {
            if (gearStr.match(/(gold|silver|copper|oro|plata|cobre)/i)) {
                currentCopper += CharGen.parseCostToCopper(gearStr);
                return;
            }

            if (existingNames.includes(gearStr)) return;

            const cleanName = gearStr.replace(/\s*\(.*?\)\s*/g, '').trim();
            const dbList = [...itemsData.weapons, ...itemsData.armor, ...itemsData.gear, ...itemsData.reagents];
            let dbItem = dbList.find(i => i.name.toLowerCase() === cleanName.toLowerCase());
            if (!dbItem) dbItem = dbList.find(i => cleanName.toLowerCase().includes(i.name.toLowerCase()));

            let finalItem = {};

            if (dbItem) {
                finalItem = JSON.parse(JSON.stringify(dbItem));
                finalItem.cost = "-";
                finalItem.name = gearStr; 
            } else {
                let slots = 0;
                const slotMatch = gearStr.match(/(\d+)\s*Slot/i);
                if (slotMatch) slots = parseFloat(slotMatch[1]);
                
                finalItem = {
                    name: gearStr,
                    slots: slots,
                    cost: "-",
                    type: "Gear", 
                    description: "Background Item"
                };
            }

            finalItem = CharGen._sanitizeItem(finalItem);
            finalItem.equipped = false;
            
            const inv = CharGen.char.inventory;
            if (finalItem.type === "Melee" || finalItem.type === "Ranged") {
                if (!inv.some(i => (i.type === "Melee" || i.type === "Ranged") && i.equipped)) finalItem.equipped = true;
            } else if (finalItem.type === "Shield") {
                if (!inv.some(i => i.type === "Shield" && i.equipped)) finalItem.equipped = true;
            } else if (finalItem.type === "Armor") {
                if (!inv.some(i => i.type === "Armor" && i.equipped)) finalItem.equipped = true;
            }

            CharGen.char.inventory.push(finalItem);
        });

        CharGen.updateWallet(currentCopper);

        const btn = document.getElementById('btn-bg-gear');
        if (btn) {
            btn.disabled = true;
            btn.textContent = `✅ ${t('cg_btn_kit_added')}`;
            btn.classList.remove('roll-btn');
            btn.classList.add('btn-secondary');
        }

        CharGen.updateInventoryUI();
        CharGen.recalcAll();
    },

    addToInventory: (item, ignoreCost = false) => {
        const costCopper = CharGen.parseCostToCopper(item.cost);
        const currentCopper = CharGen.getWalletTotal();

        // Economy Check: Only if NOT ignoring cost
        if (!ignoreCost && costCopper > 0 && currentCopper < costCopper) {
            const walletEl = document.getElementById('wallet-display');
            if (walletEl) {
                // Visual feedback for "Can't Afford"
                const originalColor = walletEl.style.color;
                walletEl.style.color = "#d32f2f"; // Red
                walletEl.style.fontWeight = "bold";
                setTimeout(() => {
                    walletEl.style.color = originalColor || "var(--accent-gold)";
                    walletEl.style.fontWeight = "normal";
                }, 500);
            }
            console.warn("Not enough gold to add item:", item.name);
            return; // Stop here
        }

        // Deduct Gold (only if not free)
        if (!ignoreCost && costCopper > 0) {
            CharGen.updateWallet(currentCopper - costCopper);
        }

        let newItem = JSON.parse(JSON.stringify(item));
        newItem = CharGen._sanitizeItem(newItem);
        newItem.equipped = false;

        // Smart Auto-Equip
        const inv = CharGen.char.inventory;
        if (newItem.type === "Melee" || newItem.type === "Ranged") {
             if (!inv.some(i => (i.type === "Melee" || i.type === "Ranged") && i.equipped)) newItem.equipped = true;
        } else if (newItem.type === "Shield") {
             if (!inv.some(i => i.type === "Shield" && i.equipped)) newItem.equipped = true;
        } else if (newItem.type === "Armor") {
             if (!inv.some(i => i.type === "Armor" && i.equipped)) newItem.equipped = true;
        }

        CharGen.char.inventory.push(newItem);
        CharGen.updateInventoryUI();
        CharGen.recalcAll();
    },

    removeFromInventory: (index) => {
        CharGen.char.inventory.splice(index, 1);
        CharGen.updateInventoryUI();
        CharGen.recalcAll(); 
    },

    updateInventoryUI: () => {
        const listEl = document.getElementById('inv-list-container');
        const fillEl = document.getElementById('slot-fill');
        const textEl = document.getElementById('slot-text');
        const warnEl = document.getElementById('encumbrance-warning');
        
        if (!listEl) return;

        let currentSlots = 0;
        CharGen.char.inventory.forEach(i => currentSlots += (i.slots || 0));
        currentSlots = Math.round(currentSlots * 100) / 100;

        const maxSlots = CharGen.char.derived.slots;
        const pct = Math.min(100, (currentSlots / maxSlots) * 100);

        if(fillEl) {
            fillEl.style.width = `${pct}%`;
            fillEl.style.backgroundColor = currentSlots > maxSlots ? 'var(--accent-crimson)' : 'var(--accent-gold)';
            textEl.textContent = `${currentSlots} / ${maxSlots} Slots`;
            warnEl.style.display = currentSlots > maxSlots ? 'block' : 'none';
        }

        listEl.innerHTML = CharGen.char.inventory.map((item, idx) => {
            const isEquipable = (item.type === "Melee" || item.type === "Ranged" || item.as > 0 || item.type === "Shield" || item.type === "Armor");
            const eqClass = item.equipped ? "equipped" : "";
            const eqText = item.equipped ? "E" : "-";
            
            return `
            <div class="inv-item ${eqClass}">
                <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                    ${isEquipable ? 
                        `<button class="equip-btn ${item.equipped ? 'active' : ''}" data-idx="${idx}" title="Toggle Equip">${eqText}</button>` 
                        : '<span style="width:24px;"></span>'}
                    <div style="display:flex; flex-direction:column; overflow:hidden;">
                        <span style="font-size:0.85rem; white-space:nowrap; text-overflow:ellipsis; font-weight:${item.equipped ? 'bold' : 'normal'}; color:${item.equipped ? 'var(--accent-gold)' : 'inherit'}">${item.name}</span>
                        <span style="font-size:0.7rem; color:#666;">${item.type}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <span style="font-family:var(--font-mono); font-size:0.75rem; margin-right:5px; color:#888;">${item.slots || 0}</span>
                    <button class="remove-btn" data-idx="${idx}">×</button>
                </div>
            </div>
            `;
        }).join('');

        listEl.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => CharGen.removeFromInventory(e.target.dataset.idx));
        });

        listEl.querySelectorAll('.equip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => CharGen.toggleEquip(e.target.dataset.idx));
        });
    },

    toggleEquip: (index) => {
        const item = CharGen.char.inventory[index];
        const isEquipping = !item.equipped; 

        if (isEquipping) {
            const check = CharGen.checkRequirements(item);
            if (!check.pass) {
                alert(`Cannot equip ${item.name}.\n${check.msg}`);
                return;
            }

            const inv = CharGen.char.inventory;
            
            if (item.type === "Armor") {
                inv.forEach(i => { if(i.type === "Armor") i.equipped = false; });
            } else if (item.type === "Shield") {
                inv.forEach(i => { if(i.type === "Shield") i.equipped = false; });
            }
        }

        item.equipped = isEquipping;
        CharGen.updateInventoryUI();
        CharGen.recalcAll();
    },

    checkRequirements: (item) => {
        if (!item.req) return { pass: true };

        const stats = CharGen.char.stats;
        const requirements = item.req.split(',').map(s => s.trim());
        let errorMsg = "";

        for (let r of requirements) {
            const match = r.match(/([A-Z]+)\s*([+-]?\d+)/);
            if (match) {
                const statName = match[1];
                const requiredVal = parseInt(match[2]);
                const myVal = stats[statName] || 0;

                if (myVal < requiredVal) {
                    errorMsg += `${statName} ${requiredVal} (You have ${myVal}). `;
                }
            }
        }

        if (errorMsg) return { pass: false, msg: errorMsg };
        return { pass: true };
    },

    /* ------------------------------------------------------------------
       STEP 5: FINAL SHEET & MANAGER
       ------------------------------------------------------------------ */

    renderSheet: async (container) => {
        const c = CharGen.char;

        // 1. Data Safety
        if (c.current.hp === null) c.current.hp = c.derived.maxHP;
        if (c.current.mp === null) c.current.mp = c.derived.maxMP;
        if (c.current.sta === null) c.current.sta = c.derived.maxSTA;
        if (c.current.luck === null) c.current.luck = c.derived.maxLuck;

        CharGen.recalcAll();
        
        // 2. Clear Container
        container.innerHTML = '';
        
        // 3. Cleanup & Create Print Container
        const existingPrint = document.getElementById('print-sheet-root');
        if (existingPrint) existingPrint.remove();

        const printArea = document.createElement('div');
        printArea.id = 'print-sheet-root';
        printArea.className = 'print-only';
        document.body.appendChild(printArea);

        // 4. Build Application Layout
        const layout = document.createElement('div');
        layout.className = 'char-manager-layout';
        
        layout.appendChild(CharGen.renderHUD());     
        layout.appendChild(CharGen.renderTabs());    
        
        const contentArea = document.createElement('div');
        contentArea.id = 'char-manager-content';
        contentArea.className = 'char-tab-content';
        layout.appendChild(contentArea);

        container.appendChild(layout);

        // 5. Initialize
        CharGen.switchTab('main');
        
        // Render hidden print view
        await CharGen.renderPrintVersion(printArea);
        
        CharGen.attachManagerListeners();
    },

    /**
     * GOD MODE: Render value or input based on state
     */
    renderEditableValue: (key, currentVal, calcVal, isResource = true) => {
        const isOverridden = CharGen.char.overrides[key] !== null;
        
        if (CharGen.isEditMode) {
            return `
                <div style="display:flex; align-items:center; gap:2px; justify-content:flex-end;">
                    <input type="number" class="god-mode-input" 
                        value="${currentVal}" 
                        onchange="import('./js/modules/chargen.js').then(m => m.CharGen.setOverride('${key}', this.value))">
                    ${isOverridden ? 
                        `<button class="btn-reset-override" title="Reset to ${calcVal}" 
                          onclick="import('./js/modules/chargen.js').then(m => m.CharGen.clearOverride('${key}'))">↺</button>` 
                        : ''}
                </div>
            `;
        } else {
            const className = isOverridden ? 'val-overridden' : '';
            const tooltip = isOverridden ? `title="Base: ${calcVal} (Overridden)"` : '';
            
            // IF Resource (HP/MP), show "/ Max". IF Static (AC), just show Number.
            const displayHTML = isResource ? `<span class="res-max">/ ${currentVal}</span>` : `<span class="res-val-static">${currentVal}</span>`;
            
            return `<span class="${className}" ${tooltip}>${displayHTML}</span>`;
        }
    },
    
    setOverride: (key, val) => {
        CharGen.char.overrides[key] = parseInt(val);
        CharGen.recalcAll(); 
        CharGen.renderSheet(CharGen.container); 
    },

    clearOverride: (key) => {
        CharGen.char.overrides[key] = null;
        CharGen.recalcAll();
        CharGen.renderSheet(CharGen.container);
    },
    
    toggleEditMode: () => {
        CharGen.isEditMode = !CharGen.isEditMode;
        CharGen.renderSheet(CharGen.container);
    },

    renderHUD: () => {
        const c = CharGen.char;
        const t = I18n.t;
        
        if (!c.calculated) CharGen.calculateDerived();

        const xpThreshold = c.level * 10;
        const canLevelUp = (c.current.xp >= xpThreshold) && (c.level < 10);
        
        const lvlBtnClass = canLevelUp ? "pulse-anim" : "";
        const lvlBtnText = canLevelUp ? t('btn_level_up_ready') : t('btn_level_up');
        const lvlBtnStyle = canLevelUp ? "" : "opacity: 0.5;";

        const hp = c.current.hp !== null ? c.current.hp : c.derived.maxHP;
        const mp = c.current.mp !== null ? c.current.mp : c.derived.maxMP;
        const sta = c.current.sta !== null ? c.current.sta : c.derived.maxSTA;
        const luck = c.current.luck !== null ? c.current.luck : c.derived.maxLuck;

        const hpPct = Math.min(100, (hp / c.derived.maxHP) * 100);
        const mpPct = Math.min(100, (mp / c.derived.maxMP) * 100);
        const staPct = Math.min(100, (sta / c.derived.maxSTA) * 100);
        const luckPct = Math.min(100, (luck / c.derived.maxLuck) * 100);
        
        // --- NEW: Get Archetype String ---
        const archDisplay = CharGen.getArchetypeDisplay();

        const div = document.createElement('div');
        div.className = 'char-hud';
        div.innerHTML = `
            <div class="hud-header">
                <div class="hud-identity">
                    <input type="text" class="edit-name" value="${c.name}" data-field="name" placeholder="${t('cg_lbl_name')}">
                    <div class="hud-subtitle">
                        ${c.className || 'Adventurer'} <span style="color:#666; font-size:0.9em;">(${archDisplay})</span> &bull; Lvl ${c.level}
                    </div>
                </div>
                
                <div class="hud-controls">
                    <button id="btn-lvl-trigger" class="hud-btn btn-levelup ${lvlBtnClass}" style="${lvlBtnStyle}" title="${t('btn_level_up')}">
                        <span>⬆</span> <span class="btn-text">${lvlBtnText}</span>
                    </button>
                    <button id="btn-toggle-edit" class="hud-btn ${CharGen.isEditMode ? 'active' : ''}" title="Toggle Edit Mode"><span>✎</span></button>
                    <button id="btn-print-trigger" class="hud-btn" title="${t('btn_print')}"><span>🖨️</span></button>
                    <button id="btn-save-trigger" class="hud-btn" title="${t('btn_save')}"><span>💾</span></button>
                    <button id="btn-exit-play" class="hud-btn exit" title="Exit"><span>✕</span></button>
                </div>
            </div>

            <div class="hud-vitals-row">
                <div class="level-capsule">
                    <div class="lvl-group">
                        <span class="lvl-label">LVL</span>
                        <input type="number" class="lvl-input edit-tiny" value="${c.level}" data-field="level" ${!CharGen.isEditMode ? 'readonly' : ''}>
                    </div>
                    <div style="width:1px; height:30px; background:#333;"></div>
                    <div class="lvl-group">
                        <span class="lvl-label">XP</span>
                        <div style="display:flex; align-items:baseline;">
                            <input type="number" class="lvl-input" value="${c.current.xp || 0}" data-vital="xp">
                            <span style="font-size:0.8rem; color:#666;">/ ${xpThreshold}</span>
                        </div>
                    </div>
                </div>

                <div class="resource-grid">
                    <div class="res-card red">
                        <div class="res-label">${t('sheet_hp')}</div>
                        <div class="res-values">
                            <input type="number" class="res-input v-cur" value="${hp}" data-vital="hp">
                            ${CharGen.renderEditableValue('maxHP', c.derived.maxHP, c.calculated.maxHP)}
                        </div>
                        <div class="res-bar"><div class="res-fill" style="width:${hpPct}%"></div></div>
                    </div>
                    <div class="res-card green">
                        <div class="res-label">${t('sheet_sta')}</div>
                        <div class="res-values">
                            <input type="number" class="res-input v-cur" value="${sta}" data-vital="sta">
                             ${CharGen.renderEditableValue('maxSTA', c.derived.maxSTA, c.calculated.maxSTA)}
                        </div>
                        <div class="res-bar"><div class="res-fill" style="width:${staPct}%"></div></div>
                    </div>
                    <div class="res-card blue">
                        <div class="res-label">${t('sheet_mp')}</div>
                        <div class="res-values">
                            <input type="number" class="res-input v-cur" value="${mp}" data-vital="mp">
                             ${CharGen.renderEditableValue('maxMP', c.derived.maxMP, c.calculated.maxMP)}
                        </div>
                        <div class="res-bar"><div class="res-fill" style="width:${mpPct}%"></div></div>
                    </div>
                    <div class="res-card gold">
                        <div class="res-label">${t('sheet_luck')}</div>
                        <div class="res-values">
                            <input type="number" class="res-input v-cur" value="${luck}" data-vital="luck">
                             ${CharGen.renderEditableValue('maxLuck', c.derived.maxLuck, c.calculated.maxLuck)}
                        </div>
                        <div class="res-bar"><div class="res-fill" style="width:${luckPct}%"></div></div>
                    </div>
                </div>
            </div>
        `;
        
        div.querySelector('#btn-toggle-edit').addEventListener('click', CharGen.toggleEditMode);
        const btnLvl = div.querySelector('#btn-lvl-trigger');
        if(btnLvl) btnLvl.addEventListener('click', CharGen.initLevelUp);
        const btnExit = div.querySelector('#btn-exit-play');
        if(btnExit) btnExit.addEventListener('click', CharGen.exitPlayMode);
        
        return div;
    },

    renderTabs: () => {
        const t = I18n.t;
        const div = document.createElement('div');
        div.className = 'char-tabs';
        div.innerHTML = `
            <button class="char-tab-btn active" data-target="main">⚔️ ${t('cg_combat_stats')}</button>
            <button class="char-tab-btn" data-target="inventory">🎒 ${t('sheet_inv')}</button>
            <button class="char-tab-btn" data-target="magic">🔮 ${t('magic_tab_title')}</button>
            <button class="char-tab-btn" data-target="features">✨ ${t('sheet_features')}</button>
            <button class="char-tab-btn" data-target="notes">📝 ${t('sheet_notes')}</button>
        `;
        
        div.querySelectorAll('.char-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                div.querySelectorAll('.char-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                CharGen.switchTab(btn.dataset.target);
            });
        });
        
        return div;
    },

    switchTab: (tabName) => {
        const container = document.getElementById('char-manager-content');
        container.innerHTML = '';
        
        switch(tabName) {
            case 'main': CharGen.renderTabMain(container); break;
            case 'inventory': CharGen.renderTabInventory(container); break;
            case 'magic': CharGen.renderTabMagic(container); break;
            case 'features': CharGen.renderTabFeatures(container); break;
            case 'notes': CharGen.renderTabNotes(container); break;
        }
    },

renderTabMain: (container) => {
        const c = CharGen.char;
        const t = I18n.t;
        const isEdit = CharGen.isEditMode;
        
        CharGen.recalcAll(); 

        const armorScore = CharGen.calculateArmorScore();
        const def = c.defenses;
        const defOverrides = c.overrides.defenses || {}; 
        
        // Handle Init/Speed overrides
        const initVal = c.overrides.initiative !== null ? c.overrides.initiative : (c.stats.DEX || 0);
        const speedVal = c.overrides.speed !== null ? c.overrides.speed : "30'";

        // --- RENDER HELPERS ---

        // 1. Skill Row
        const renderSkillRow = (s) => {
            const modStr = s.statMod >= 0 ? `+${s.statMod}` : s.statMod;
            // Name is already localized by calculateSkills()
            
            if (isEdit) {
                return `
                <div class="skill-row edit-mode">
                    <span class="skill-name" style="flex:1;">${s.name} <small>(${s.stat})</small></span>
                    <span class="skill-mod" style="width:40px; color:#666;">${modStr}</span>
                    <select class="js-skill-die god-mode-input" data-id="${s.id}" style="width:70px;">
                        <option value="-" ${s.die==='-'?'selected':''}>-</option>
                        <option value="1d4" ${s.die==='1d4'?'selected':''}>d4</option>
                        <option value="1d6" ${s.die==='1d6'?'selected':''}>d6</option>
                        <option value="1d8" ${s.die==='1d8'?'selected':''}>d8</option>
                    </select>
                </div>`;
            } else {
                const dieClass = String(s.die).includes('d6') ? 'expert' : (String(s.die).includes('d4') ? 'trained' : '');
                return `
                <div class="skill-row interactive js-roll-skill" data-name="${s.name}" data-mod="${s.statMod}" data-die="${s.die}">
                    <span class="skill-name ${s.isOverridden ? 'val-overridden' : ''}" style="flex:1;">${s.name} <small style="color:#666;">(${s.stat})</small></span>
                    <span class="skill-mod" style="width:40px; text-align:center; color:#888;">${modStr}</span>
                    <span class="skill-die ${dieClass}" style="width:50px; text-align:right;">${s.die !== '-' ? '+' + s.die : ''}</span>
                </div>`;
            }
        };

        // 2. Attack Row
        const attacks = [];
        const str = c.stats.STR || 0;
        // Unarmed
        attacks.push({ id: "unarmed", name: t('wep_unarmed'), tags: t('tag_melee'), atk: str, dmg: `1d4 + ${str}` });

        // Weapons
        c.inventory.filter(i => (i.type === 'Melee' || i.type === 'Ranged') && i.equipped).forEach((w, i) => {
            const isFinesse = w.tags && (String(w.tags).includes("Finesse") || String(w.tags).includes("Sutil"));
            const isRanged = w.type === 'Ranged' || w.type === 'A Distancia';
            let mod = c.stats.STR || 0;
            if (isRanged) mod = c.stats.DEX || 0;
            else if (isFinesse) mod = Math.max(c.stats.STR || 0, c.stats.DEX || 0);
            
            // Check Overrides
            const uid = `wep_${i}`;
            const ov = c.overrides.attacks?.[uid] || {};
            
            attacks.push({
                id: uid,
                name: w.name,
                tags: w.type, // Usually localized by item data, or we could map it
                atk: ov.atk !== undefined ? ov.atk : mod,
                dmg: ov.dmg !== undefined ? ov.dmg : `${w.damage} + ${mod}`,
                isOverridden: (ov.atk !== undefined || ov.dmg !== undefined)
            });
        });

        const renderAttackRow = (atk) => {
            if (isEdit) {
                return `
                <div class="attack-card edit-mode" style="display:flex; flex-direction:column; gap:5px;">
                    <div style="font-weight:bold; color:#aaa;">${atk.name}</div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <label style="font-size:0.7rem;">${t('lbl_atk_bonus')}:</label>
                        <input type="number" class="js-atk-mod god-mode-input" data-id="${atk.id}" value="${atk.atk}" style="width:50px;">
                        <label style="font-size:0.7rem;">${t('mon_stat_dmg')}:</label>
                        <input type="text" class="js-atk-dmg god-mode-input" data-id="${atk.id}" value="${atk.dmg}" style="width:100px;">
                    </div>
                </div>`;
            } else {
                return `
                <div class="attack-card roll-action js-roll-attack" data-name="${atk.name}" data-mod="${atk.atk}" data-dmg="${atk.dmg}">
                    <div class="atk-main">
                        <span class="atk-name ${atk.isOverridden ? 'val-overridden' : ''}">${atk.name}</span>
                        <span class="atk-tags">${atk.tags}</span>
                    </div>
                    <div class="atk-roll">
                        <span class="atk-bonus">${t('lbl_atk_bonus')} ${atk.atk >= 0 ? '+' : ''}${atk.atk}</span>
                        <span class="atk-dmg">${atk.dmg}</span>
                    </div>
                </div>`;
            }
        };

        // 3. Defense Row Helper
        const renderDefense = (label, type, dataObj) => {
            if (isEdit) {
                 return `
                <div class="skill-row edit-mode">
                    <span class="skill-name">${label}</span>
                    <div style="display:flex; gap:2px;">
                        <input type="number" class="god-mode-input js-def-val" data-type="${type}" value="${dataObj.val || 0}" style="width:50px;">
                        <input type="text" class="god-mode-input js-def-die" data-type="${type}" value="${dataObj.die}" style="width:50px;">
                        ${defOverrides[type] ? `<button class="btn-reset-override" onclick="import('./js/modules/chargen.js').then(m => m.CharGen.clearDefenseOverride('${type}'))">↺</button>` : ''}
                    </div>
                </div>`;
            } else {
                return `
                <div class="skill-row interactive js-roll-def" data-label="${label}" data-die="${dataObj.die}" data-val="${dataObj.val || 0}">
                    <span class="skill-name">${label}</span>
                    <span class="skill-val ${defOverrides[type] ? 'val-overridden' : ''}">
                        ${dataObj.val !== null ? (dataObj.val >= 0 ? '+'+dataObj.val : dataObj.val) : '--'} 
                        ${dataObj.die !== '-' ? '('+dataObj.die+')' : ''}
                    </span>
                </div>`;
            }
        };

        // --- RENDER HTML ---
        container.innerHTML = `
            <div class="manager-grid">
                <!-- COL 1 -->
                <div class="mgr-col">
                    <div>
                        <div class="mgr-header">${t('cg_step_stats')}</div>
                        <div class="attr-grid">
                            ${['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(stat => `
                                <div class="attr-card ${!isEdit ? 'interactive js-roll-stat' : ''}" data-stat="${stat}" data-mod="${c.stats[stat] || 0}">
                                    <span class="attr-lbl">${t('stat_' + stat.toLowerCase())}</span>
                                    ${isEdit ? 
                                      `<input type="number" class="god-mode-input js-stat-edit" data-stat="${stat}" value="${c.stats[stat]||0}">` 
                                      : 
                                      `<div class="attr-val-display">${(c.stats[stat] || 0) >= 0 ? '+' : ''}${c.stats[stat] || 0}</div>`
                                    }
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <div class="mgr-header">${t('sheet_def')}</div>
                        <div class="def-row">
                            <div class="def-card"><span class="def-label">${t('sheet_ac')}</span>
                                <div class="def-val">${CharGen.renderEditableValue('ac', armorScore, armorScore, false)}</div>
                            </div>
                            <div class="def-card"><span class="def-label">${t('cg_initiative')}</span>
                                <div class="def-val">${CharGen.renderEditableValue('initiative', initVal, c.stats.DEX||0, false)}</div>
                            </div>
                            <div class="def-card"><span class="def-label">${t('mon_stat_spd')}</span>
                                <div class="def-val">${CharGen.renderEditableValue('speed', speedVal, "30'", false)}</div>
                            </div>
                        </div>
                        <!-- Defenses List -->
                        <div style="margin-top:10px; background:#1a1a1a; padding:10px; border-radius:4px; border:1px solid #333;">
                            ${renderDefense(`${t('def_dodge')} (DEX)`, 'dodge', def.dodge)}
                            ${renderDefense(`${t('def_parry')} (STR)`, 'parry', def.parry)}
                            ${renderDefense(`${t('def_block')} (CON)`, 'block', def.block)}
                        </div>
                    </div>
                </div>
                <!-- COL 2 -->
                <div class="mgr-col">
                    <div>
                        <div class="mgr-header">${t('sheet_attacks')}</div>
                        <div class="attack-list">${attacks.map(renderAttackRow).join('')}</div>
                    </div>
                    <div>
                        <div class="mgr-header">${t('sheet_skills')}</div>
                        <div class="skills-grid" style="display:grid; grid-template-columns:1fr; gap:0;">
                            ${CharGen.calculateSkills().map(renderSkillRow).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // --- ATTACH LISTENERS ---
        // (Listeners code is same as previous batch, just ensure it's included)
        CharGen.attachMainTabListeners(container, isEdit);
    },

    // Helper to keep renderTabMain clean
    attachMainTabListeners: (container, isEdit) => {
         if (isEdit) {
            container.querySelectorAll('.js-stat-edit').forEach(el => {
                el.addEventListener('change', (e) => {
                    CharGen.char.stats[e.target.dataset.stat] = parseInt(e.target.value);
                    CharGen.recalcAll(); CharGen.renderSheet(CharGen.container);
                });
            });
            container.querySelectorAll('.js-skill-die').forEach(el => {
                el.addEventListener('change', (e) => CharGen.setSkillOverride(e.target.dataset.id, e.target.value));
            });
            container.querySelectorAll('.js-def-val').forEach(el => {
                el.addEventListener('change', (e) => CharGen.setDefenseOverride(e.target.dataset.type, 'val', e.target.value));
            });
            container.querySelectorAll('.js-def-die').forEach(el => {
                el.addEventListener('change', (e) => CharGen.setDefenseOverride(e.target.dataset.type, 'die', e.target.value));
            });
            container.querySelectorAll('.js-atk-mod').forEach(el => {
                el.addEventListener('change', (e) => CharGen.setAttackOverride(e.target.dataset.id, 'atk', parseInt(e.target.value)));
            });
            container.querySelectorAll('.js-atk-dmg').forEach(el => {
                el.addEventListener('change', (e) => CharGen.setAttackOverride(e.target.dataset.id, 'dmg', e.target.value));
            });
        } else {
            container.querySelectorAll('.js-roll-stat').forEach(el => {
                el.addEventListener('click', () => CharGen.performRoll(el.dataset.stat + ' Check', null, parseInt(el.dataset.mod)));
            });
            container.querySelectorAll('.js-roll-def').forEach(el => {
                el.addEventListener('click', () => CharGen.performRoll(el.dataset.label, el.dataset.die, parseInt(el.dataset.val)));
            });
            container.querySelectorAll('.js-roll-attack').forEach(el => {
                el.addEventListener('click', () => {
                    const name = el.dataset.name;
                    const mod = parseInt(el.dataset.mod);
                    const dmg = el.dataset.dmg;
                    
                    // 1. Roll Attack (Immediate)
                    CharGen.performRoll(`${name} (Atk)`, null, mod, 'attack');
                    
                    // 2. Roll Damage (Delayed for visual pacing)
                    setTimeout(() => {
                        // FIX: Use the imported Dice object directly
                        const res = Dice.roll(dmg);
                        DiceUI.show(`${name} (Dmg)`, res, 'damage');
                    }, 800);
                });
            });
            container.querySelectorAll('.js-roll-skill').forEach(el => {
                el.addEventListener('click', () => {
                    const die = el.dataset.die === '-' ? null : el.dataset.die;
                    CharGen.performRoll(el.dataset.name, die, parseInt(el.dataset.mod), 'check');
                });
            });
        }
    },

    // --- SKILL & DEFENSE OVERRIDE HELPERS ---

    setSkillOverride: (id, die) => {
        if (!CharGen.char.overrides.skills) CharGen.char.overrides.skills = {};
        CharGen.char.overrides.skills[id] = { die: die };
        CharGen.renderSheet(CharGen.container);
    },

    clearSkillOverride: (id) => {
        if (CharGen.char.overrides.skills) delete CharGen.char.overrides.skills[id];
        CharGen.renderSheet(CharGen.container);
    },

    setDefenseOverride: (type, field, value) => {
        if (!CharGen.char.overrides.defenses) CharGen.char.overrides.defenses = {};
        if (!CharGen.char.overrides.defenses[type]) CharGen.char.overrides.defenses[type] = { val: 0, die: '-' };
        
        CharGen.char.overrides.defenses[type][field] = (field === 'val') ? parseInt(value) : value;
        CharGen.renderSheet(CharGen.container);
    },

    clearDefenseOverride: (type) => {
        if (CharGen.char.overrides.defenses) delete CharGen.char.overrides.defenses[type];
        CharGen.recalcAll();
        CharGen.renderSheet(CharGen.container);
    },

    // Update renderSkillButtons to accept a renderer callback
    renderSkillButtons: (renderer) => {
        const skills = CharGen.calculateSkills();
        return skills.map(s => renderer(s)).join('');
    },

    performRoll: (label, profDie, mod, type = 'check') => {
        let pDie = 0;
        if (profDie && profDie.includes('d')) {
            pDie = parseInt(profDie.split('d')[1]);
        }
        const result = Dice.rollCheck(mod, pDie);
        DiceUI.show(label, result, type);
    },

    renderAttackButtons: () => {
        const c = CharGen.char;
        const t = I18n.t;
        
        // Unarmed
        const str = c.stats.STR || 0;
        let html = `
            <div class="attack-card roll-action" data-name="${t('wep_unarmed')}" data-mod="${str}" data-dmg="1d4+${str}">
                <div class="atk-main"><span class="atk-name">${t('wep_unarmed')}</span><span class="atk-tags">Melee</span></div>
                <div class="atk-roll"><span class="atk-bonus">Atk: ${str >= 0 ? '+' : ''}${str}</span><span class="atk-dmg">1d4 ${str >= 0 ? '+' : ''}${str}</span></div>
            </div>
        `;

        const weapons = c.inventory.filter(i => (i.type === 'Melee' || i.type === 'Ranged') && i.equipped);
        weapons.forEach(w => {
            const isFinesse = w.tags && (w.tags.includes("Finesse") || w.tags.includes("Sutil"));
            const isRanged = w.type === 'Ranged' || w.type === 'A Distancia';
            
            let mod = c.stats.STR || 0;
            if (isRanged) mod = c.stats.DEX || 0;
            else if (isFinesse) mod = Math.max(c.stats.STR || 0, c.stats.DEX || 0);
            
            const sign = mod >= 0 ? '+' : '';
            const dmgString = `${w.damage}+${mod}`; 

            html += `
                <div class="attack-card roll-action" data-name="${w.name}" data-mod="${mod}" data-dmg="${dmgString}">
                    <div class="atk-main"><span class="atk-name">${w.name}</span><span class="atk-tags">${w.type}</span></div>
                    <div class="atk-roll"><span class="atk-bonus">Atk ${sign}${mod}</span><span class="atk-dmg">${w.damage} ${sign}${mod}</span></div>
                </div>
            `;
        });
        return html;
    },

    renderSkillButtons: () => {
        const skills = CharGen.calculateSkills();
        return skills.map(s => {
            const isTrained = s.count > 0;
            const dieClass = s.die === 'd6' ? 'expert' : (s.die === 'd4' ? 'trained' : '');
            const statMod = CharGen.char.stats[s.statKey] || 0; 
            return `
                <div class="skill-row skill-row-btn interactive" data-name="${s.name}" data-die="${s.die}" data-mod="${statMod}">
                    <span class="skill-name" style="${isTrained ? 'color:#eee;' : 'color:#666;'}">${s.name}</span>
                    <span class="skill-die ${dieClass}">${s.die !== '-' ? '+' + s.die : ''}</span>
                </div>
            `;
        }).join('');
    },

renderTabInventory: (container) => {
        const c = CharGen.char;
        const t = I18n.t;
        let currentSlots = c.inventory.reduce((sum, i) => sum + (i.slots || 0), 0);
        currentSlots = Math.round(currentSlots * 100) / 100;
        const maxSlots = c.derived.slots || 10;
        
        container.innerHTML = `
            <div class="wealth-bar">
                <div class="wealth-item"><label>${t('inv_gold')}</label><input type="number" class="wealth-input" data-type="g" value="${c.currency.g}"></div>
                <div class="wealth-item"><label>${t('inv_silver')}</label><input type="number" class="wealth-input" data-type="s" value="${c.currency.s}"></div>
                <div class="wealth-item"><label>${t('inv_copper')}</label><input type="number" class="wealth-input" data-type="c" value="${c.currency.c}"></div>
                <div style="flex-grow:1; text-align:right; font-family:var(--font-mono); font-size:0.9rem; color:#888;">
                    ${t('inv_capacity')}: <span style="color:${currentSlots > maxSlots ? 'var(--accent-crimson)' : 'white'}">${currentSlots} / ${maxSlots}</span>
                </div>
                <button id="btn-open-shop" class="btn-primary" style="margin-left:20px;">🛒 ${t('btn_shop')}</button>
            </div>
            <div class="inv-grid-layout">
                <div class="inv-header-bar">
                    <span style="flex:2">${t('inv_item_header')}</span>
                    <span style="width:80px; text-align:center;">${t('inv_slots_header')}</span>
                    <span style="width:100px; text-align:right;">${t('inv_actions_header')}</span>
                </div>
                <div id="inv-list">
                    ${c.inventory.map((item, idx) => `
                        <div class="inv-manager-row">
                            <div class="col-name">
                                <span class="inv-name" style="${item.equipped ? 'color:var(--accent-gold)' : ''}">${item.name} ${item.equipped ? ' (E)' : ''}</span>
                                <span class="inv-meta">${item.type} &bull; ${item.damage || item.as ? (item.damage || 'AS ' + item.as) : t('inv_item_header')}</span>
                            </div>
                            <div class="col-slots">${item.slots}</div>
                            <div class="col-actions">
                                ${(item.type === 'Melee' || item.type === 'Ranged' || item.type === 'Armor' || item.type === 'Shield') ? 
                                    `<button class="btn-icon-small action-equip" data-idx="${idx}" title="Equip/Unequip">${item.equipped ? '✅' : '🛡️'}</button>` : ''}
                                <button class="btn-icon-small action-delete" data-idx="${idx}" title="Delete">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.wealth-input').forEach(inp => {
            inp.addEventListener('change', (e) => c.currency[e.target.dataset.type] = parseInt(e.target.value) || 0);
        });
        document.getElementById('btn-open-shop').onclick = CharGen.openShopModal;
        container.querySelectorAll('.action-equip').forEach(btn => {
            btn.onclick = (e) => { CharGen.toggleEquip(e.target.dataset.idx); CharGen.renderTabInventory(container); };
        });
        container.querySelectorAll('.action-delete').forEach(btn => {
            btn.onclick = (e) => { if(confirm(t('btn_confirm') + '?')) { CharGen.removeFromInventory(e.target.dataset.idx); CharGen.renderTabInventory(container); }};
        });
    },

    renderTabMagic: (container) => {
        const c = CharGen.char;
        const t = I18n.t;

        // Filter: Magic items or items with effects
        const magicItems = c.inventory.filter(i => 
            i.isMagic === true || 
            (i.magicEffect && i.magicEffect.length > 0) ||
            i.type === "Trinket" ||
            i.type === "Wondrous" ||
            i.type === "Potion" ||
            i.type === "Scroll" ||
            (i.name && (i.name.includes("Magic") || i.name.includes("Mágico")))
        );

        container.innerHTML = `
            <div class="wealth-bar" style="justify-content:space-between;">
                <div style="font-family:var(--font-header); font-size:1.2rem; color:var(--accent-blue);">
                    ${t('magic_header')}
                </div>
                <button id="btn-import-magic" class="btn-primary">⚡ ${t('magic_import')}</button>
            </div>

            <div class="magic-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:1rem;">
                ${magicItems.length > 0 ? magicItems.map((item) => {
                    // Find the REAL index in the main inventory array
                    const realIdx = c.inventory.indexOf(item);
                    
                    return `
                    <div class="lib-card item ${item.equipped ? 'official' : ''}" style="min-height:auto;">
                        <div class="lib-card-body">
                            <div class="lib-card-name" style="${item.equipped ? 'color:var(--accent-gold)' : ''}">
                                ${item.equipped ? '★ ' : ''}${item.name}
                            </div>
                            <div class="lib-card-meta">${item.type} &bull; ${item.slots} ${t('inv_slots_header')}</div>
                            <div style="font-size:0.85rem; color:#ccc; margin-top:5px; font-style:italic;">
                                ${item.magicEffect || item.description || ''}
                            </div>
                        </div>
                        <div class="lib-card-footer">
                            <button class="lib-btn ${item.equipped ? 'primary' : ''} js-magic-equip" data-idx="${realIdx}">
                                ${item.equipped ? t('btn_cancel') : 'Equip / Attune'}
                            </button>
                            <button class="lib-btn delete js-magic-delete" data-idx="${realIdx}">
                                ${t('btn_delete')}
                            </button>
                        </div>
                    </div>`;
                }).join('') : `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:#666;">${t('magic_empty')}</div>`}
            </div>
        `;
        
        // --- ATTACH LISTENERS ---

        // Import Button
        const btnImport = document.getElementById('btn-import-magic');
        if (btnImport) btnImport.onclick = CharGen.openMagicImportModal;

        // Equip/Attune Buttons
        container.querySelectorAll('.js-magic-equip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                CharGen.toggleEquip(idx);
                // Force re-render of THIS tab to update button state (Equip -> Unequip)
                CharGen.renderTabMagic(container);
            });
        });

        // Delete Buttons
        container.querySelectorAll('.js-magic-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm(t('btn_confirm') + '?')) {
                    const idx = parseInt(e.target.dataset.idx);
                    CharGen.removeFromInventory(idx);
                    // Force re-render
                    CharGen.renderTabMagic(container);
                }
            });
        });
    },

    openMagicImportModal: () => {
        // Use global Storage
        const libraryItems = Storage.getItems().filter(i => i.isMagic || i.type === "Trinket" || i.magicEffect);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        overlay.innerHTML = `
            <div class="modal-content" style="width:600px; height:80vh; display:flex; flex-direction:column;">
                <div class="modal-header">
                    Import Magic Item
                    <button class="btn-close-modal" style="float:right; background:none; border:none; color:white;">✕</button>
                </div>
                <div style="flex-grow:1; overflow-y:auto; padding:10px;">
                    ${libraryItems.length === 0 ? '<p style="text-align:center; color:#888;">No magic items found in Library.<br>Go to the Artificer to forge some!</p>' : ''}
                    ${libraryItems.map(item => `
                        <div class="shop-item">
                            <div style="flex:1">
                                <div style="color:var(--accent-blue); font-weight:bold;">${item.name}</div>
                                <div style="font-size:0.8rem; color:#888;">${item.magicEffect || item.description}</div>
                            </div>
                            <button class="add-btn" data-id="${item.id}">+</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Bind Add Buttons
        overlay.querySelectorAll('.add-btn').forEach(btn => {
            btn.onclick = () => {
                const item = libraryItems.find(i => i.id === btn.dataset.id);
                if (item) {
                    const newItem = JSON.parse(JSON.stringify(item));
                    
                    // Force Magic Flags
                    newItem.equipped = false; 
                    newItem.isMagic = true; 
                    
                    // --- FIX: Pass 'true' to ignore gold cost ---
                    CharGen.addToInventory(newItem, true); 
                    
                    const main = document.getElementById('char-manager-content');
                    if (main) CharGen.renderTabMagic(main);
                    
                    btn.textContent = "Added";
                    btn.disabled = true;
                }
            };
        });

        const close = () => overlay.remove();
        overlay.querySelector('.btn-close-modal').onclick = close;
    },

    openShopModal: () => {
        const t = I18n.t;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        overlay.innerHTML = `
            <div class="modal-content" style="width:800px; height:80vh; display:flex; flex-direction:column;">
                <div class="modal-header" style="flex-shrink:0;">
                    ${t('shop_modal_title')}
                    <button id="close-shop" style="float:right; background:none; border:none; color:white; cursor:pointer;">✕</button>
                </div>
                
                <div class="shop-tabs" style="margin-top:1rem;">
                    <button class="tab-btn active" data-tab="weapons">${t('cg_tab_wep')}</button>
                    <button class="tab-btn" data-tab="armor">${t('cg_tab_arm')}</button>
                    <button class="tab-btn" data-tab="gear">${t('cg_tab_gear')}</button>
                </div>

                <div id="modal-shop-list" class="shop-list" style="flex-grow:1; height:auto;"></div>

                <div style="margin-top:1rem; border-top:1px solid #333; padding-top:1rem;">
                    <h4>${t('btn_add_custom')}</h4>
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="cust-item-name" placeholder="${t('lbl_name')}" style="flex:2">
                        <input type="number" id="cust-item-slots" placeholder="Slots" style="width:60px;">
                        <button id="btn-add-custom-item" class="btn-secondary">+</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const renderList = (cat) => {
            const data = I18n.getData('items');
            const container = overlay.querySelector('#modal-shop-list');
            let items = [];
            if (cat === 'weapons') items = data.weapons;
            else if (cat === 'armor') items = data.armor;
            else items = [...data.gear, ...data.materials, ...data.reagents];

            container.innerHTML = items.map((item, idx) => `
                <div class="shop-item">
                    <div style="flex-grow:1;">
                        <div style="font-weight:bold; color:var(--accent-gold);">${item.name}</div>
                        <div style="font-size:0.75rem; color:#888;">
                            ${item.cost} | ${item.slots} Slot | ${item.description || item.effect || ''}
                        </div>
                    </div>
                    <button class="add-shop-item" data-cat="${cat}" data-idx="${idx}">+</button>
                </div>
            `).join('');

            container.querySelectorAll('.add-shop-item').forEach(btn => {
                btn.onclick = () => {
                    const list = (btn.dataset.cat === 'weapons') ? data.weapons : (btn.dataset.cat === 'armor') ? data.armor : [...data.gear, ...data.materials, ...data.reagents];
                    CharGen.addToInventory(list[btn.dataset.idx]);
                    const mainContainer = document.getElementById('char-manager-content');
                    if(mainContainer) CharGen.renderTabInventory(mainContainer);
                    btn.textContent = "✔";
                    setTimeout(() => btn.textContent = "+", 500);
                };
            });
        };

        overlay.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                overlay.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderList(btn.dataset.tab);
            };
        });

        overlay.querySelector('#btn-add-custom-item').onclick = () => {
            const name = overlay.querySelector('#cust-item-name').value;
            const slots = parseFloat(overlay.querySelector('#cust-item-slots').value) || 0;
            if(name) {
                CharGen.char.inventory.push({ name, slots, type: 'Custom', cost: '-', equipped: false });
                const mainContainer = document.getElementById('char-manager-content');
                if(mainContainer) CharGen.renderTabInventory(mainContainer);
                alert("Added " + name);
            }
        };

        const close = () => overlay.remove();
        overlay.querySelector('#close-shop').onclick = close;
        renderList('weapons');
    },

    renderTabFeatures: (container) => {
        const c = CharGen.char;
        const t = I18n.t;
        const data = I18n.getData('options');
        const allFeatures = [];

        if (c.ancestry && data.ancestries) {
            const anc = data.ancestries.find(a => a.id === c.ancestry);
            const featIdx = c.ancestryFeatIndex !== null ? c.ancestryFeatIndex : (anc.feats.length > 0 ? 0 : null);
            if (anc && featIdx !== null && anc.feats[featIdx]) {
                const feat = anc.feats[featIdx];
                allFeatures.push({ name: feat.name, source: `${t('cg_lbl_ancestry')}: ${anc.name}`, type: "Passive", cost: "-", desc: feat.effect, tags: feat.modifiers ? ["Stat Bonus"] : [] });
            }
        }

        if (c.background && data.backgrounds) {
            const bg = data.backgrounds.find(b => b.id === c.background);
            if (bg && bg.feat) {
                allFeatures.push({ name: bg.feat.name, source: `${t('cg_lbl_background')}: ${bg.name}`, type: "Passive", cost: "-", desc: bg.feat.effect, tags: ["Utility"] });
            }
        }

        if (c.classId && data.classes) {
            const cls = data.classes.find(x => x.id === c.classId);
            if (cls && cls.synergy_feats) {
                cls.synergy_feats.forEach(f => {
                    if (f.level <= c.level) {
                        allFeatures.push({ name: f.name, source: `${t('cg_step_class')} (Lvl ${f.level})`, type: f.type || "Passive", cost: f.cost || "-", desc: f.effect, tags: f.stat_options ? ["Stat Choice"] : [] });
                    }
                });
            }
        }

        if (c.talents && c.talents.length > 0) {
            c.talents.forEach(tal => {
                allFeatures.push({ name: tal.name, source: tal.sourceName || t('sheet_arch_talents'), type: tal.type || "Talent", cost: tal.cost, desc: tal.effect, tags: tal.tags || [], choice: tal.choice });
            });
        }

        if (allFeatures.length === 0) {
            container.innerHTML = `<div style="padding:2rem; text-align:center; color:#666;">No features found.</div>`;
            return;
        }

        const getTypeClass = (type) => {
            const tLower = (type || "").toLowerCase();
            if (tLower.includes("reaction")) return "reaction";
            if (tLower.includes("action") || tLower.includes("attack")) return "action";
            if (tLower.includes("passive")) return "passive";
            return "utility"; 
        };

        container.innerHTML = `
            <div class="manager-grid" style="grid-template-columns: 1fr;">
                <div class="mgr-header">${t('sheet_features')}</div>
                <div class="features-grid">
                    ${allFeatures.map(f => `
                        <div class="feature-card ${getTypeClass(f.type)}">
                            <div class="feat-header"><span class="feat-title">${f.name}</span>${f.cost !== "-" ? `<span class="feat-cost">${f.cost}</span>` : ""}</div>
                            <div class="feat-meta"><span class="feat-source">${f.source}</span><span>${f.type}</span></div>
                            <div class="feat-desc">${f.desc} ${f.choice ? `<em style="color:var(--accent-gold); display:block; margin-top:5px;">Selection: ${f.choice}</em>` : ''}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderTabNotes: async (container) => {
        const c = CharGen.char;
        const t = I18n.t;
        const data = I18n.getData('options');
        const ancName = data.ancestries.find(a => a.id === c.ancestry)?.name || "-";
        const bgName = data.backgrounds.find(b => b.id === c.background)?.name || "-";
        
        let imgHTML = `<div class="portrait-placeholder">👤</div>`;
        if (c.imageUrl) imgHTML = `<img src="${c.imageUrl}">`;
        else if (c.imageId) {
            const { ImageStore } = await import('../utils/image_store.js');
            const url = await ImageStore.getUrl(c.imageId);
            if(url) imgHTML = `<img src="${url}">`;
        }

        container.innerHTML = `
            <div class="bio-layout">
                <div class="bio-sidebar">
                    <div class="portrait-frame">${imgHTML}</div>
                    <div>
                        <div class="bio-field"><span class="bio-label">${t('cg_step_class')}</span><div class="bio-text">${c.className}</div></div>
                        <div class="bio-field"><span class="bio-label">${t('cg_lbl_ancestry')}</span><div class="bio-text">${ancName}</div></div>
                        <div class="bio-field"><span class="bio-label">${t('cg_lbl_background')}</span><div class="bio-text">${bgName}</div></div>
                    </div>
                </div>
                <div class="bio-main">
                    <div class="mgr-header">${t('sheet_notes')}</div>
                    <textarea id="char-notes-input" class="notes-editor" placeholder="Character backstory, session notes...">${c.notes || ''}</textarea>
                </div>
            </div>
        `;

        document.getElementById('char-notes-input').addEventListener('input', (e) => {
            c.notes = e.target.value;
        });
    },

    renderPrintVersion: async (container) => {
        const c = CharGen.char;
        const t = I18n.t;
        const data = I18n.getData('options');
        const s = c.stats;
        
        CharGen.recalcAll();
        const armorScore = CharGen.calculateArmorScore();
        const def = c.defenses;
        const skills = CharGen.calculateSkills();
        
        // --- IMAGE ---
        let imgHTML = `<div style="font-size:3rem; color:#ccc;">👤</div>`;
        if (c.imageUrl) imgHTML = `<img src="${c.imageUrl}">`;
        else if (c.imageId) {
            try {
                const { ImageStore } = await import('../utils/image_store.js');
                const url = await ImageStore.getUrl(c.imageId);
                if (url) imgHTML = `<img src="${url}">`;
            } catch(e) {}
        }

        // --- ATTACKS ---
        const attacks = [];
        const str = s.STR || 0;
        // Unarmed
        attacks.push({ name: t('wep_unarmed'), atk: str, dmg: `1d4 + ${str}`, tags: "Melee" });
        // Weapons
        c.inventory.filter(i => (i.type === 'Melee' || i.type === 'Ranged') && i.equipped).forEach((w, i) => {
            const isFinesse = w.tags && (String(w.tags).includes("Finesse") || String(w.tags).includes("Sutil"));
            const isRanged = w.type === 'Ranged' || w.type === 'A Distancia';
            let mod = s.STR || 0;
            if (isRanged) mod = s.DEX || 0;
            else if (isFinesse) mod = Math.max(s.STR || 0, s.DEX || 0);
            
            // Check overrides
            const ov = c.overrides.attacks?.[`wep_${i}`] || {};
            
            attacks.push({
                name: w.name,
                atk: ov.atk !== undefined ? ov.atk : mod,
                dmg: ov.dmg !== undefined ? ov.dmg : `${w.damage} + ${mod}`,
                tags: w.tags ? (Array.isArray(w.tags) ? w.tags.join(', ') : w.tags) : w.type
            });
        });

        // --- FEATURES ---
        const features = [];
        if(c.ancestry && data.ancestries) {
            const anc = data.ancestries.find(a => a.id === c.ancestry);
            if(anc) features.push({ name: anc.name + " Traits", source: "Ancestry", desc: anc.description });
            const fIdx = c.ancestryFeatIndex !== null ? c.ancestryFeatIndex : 0;
            if(anc && anc.feats[fIdx]) features.push({ name: anc.feats[fIdx].name, source: "Ancestry Feat", desc: anc.feats[fIdx].effect });
        }
        if(c.background && data.backgrounds) {
            const bg = data.backgrounds.find(b => b.id === c.background);
            if(bg && bg.feat) features.push({ name: bg.feat.name, source: "Background", desc: bg.feat.effect });
        }
        if(c.classId && data.classes) {
            const cls = data.classes.find(x => x.id === c.classId);
            if(cls) cls.synergy_feats.filter(f => f.level <= c.level).forEach(f => {
                features.push({ name: f.name, source: `Class Lvl ${f.level}`, desc: f.effect });
            });
        }
        c.talents.forEach(tal => {
            features.push({ 
                name: tal.name, 
                source: tal.sourceName || "Talent", 
                desc: tal.effect + (tal.choice ? ` <em>(${tal.choice})</em>` : '')
            });
        });

       const archDisplay = CharGen.getArchetypeDisplay(); // <--- CALL HELPER

        // --- HTML GENERATION ---
        container.innerHTML = `
        <!-- PAGE 1: COMBAT & STATS -->
        <div class="print-page">
            
            <!-- HEADER -->
            <div class="p-top-grid">
                <div class="p-img-box">${imgHTML}</div>
                <div class="p-identity">
                    <div class="p-char-name">${c.name || "Nameless"}</div>
                    <div class="p-id-row">
                        <!-- UPDATE THIS FIELD -->
                        <div class="p-field">
                            <label>${t('cg_step_class')}</label>
                            <span>${c.className} <span style="font-size:0.7em; font-weight:normal; color:#444;">(${archDisplay})</span></span>
                        </div>
                        <div class="p-field"><label>${t('lbl_level')}</label><span>${c.level}</span></div>
                        <div class="p-field"><label>${t('cg_lbl_ancestry')}</label><span>${data.ancestries.find(a=>a.id===c.ancestry)?.name || '-'}</span></div>
                        <div class="p-field"><label>${t('cg_lbl_background')}</label><span>${data.backgrounds.find(b=>b.id===c.background)?.name || '-'}</span></div>
                    </div>
                </div>
            </div>

            <!-- VITALS STRIP -->
            <div class="p-vitals-bar">
                <div class="p-vital-box"><label>${t('sheet_hp')}</label><span>${c.derived.maxHP}</span></div>
                <div class="p-vital-box"><label>${t('sheet_mp')}</label><span>${c.derived.maxMP}</span></div>
                <div class="p-vital-box"><label>${t('sheet_sta')}</label><span>${c.derived.maxSTA}</span></div>
                <div class="p-vital-box"><label>${t('sheet_luck')}</label><span>${c.derived.maxLuck}</span></div>
                <div class="p-vital-box"><label>${t('cg_lbl_slots')}</label><span>${c.derived.slots}</span></div>
            </div>

            <!-- MAIN BODY -->
            <div class="p-columns-2">
                
                <!-- LEFT COLUMN: STATS -->
                <div class="p-col-left">
                    <div class="p-section">
                        <div class="p-header">${t('cg_step_stats')}</div>
                        <div class="p-attr-row">
                            ${['STR','DEX','CON','INT','WIS','CHA'].map(st => `
                                <div class="p-attr"><label>${st}</label><span>${s[st] !== null ? (s[st]>=0?'+'+s[st]:s[st]) : 0}</span></div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="p-defense-grid">
                        <div class="p-def-box"><span class="p-def-val">${armorScore}</span><span class="p-def-lbl">${t('sheet_ac')}</span></div>
                        <div class="p-def-box"><span class="p-def-val">${def.dodge.val}</span><span class="p-def-lbl">${t('sheet_dodge')}</span></div>
                        <div class="p-def-box"><span class="p-def-val">${def.parry.val!==null?def.parry.val:'-'}</span><span class="p-def-lbl">${t('sheet_parry')}</span></div>
                        <div class="p-def-box"><span class="p-def-val">${(c.stats.DEX||0)>=0?'+'+c.stats.DEX:c.stats.DEX}</span><span class="p-def-lbl">${t('cg_initiative')}</span></div>
                    </div>

                    <div class="p-section">
                        <div class="p-header">${t('sheet_skills')}</div>
                        <div class="p-skill-list">
                            ${skills.map(sk => {
                                const mod = sk.statMod >= 0 ? '+'+sk.statMod : sk.statMod;
                                let className = "p-skill-row";
                                if(sk.count === 1) className += " trained";
                                if(sk.count >= 2) className += " expert";
                                return `<div class="${className}">
                                    <span>${sk.name} <span style="color:#666">(${sk.stat})</span></span>
                                    <span>${mod} / <strong>${sk.die !== '-' ? '+'+sk.die : '-'}</strong></span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- RIGHT COLUMN: COMBAT -->
                <div class="p-col-right">
                    <div class="p-section">
                        <div class="p-header">${t('sheet_attacks')}</div>
                        <table class="p-table">
                            <thead><tr><th>Name</th><th width="30">Atk</th><th>Dmg</th><th>Tags</th></tr></thead>
                            <tbody>
                                ${attacks.map(a => `
                                    <tr>
                                        <td><strong>${a.name}</strong></td>
                                        <td>${a.atk >= 0 ? '+'+a.atk : a.atk}</td>
                                        <td>${a.dmg}</td>
                                        <td style="font-size:8pt; color:#444;">${a.tags}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="p-section">
                        <div class="p-header">Equipped / Worn</div>
                        <div style="font-size:9pt; line-height:1.4;">
                            ${c.inventory.filter(i => i.equipped).map(i => `
                                <div>• <strong>${i.name}</strong> (${i.type}) - ${i.magicEffect || i.effect || i.description || '-'}</div>
                            `).join('') || "None"}
                        </div>
                    </div>

                    <div class="p-section">
                        <div class="p-header">${t('sheet_notes')}</div>
                        <div class="p-notes-box">${c.notes || ''}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- PAGE 2: INVENTORY & FEATURES -->
        <div class="print-page">
            
            <div class="p-currency">
                <span>GOLD: ${c.currency.g}</span>
                <span>SILVER: ${c.currency.s}</span>
                <span>COPPER: ${c.currency.c}</span>
            </div>

            <div class="p-grid-3">
                
                <!-- LEFT: INVENTORY -->
                <div class="p-section">
                    <div class="p-header">${t('sheet_inv')} (Backpack)</div>
                    <table class="p-table">
                        <thead><tr><th>Item</th><th width="30">Slot</th></tr></thead>
                        <tbody>
                            ${c.inventory.filter(i => !i.equipped && !i.isMagic).map(i => `
                                <tr><td>${i.name}</td><td style="text-align:center;">${i.slots}</td></tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="p-header" style="margin-top:20px;">Magic & Attuned</div>
                    ${c.inventory.filter(i => i.isMagic || i.type === "Trinket").map(i => `
                        <div class="p-magic-item">
                            <div style="font-weight:bold;">${i.name} ${i.equipped ? '(E)' : ''}</div>
                            <div style="font-size:8pt; font-style:italic;">${i.magicEffect || i.description}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- RIGHT: FEATURES -->
                <div class="p-section">
                    <div class="p-header">${t('sheet_features')}</div>
                    ${features.map(f => `
                        <div class="p-feat-card">
                            <div class="p-feat-title"><span>${f.name}</span><span class="p-feat-source">${f.source}</span></div>
                            <div class="p-feat-desc">${f.desc}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        `;
    },

    attachManagerListeners: () => {
        const bind = (selector, type) => {
            document.querySelectorAll(selector).forEach(el => {
                el.addEventListener('change', (e) => {
                    let val = e.target.value;
                    if (type !== 'name') val = parseInt(val) || 0;
                    if (type === 'name') CharGen.char.name = val;
                    if (type === 'level') CharGen.char.level = val;
                    if (el.dataset.vital) {
                        const key = el.dataset.vital;
                        if (['hp', 'mp', 'sta', 'luck'].includes(key)) CharGen.char.current[key] = val;
                    }
                });
            });
        };
        bind('.edit-name', 'name');
        bind('.edit-tiny', 'level');
        bind('.res-input', 'vital');
        bind('.lvl-input', 'vital');

        const btnSave = document.getElementById('btn-save-trigger');
        if (btnSave) {
            btnSave.onclick = () => {
                CharGen.saveCharacter();
                const originalHTML = btnSave.innerHTML;
                btnSave.innerHTML = "✅";
                setTimeout(() => btnSave.innerHTML = originalHTML, 1000);
            };
        }

        const btnPrint = document.getElementById('btn-print-trigger');
        if (btnPrint) {
            btnPrint.onclick = () => {
                const printArea = document.getElementById('print-sheet-root');
                if (printArea) CharGen.renderPrintVersion(printArea);
                window.print();
            };
        }
    },
    /* --- BATCH 8: Calculations, Level Up Logic, and Helpers --- */

    _renderWeaponRow: (w, stats) => {
        const t = I18n.t;
        const isFinesse = (w.tags && w.tags.includes("Finesse")) || w.type === 'Ranged';
        const isRanged = w.type === 'Ranged' || w.type === 'A Distancia';
        let atkMod = stats.STR || 0;
        
        if (isRanged) atkMod = stats.DEX || 0;
        else if (isFinesse) atkMod = Math.max(stats.STR || 0, stats.DEX || 0);
        
        const sign = atkMod >= 0 ? '+' : '';
        const translatedTags = w.tags ? w.tags.map(tag => {
            const key = "tag_" + tag.toLowerCase().replace(/ /g, "_").replace(/-/g, "_");
            return t(key) !== key ? t(key) : tag;
        }).join(', ') : '';

        return `<tr><td>${w.name}</td><td>${sign}${atkMod}</td><td>${w.damage} ${sign}${atkMod}</td><td class="tags">${translatedTags}</td></tr>`;
    },

    saveCharacter: () => {
        try {
            const id = Storage.saveCharacter(CharGen.char);
            CharGen.char.id = id; 
            // Only alert if we are in the wizard flow, not constant saves in manager
            if (CharGen.currentStep < 5) alert(`Character "${CharGen.char.name}" saved to Library!`);
        } catch (e) {
            console.error("Save failed:", e);
            alert("Failed to save character. See console.");
        }
    },

    calculateDefenses: () => {
        const c = CharGen.char;
        const s = c.stats;
        const str = s.STR || 0;
        const dex = s.DEX || 0;
        const con = s.CON || 0;

        // 1. DODGE (DEX)
        let dodgeVal = dex;
        let dodgeDie = "-"; 
        
        let dodgeRank = 0;
        c.talents.forEach(t => {
            if (t.modifiers && t.modifiers.defense_train === "dodge") dodgeRank++;
            if (t.modifiers && t.modifiers.defense_bonus_dodge) dodgeVal += t.modifiers.defense_bonus_dodge;
        });
        
        if (dodgeRank === 1) dodgeDie = "1d4";
        if (dodgeRank >= 2) dodgeDie = "1d6";

        // 2. PARRY (STR or DEX)
        const hasWeapon = c.inventory.some(i => i.type === "Melee" && i.equipped);
        let parryVal = null;
        let parryDie = "-";

        if (hasWeapon) {
            parryVal = Math.max(str, dex);
            const hasGuardWeapon = c.inventory.some(i => i.tags && i.tags.includes("Guard") && i.equipped);
            if (hasGuardWeapon) parryVal += 1;
            c.talents.forEach(t => {
                if (t.modifiers && t.modifiers.defense_bonus_parry) parryVal += t.modifiers.defense_bonus_parry;
            });
        }

        // 3. BLOCK (CON)
        const hasShield = c.inventory.some(i => i.name.includes("Shield") && i.equipped);
        let blockVal = null;
        let blockDie = "-";
        
        if (hasShield) {
            blockVal = con;
            c.talents.forEach(t => {
                if (t.modifiers && t.modifiers.defense_bonus_block) blockVal += t.modifiers.defense_bonus_block;
            });
        }

        // --- OVERRIDE CHECK ---
        const ov = c.overrides.defenses || {};
        
        if (ov.dodge) { dodgeVal = ov.dodge.val; dodgeDie = ov.dodge.die; }
        if (ov.parry) { parryVal = ov.parry.val; parryDie = ov.parry.die; }
        if (ov.block) { blockVal = ov.block.val; blockDie = ov.block.die; }

        c.defenses = {
            dodge: { val: dodgeVal, die: dodgeDie },
            parry: { val: parryVal, die: parryDie },
            block: { val: blockVal, die: blockDie }
        };
    },

    calculateArmorScore: () => {
        const c = CharGen.char;
        
        // 1. Check Override First
        if (c.overrides.ac !== null) return c.overrides.ac;

        const data = I18n.getData('options');
        let wornArmorAS = 0;
        let shieldBonus = 0;
        let naturalArmor = 0;
        let flatBonus = 0;

        // Inventory Check
        c.inventory.forEach(i => {
            if (!i.equipped) return;
            if (i.type === "Shield") shieldBonus = Math.max(shieldBonus, i.as || 1);
            else if (i.type === "Armor") wornArmorAS = Math.max(wornArmorAS, i.as || 0);
        });

        // Talents & Feats
        let unarmoredDef = false;
        let towerShield = false;

        const checkMods = (mods) => {
            if (!mods) return;
            if (mods.as_bonus) flatBonus += mods.as_bonus;
            if (mods.natural_armor) naturalArmor = Math.max(naturalArmor, mods.natural_armor);
        };

        if (c.ancestry) {
            const anc = data.ancestries.find(a => a.id === c.ancestry);
            if (anc && anc.feats[c.ancestryFeatIndex]) checkMods(anc.feats[c.ancestryFeatIndex].modifiers);
        }

        c.talents.forEach(t => {
            if (t.modifiers) checkMods(t.modifiers);
            if (t.name === "Unarmored Defense") unarmoredDef = true;
            if (t.name === "Tower Shield Training") towerShield = true;
        });

        if (c.classId) {
            const cls = data.classes.find(cl => cl.id === c.classId);
            if (cls) {
                cls.synergy_feats.filter(f => f.level <= c.level).forEach(f => {
                    if (f.modifiers) checkMods(f.modifiers);
                });
            }
        }

        // Magic Item Bonuses (New in Step 3)
        const itemMods = CharGen.getMagicItemBonuses();
        flatBonus += itemMods.as;

        // Resolve Logic
        if (towerShield && shieldBonus > 0) shieldBonus = 2;

        let base = 0;
        if (wornArmorAS > 0) {
            base = wornArmorAS;
        } else {
            if (unarmoredDef) {
                const dex = c.stats.DEX || 0;
                base = Math.max(0, dex);
                if (naturalArmor > base) base = naturalArmor;
            } else {
                base = naturalArmor;
            }
        }
        
        return base + shieldBonus + flatBonus;
    },

    setAttackOverride: (uniqueId, field, value) => {
        if (!CharGen.char.overrides.attacks) CharGen.char.overrides.attacks = {};
        if (!CharGen.char.overrides.attacks[uniqueId]) CharGen.char.overrides.attacks[uniqueId] = {};
        
        CharGen.char.overrides.attacks[uniqueId][field] = value;
        CharGen.renderSheet(CharGen.container); // Refresh
    },

    calculateSkills: () => {
        const c = CharGen.char;
        const t = I18n.t;
        const data = I18n.getData('options');
        const skillCounts = {}; 

        const add = (id) => { 
            if (id) skillCounts[id] = (skillCounts[id] || 0) + 1; 
        };
        
        // Robust Mapper: Checks both ID and Localized Names
        const mapStringToId = (str) => {
            if (!str) return null;
            const s = str.toLowerCase();
            // English / ID matches
            if (s.includes("athletics") || s.includes("atletismo")) return "athletics";
            if (s.includes("acrobatics") || s.includes("acrobacias")) return "acrobatics";
            if (s.includes("stealth") || s.includes("sigilo")) return "stealth";
            if (s.includes("craft") || s.includes("artesanía") || s.includes("artesania")) return "craft";
            if (s.includes("lore") || s.includes("saber")) return "lore";
            if (s.includes("investigate") || s.includes("investigar")) return "investigate";
            if (s.includes("scrutiny") || s.includes("escrutinio")) return "scrutiny";
            if (s.includes("survival") || s.includes("supervivencia")) return "survival";
            if (s.includes("medicine") || s.includes("medicina")) return "medicine";
            if (s.includes("influence") || s.includes("influencia")) return "influence";
            if (s.includes("deception") || s.includes("engaño")) return "deception";
            if (s.includes("intimidation") || s.includes("intimidación") || s.includes("intimidacion")) return "intimidation";
            return null;
        };

        // 1. Ancestry
        if (c.ancestry && c.ancestryFeatIndex !== null && data.ancestries) {
            const anc = data.ancestries.find(a => a.id === c.ancestry);
            if(anc && anc.feats[c.ancestryFeatIndex]) {
                const f = anc.feats[c.ancestryFeatIndex];
                if (f.modifiers) {
                    if (f.modifiers.skill_train) add(f.modifiers.skill_train);
                    if (f.modifiers.select_skill && c.ancestrySkill) add(c.ancestrySkill);
                }
            }
        }

        // 2. Background
        if (c.background && data.backgrounds) {
            const bg = data.backgrounds.find(b => b.id === c.background);
            if (bg && bg.skill) add(mapStringToId(bg.skill));
        }

        // 3. Archetypes
        const processArch = (archId) => {
            if(!archId) return;
            const arch = data.archetypes.find(a => a.id === archId);
            if (arch && arch.proficiencies && arch.proficiencies.skills) {
                arch.proficiencies.skills.forEach(s => add(mapStringToId(s)));
            }
        };
        processArch(c.archA);
        processArch(c.archB);

        // 4. Talents
        c.talents.forEach(tal => {
            if (tal.choice && tal.flags && tal.flags.select_skill) add(tal.choice);
            if (tal.modifiers && tal.modifiers.skill_train) add(tal.modifiers.skill_train);
        });

        // 5. NEW: MAGIC ITEMS (Equipped)
        c.inventory.filter(i => i.equipped).forEach(item => {
            // Check descriptions for "Gain Proficiency in X" or "Gana Competencia en X"
            const text = `${item.description || ''} ${item.effect || ''} ${item.magicEffect || ''}`.toLowerCase();
            
            // Look for keywords indicating skill gain
            if (text.includes("proficiency") || text.includes("competencia")) {
                // Map the entire string to see if any skill name is present
                // This is a greedy check: if the text says "Atletismo", we add Athletics.
                const skillId = mapStringToId(text);
                if (skillId) add(skillId);
            }
        });

        // 6. Build List
        const fullList = [
            {id: "athletics", name: "Athletics", stat: "STR"},
            {id: "acrobatics", name: "Acrobatics", stat: "DEX"},
            {id: "stealth", name: "Stealth", stat: "DEX"},
            {id: "craft", name: "Craft", stat: "INT"},
            {id: "lore", name: "Lore", stat: "INT"},
            {id: "investigate", name: "Investigate", stat: "INT"},
            {id: "scrutiny", name: "Scrutiny", stat: "WIS"},
            {id: "survival", name: "Survival", stat: "WIS"},
            {id: "medicine", name: "Medicine", stat: "WIS"},
            {id: "influence", name: "Influence", stat: "CHA"},
            {id: "deception", name: "Deception", stat: "CHA"},
            {id: "intimidation", name: "Intimidation", stat: "CHA"}
        ];

        return fullList.map(sk => {
            let count = skillCounts[sk.id] || 0;
            let die = "-";
            let isOverridden = false;

            // Check Override
            if (c.overrides && c.overrides.skills && c.overrides.skills[sk.id]) {
                const ov = c.overrides.skills[sk.id];
                if (ov.die) { die = ov.die; isOverridden = true; }
            } else {
                if (count === 1) die = "1d4"; 
                if (count >= 2) die = "1d6";  
            }
            
            const localizedName = t(`skill_${sk.id}`) === `skill_${sk.id}` ? sk.name : t(`skill_${sk.id}`);
            const localizedStat = t(`stat_${sk.stat.toLowerCase()}`);
            const statMod = c.stats[sk.stat] || 0;

            return {
                id: sk.id,
                name: localizedName, 
                stat: sk.stat,    
                statLabel: localizedStat, 
                statMod: statMod, 
                statKey: sk.stat, 
                count: count,
                die: die,
                isOverridden: isOverridden
            };
        });
    },

    // --- LEVEL UP LOGIC ---

    initLevelUp: () => {
        const c = CharGen.char;
        const nextLevel = c.level + 1;
        
        const data = I18n.getData('options');
        const archA = data.archetypes.find(a => a.id === c.archA);
        const archB = data.archetypes.find(a => a.id === c.archB);
        
        const roleA = I18n.normalize('roles', archA.role);
        const roleB = I18n.normalize('roles', archB.role);

        let hitDie = 8; 
        if (roleA === roleB) {
            if (roleA === "Warrior") hitDie = 10;
            else if (roleA === "Spellcaster") hitDie = 6;
        }
        
        CharGen.levelState = {
            newHP: 0,
            selectedTalent: null,
            selectedStat: null,
            hitDie: hitDie,
            nextLevel: nextLevel
        };

        CharGen.renderLevelUpModal();
    },

    renderLevelUpModal: () => {
        const state = CharGen.levelState;
        const c = CharGen.char;
        const isMilestone = (state.nextLevel === 5 || state.nextLevel === 10);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        overlay.innerHTML = `
            <div class="modal-content" style="width:500px; max-height:85vh; display:flex; flex-direction:column;">
                <div class="modal-header">Level Up: ${c.level} ➜ ${state.nextLevel}</div>
                <div style="flex-grow:1; overflow-y:auto; padding:0 10px;">
                    <div class="levelup-step">
                        <h4>1. Increase HP (d${state.hitDie} + CON)</h4>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <button id="btn-roll-hp" class="roll-btn">🎲 Roll HP</button>
                            <div id="hp-result" style="font-family:var(--font-mono); font-size:1.2rem; font-weight:bold;">--</div>
                        </div>
                    </div>
                    <div class="levelup-step">
                        <h4>2. Select New Talent</h4>
                        <select id="lvl-talent-select">
                            <option value="">-- Choose Talent --</option>
                            ${CharGen.getValidTalentOptions().map((opt, idx) => `<option value="${idx}">${opt.name} [${opt.sourceName}]</option>`).join('')}
                        </select>
                        <div id="lvl-talent-desc" style="margin-top:5px; font-size:0.85rem; color:#aaa; font-style:italic;"></div>
                    </div>
                    ${isMilestone ? `
                    <div class="levelup-step">
                        <h4 style="color:var(--accent-gold)">3. Milestone Bonus</h4>
                        <p style="font-size:0.9rem;">You gain a <strong>Synergy Feat</strong> automatically.</p>
                        <p style="font-size:0.9rem;"><strong>Attribute Boost:</strong> Choose one Stat to increase by +1.</p>
                        <div class="stat-grid" style="grid-template-columns: repeat(6, 1fr); gap:5px;">
                            ${['STR','DEX','CON','INT','WIS','CHA'].map(s => `<button class="stat-boost-btn" data-stat="${s}">${s}</button>`).join('')}
                        </div>
                    </div>` : ''}
                </div>
                <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px; padding-top:10px; border-top:1px solid #333;">
                    <button id="btn-lvl-cancel" class="btn-secondary">Cancel</button>
                    <button id="btn-lvl-confirm" class="btn-primary" disabled>Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const btnRollHP = overlay.querySelector('#btn-roll-hp');
        const hpRes = overlay.querySelector('#hp-result');
        const btnConfirm = overlay.querySelector('#btn-lvl-confirm');

        const validate = () => {
            let isValid = state.newHP > 0 && state.selectedTalent !== null;
            if (isMilestone && !state.selectedStat) isValid = false;
            btnConfirm.disabled = !isValid;
        };

        btnRollHP.onclick = () => {
            const roll = Dice.roll(`1d${state.hitDie}`).total;
            const conMod = c.stats.CON || 0;
            const total = Math.max(1, roll + conMod);
            state.newHP = total;
            hpRes.textContent = `${total} (${roll} + ${conMod})`;
            hpRes.style.color = "var(--accent-gold)";
            btnRollHP.disabled = true;
            validate();
        };

        const talSel = overlay.querySelector('#lvl-talent-select');
        const talDesc = overlay.querySelector('#lvl-talent-desc');
        const options = CharGen.getValidTalentOptions();

        talSel.onchange = (e) => {
            const idx = e.target.value;
            if (idx !== "") {
                const tal = options[idx];
                state.selectedTalent = tal;
                talDesc.textContent = tal.effect;
            } else {
                state.selectedTalent = null;
                talDesc.textContent = "";
            }
            validate();
        };

        if (isMilestone) {
            overlay.querySelectorAll('.stat-boost-btn').forEach(btn => {
                btn.onclick = (e) => {
                    overlay.querySelectorAll('.stat-boost-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    state.selectedStat = btn.dataset.stat;
                    validate();
                };
            });
        }

        overlay.querySelector('#btn-lvl-cancel').onclick = () => overlay.remove();
        btnConfirm.onclick = () => {
            const t = state.selectedTalent;
            
            // CHECK: Does this talent require a choice? (e.g. Expertise, Weapon Spec)
            if (t.flags && (t.flags.select_skill || t.flags.select_mod || t.flags.select_property || t.flags.select_bond)) {
                
                // 1. Close Level Up Modal (temp)
                overlay.remove();
                
                // 2. Open Choice Modal
                CharGen.handleLevelUpChoice(t);
                
            } else {
                // No choice needed, proceed normally
                CharGen.applyLevelUp();
                overlay.remove();
            }
        };
    },

    applyLevelUp: () => {
        const c = CharGen.char;
        const s = CharGen.levelState;

        c.level = s.nextLevel;
        c.baseHP += s.newHP;
        c.current.hp += s.newHP; 
        
        if (s.selectedTalent) c.talents.push(s.selectedTalent);
        if (s.selectedStat) c.stats[s.selectedStat] += 1;
        c.current.xp = 0;

        CharGen.saveCharacter();
        CharGen.recalcAll();
        CharGen.renderSheet(CharGen.container);
        
        DiceUI.show(`Level Up!`, { total: s.newHP, notation: `HP Increased` }, 'damage');
    },

    getValidTalentOptions: () => {
        const c = CharGen.char;
        const data = I18n.getData('options');
        const archA = data.archetypes.find(a => a.id === c.archA);
        const archB = data.archetypes.find(a => a.id === c.archB);

        const list = [];
        const addArch = (arch) => {
            if(!arch) return;
            arch.talents.forEach(t => {
                const owned = c.talents.some(kt => kt.name === t.name);
                const repeatable = t.flags && t.flags.repeatable;
                if (!owned || repeatable) {
                    const opt = JSON.parse(JSON.stringify(t));
                    opt.sourceName = arch.name;
                    list.push(opt);
                }
            });
        };
        addArch(archA);
        if (archA.id !== archB.id) addArch(archB);
        return list;
    },

    recalcAll: () => {
        CharGen.calculateDerived();
        CharGen.calculateDefenses();
        CharGen.calculateArmorScore();
    }
};