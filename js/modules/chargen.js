import { I18n } from '../utils/i18n.js';
import { Dice } from '../utils/dice.js';
import { Storage } from '../utils/storage.js';

export const CharGen = {

    /**
     * Load an existing character object into the editor
     */
    loadCharacter: (savedChar) => {
        CharGen.char = JSON.parse(JSON.stringify(savedChar));
        // We do NOT reset currentStep here, we let init() handle the UI setup
        console.log("Character Loaded:", CharGen.char.name);
    },
    
    // State Tracking
    container: null,
    currentStep: 1,
    
    // The Character Data Object (The Truth)
    char: {
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
        inventory: [],
        talents: [],
        ancestryChoice: null, 
        ancestrySkill: null
    },

    // Temporary state for Step 3 (Stats)
    statState: {
        manualMode: false,
        arrayValues: [], // e.g. [3, 2, 1, 0, 0, -1]
        assignedIndices: {}, // { 0: 'STR', 1: 'DEX' } -> Maps array index to stat
        selectedValIndex: null
    },

    /**
     * Initialize the Character Creator Module
     */
    init: (container) => {
        CharGen.container = container;
        
        // Only reset if we are NOT editing an existing character (no ID)
        if (!CharGen.char.id) {
            CharGen.resetChar();
            CharGen.currentStep = 1;
        } else {
            // If editing, start at Step 1 (Bio) with data populated
            CharGen.currentStep = 1;
        }
        
        CharGen.renderShell();
    },

    /**
     * PHASE 5.3: PLAY MODE ENTRY
     * Loads the character specifically for the table-ready view.
     */
    initPlayMode: (charData) => {
        // FIX: Ensure container is defined even if jumping straight from Library
        if (!CharGen.container) {
            CharGen.container = document.getElementById('main-content');
        }

        // 1. Load Data
        CharGen.char = JSON.parse(JSON.stringify(charData));
        
        // 2. Toggle CSS State
        document.body.classList.add('mode-play');
        
        // 3. Render
        CharGen.renderPlayInterface();
    },

    /**
     * CLEANUP & EXIT
     */
    exitPlayMode: () => {
        // 1. Auto-Save one last time
        import('../utils/storage.js').then(m => m.Storage.saveCharacter(CharGen.char));
        
        // 2. Remove CSS State
        document.body.classList.remove('mode-play');
        
        // 3. Remove Toolbar
        const toolbar = document.querySelector('.play-toolbar');
        if(toolbar) toolbar.remove();
        
        // 4. Return to Library
        const libBtn = document.querySelector('[data-module="library"]');
        if(libBtn) libBtn.click();
    },

    /**
     * Reset character state to defaults
     */
    resetChar: () => {
        CharGen.char = {
            name: "",
            level: 1,
            ancestry: null, background: null,
            archA: null, archB: null, classId: null, className: "",
            stats: { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null },
            derived: { maxHP: 0, maxMP: 0, maxSTA: 0, maxLuck: 0, slots: 8 },
            baseHP: 0,
            // --- NEW LIVE STATE ---
            current: { hp: null, mp: null, sta: null, luck: null, xp: 0 }, 
            activeConditions: [], // Array of strings e.g. ["Blinded"]
            notes: "",
            // ----------------------
            defenses: { dodge: {val:0, die:"-"}, parry: {val:0, die:"-"}, block: {val:0, die:"-"} },
            inventory: [],
            currency: { g: 0, s: 0, c: 0 },
            talents: []
        };
        CharGen.statState = {
            manualMode: false,
            arrayValues: [],
            assignedIndices: {},
            selectedValIndex: null
        };
    },

    /**
     * Renders the outer layout (Sidebar + Content Area)
     */
    renderShell: () => {
        const t = I18n.t;
        const html = `
            <div class="chargen-layout">
                <!-- Progress Sidebar -->
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

                <!-- Main Input Area -->
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

        // Attach Nav Listeners
        document.getElementById('btn-prev').onclick = CharGen.prevStep;
        document.getElementById('btn-next').onclick = CharGen.nextStep;

        // Initial Render of Step 1
        CharGen.renderStep();
    },

    /**
     * Renders the simplified "Table View" (Now the Character Manager).
     */
    renderPlayInterface: () => {
        // 1. Render the new Manager Layout
        // The new  function handles clearing the container and setting up the grid/tabs.
        CharGen.renderSheet(CharGen.container).then(() => {
            console.log("Play Mode: Manager Rendered.");
        });

        // 2. Add the Floating Toolbar (Save/Exit)
        // This sits on top of the manager for quick access.
        CharGen.renderPlayToolbar();
    },

    renderPlayToolbar: () => {
        const toolbar = document.createElement('div');
        toolbar.className = 'play-toolbar';
        
        // Save Button
        const btnSave = document.createElement('button');
        btnSave.className = 'play-btn save';
        btnSave.innerHTML = `<span>💾</span> Save`;
        btnSave.onclick = () => {
            import('../utils/storage.js').then(m => {
                m.Storage.saveCharacter(CharGen.char);
                // Visual Feedback
                btnSave.innerHTML = `<span>✅</span> Saved`;
                setTimeout(() => btnSave.innerHTML = `<span>💾</span> Save`, 1000);
            });
        };

        // Exit Button
        const btnExit = document.createElement('button');
        btnExit.className = 'play-btn exit';
        btnExit.innerHTML = `<span>❌</span> Exit`;
        btnExit.onclick = CharGen.exitPlayMode;

        toolbar.appendChild(btnSave);
        toolbar.appendChild(btnExit);
        
        document.body.appendChild(toolbar);
    },

    /**
     * Renders the specific content for the current step
     */
    renderStep: () => {
        const container = document.getElementById('step-container');
        const t = I18n.t; // Localization
        container.innerHTML = ''; 

        // Visual Update of Sidebar
        document.querySelectorAll('.step-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.step) === CharGen.currentStep);
        });

        // Button State Management
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if (prevBtn && nextBtn) {
            prevBtn.disabled = (CharGen.currentStep === 1);
            nextBtn.disabled = false; 
            // FIX: Localized button text
            nextBtn.textContent = (CharGen.currentStep === 5) ? t('cg_btn_finish') : t('cg_btn_next');
        }

        // Router for Steps
        switch(CharGen.currentStep) {
            case 1: CharGen.renderBio(container); break;
            case 2: CharGen.renderClass(container); break;
            case 3: CharGen.renderStats(container); break;
            case 4: CharGen.renderGear(container); break;
            case 5: CharGen.renderSheet(container); break;
        }
    },

    /**
     * Navigation Logic
     */
    nextStep: () => {
        // Step 1 Validation (Bio)
        if (CharGen.currentStep === 1 && (!CharGen.char.ancestry || !CharGen.char.background)) {
            alert("Please select an Ancestry and Background.");
            return;
        }

        // Step 2 Validation (Class)
        if (CharGen.currentStep === 2) {
            if (!CharGen.char.archA || !CharGen.char.archB) {
                alert("Please select two Archetypes.");
                return;
            }
            if (CharGen.char.talents.length < 2) {
                alert("Please select your 2 Starting Talents.");
                return;
            }
        }

        // Step 3 Validation (Stats)
        if (CharGen.currentStep === 3) {
            const stats = CharGen.char.stats;
            const allAssigned = Object.values(stats).every(v => v !== null);
            if (!allAssigned && !CharGen.statState.manualMode) {
                alert("Please assign all stat values.");
                return;
            }
        }

        // --- NEW LOGIC: FINISH BUTTON ---
        if (CharGen.currentStep === 5) {
            // Save
            CharGen.saveCharacter();
            // Redirect to Library
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

        // 1. Build the HTML String
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
                            <!-- Populated dynamically -->
                        </select>
                    </div>

                    <!-- Dynamic Element Choice -->
                    <div id="ancestry-element-options" style="display:none; margin-bottom:1.5rem; padding:10px; border:1px dashed var(--accent-crimson); border-radius:4px;">
                        <label class="form-label" style="font-size:0.9rem;">${t('cg_sel_resist')}</label>
                        <select id="sel-anc-element">
                            <option value="">-- ${t('btn_view')} --</option>
                            <!-- Populated dynamically -->
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
        
        // 2. Inject HTML
        el.innerHTML = html;
        // 3. Select DOM Elements
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

        // 4. Define Helper Functions (Scoped to this render)

        const populateFeats = (ancId) => {
            // Localize option placeholder
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
            
            // Hide all dynamic sections by default
            optDiv.style.display = 'none';
            if (skillDiv) skillDiv.style.display = 'none';
            if (elemDiv) elemDiv.style.display = 'none';

            if (ancId && featIdx !== "") {
                const anc = data.ancestries.find(a => a.id === ancId);
                const feat = anc.feats[featIdx];
                const mods = feat.modifiers;

                if (mods) {
                    // Stat Bonus Choice
                    if (mods.select_bonus) {
                        optDiv.style.display = 'block';
                    } else {
                        CharGen.char.ancestryChoice = null; 
                        optSelect.value = ""; 
                    }

                    // Element Resistance Choice
                    if (mods.select_element && elemDiv) {
                        elemDiv.style.display = 'block';
                        elemSelect.innerHTML = `<option value="">-- ${t('btn_view')} --</option>`;
                        mods.select_element.forEach(el => {
                            const opt = document.createElement('option');
                            opt.value = el; opt.textContent = el;
                            elemSelect.appendChild(opt);
                        });
                        // Restore Value
                        if (CharGen.char.ancestryElement) elemSelect.value = CharGen.char.ancestryElement;
                    }

                    // Skill Choice
                    if (mods.select_skill && skillDiv) {
                        skillDiv.style.display = 'block';
                        skillSelect.innerHTML = `<option value="">-- ${t('btn_view')} --</option>`;
                        // Filter skills based on "any" or specific array in JSON
                        let options = (mods.select_skill === "any") ? allSkills : allSkills.filter(s => mods.select_skill.includes(s.id));
                        
                        options.forEach(s => {
                            const opt = document.createElement('option');
                            opt.value = s.id; opt.textContent = s.name;
                            skillSelect.appendChild(opt);
                        });
                        // Restore Value
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

            if (src) {
                box.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                box.innerHTML = `<span style="font-size:2rem;">👤</span>`;
            }
        };

        // 5. Restore State (If editing or moving back)
        updateImagePreview();
        
        if (CharGen.char.ancestry) {
            ancSelect.value = CharGen.char.ancestry;
            populateFeats(CharGen.char.ancestry);
            
            if (CharGen.char.ancestryFeatIndex !== null) {
                featSelect.value = CharGen.char.ancestryFeatIndex;
            }
            
            checkDynamicOptions(); // Shows the divs
            
            if (CharGen.char.ancestryChoice) optSelect.value = CharGen.char.ancestryChoice;
        }
        
        if (CharGen.char.background) {
            bgSelect.value = CharGen.char.background;
        }
        
        CharGen.updateBioPreview(); // Updates the text card

        // 6. Attach Event Listeners

        // Name
        document.getElementById('char-name').addEventListener('input', (e) => CharGen.char.name = e.target.value);

        // Ancestry Logic
        ancSelect.addEventListener('change', (e) => {
            CharGen.char.ancestry = e.target.value;
            CharGen.char.ancestryFeatIndex = null; // Reset choices
            CharGen.char.ancestryChoice = null;
            CharGen.char.ancestrySkill = null;
            
            populateFeats(e.target.value);
            checkDynamicOptions();
            CharGen.updateBioPreview();
        });

        featSelect.addEventListener('change', (e) => {
            CharGen.char.ancestryFeatIndex = e.target.value;
            checkDynamicOptions();
            // Show tiny description under dropdown
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

        // Image Upload Logic
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

        // Randomize Button
        document.getElementById('btn-random-bio').addEventListener('click', () => {
            CharGen.rollRandomBio();
            // Refresh UI after random data set
            ancSelect.value = CharGen.char.ancestry;
            populateFeats(CharGen.char.ancestry);
            bgSelect.value = CharGen.char.background;
            checkDynamicOptions();
            CharGen.updateBioPreview();
        });
    },

    calculateDerived: () => {
        const c = CharGen.char;
        const s = c.stats;
        const data = I18n.getData('options');
        
        if (!data) return;

        // --- 1. Class Logic (Normalized) ---
        let isFullWarrior = false;
        let isFullCaster = false;
        let isFullSpecialist = false;
        let hasWarrior = false;
        let hasCaster = false;
        let hasSpecialist = false;
        let archA = null;
        let archB = null;

        // Helper: Check role using Normalization (Guerrero -> Warrior)
        const checkRole = (arch, targetRole) => {
            if (!arch) return false;
            // Normalize the role from JSON (e.g. "Guerrero") to System Key ("Warrior")
            const normRole = I18n.normalize('roles', arch.role); 
            // Compare case-insensitive
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

        const d = c.derived;
        const level = c.level;
        const str = s.STR || 0;
        const dex = s.DEX || 0;
        const con = s.CON || 0;
        const int = s.INT || 0;
        const wis = s.WIS || 0;
        const cha = s.CHA || 0;

        // --- 2. Calculate Base Vitals ---
        
        // Hit Points
        let hitDie = 8;
        if (isFullWarrior) hitDie = 10;
        if (isFullCaster) hitDie = 6;

        // Init Base HP if fresh (Level 1 and undefined)
        if (c.level === 1 && (!c.baseHP || c.baseHP === 0)) {
            c.baseHP = Math.max(1, hitDie + con);
        }
        // Safety for existing chars
        if (!c.baseHP) c.baseHP = Math.max(1, hitDie + con);

        d.maxHP = c.baseHP;

        // Stamina
        d.maxSTA = 0;
        if (isFullWarrior) {
            const phys = [str, dex, con].sort((a,b) => b - a);
            d.maxSTA = Math.max(1, phys[0] + phys[1]);
        } else if (hasWarrior) {
            d.maxSTA = Math.max(1, str, dex, con);
        }

        // Mana
        d.maxMP = 0;
        if (hasCaster) {
            let castMod = 0;
            // Find casting stat by checking Normalized Stat Keys
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
            castMod = Math.max(modA, modB);
            
            // Fallback
            if (castMod === 0) castMod = Math.max(int, wis, cha); 

            if (isFullCaster) d.maxMP = ((level + 1) * 2) + castMod;
            else d.maxMP = (level + 1) + castMod;
        }

        // Luck
        d.maxLuck = 1; 
        if (isFullSpecialist) d.maxLuck = Math.max(1, cha * 2);
        else if (hasSpecialist) d.maxLuck = Math.max(1, cha);

        // Slots
        d.slots = 8 + str + con;

        // --- 3. Apply Modifiers ---
        const applyModifiers = (mods) => {
            if (!mods) return;
            if (mods.hp_flat) d.maxHP += mods.hp_flat;
            if (mods.hp_per_level) d.maxHP += (mods.hp_per_level * level);
            if (mods.mp_flat) d.maxMP += mods.mp_flat;
            if (mods.sta_flat) d.maxSTA += mods.sta_flat;
            if (mods.luck_flat) d.maxLuck += mods.luck_flat;
            if (mods.slots_flat) d.slots += mods.slots_flat;
            
            if (mods.sta_mod) {
                const normStat = I18n.normalize('stats', mods.sta_mod);
                d.maxSTA += (s[normStat] || 0);
            }
        };

        // Ancestry Mods
        if (c.ancestry) {
            const anc = data.ancestries.find(a => a.id === c.ancestry);
            if (anc && c.ancestryFeatIndex !== null && anc.feats[c.ancestryFeatIndex]) {
                applyModifiers(anc.feats[c.ancestryFeatIndex].modifiers);
            }
            if (c.ancestryChoice) {
                const tempMod = {};
                if (c.ancestryChoice === "hp_flat") tempMod.hp_flat = 4;
                if (c.ancestryChoice === "mp_flat") tempMod.mp_flat = 2;
                if (c.ancestryChoice === "sta_flat") tempMod.sta_flat = 1;
                if (c.ancestryChoice === "slots_flat") tempMod.slots_flat = 1;
                applyModifiers(tempMod);
            }
        }

        // Talent Mods
        if (c.talents.length > 0) {
            c.talents.forEach(t => {
                if (t.modifiers) applyModifiers(t.modifiers);
            });
        }

        // Class Synergy Mods
        if (c.classId) {
            const cls = data.classes.find(cl => cl.id === c.classId);
            if (cls) {
                const activeFeats = cls.synergy_feats.filter(f => f.level <= c.level);
                activeFeats.forEach(f => {
                    if (f.modifiers) applyModifiers(f.modifiers);
                });
            }
        }

        // --- 4. Minimum Safety ---
        if (d.maxHP < 1) d.maxHP = 1;
        if (d.maxMP < 0) d.maxMP = 0;
        if (d.maxSTA < 0) d.maxSTA = 0;
        if (d.maxLuck < 1) d.maxLuck = 1;
        if (d.slots < 8) d.slots = 8;

        // --- 5. Update UI ---
        CharGen.updateStatPreview(hitDie);
    },
    
    // Check if current class synergy feat grants a free talent choice
    checkSynergyGrant: () => {
        const c = CharGen.char;
        const data = I18n.getData('options');
        
        if (!c.classId || !data) return null;

        const cls = data.classes.find(cl => cl.id === c.classId);
        if (!cls) return null;

        // Find active synergy feats based on level
        const activeFeats = cls.synergy_feats.filter(f => f.level <= c.level);
        
        for (let feat of activeFeats) {
            // Check if this feat grants a specific talent
            if (feat.flags && feat.flags.grant_talent) {
                const talentName = feat.flags.grant_talent;
                
                // Look for this talent in our current list with the specific Source Tag
                const hasIt = c.talents.some(t => t.source === `Synergy: ${feat.name}`);
                
                if (!hasIt) {
                    return { featName: feat.name, grantName: talentName };
                }
            }
        }
        return null;
    },

    resolveSynergyGrant: (grantObj) => {
        console.log("Resolving Synergy Grant:", grantObj);
        const data = I18n.getData('options');
        const archA = data.archetypes.find(a => a.id === CharGen.char.archA);
        const archB = data.archetypes.find(a => a.id === CharGen.char.archB);

        // Find the full Talent Object
        let targetTalent = archA.talents.find(t => t.name === grantObj.grantName);
        if (!targetTalent) {
            targetTalent = archB.talents.find(t => t.name === grantObj.grantName);
        }

        if (!targetTalent) {
            console.error(`Talent '${grantObj.grantName}' not found in archetypes.`);
            alert(`Error: Could not find definition for ${grantObj.grantName}. Check JSON data.`);
            return;
        }

        // Safe check for flags
        const flags = targetTalent.flags || {};

        // If the talent requires a choice, show the modal
        if (flags.select_mod || flags.select_skill || flags.select_property) {
            CharGen.renderSynergyChoiceModal(targetTalent, grantObj.featName);
        } else {
            // No choice needed, just add it
            CharGen.char.talents.push({
                ...targetTalent, 
                source: `Synergy: ${grantObj.featName}`,
                cost: "Free",
                choice: null
            });
            CharGen.renderSheet(CharGen.container);
        }
    },

    renderSynergyChoiceModal: (talent, synergySourceName) => {
        console.log("Rendering Choice Modal for:", talent.name);
        let options = [];
        let title = `Bonus Talent: ${talent.name}`;
        const flags = talent.flags || {};

        // 1. Define Options based on Flags
        if (flags.select_mod) {
            options = [
                { val: "empower", label: "Empower (+1 Die)" },
                { val: "range", label: "Reach (Double Range)" },
                { val: "widen", label: "Widen (Area +5ft)" },
                { val: "subtle", label: "Subtle (No Components)" }
            ];
        } else if (flags.select_property) {
            options = [
                { val: "sunder", label: "Sunder (Armor Break)" },
                { val: "reach", label: "Reach (Long Weapons)" },
                { val: "guard", label: "Guard (Defense)" },
                { val: "heavy", label: "Heavy (Knockdown)" },
                { val: "finesse", label: "Finesse (Dex Weapons)" }
            ];
        } else if (flags.select_bond) {
            // --- NEW RANGER LOGIC ---
            options = [
                { val: "hunter", label: "Bond of the Hunter (+1 Ranged, Track Adv)" },
                { val: "beast", label: "Bond of the Beast (+1 Pet AC/Dmg)" }
            ];
        } else if (flags.select_skill) {
            const currentSkills = CharGen.calculateSkills();
            options = currentSkills
                .filter(s => s.count === 1)
                .map(s => ({ val: s.id, label: `${s.name} (Upgrade)` }));

            if (options.length === 0) {
                options = [{ val: "none", label: "No Valid Skills available to upgrade." }];
            }
        } else {
            console.warn("Talent flagged for choice but no type match found:", flags);
            options = [{ val: "default", label: "Default" }];
        }

        // 2. Create Modal DOM
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content" style="width: 450px; border: 1px solid var(--accent-gold);">
                <div class="modal-header" style="border-color:var(--accent-blue);">Class Bonus Unlocked</div>
                <div style="padding:1rem;">
                    <p style="margin-bottom:10px; color:var(--text-main);">Your class feature <strong>${synergySourceName}</strong> grants you the <strong>${talent.name}</strong> talent for free.</p>
                    <p class="text-muted" style="font-size:0.9rem; font-style:italic; margin-bottom:15px; color:#aaa;">${talent.effect}</p>
                    
                    <label class="form-label" style="display:block; margin-bottom:5px; color:var(--accent-gold);">Make your selection:</label>
                    <select id="syn-modal-choice" style="width:100%; padding:8px; margin-bottom:20px; background: #222; color: #eee; border:1px solid #555;">
                        ${options.map(o => `<option value="${o.val}">${o.label}</option>`).join('')}
                    </select>
                    
                    <div style="display:flex; gap:10px;">
                        <button id="btn-syn-cancel" class="btn-secondary" style="width:50%;">Cancel</button>
                        <button id="btn-syn-confirm" class="btn-primary" style="width:50%;">Confirm</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // 3. Attach Listeners
        document.getElementById('btn-syn-cancel').onclick = () => document.body.removeChild(overlay);

        document.getElementById('btn-syn-confirm').onclick = () => {
            const choice = document.getElementById('syn-modal-choice').value;
            
            if (choice === "none") {
                alert("Cannot add talent: No valid options available.");
                document.body.removeChild(overlay);
                return;
            }

            // Push to Character Data
            CharGen.char.talents.push({
                ...talent,
                source: `Synergy: ${synergySourceName}`,
                cost: "Free",
                choice: choice === "default" ? null : choice
            });

            console.log("Talent added via Synergy:", talent.name, choice);

            // Cleanup and Refresh
            document.body.removeChild(overlay);
            CharGen.calculateDerived();
            CharGen.renderSheet(CharGen.container);
        };
    },

    updateBioPreview: () => {
        const data = I18n.getData('options');
        const ancId = CharGen.char.ancestry;
        const bgId = CharGen.char.background;
        const previewEl = document.getElementById('bio-preview');
        const t = I18n.t; // Localization
        
        if (!ancId && !bgId) {
            previewEl.innerHTML = `<p class="text-muted" style="text-align:center; margin-top:2rem;">${t('lbl_desc')}</p>`;
            return;
        }

        let html = '';

        // Ancestry Section
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

        // Background Section
        if (bgId) {
            const bg = data.backgrounds.find(b => b.id === bgId);
            if (bg) {
                // Localize Gear List
                const gearList = bg.gear.map(g => {
                    // Try to translate if it's a known item, otherwise keep original
                    // For now, keep original string as item data might not be loaded here
                    return g; 
                }).join(', ');

                html += `
                    <div class="preview-section" style="border-top: 1px solid #333; padding-top: 1rem;">
                        <div class="preview-header">${bg.name}</div>
                        <div class="preview-text"><em>${bg.description}</em></div>
                        
                        <div class="split-view" style="gap: 10px; margin-top:10px;">
                            <div>
                                <div class="preview-label">${t('cg_lbl_skill_training')}</div>
                                <div class="preview-text">${bg.skill}</div>
                            </div>
                            <div>
                                <div class="preview-label">${t('cg_lbl_wealth')}</div>
                                <div class="preview-text">${bg.gear[bg.gear.length-1]}</div> 
                            </div>
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

        // Set values
        CharGen.char.ancestry = randAnc.id;
        CharGen.char.background = randBg.id;

        // Update UI
        document.getElementById('sel-ancestry').value = randAnc.id;
        document.getElementById('sel-background').value = randBg.id;
        
        // Update Preview
        CharGen.updateBioPreview();
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

        // Restore State
        if (CharGen.char.archA) document.getElementById('sel-arch-a').value = CharGen.char.archA;
        if (CharGen.char.archB) document.getElementById('sel-arch-b').value = CharGen.char.archB;

        // Initial Preview
        CharGen.updateClassPreview();

        // Listeners
        document.getElementById('sel-arch-a').addEventListener('change', (e) => {
            CharGen.char.archA = e.target.value;
            CharGen.char.talents = []; // Reset talents on change
            CharGen.updateClassPreview();
        });

        document.getElementById('sel-arch-b').addEventListener('change', (e) => {
            CharGen.char.archB = e.target.value;
            CharGen.char.talents = []; // Reset talents on change
            CharGen.updateClassPreview();
        });

        // Fix: Ensure listener is attached correctly
        const randBtn = document.getElementById('btn-random-class');
        if (randBtn) {
            randBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent any weird form behaviors
                CharGen.rollRandomClass();
            });
        }
    },

    updateClassPreview: () => {
        const data = I18n.getData('options');
        const idA = CharGen.char.archA;
        const idB = CharGen.char.archB;
        const previewEl = document.getElementById('class-preview');
        const talentUI = document.getElementById('talent-selection-ui');
        const t = I18n.t;
        const fmt = I18n.fmt;

        // 1. Validation
        if (!idA || !idB) {
            previewEl.innerHTML = `<p style="color:#666; text-align:center; margin-top:2rem;">${t('lbl_desc')}</p>`;
            talentUI.style.display = 'none';
            return;
        }

        // 2. Fetch Data
        const archA = data.archetypes.find(a => a.id === idA);
        const archB = data.archetypes.find(a => a.id === idB);
        
        // Find Class Logic
        const foundClass = data.classes.find(c => 
            (c.components[0] === archA.name && c.components[1] === archB.name) ||
            (c.components[0] === archB.name && c.components[1] === archA.name)
        );

        if (!foundClass) return;

        // Update State
        CharGen.char.classId = foundClass.id;
        CharGen.char.className = foundClass.name;

        // --- HELPER: Render Archetype Detail Block ---
        const renderArchDetail = (arch) => {
            // Translate stats array [STR, DEX] -> [FUE, DES]
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

                <div style="font-size:0.75rem;">
                    <div><strong style="color:var(--text-muted);">${t('cg_lbl_weapons')}:</strong> ${arch.proficiencies.weapons.join(', ')}</div>
                    <div><strong style="color:var(--text-muted);">${t('cg_lbl_armor')}:</strong> ${arch.proficiencies.armor.join(', ')}</div>
                </div>
            </div>
            `;
        };

        // --- HELPER: Render Synergy Feats ---
        let featsHtml = '';
        if (foundClass.synergy_feats) {
            foundClass.synergy_feats.forEach(feat => {
                let badgeColor = '#888';
                if (feat.level === 1) badgeColor = 'var(--accent-blue)';
                if (feat.level === 5) badgeColor = 'var(--accent-gold)';
                if (feat.level === 10) badgeColor = 'var(--accent-crimson)';

                featsHtml += `
                    <div style="margin-bottom:10px; padding-bottom:10px; border-bottom:1px dashed #444; last-child:border-bottom:none;">
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

        // --- 3. Build HTML Structure ---
        const html = `
            <div class="preview-section">
                <!-- Class Header -->
                <div class="preview-header" style="color:var(--accent-gold); border-bottom: 2px solid var(--accent-gold); padding-bottom:5px; margin-bottom:10px;">
                    <span style="font-size:1.6rem; text-transform:uppercase; letter-spacing:1px;">${foundClass.name}</span>
                </div>
                <div class="preview-text" style="margin-bottom:1.5rem; font-style:italic; color:#aaa;">${foundClass.description}</div>
                
                <!-- Section 1: Synergy Feats (Open by Default) -->
                <details class="accordion-box" open>
                    <summary class="accordion-header">${t('cg_class_features')}</summary>
                    <div class="accordion-content">
                        ${featsHtml}
                    </div>
                </details>

                <!-- Section 2: Archetype A -->
                <details class="accordion-box">
                    <summary class="accordion-header">${archA.name}</summary>
                    ${renderArchDetail(archA)}
                </details>

                <!-- Section 3: Archetype B -->
                <details class="accordion-box">
                    <summary class="accordion-header">${archB.name}</summary>
                    ${renderArchDetail(archB)}
                </details>
            </div>
        `;
        previewEl.innerHTML = html;

        // Render Talent Selectors
        talentUI.style.display = 'block';
        CharGen.renderTalentSelectors(archA, archB);
    },

    renderChoiceModal: (talent, archId, talentIdx, colId) => {
        // 1. Determine what kind of choice is needed
        let title = `Choice Required: ${talent.name}`;
        let options = [];

        // A. Skill Choice
        if (talent.flags.select_skill) {
            const currentSkills = CharGen.calculateSkills();
            
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
                // Pick any skill (e.g. Adaptable Learner)
                // Simplified list for context
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

        // --- BUILD MODAL HTML ---
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

        // Handlers
        document.getElementById('btn-modal-cancel').onclick = () => document.body.removeChild(overlay);
        
        document.getElementById('btn-modal-confirm').onclick = () => {
            const choice = document.getElementById('modal-choice').value;
            
            // Add talent with choice
            CharGen.confirmTalentAdd(talent, archId, choice);
            
            document.body.removeChild(overlay);
            
            // --- CONTEXT AWARE REFRESH ---
            if (CharGen.currentStep === 2) {
                // We are in Creation Mode
                CharGen.renderTalentSelectorsFromIDs(CharGen.char.archA, CharGen.char.archB);
            } else {
                // We are in Level Up / Sheet Mode
                CharGen.calculateDerived();
                CharGen.renderSheet(CharGen.container);
            }
        };
    },

    // Helper to re-render using IDs stored in char
    renderTalentSelectorsFromIDs: (idA, idB) => {
        const data = I18n.getData('options');
        const a = data.archetypes.find(x => x.id === idA);
        const b = data.archetypes.find(x => x.id === idB);
        CharGen.renderTalentSelectors(a, b);
    },

    renderTalentSelectors: (archA, archB) => {
        const container = document.getElementById('talent-columns');
        const instruct = document.getElementById('talent-instruction');
        const isPure = (archA.id === archB.id);
        const t = I18n.t;
        const fmt = I18n.fmt;
        
        container.innerHTML = '';

        // Helper to render a list
        const makeList = (arch, colId) => {
            // Localize header: "Soldier Talents" -> "Talentos de Soldado"
            let html = `<div class="talent-col" id="${colId}"><h4>${fmt('cg_lbl_talents_header', {name: arch.name})}</h4>`;
            arch.talents.forEach((t, idx) => {
                const isSelected = CharGen.char.talents.some(sel => sel.name === t.name);
                html += `
                    <div class="talent-opt ${isSelected ? 'selected' : ''}" 
                         data-arch="${arch.id}" 
                         data-idx="${idx}" 
                         data-col="${colId}">
                        <div>
                            <span class="talent-opt-name">${t.name}</span>
                            <span class="talent-opt-cost">${t.cost}</span>
                        </div>
                        <span class="talent-opt-desc">${t.effect}</span>
                    </div>
                `;
            });
            html += `</div>`;
            return html;
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
                const archId = target.dataset.arch;
                const idx = parseInt(target.dataset.idx);
                const colId = target.dataset.col;
                CharGen.toggleTalent(archId, idx, colId);
            });
        });
        
        CharGen.updateTalentCount();
    },

    updateTalentCount: () => {
        const countEl = document.getElementById('talent-count');
        const count = CharGen.char.talents.length;
        const limit = (CharGen.char.archA === CharGen.char.archB) ? 2 : 2; // Actually creation limit is always 2
        const t = I18n.t;
        const fmt = I18n.fmt;
        
        if(countEl) {
            countEl.textContent = fmt('cg_lbl_selected', {current: count, max: limit});
            countEl.style.color = (count === limit) ? 'var(--accent-gold)' : 'var(--text-muted)';
        }
    },

    toggleTalent: (archId, talentIdx, colId) => {
        const data = I18n.getData('options');
        const arch = data.archetypes.find(a => a.id === archId);
        const talent = arch.talents[talentIdx];
        
        // CHECK 1: Is it already selected?
        // We match by name AND choice (if applicable)
        const existIdx = CharGen.char.talents.findIndex(t => t.name === talent.name);

        if (existIdx > -1) {
            // REMOVE
            // If it's repeatable, we might need to check WHICH instance to remove if there are choices.
            // For this UI iteration, clicking a selected talent removes it.
            CharGen.char.talents.splice(existIdx, 1);
            CharGen.renderTalentSelectors(
                data.archetypes.find(a => a.id === CharGen.char.archA), 
                data.archetypes.find(a => a.id === CharGen.char.archB)
            );
            return;
        } 
        
        // CHECK 2: Does it require a choice?
        if (talent.flags && (talent.flags.select_skill || talent.flags.select_mod || talent.flags.select_property)) {
            CharGen.renderChoiceModal(talent, archId, talentIdx, colId);
            return; // Stop here, Modal handles the rest
        }

        // Standard Add
        CharGen.confirmTalentAdd(talent, archId, null);
        CharGen.renderTalentSelectors(
            data.archetypes.find(a => a.id === CharGen.char.archA), 
            data.archetypes.find(a => a.id === CharGen.char.archB)
        );
    },

    confirmTalentAdd: (talent, archId, choiceValue) => {
        const data = I18n.getData('options');
        const arch = data.archetypes.find(a => a.id === archId);
        
        // Only enforce creation limits during Step 2
        if (CharGen.currentStep === 2) {
            const isPure = (CharGen.char.archA === CharGen.char.archB);
            
            if (isPure) {
                if (CharGen.char.talents.length >= 2) {
                    alert("Limit reached: 2 Talents maximum.");
                    return;
                }
                CharGen.char.talents.push({...talent, source: arch.name, choice: choiceValue});
            } else {
                // Hybrid: 1 from A, 1 from B
                // Check if we already have a talent from this Archetype Source
                const existingFromSourceIdx = CharGen.char.talents.findIndex(t => t.source === arch.name);
                
                if (existingFromSourceIdx > -1) {
                    // Replace existing
                    CharGen.char.talents.splice(existingFromSourceIdx, 1);
                }
                CharGen.char.talents.push({...talent, source: arch.name, choice: choiceValue});
            }
        } else {
            // Level Up Mode: Just add the talent
            // Note: Duplicate checking for non-repeatables is handled by getValidTalentOptions before this point
            CharGen.char.talents.push({...talent, source: arch.name, choice: choiceValue});
        }
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

        // Update State
        CharGen.char.archA = archA.id;
        CharGen.char.archB = archB.id;
        
        // Reset Talents because archetype changed
        CharGen.char.talents = []; 

        // Update UI
        document.getElementById('sel-arch-a').value = archA.id;
        document.getElementById('sel-arch-b').value = archB.id;

        CharGen.updateClassPreview();
    },

    /* ------------------------------------------------------------------
       STEP 3: ATTRIBUTES
       ------------------------------------------------------------------ */
    
    renderStats: (el) => {
        const t = I18n.t;
        const isManual = CharGen.statState.manualMode;
        
        // Define stats explicitly for iteration
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

        // --- Event Listeners ---
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
                    const idx = parseInt(e.target.dataset.idx);
                    CharGen.statState.selectedValIndex = idx;
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
            
            // Helper class for visual feedback
            let classes = "pool-btn";
            if (isUsed) classes += " used";
            if (isSelected) classes += " selected";

            return `<button class="${classes}" data-idx="${idx}" ${isUsed ? 'disabled' : ''}>
                    ${val >= 0 ? '+'+val : val}
                    </button>`;
        }).join('');
    },

    rollStats: () => {
        const roll = Math.floor(Math.random() * 12) + 1;
        let values = [];
        let name = "";

        // Standard Array Logic
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
        
        // Re-render to show buttons
        CharGen.renderStats(document.getElementById('step-container'));
    },

    assignStatFromPool: (statKey) => {
        const state = CharGen.statState;

        // If clicking a filled box, clear it (return value to pool)
        if (CharGen.char.stats[statKey] !== null) {
            const idxToRemove = Object.keys(state.assignedIndices).find(key => state.assignedIndices[key] === statKey);
            if (idxToRemove) {
                delete state.assignedIndices[idxToRemove];
                CharGen.char.stats[statKey] = null;
                state.selectedValIndex = null;
                
                // Refresh
                CharGen.renderStats(document.getElementById('step-container'));
                CharGen.calculateDerived(); // Recalc on change
                CharGen.validateStats();
                return;
            }
        }

        // If clicking an empty box with a value selected
        if (state.selectedValIndex !== null) {
            const val = state.arrayValues[state.selectedValIndex];
            state.assignedIndices[state.selectedValIndex] = statKey;
            CharGen.char.stats[statKey] = val;
            state.selectedValIndex = null;
            
            // Refresh
            CharGen.renderStats(document.getElementById('step-container'));
            CharGen.calculateDerived(); // Recalc on change
            CharGen.validateStats();
        }
    },

    validateStats: () => {
        const btnNext = document.getElementById('btn-next');
        if (!btnNext) return;

        if (CharGen.statState.manualMode) {
            btnNext.disabled = false;
        } else {
            const allAssigned = Object.values(CharGen.char.stats).every(v => v !== null);
            btnNext.disabled = !allAssigned;
        }
    },

    calculateDerived: () => {
        const c = CharGen.char;
        const s = c.stats;
        const data = I18n.getData('options');
        
        if (!data) return;

        let isFullWarrior = false;
        let isFullCaster = false;
        let isFullSpecialist = false;
        let hasWarrior = false;
        let hasCaster = false;
        let hasSpecialist = false;
        let archA = null;
        let archB = null;

        // --- ROBUST ROLE CHECKING ---
        // Instead of checking the string "Warrior", we check the ID prefix or specific IDs
        // Assuming IDs are like "arch_soldier", "arch_brute" etc.
        // We map IDs to Roles manually here to be 100% safe against translation errors.
        
        const ROLE_MAP = {
            "arch_soldier": "Warrior", "arch_brute": "Warrior", "arch_guardian": "Warrior", "arch_skirmisher": "Warrior",
            "arch_arcanist": "Spellcaster", "arch_occultist": "Spellcaster", "arch_priest": "Spellcaster", "arch_primalist": "Spellcaster",
            "arch_rogue": "Specialist", "arch_warden": "Specialist", "arch_leader": "Specialist", "arch_crafter": "Specialist"
        };

        if (c.archA && c.archB) {
            archA = data.archetypes.find(a => a.id === c.archA);
            archB = data.archetypes.find(a => a.id === c.archB);

            if (archA && archB) {
                const roleA = ROLE_MAP[c.archA];
                const roleB = ROLE_MAP[c.archB];

                isFullWarrior = (roleA === "Warrior" && roleB === "Warrior");
                isFullCaster = (roleA === "Spellcaster" && roleB === "Spellcaster");
                isFullSpecialist = (roleA === "Specialist" && roleB === "Specialist");
                
                hasWarrior = (roleA === "Warrior" || roleB === "Warrior");
                hasCaster = (roleA === "Spellcaster" || roleB === "Spellcaster");
                hasSpecialist = (roleA === "Specialist" || roleB === "Specialist");
            }
        }

        const d = c.derived;
        const level = c.level;
        const str = s.STR || 0;
        const dex = s.DEX || 0;
        const con = s.CON || 0;
        const int = s.INT || 0;
        const wis = s.WIS || 0;
        const cha = s.CHA || 0;

        // --- 2. Calculate Base Vitals ---
        
        // Hit Points
        let hitDie = 8;
        if (isFullWarrior) hitDie = 10;
        if (isFullCaster) hitDie = 6;

        // Init Base HP if fresh (Level 1 and undefined)
        if (c.level === 1 && (!c.baseHP || c.baseHP === 0)) {
            c.baseHP = Math.max(1, hitDie + con);
        }
        // Safety for existing chars
        if (!c.baseHP) c.baseHP = Math.max(1, hitDie + con);

        d.maxHP = c.baseHP;

        // Stamina
        d.maxSTA = 0;
        if (isFullWarrior) {
            const phys = [str, dex, con].sort((a,b) => b - a);
            d.maxSTA = Math.max(1, phys[0] + phys[1]);
        } else if (hasWarrior) {
            d.maxSTA = Math.max(1, str, dex, con);
        }

        // Mana
        d.maxMP = 0;
        if (hasCaster) {
            let castMod = 0;
            // Primary Stats are arrays strings ["STR", "DEX"]. 
            // In Spanish JSON they might be ["FUE", "DES"] if translated.
            // We need to Normalize the stat key.
            
            const getCastStat = (arch) => {
                if (!arch || !arch.primary_stats) return 0;
                for (let rawStat of arch.primary_stats) {
                    const normStat = I18n.normalize('stats', rawStat); // "FUE" -> "STR"
                    if (["INT", "WIS", "CHA"].includes(normStat)) return s[normStat] || 0;
                }
                return 0;
            };

            const modA = getCastStat(archA);
            const modB = getCastStat(archB);
            castMod = Math.max(modA, modB);
            
            // Fallback
            if (castMod === 0) castMod = Math.max(int, wis, cha); 

            if (isFullCaster) d.maxMP = ((level + 1) * 2) + castMod;
            else d.maxMP = (level + 1) + castMod;
        }

        // Luck
        d.maxLuck = 1; 
        if (isFullSpecialist) d.maxLuck = Math.max(1, cha * 2);
        else if (hasSpecialist) d.maxLuck = Math.max(1, cha);

        // Slots
        d.slots = 8 + str + con;

        // --- 3. Apply Modifiers ---
        const applyModifiers = (mods) => {
            if (!mods) return;
            if (mods.hp_flat) d.maxHP += mods.hp_flat;
            if (mods.hp_per_level) d.maxHP += (mods.hp_per_level * level);
            if (mods.mp_flat) d.maxMP += mods.mp_flat;
            if (mods.sta_flat) d.maxSTA += mods.sta_flat;
            if (mods.luck_flat) d.maxLuck += mods.luck_flat;
            if (mods.slots_flat) d.slots += mods.slots_flat;
            
            if (mods.sta_mod) {
                const normStat = I18n.normalize('stats', mods.sta_mod);
                d.maxSTA += (s[normStat] || 0);
            }
        };

        // Ancestry Mods
        if (c.ancestry) {
            const anc = data.ancestries.find(a => a.id === c.ancestry);
            if (anc && c.ancestryFeatIndex !== null && anc.feats[c.ancestryFeatIndex]) {
                applyModifiers(anc.feats[c.ancestryFeatIndex].modifiers);
            }
            if (c.ancestryChoice) {
                const tempMod = {};
                if (c.ancestryChoice === "hp_flat") tempMod.hp_flat = 4;
                if (c.ancestryChoice === "mp_flat") tempMod.mp_flat = 2;
                if (c.ancestryChoice === "sta_flat") tempMod.sta_flat = 1;
                if (c.ancestryChoice === "slots_flat") tempMod.slots_flat = 1;
                applyModifiers(tempMod);
            }
        }

        // Talent Mods
        if (c.talents.length > 0) {
            c.talents.forEach(t => {
                if (t.modifiers) applyModifiers(t.modifiers);
            });
        }

        // Class Synergy Mods
        if (c.classId) {
            const cls = data.classes.find(cl => cl.id === c.classId);
            if (cls) {
                const activeFeats = cls.synergy_feats.filter(f => f.level <= c.level);
                activeFeats.forEach(f => {
                    if (f.modifiers) applyModifiers(f.modifiers);
                });
            }
        }

        // --- 4. Minimum Safety ---
        if (d.maxHP < 1) d.maxHP = 1;
        if (d.maxMP < 0) d.maxMP = 0;
        if (d.maxSTA < 0) d.maxSTA = 0;
        if (d.maxLuck < 1) d.maxLuck = 1;
        if (d.slots < 8) d.slots = 8;

        // --- 5. Update UI ---
        CharGen.updateStatPreview(hitDie);
    },

    updateStatPreview: (hitDie) => {
        const d = CharGen.char.derived;
        const s = CharGen.char.stats;
        const el = document.getElementById('stats-preview');
        const t = I18n.t; // Localization
        
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
       STEP 4: GEAR (Cleaned)
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
        
        // Shop Tab Switching
        el.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                CharGen.renderShopList(e.target.dataset.tab);
            });
        });

        // Background Gear Button
        const bgBtn = document.getElementById('btn-bg-gear');
        const hasBgItems = CharGen.char.inventory.some(i => i.type === "Background");
        if(hasBgItems) {
            bgBtn.disabled = true;
            bgBtn.textContent = `✅ ${t('cg_btn_kit_added')}`;
        } else {
            bgBtn.addEventListener('click', () => {
                CharGen.equipBackgroundGear(); 
            });
        }

        // Initial Render
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

        // Bind Add Buttons
        container.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Retrieve item from data again to copy it
                let list = [];
                if (btn.dataset.cat === 'weapons') list = data.weapons;
                else if (btn.dataset.cat === 'armor') list = data.armor;
                else list = [...data.gear, ...data.materials, ...data.reagents];
                
                const item = list[btn.dataset.idx];
                CharGen.addToInventory(item);
            });
        });
    },

    renderTalentList: () => {
        const container = document.getElementById('shop-container');
        const data = I18n.getData('options');
        
        // Determine available talents based on Archetypes
        const archA = data.archetypes.find(a => a.id === CharGen.char.archA);
        const archB = data.archetypes.find(a => a.id === CharGen.char.archB);
        
        if (!archA || !archB) {
            container.innerHTML = '<p class="text-muted p-2">Select Class first.</p>';
            return;
        }

        // Combine lists, removing duplicates if Pure Class
        let pool = [];
        
        // Helper to tag source
        const tag = (t, source) => ({...t, sourceName: source});

        if (archA.id === archB.id) {
            // Pure Class
            pool = archA.talents.map(t => tag(t, archA.name));
        } else {
            // Hybrid
            pool = [
                ...archA.talents.map(t => tag(t, archA.name)),
                ...archB.talents.map(t => tag(t, archB.name))
            ];
        }

        const html = pool.map((talent, idx) => `
            <div class="shop-item">
                <div style="flex-grow:1;">
                    <div style="font-weight:bold; color:var(--accent-blue);">${talent.name}</div>
                    <div style="font-size:0.75rem; color:#aaa;">${talent.type} | ${talent.cost} | ${talent.sourceName}</div>
                    <div style="font-size:0.7rem; color:#888;">${talent.effect}</div>
                </div>
                <button class="add-btn" data-idx="${idx}">+</button>
            </div>
        `).join('');

        container.innerHTML = html;

        // Bind Add Buttons (Store temp pool in DOM or closure? Let's just rebuild it)
        container.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const t = pool[btn.dataset.idx];
                CharGen.addTalent(t);
            });
        });
    },

    /* --- ECONOMY HELPERS --- */
    
    // Convert a cost string (e.g., "15g", "5s", "10g") to total Copper value
    parseCostToCopper: (costStr) => {
        if (!costStr || costStr === "-") return 0;

        const clean = String(costStr).toLowerCase().replace(/,/g, '').trim();

        // Regex: Capture number and unit
        const match = clean.match(/(\d+)\s*([a-zñ]+)/); // added ñ for 'año' edge cases, mainly just [a-z]
        
        if (!match) return 0;

        const val = parseInt(match[1], 10);
        const unit = match[2]; 

        // Gold / Oro
        if (unit.startsWith('g') || unit.startsWith('o')) return val * 100;
        // Silver / Plata
        if (unit.startsWith('s') || unit.startsWith('p')) return val * 10;
        
        return val; // Default Copper
    },

    // Convert character's current wealth to total Copper
    getWalletTotal: () => {
        const w = CharGen.char.currency || { g: 0, s: 0, c: 0 };
        return (w.g * 100) + (w.s * 10) + (w.c);
    },

    updateWallet: (totalCopper) => {
        // A. Update Data Model
        const g = Math.floor(totalCopper / 100);
        const rem1 = totalCopper % 100;
        const s = Math.floor(rem1 / 10);
        const c = rem1 % 10;

        CharGen.char.currency = { g, s, c };

        // B. Update UI immediately
        const walletEl = document.getElementById('wallet-display');
        if (walletEl) {
            walletEl.innerHTML = `💰 ${g}g ${s}s ${c}c`;
            
            // Visual feedback (Flash Gold)
            walletEl.style.transition = "color 0.2s";
            walletEl.style.color = "#fff"; // Flash white
            setTimeout(() => {
                walletEl.style.color = "var(--accent-gold)"; // Return to Gold
            }, 300);
        }
    },

    // Update character wallet from a total Copper amount (Greedy Exchange)
    setWalletFromTotal: (totalCopper) => {
        const g = Math.floor(totalCopper / 100);
        const rem1 = totalCopper % 100;
        const s = Math.floor(rem1 / 10);
        const c = rem1 % 10;
        
        CharGen.char.currency = { g, s, c };
        
        // IMMEDIATE UI UPDATE
        const walletEl = document.getElementById('wallet-display');
        if (walletEl) {
            walletEl.innerHTML = `💰 ${g}g ${s}s ${c}c`;
            // Add a visual flash effect
            walletEl.style.color = '#fff';
            setTimeout(() => walletEl.style.color = 'var(--accent-gold)', 300);
        }
    },

    /* --- INVENTORY LOGIC (ROBUST) --- */

    _sanitizeItem: (item) => {
        // Ensure item has a type for logic checks
        // Normalize checking against localized names
        const name = item.name.toLowerCase();
        
        if (!item.type) {
            if (name.includes("shield") || name.includes("escudo")) item.type = "Shield";
            else if (item.as > 0) item.type = "Armor";
            else item.type = "Gear";
        }
        
        // Normalize type for internal logic (Armor/Shield/Melee/Ranged)
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

        let currentCopper = 0;
        const existingNames = CharGen.char.inventory.map(i => i.name);

        bg.gear.forEach(gearStr => {
            // FIX: Check for English OR Spanish currency terms
            // Matches: gold, silver, copper, oro, plata, cobre
            if (gearStr.match(/(gold|silver|copper|oro|plata|cobre)/i)) {
                currentCopper += CharGen.parseCostToCopper(gearStr);
                return; // Stop processing this string, it's money, not an item
            }

            if (existingNames.includes(gearStr)) return;

            // Name Parsing (Remove parenthesis details for lookup)
            const cleanName = gearStr.replace(/\s*\(.*?\)\s*/g, '').trim();
            
            // DB Lookup
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
            
            // Auto-Equip Logic
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

        // Update Wallet
        const currentTotal = CharGen.getWalletTotal();
        CharGen.updateWallet(currentTotal + currentCopper);

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

    addToInventory: (item) => {
        const costCopper = CharGen.parseCostToCopper(item.cost);
        const currentCopper = CharGen.getWalletTotal();

        if (costCopper > 0 && currentCopper < costCopper) {
            const walletEl = document.getElementById('wallet-display');
            if (walletEl) {
                walletEl.style.color = "var(--accent-crimson)";
                setTimeout(() => walletEl.style.color = "var(--accent-gold)", 500);
            }
            return; 
        }

        if (costCopper > 0) CharGen.updateWallet(currentCopper - costCopper);

        let newItem = JSON.parse(JSON.stringify(item));
        newItem = CharGen._sanitizeItem(newItem);
        newItem.equipped = false;

        // Smart Auto-Equip for Shop
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

    // Helper to refresh everything
    recalcAll: () => {
        CharGen.calculateDerived();
        CharGen.calculateDefenses();
        CharGen.calculateArmorScore();
    },

    removeFromInventory: (index) => {
        CharGen.char.inventory.splice(index, 1);
        CharGen.updateInventoryUI();
        CharGen.calculateDefenses(); 
    },

    updateInventoryUI: () => {
        const listEl = document.getElementById('inv-list-container');
        const fillEl = document.getElementById('slot-fill');
        const textEl = document.getElementById('slot-text');
        const warnEl = document.getElementById('encumbrance-warning');
        
        if (!listEl) return;

        // Calculate Slots
        let currentSlots = 0;
        CharGen.char.inventory.forEach(i => currentSlots += (i.slots || 0));
        currentSlots = Math.round(currentSlots * 100) / 100;

        const maxSlots = CharGen.char.derived.slots;
        const pct = Math.min(100, (currentSlots / maxSlots) * 100);

        // Render Meter
        fillEl.style.width = `${pct}%`;
        fillEl.style.backgroundColor = currentSlots > maxSlots ? 'var(--accent-crimson)' : 'var(--accent-gold)';
        textEl.textContent = `${currentSlots} / ${maxSlots} Slots`;
        warnEl.style.display = currentSlots > maxSlots ? 'block' : 'none';

        // Render List
        listEl.innerHTML = CharGen.char.inventory.map((item, idx) => {
            // Check if item is equipable
            const isEquipable = (item.type === "Melee" || item.type === "Ranged" || item.as > 0 || item.name.includes("Shield"));
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

        // Listeners
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
            // 1. Check Requirements
            const check = CharGen.checkRequirements(item);
            if (!check.pass) {
                alert(`Cannot equip ${item.name}.\n${check.msg}`);
                return;
            }

            // 2. Check Exclusivity
            const inv = CharGen.char.inventory;
            
            if (item.type === "Armor") {
                // Unequip other Armor (but not Shields)
                inv.forEach(i => { if(i.type === "Armor") i.equipped = false; });
            } else if (item.type === "Shield") {
                // Unequip other Shields
                inv.forEach(i => { if(i.type === "Shield") i.equipped = false; });
            }
            // Weapons can have multiple equipped (Dual Wielding or Ranged/Melee swap), 
            // so we don't auto-unequip them here, user must unequip manually if needed.
        }

        item.equipped = isEquipping;
        
        CharGen.updateInventoryUI();
        CharGen.recalcAll();
    },

    /* --- TALENT LOGIC --- */

    addTalent: (talent) => {
        // Check duplicates
        if (CharGen.char.talents.some(t => t.name === talent.name)) return;
        
        // Check limit (Level 1)
        // Pure Class = 2 Talents. Hybrid = 1 Talent.
        const limit = (CharGen.char.archA === CharGen.char.archB) ? 2 : 1;
        
        if (CharGen.char.talents.length >= limit) {
            alert(`Level 1 Limit Reached: ${limit} Talent(s). Remove one to add another.`);
            return;
        }

        CharGen.char.talents.push(talent);
        CharGen.updateTalentUI();
    },

    removeTalent: (index) => {
        CharGen.char.talents.splice(index, 1);
        CharGen.updateTalentUI();
    },

    updateTalentUI: () => {
        const container = document.getElementById('talent-list-container');
        const limitMsg = document.getElementById('talent-limit-msg');
        if (!container) return;

        const limit = (CharGen.char.archA === CharGen.char.archB) ? 2 : 1;
        limitMsg.textContent = `Level 1 Limit: ${CharGen.char.talents.length} / ${limit}`;
        if (CharGen.char.talents.length > limit) limitMsg.style.color = 'var(--accent-crimson)';
        else limitMsg.style.color = '#888';

        container.innerHTML = CharGen.char.talents.map((t, idx) => `
            <div class="inv-item" style="border-left: 2px solid var(--accent-blue);">
                <span style="font-size:0.85rem;">${t.name}</span>
                <button class="remove-btn" onclick="CharGen.removeTalent(${idx})">×</button>
            </div>
        `).join('');
    },
/* ------------------------------------------------------------------
       STEP 5: FINAL SHEET
       ------------------------------------------------------------------ */

renderSheet: async (container) => {
    const c = CharGen.char;

    // 1. Data Safety: Initialize Current Vitals if they are null
    if (c.current.hp === null) c.current.hp = c.derived.maxHP;
    if (c.current.mp === null) c.current.mp = c.derived.maxMP;
    if (c.current.sta === null) c.current.sta = c.derived.maxSTA;
    if (c.current.luck === null) c.current.luck = c.derived.maxLuck;

    CharGen.recalcAll();
    
    // 2. Clear Container
    container.innerHTML = '';
    
    // 3. Build Layout Structure
    const layout = document.createElement('div');
    layout.className = 'char-manager-layout';
    
    // 4. Render Components
    layout.appendChild(CharGen.renderHUD());     
    layout.appendChild(CharGen.renderTabs());    
    
    const contentArea = document.createElement('div');
    contentArea.id = 'char-manager-content';
    contentArea.className = 'char-tab-content';
    layout.appendChild(contentArea);
    
    // CRITICAL: This class MUST be 'print-only' and matched in CSS
    const printArea = document.createElement('div');
    printArea.id = 'print-sheet-root';
    printArea.className = 'print-only';
    layout.appendChild(printArea);

    container.appendChild(layout);

    // 5. Initialize
    CharGen.switchTab('main');
    CharGen.renderPrintVersion(printArea);
    CharGen.attachManagerListeners();
},

renderHUD: () => {
    const c = CharGen.char;
    const t = I18n.t;
    
    const hp = c.current.hp !== null ? c.current.hp : c.derived.maxHP;
    const maxHP = c.derived.maxHP || 1;
    const mp = c.current.mp !== null ? c.current.mp : c.derived.maxMP;
    const maxMP = c.derived.maxMP || 0;
    const sta = c.current.sta !== null ? c.current.sta : c.derived.maxSTA;
    const maxSTA = c.derived.maxSTA || 0;
    const luck = c.current.luck !== null ? c.current.luck : c.derived.maxLuck;
    const maxLuck = c.derived.maxLuck || 0;

    const hpPct = Math.min(100, (hp / maxHP) * 100);
    const mpPct = Math.min(100, (mp / maxMP) * 100);
    const staPct = Math.min(100, (sta / maxSTA) * 100);
    const luckPct = Math.min(100, (luck / maxLuck) * 100);

    const div = document.createElement('div');
    div.className = 'char-hud';
    div.innerHTML = `
        <div class="hud-header">
            <div class="hud-identity">
                <input type="text" class="edit-name" value="${c.name}" data-field="name" placeholder="${t('cg_lbl_name')}">
                <div class="hud-subtitle">
                    ${c.className || 'Adventurer'} &bull; Lvl ${c.level}
                </div>
            </div>
            <div class="hud-controls">
                <button id="btn-print-trigger" class="btn-icon" title="${t('btn_print')}">🖨️</button>
                <button id="btn-save-trigger" class="btn-icon" title="${t('btn_save')}">💾</button>
            </div>
        </div>

        <div class="hud-vitals-row">
            <div class="level-capsule">
                <div class="lvl-group">
                    <span class="lvl-label">LVL</span>
                    <input type="number" class="lvl-input edit-tiny" value="${c.level}" data-field="level">
                </div>
                <div style="width:1px; height:30px; background:#333;"></div>
                <div class="lvl-group">
                    <span class="lvl-label">XP</span>
                    <div style="display:flex; align-items:baseline;">
                        <input type="number" class="lvl-input" value="${c.current.xp || 0}" data-vital="xp">
                        <span style="font-size:0.8rem; color:#666;">/ 10</span>
                    </div>
                </div>
            </div>

            <div class="resource-grid">
                <div class="res-card red">
                    <div class="res-label">${t('sheet_hp')}</div>
                    <div class="res-values">
                        <input type="number" class="res-input v-cur" value="${hp}" data-vital="hp">
                        <span class="res-max">/ ${maxHP}</span>
                    </div>
                    <div class="res-bar"><div class="res-fill" style="width:${hpPct}%"></div></div>
                </div>
                <div class="res-card green">
                    <div class="res-label">${t('sheet_sta')}</div>
                    <div class="res-values">
                        <input type="number" class="res-input v-cur" value="${sta}" data-vital="sta">
                        <span class="res-max">/ ${maxSTA}</span>
                    </div>
                    <div class="res-bar"><div class="res-fill" style="width:${staPct}%"></div></div>
                </div>
                <div class="res-card blue">
                    <div class="res-label">${t('sheet_mp')}</div>
                    <div class="res-values">
                        <input type="number" class="res-input v-cur" value="${mp}" data-vital="mp">
                        <span class="res-max">/ ${maxMP}</span>
                    </div>
                    <div class="res-bar"><div class="res-fill" style="width:${mpPct}%"></div></div>
                </div>
                <div class="res-card gold">
                    <div class="res-label">${t('sheet_luck')}</div>
                    <div class="res-values">
                        <input type="number" class="res-input v-cur" value="${luck}" data-vital="luck">
                        <span class="res-max">/ ${maxLuck}</span>
                    </div>
                    <div class="res-bar"><div class="res-fill" style="width:${luckPct}%"></div></div>
                </div>
            </div>
        </div>
    `;
    return div;
},

    renderTabs: () => {
        const t = I18n.t;
        const div = document.createElement('div');
        div.className = 'char-tabs';
        div.innerHTML = `
            <button class="char-tab-btn active" data-target="main">⚔️ ${t('cg_combat_stats')}</button>
            <button class="char-tab-btn" data-target="inventory">🎒 ${t('sheet_inv')}</button>
            <button class="char-tab-btn" data-target="features">✨ ${t('sheet_features')}</button>
            <button class="char-tab-btn" data-target="notes">📝 ${t('sheet_notes')}</button>
        `;
        
        // Tab Switching Logic
        div.querySelectorAll('.char-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
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
            case 'main':
                CharGen.renderTabMain(container);
                break;
            case 'inventory':
                CharGen.renderTabInventory(container);
                break;
            case 'features':
                CharGen.renderTabFeatures(container);
                break;
            case 'notes':
                CharGen.renderTabNotes(container);
                break;
        }
    },

    renderTabMain: (container) => {
    const c = CharGen.char;
    const t = I18n.t;
    
    CharGen.recalcAll(); 

    const armorScore = CharGen.calculateArmorScore();
    const def = c.defenses;

    container.innerHTML = `
        <div class="manager-grid">
            
            <!-- COLUMN 1 -->
            <div class="mgr-col">
                <div>
                    <div class="mgr-header">${t('cg_step_stats')}</div>
                    <div class="attr-grid">
                        ${['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(stat => `
                            <div class="attr-card">
                                <span class="attr-lbl">${t('stat_' + stat.toLowerCase())}</span>
                                <input type="number" class="attr-val attr-input" data-stat="${stat}" value="${c.stats[stat] || 0}">
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <div class="mgr-header">${t('sheet_def')}</div>
                    <div class="def-row">
                        <div class="def-card">
                            <span class="def-label">${t('sheet_ac')}</span>
                            <div class="def-val">${armorScore}</div>
                        </div>
                        <div class="def-card">
                            <span class="def-label">${t('cg_initiative')}</span>
                            <div class="def-val">${(c.stats.DEX || 0) >= 0 ? '+' : ''}${c.stats.DEX || 0}</div>
                        </div>
                        <div class="def-card">
                            <span class="def-label">${t('mon_stat_spd')}</span>
                            <div class="def-val">30'</div>
                        </div>
                    </div>

                    <div style="margin-top:10px; background:#1a1a1a; padding:10px; border-radius:4px; border:1px solid #333;">
                        <div class="skill-row">
                            <span class="skill-name">${t('sheet_dodge')} (DEX)</span>
                            <span class="skill-val">${def.dodge.val >= 0 ? '+' : ''}${def.dodge.val} ${def.dodge.die !== '-' ? '('+def.dodge.die+')' : ''}</span>
                        </div>
                        <div class="skill-row">
                            <span class="skill-name">${t('sheet_parry')} (STR)</span>
                            <span class="skill-val">${def.parry.val !== null ? (def.parry.val >= 0 ? '+'+def.parry.val : def.parry.val) : '--'}</span>
                        </div>
                        <div class="skill-row" style="border-bottom:none;">
                            <span class="skill-name">${t('sheet_block')} (CON)</span>
                            <span class="skill-val">${def.block.val !== null ? (def.block.val >= 0 ? '+'+def.block.val : def.block.val) : '--'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- COLUMN 2 -->
            <div class="mgr-col">
                <div>
                    <div class="mgr-header">${t('sheet_attacks')}</div>
                    <div id="combat-attacks-list" class="attack-list">
                        ${CharGen.renderAttackButtons()}
                    </div>
                </div>

                <div>
                    <div class="mgr-header">${t('sheet_skills')}</div>
                    <div class="skills-grid">
                        ${CharGen.renderSkillButtons()}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Bind Attribute Inputs
    container.querySelectorAll('.attr-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const stat = e.target.dataset.stat;
            const val = parseInt(e.target.value) || 0;
            CharGen.char.stats[stat] = val;
            
            CharGen.recalcAll();
            CharGen.renderSheet(CharGen.container);
        });
    });

    // Bind Attack Rolls
    container.querySelectorAll('.attack-card').forEach(btn => {
        btn.addEventListener('click', () => {
            // Placeholder: In future phases this calls the dice roller
            alert(`Attack Roll: ${btn.dataset.name}`);
        });
    });
},

    renderAttackButtons: () => {
        const c = CharGen.char;
        const t = I18n.t;
        
        // 1. Unarmed Strike
        const str = c.stats.STR || 0;
        let html = `
            <div class="attack-card roll-action" data-name="Unarmed">
                <div class="atk-main">
                    <span class="atk-name">${t('wep_unarmed')}</span>
                    <span class="atk-tags">Melee</span>
                </div>
                <div class="atk-roll">
                    <span class="atk-bonus">Atk: ${str >= 0 ? '+' : ''}${str}</span>
                    <span class="atk-dmg">1d4 ${str >= 0 ? '+' : ''}${str}</span>
                </div>
            </div>
        `;

        // 2. Equipped Weapons
        const weapons = c.inventory.filter(i => (i.type === 'Melee' || i.type === 'Ranged') && i.equipped);
        
        weapons.forEach(w => {
            const isFinesse = w.tags && (w.tags.includes("Finesse") || w.tags.includes("Sutil"));
            const isRanged = w.type === 'Ranged' || w.type === 'A Distancia';
            
            // Determine Modifier
            let mod = c.stats.STR || 0;
            if (isRanged) mod = c.stats.DEX || 0;
            else if (isFinesse) mod = Math.max(c.stats.STR || 0, c.stats.DEX || 0);
            
            const sign = mod >= 0 ? '+' : '';
            
            // Translate tags
            const tagStr = w.tags ? w.tags.map(tag => {
                const key = "tag_" + tag.toLowerCase().replace(/ /g, "_");
                return t(key) !== key ? t(key) : tag;
            }).join(', ') : '';

            html += `
                <div class="attack-card roll-action" data-name="${w.name}">
                    <div class="atk-main">
                        <span class="atk-name">${w.name}</span>
                        <span class="atk-tags">${tagStr}</span>
                    </div>
                    <div class="atk-roll">
                        <span class="atk-bonus">Atk ${sign}${mod}</span>
                        <span class="atk-dmg">${w.damage} ${sign}${mod}</span>
                    </div>
                </div>
            `;
        });

        if (weapons.length === 0) {
            html += `<div style="font-size:0.8rem; color:#666; padding:5px; font-style:italic;">Equip weapons in Inventory tab.</div>`;
        }

        return html;
    },

    renderSkillButtons: () => {
        const skills = CharGen.calculateSkills();
        return skills.map(s => {
            const isTrained = s.count > 0;
            // Use CSS classes to color text
            const dieClass = s.die === 'd6' ? 'expert' : (s.die === 'd4' ? 'trained' : '');
            
            return `
                <div class="skill-row">
                    <span class="skill-name" style="${isTrained ? 'color:#eee;' : 'color:#666;'}">${s.name}</span>
                    <span class="skill-die ${dieClass}">${s.die !== '-' ? '+' + s.die : ''}</span>
                </div>
            `;
        }).join('');
    },

    renderTabInventory: (container) => {
        const c = CharGen.char;
        const t = I18n.t;
        const fmt = I18n.fmt;

        // Calculate Slots
        let currentSlots = 0;
        c.inventory.forEach(i => currentSlots += (i.slots || 0));
        currentSlots = Math.round(currentSlots * 100) / 100;
        const maxSlots = c.derived.slots;
        const pct = Math.min(100, (currentSlots / maxSlots) * 100);
        const barColor = currentSlots > maxSlots ? 'var(--accent-crimson)' : 'var(--accent-gold)';

        container.innerHTML = `
            <div class="manager-grid">
                <!-- TOP BAR: WEALTH & CAPACITY -->
                <div style="grid-column: 1 / -1; display:flex; gap:20px; align-items:center; margin-bottom:1rem; background:#111; padding:10px; border:1px solid #333;">
                    <div class="wealth-edit">
                        <label>Gold</label>
                        <input type="number" class="currency-input" data-type="g" value="${c.currency.g}">
                    </div>
                    <div class="wealth-edit">
                        <label>Silver</label>
                        <input type="number" class="currency-input" data-type="s" value="${c.currency.s}">
                    </div>
                    <div class="wealth-edit">
                        <label>Copper</label>
                        <input type="number" class="currency-input" data-type="c" value="${c.currency.c}">
                    </div>
                    
                    <div style="flex-grow:1; margin-left:20px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;">
                            <span>${t('cg_lbl_slots')}</span>
                            <span style="color:${barColor}">${currentSlots} / ${maxSlots}</span>
                        </div>
                        <div class="progress-bar"><div class="fill" style="width:${pct}%; background:${barColor}"></div></div>
                    </div>

                    <button id="btn-open-shop" class="btn-primary" style="font-size:0.9rem;">🛒 ${t('btn_shop')}</button>
                </div>

                <!-- INVENTORY LIST -->
                <div style="grid-column: 1 / -1;">
                    <div class="inv-table-header">
                        <span style="flex:2">${t('inv_header_name')}</span>
                        <span style="width:60px; text-align:center;">${t('inv_header_slots')}</span>
                        <span style="width:100px; text-align:right;">${t('inv_header_actions')}</span>
                    </div>
                    <div id="inv-manager-list">
                        ${c.inventory.length === 0 ? `<div class="text-muted p-2">${t('inv_empty')}</div>` : ''}
                        ${c.inventory.map((item, idx) => CharGen.renderManagerRow(item, idx)).join('')}
                    </div>
                </div>
            </div>
        `;

        // Bind Listeners
        
        // Currency
        container.querySelectorAll('.currency-input').forEach(input => {
            input.addEventListener('change', (e) => {
                c.currency[e.target.dataset.type] = parseInt(e.target.value) || 0;
            });
        });

        // Shop Modal
        document.getElementById('btn-open-shop').onclick = CharGen.openShopModal;

        // Row Actions (Equip/Delete)
        container.querySelectorAll('.action-equip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                CharGen.toggleEquip(e.target.dataset.idx); // Existing logic
                CharGen.renderTabInventory(container); // Re-render to update UI
            });
        });

        container.querySelectorAll('.action-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm(t('btn_confirm') + "?")) {
                    CharGen.removeFromInventory(e.target.dataset.idx); // Existing logic
                    CharGen.renderTabInventory(container);
                }
            });
        });
    },

    renderManagerRow: (item, idx) => {
        const t = I18n.t;
        const isEquipped = item.equipped;
        const isEquipable = (item.type === "Melee" || item.type === "Ranged" || item.type === "Armor" || item.type === "Shield");
        
        return `
            <div class="inv-manager-row ${isEquipped ? 'equipped' : ''}">
                <div style="flex:2; display:flex; flex-direction:column;">
                    <span class="inv-name">${item.name}</span>
                    <span class="inv-meta">${item.type} ${item.damage ? `• ${item.damage}` : ''} ${item.as ? `• AS ${item.as}` : ''}</span>
                </div>
                <div style="width:60px; text-align:center; font-family:var(--font-mono);">${item.slots}</div>
                <div style="width:100px; text-align:right; display:flex; justify-content:flex-end; gap:5px;">
                    ${isEquipable ? 
                        `<button class="btn-icon-small action-equip" data-idx="${idx}" title="${isEquipped ? 'Unequip' : 'Equip'}">
                            ${isEquipped ? '✅' : '🛡️'}
                        </button>` : ''
                    }
                    <button class="btn-icon-small action-delete" data-idx="${idx}" title="${t('btn_delete')}">🗑️</button>
                </div>
            </div>
        `;
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

                <div id="modal-shop-list" class="shop-list" style="flex-grow:1; height:auto;">
                    <!-- Items injected here -->
                </div>

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

        // Logic
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
                    // Refresh main inventory view behind modal
                    const mainContainer = document.getElementById('char-manager-content');
                    if(mainContainer) CharGen.renderTabInventory(mainContainer);
                    
                    // Visual feedback
                    btn.textContent = "✔";
                    setTimeout(() => btn.textContent = "+", 500);
                };
            });
        };

        // Tabs
        overlay.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                overlay.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderList(btn.dataset.tab);
            };
        });

        // Custom Item
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

        // Close
        const close = () => overlay.remove();
        overlay.querySelector('#close-shop').onclick = close;
        overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });

        // Initial Load
        renderList('weapons');
    },

    renderTabFeatures: (container) => {
        container.innerHTML = `<div style="padding:20px; text-align:center;">Features List Coming Soon...</div>`;
    },

    renderTabNotes: async (container) => {
         const c = CharGen.char;
         const t = I18n.t;
         const data = I18n.getData('options');

         // Lookup Names
         const archA = data.archetypes.find(a => a.id === c.archA)?.name || "Archetype A";
         const archB = data.archetypes.find(a => a.id === c.archB)?.name || "Archetype B";
         
         let src = c.imageUrl;
         if (c.imageId) {
            const { ImageStore } = await import('../utils/image_store.js');
            src = await ImageStore.getUrl(c.imageId);
         }
         const placeholderImg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23333'%3E%3Ctext x='50' y='50' font-size='40' text-anchor='middle' dy='.3em' fill='%23555'%3E👤%3C/text%3E%3C/svg%3E`;

         container.innerHTML = `
            <div class="manager-grid">
                <div class="mgr-col">
                    <div class="bio-card">
                        <div class="bio-portrait">
                            <img src="${src || placeholderImg}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">
                        </div>
                        <div class="bio-details">
                            <label>${t('cg_lbl_class')}</label>
                            <div class="bio-val">${c.className} (${archA} + ${archB})</div>
                            
                            <label style="margin-top:10px;">${t('cg_lbl_ancestry')}</label>
                            <div class="bio-val">${c.ancestryChoice || '-'}</div>

                            <label style="margin-top:10px;">${t('cg_lbl_background')}</label>
                            <div class="bio-val">${c.background || '-'}</div>
                        </div>
                    </div>
                </div>
                <div class="mgr-col">
                    <h4 class="mgr-header">${t('sheet_notes')}</h4>
                    <textarea id="live-notes" class="editor-textarea" style="height:400px; font-size:1rem; background:#222; border:1px solid #444; color:#eee; padding:10px; width:100%; resize:none;">${c.notes || ''}</textarea>
                </div>
            </div>
         `;
         
         container.querySelector('#live-notes').addEventListener('input', (e) => {
             c.notes = e.target.value;
         });
    },

    renderPrintVersion: (container) => {
        const c = CharGen.char;
        const t = I18n.t;
        const fmt = I18n.fmt;
        const s = c.stats;

        // Ensure fresh math
        const armorScore = CharGen.calculateArmorScore();
        const def = c.defenses;
        const skills = CharGen.calculateSkills();
        
        // Helper: Format Attacks
        const weapons = c.inventory.filter(i => (i.type === 'Melee' || i.type === 'Ranged') && i.equipped);
        const attackRows = weapons.map(w => {
            const isFinesse = w.tags && (w.tags.includes("Finesse") || w.tags.includes("Sutil"));
            const isRanged = w.type === 'Ranged' || w.type === 'A Distancia';
            let mod = s.STR || 0;
            if (isRanged) mod = s.DEX || 0;
            else if (isFinesse) mod = Math.max(s.STR || 0, s.DEX || 0);
            const sign = mod >= 0 ? '+' : '';
            return `<tr><td>${w.name}</td><td>${sign}${mod}</td><td>${w.damage} ${sign}${mod}</td><td style="font-size:0.7em">${w.tags || '-'}</td></tr>`;
        }).join('');

        // Helper: Format Inventory
        const inventoryRows = c.inventory.map(i => `
            <div class="p-inv-item">
                <span>${i.equipped ? '★ ' : ''}${i.name}</span>
                <span>${i.slots || 0}</span>
            </div>
        `).join('');

        // Helper: Format Talents
        const renderFeat = (f) => `
            <div class="p-feat-card">
                <span class="p-feat-name">${f.name}</span>
                <div>${f.effect}</div>
            </div>
        `;
        const featsHTML = c.talents.map(renderFeat).join('');

        // HTML TEMPLATE
        container.innerHTML = `
            <!-- PAGE 1 -->
            <div class="print-page" id="p1">
                
                <!-- IDENTITY -->
                <div class="p-identity">
                    <div class="p-id-field"><span class="p-id-label">${t('lbl_name')}</span><span class="p-id-val">${c.name}</span></div>
                    <div class="p-id-field"><span class="p-id-label">Class</span><span class="p-id-val">${c.className}</span></div>
                    <div class="p-id-field"><span class="p-id-label">${t('lbl_level')}</span><span class="p-id-val">${c.level}</span></div>
                    <div class="p-id-field"><span class="p-id-label">XP</span><span class="p-id-val">${c.current.xp}/10</span></div>
                </div>

                <!-- ATTRIBUTES -->
                <div class="p-attributes">
                    <div class="p-attr-cell"><span class="p-attr-name">${t('stat_str')}</span><span class="p-attr-val">${s.STR}</span></div>
                    <div class="p-attr-cell"><span class="p-attr-name">${t('stat_dex')}</span><span class="p-attr-val">${s.DEX}</span></div>
                    <div class="p-attr-cell"><span class="p-attr-name">${t('stat_con')}</span><span class="p-attr-val">${s.CON}</span></div>
                    <div class="p-attr-cell"><span class="p-attr-name">${t('stat_int')}</span><span class="p-attr-val">${s.INT}</span></div>
                    <div class="p-attr-cell"><span class="p-attr-name">${t('stat_wis')}</span><span class="p-attr-val">${s.WIS}</span></div>
                    <div class="p-attr-cell"><span class="p-attr-name">${t('stat_cha')}</span><span class="p-attr-val">${s.CHA}</span></div>
                </div>

                <!-- MAIN GRID -->
                <div class="p-grid-main">
                    
                    <!-- LEFT COL -->
                    <div class="p-col-left">
                        
                        <div class="p-box">
                            <div class="p-header">${t('sheet_def')}</div>
                            <div class="p-defense-grid">
                                <div class="p-ac-large">${armorScore} <span style="font-size:0.4em; display:block; font-weight:normal;">ARMOR</span></div>
                                <div><small>${t('sheet_dodge')}</small><br><strong>${def.dodge.val} (${def.dodge.die})</strong></div>
                                <div><small>${t('sheet_parry')}</small><br><strong>${def.parry.val!==null ? def.parry.val : '-'}</strong></div>
                                <div><small>${t('sheet_block')}</small><br><strong>${def.block.val!==null ? def.block.val : '-'}</strong></div>
                            </div>
                        </div>

                        <div style="margin-top:10px;">
                            <strong>${t('sheet_skills')}</strong>
                            <table class="p-table">
                                ${skills.map(sk => `<tr><td>${sk.name}</td><td class="die">${sk.die !== '-' ? '+'+sk.die : ''}</td></tr>`).join('')}
                            </table>
                        </div>

                    </div>

                    <!-- RIGHT COL -->
                    <div class="p-col-right">
                        
                        <!-- VITALS -->
                        <div class="p-vitals">
                            <div class="p-vital-box"><h4>${t('sheet_hp')}</h4><span class="p-vital-val">${c.derived.maxHP}</span></div>
                            <div class="p-vital-box"><h4>${t('sheet_sta')}</h4><span class="p-vital-val">${c.derived.maxSTA}</span></div>
                            <div class="p-vital-box"><h4>${t('sheet_mp')}</h4><span class="p-vital-val">${c.derived.maxMP}</span></div>
                            <div class="p-vital-box"><h4>${t('sheet_luck')}</h4><span class="p-vital-val">${c.derived.maxLuck}</span></div>
                        </div>

                        <!-- ATTACKS -->
                        <div class="p-box">
                            <div class="p-header">${t('sheet_attacks')}</div>
                            <table class="p-table">
                                <tr>
                                    <th>Name</th><th>Atk</th><th>Dmg</th><th>Tags</th>
                                </tr>
                                <tr>
                                    <td>${t('wep_unarmed')}</td>
                                    <td>${(s.STR >= 0 ? '+' : '')}${s.STR}</td>
                                    <td>1d4 ${(s.STR >= 0 ? '+' : '')}${s.STR}</td>
                                    <td>-</td>
                                </tr>
                                ${attackRows}
                            </table>
                        </div>
                        
                        <div class="p-box" style="margin-top:15px; height:200px;">
                             <div class="p-header">${t('sheet_notes')}</div>
                             <div style="font-size:0.8em; white-space: pre-wrap;">${c.notes}</div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- PAGE 2 -->
            <div class="print-page" id="p2">
                <div class="p-header">${t('sheet_inv')} & ${t('sheet_features')}</div>
                
                <div class="p-grid-main">
                    <!-- INVENTORY -->
                    <div class="p-col-left">
                        <div style="border-bottom:1px solid black; margin-bottom:5px;">
                            <strong>Wealth:</strong> ${c.currency.g}g ${c.currency.s}s ${c.currency.c}c
                        </div>
                        <div class="p-inv-list">
                            ${inventoryRows}
                        </div>
                    </div>

                    <!-- FEATURES -->
                    <div class="p-col-right">
                        <div class="p-features-grid">
                            ${featsHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachManagerListeners: () => {
        // 1. HUD Listeners (Name, Level, Vitals)
        // Helper to bind inputs to state paths
        const bind = (selector, type) => {
            document.querySelectorAll(selector).forEach(el => {
                el.addEventListener('change', (e) => {
                    let val = e.target.value;
                    // Convert to number if it's not the name field
                    if (type !== 'name') val = parseInt(val) || 0;

                    if (type === 'name') CharGen.char.name = val;
                    if (type === 'level') CharGen.char.level = val;
                    
                    // Vitals Logic
                    if (el.dataset.vital) {
                        const key = el.dataset.vital;
                        
                        // Handle Current Values (hp, mp, sta, luck)
                        if (['hp', 'mp', 'sta', 'luck'].includes(key)) {
                            CharGen.char.current[key] = val;
                        }
                        
                        // Handle Max Values (Manual Overrides for "God Mode")
                        // If Max changes, we must re-render the HUD to update progress bar widths
                        if (['maxHP', 'maxMP', 'maxSTA', 'maxLuck'].includes(key)) {
                            CharGen.char.derived[key] = val;
                            
                            const newHUD = CharGen.renderHUD();
                            const oldHUD = document.querySelector('.char-hud');
                            if (oldHUD) {
                                oldHUD.replaceWith(newHUD);
                                CharGen.attachManagerListeners(); // Re-attach listeners to new DOM elements
                            }
                            return; // Stop execution here to avoid redundant binding
                        }
                    }
                });
            });
        };
        
        bind('.edit-transparent', 'name');
        bind('.edit-tiny', 'level');
        bind('.edit-vital', 'vital');
        bind('.edit-vital-max', 'vital');

        // 2. Toolbar Actions
        const btnSave = document.getElementById('btn-save-trigger');
        if (btnSave) {
            btnSave.onclick = () => {
                CharGen.saveCharacter();
                // Simple visual feedback
                const originalHTML = btnSave.innerHTML;
                btnSave.innerHTML = "✅";
                setTimeout(() => btnSave.innerHTML = originalHTML, 1000);
            };
        }

        const btnPrint = document.getElementById('btn-print-trigger');
        if (btnPrint) {
            btnPrint.onclick = () => {
                // Critical: Update the hidden print view with latest data before printing
                // This ensures any manual edits made in the HUD appear on the PDF
                const printArea = document.getElementById('print-sheet-root');
                if (printArea) CharGen.renderPrintVersion(printArea);
                
                window.print();
            };
        }
    },

    _renderWeaponRow: (w, stats) => {
        const t = I18n.t;
        const isFinesse = (w.tags && w.tags.includes("Finesse")) || w.type === 'Ranged';
        const isRanged = w.type === 'Ranged' || w.type === 'A Distancia';
        let atkMod = stats.STR || 0;
        
        if (isRanged) atkMod = stats.DEX || 0;
        else if (isFinesse) atkMod = Math.max(stats.STR || 0, stats.DEX || 0);
        
        const sign = atkMod >= 0 ? '+' : '';
        
        // Translate Tags
        const translatedTags = w.tags ? w.tags.map(tag => {
            const key = "tag_" + tag.toLowerCase().replace(/ /g, "_").replace(/-/g, "_");
            return t(key) !== key ? t(key) : tag;
        }).join(', ') : '';

        return `<tr>
            <td>${w.name}</td>
            <td>${sign}${atkMod}</td>
            <td>${w.damage} ${sign}${atkMod}</td>
            <td class="tags">${translatedTags}</td>
        </tr>`;
    },

    /**
     * Attaches listeners to the interactive elements of the Character Sheet.
     * Robust checks ensure this works in both Wizard and Play modes.
     */
    _attachSheetListeners: () => {
        // 1. Live Resource Tracking (HP, MP, STA, Luck, XP)
        const bindInput = (id, key) => {
            const el = document.getElementById(id);
            if (el) {
                // Remove old listeners to prevent duplicates if re-rendered
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                
                newEl.addEventListener('change', (e) => {
                    const val = parseInt(e.target.value) || 0;
                    CharGen.char.current[key] = val;
                    console.log(`Updated ${key} to ${val}`);
                });
            }
        };

        bindInput('inp-hp', 'hp');
        bindInput('inp-mp', 'mp');
        bindInput('inp-sta', 'sta');
        bindInput('inp-luck', 'luck');
        bindInput('inp-xp', 'xp');

        // 2. Notes Field
        const notesEl = document.getElementById('inp-notes');
        if (notesEl) {
            // Clone to clear old listeners
            const newNotes = notesEl.cloneNode(true);
            notesEl.parentNode.replaceChild(newNotes, notesEl);
            
            newNotes.addEventListener('input', (e) => {
                CharGen.char.notes = e.target.value;
            });
            // Restore cursor position if needed? Input event usually keeps focus. 
            // Actually, simpler logic is just setting on change to avoid lag.
            newNotes.addEventListener('change', (e) => {
                 CharGen.char.notes = e.target.value;
            });
        }

        // 3. Action Buttons (Wizard Mode Only)
        // These might be hidden via CSS in Play Mode, but we attach safely anyway.
        
        const btnSave = document.getElementById('btn-save-lib');
        if (btnSave) {
            btnSave.onclick = CharGen.saveCharacter;
        }

        const btnPrint = document.getElementById('btn-print-pdf');
        if (btnPrint) {
            btnPrint.onclick = () => window.print();
        }
        
        const btnLvl = document.getElementById('btn-levelup');
        if (btnLvl) {
            if (CharGen.char.level >= 10) { 
                btnLvl.disabled = true; 
                btnLvl.textContent = "Max Level"; 
            } else {
                btnLvl.onclick = CharGen.initLevelUp;
            }
        }
    },

    _getToolProfs: (char, bg) => {
        const tools = [];
        // Extract from Talents
        char.talents.forEach(t => {
            if (t.tags && (t.tags.includes("Kit") || t.tags.includes("Crafting"))) {
                if(t.name.startsWith("Kit:")) tools.push(t.name.replace("Kit: ", ""));
                else if(t.name === "Poisoner") tools.push("Poisoner's Kit");
                else if(t.name === "Saboteur") tools.push("Thieves' Tools");
                else if(t.name === "Master Trapper") tools.push("Thieves' Tools");
                else if(t.name === "Master Herbalist") tools.push("Herbalism Kit");
            }
        });
        // Extract from Background
        if (bg.skill && bg.skill.includes("Proficiency")) {
            tools.push(bg.skill.replace(" Proficiency", ""));
        }
        return [...new Set(tools)]; // Unique
    },

    _loadPortrait: async () => {
        const imgEl = document.getElementById('char-portrait-img');
        if (!imgEl) return;
        
        // 1. Check for URL
        if (CharGen.char.imageUrl) {
            imgEl.src = CharGen.char.imageUrl;
            return;
        }

        // 2. Check for IndexedDB Blob
        if (CharGen.char.imageId) {
            // Dynamic import to avoid dependency issues if not loaded
            const { ImageStore } = await import('../utils/image_store.js');
            const url = await ImageStore.getUrl(CharGen.char.imageId);
            if (url) imgEl.src = url;
        }
    },

    // Save Handler definition remains part of the object
    saveCharacter: () => {
        // Ensure Storage is imported at the top of the file
        // import { Storage } from '../utils/storage.js';
        
        try {
            const id = Storage.saveCharacter(CharGen.char);
            CharGen.char.id = id; // Update state with new ID
            alert(`Character "${CharGen.char.name}" saved to Library!`);
        } catch (e) {
            console.error("Save failed:", e);
            alert("Failed to save character. See console.");
        }
    },

    calculateDefenses: () => {
        const c = CharGen.char;
        const s = c.stats;
        
        // Default to 0 if stats aren't assigned yet
        const str = s.STR || 0;
        const dex = s.DEX || 0;
        const con = s.CON || 0;

        // --- 1. DODGE (DEX) ---
        let dodgeVal = dex;
        let dodgeDie = "-"; 
        
        // Check for Training (e.g. Uncanny Dodge)
        let dodgeRank = 0;
        c.talents.forEach(t => {
            // Check for proficiency training
            if (t.modifiers && t.modifiers.defense_train === "dodge") dodgeRank++;
            // Check for flat bonuses (e.g. Evasive)
            if (t.modifiers && t.modifiers.defense_bonus_dodge) dodgeVal += t.modifiers.defense_bonus_dodge;
        });
        
        // Determine Die based on Rank
        if (dodgeRank === 1) dodgeDie = "1d4";
        if (dodgeRank >= 2) dodgeDie = "1d6";

        // --- 2. PARRY (STR or DEX) ---
        // Requirement: Must wield a Melee Weapon
        const hasWeapon = c.inventory.some(i => i.type === "Melee");
        
        let parryVal = null;
        let parryDie = "-";

        if (hasWeapon) {
            parryVal = Math.max(str, dex);
            
            // Weapon Tags (e.g. "Guard" property)
            const hasGuardWeapon = c.inventory.some(i => i.tags && i.tags.includes("Guard"));
            if (hasGuardWeapon) parryVal += 1;
            
            // Talents
            c.talents.forEach(t => {
                if (t.modifiers && t.modifiers.defense_bonus_parry) parryVal += t.modifiers.defense_bonus_parry;
            });
        }

        // --- 3. BLOCK (CON) ---
        // Requirement: Must wield a Shield
        const hasShield = c.inventory.some(i => i.name.includes("Shield"));
        
        let blockVal = null;
        let blockDie = "-";
        
        if (hasShield) {
            blockVal = con;
            // Guardian Talents (e.g. Shield Master)
            c.talents.forEach(t => {
                if (t.modifiers && t.modifiers.defense_bonus_block) blockVal += t.modifiers.defense_bonus_block;
                // Some talents might add dice to block, logic can be added here similar to dodge
            });
        }

        // Save to State
        c.defenses = {
            dodge: { val: dodgeVal, die: dodgeDie },
            parry: { val: parryVal, die: parryDie },
            block: { val: blockVal, die: blockDie }
        };
    },

    calculateArmorScore: () => {
        const c = CharGen.char;
        const data = I18n.getData('options');
        
        let wornArmorAS = 0;
        let shieldBonus = 0;
        let naturalArmor = 0;
        let flatBonus = 0;

        // 1. Inventory Check
        c.inventory.forEach(i => {
            if (!i.equipped) return;

            if (i.type === "Shield") {
                shieldBonus = Math.max(shieldBonus, i.as || 1);
            } else if (i.type === "Armor") {
                wornArmorAS = Math.max(wornArmorAS, i.as || 0);
            }
        });

        // 2. Talents & Feats
        let unarmoredDef = false;
        let towerShield = false;

        const checkMods = (mods) => {
            if (!mods) return;
            if (mods.as_bonus) flatBonus += mods.as_bonus;
            if (mods.natural_armor) naturalArmor = Math.max(naturalArmor, mods.natural_armor);
        };

        // Ancestry
        if (c.ancestry) {
            const anc = data.ancestries.find(a => a.id === c.ancestry);
            if (anc && anc.feats[c.ancestryFeatIndex]) checkMods(anc.feats[c.ancestryFeatIndex].modifiers);
        }

        // Talents
        c.talents.forEach(t => {
            if (t.modifiers) checkMods(t.modifiers);
            if (t.name === "Unarmored Defense") unarmoredDef = true;
            if (t.name === "Tower Shield Training") towerShield = true;
        });

        // Synergy
        if (c.classId) {
            const cls = data.classes.find(cl => cl.id === c.classId);
            if (cls) {
                cls.synergy_feats.filter(f => f.level <= c.level).forEach(f => {
                    if (f.modifiers) checkMods(f.modifiers);
                });
            }
        }

        // 3. Resolve
        if (towerShield && shieldBonus > 0) shieldBonus = 2;

        let base = 0;
        if (wornArmorAS > 0) {
            base = wornArmorAS;
        } else {
            // Unarmored logic
            if (unarmoredDef) {
                const dex = c.stats.DEX || 0;
                base = Math.max(0, dex);
                if (naturalArmor > base) base = naturalArmor; // Take better of Natural or DEX
            } else {
                base = naturalArmor;
            }
        }
        
        // Final Total
        return base + shieldBonus + flatBonus;
    },

    /* ------------------------------------------------------------------
       LOGIC: SKILL CALCULATION
       ------------------------------------------------------------------ */
    
    calculateSkills: () => {
        const data = I18n.getData('options');
        const c = CharGen.char;
        const t = I18n.t; // Localization
        const skillCounts = {}; 

        const add = (id) => {
            if (!id) return;
            skillCounts[id] = (skillCounts[id] || 0) + 1;
        };

        const mapStringToId = (str) => {
            if (!str) return null;
            const s = str.toLowerCase();
            if (s.includes("athletics") || s.includes("atletismo")) return "athletics";
            if (s.includes("acrobatics") || s.includes("acrobacias")) return "acrobatics";
            if (s.includes("stealth") || s.includes("sigilo")) return "stealth";
            if (s.includes("craft") || s.includes("artesanía")) return "craft";
            if (s.includes("lore") || s.includes("saber")) return "lore";
            if (s.includes("investigate") || s.includes("investigar")) return "investigate";
            if (s.includes("scrutiny") || s.includes("escrutinio")) return "scrutiny";
            if (s.includes("survival") || s.includes("supervivencia")) return "survival";
            if (s.includes("medicine") || s.includes("medicina")) return "medicine";
            if (s.includes("influence") || s.includes("influencia")) return "influence";
            if (s.includes("deception") || s.includes("engaño")) return "deception";
            if (s.includes("intimidat")) return "intimidation";
            return null;
        };

        // 1. Ancestry Skills
        if (c.ancestry && c.ancestryFeatIndex !== null) {
            const anc = data.ancestries.find(a => a.id === c.ancestry);
            const feat = anc.feats[c.ancestryFeatIndex];
            if (feat && feat.modifiers) {
                if (feat.modifiers.skill_train) add(feat.modifiers.skill_train);
                if (feat.modifiers.select_skill && c.ancestrySkill) add(c.ancestrySkill);
            }
        }

        // 2. Background Skills
        if (c.background) {
            const bg = data.backgrounds.find(b => b.id === c.background);
            if (bg && bg.skill) add(mapStringToId(bg.skill));
        }

        // 3. Archetype Base Skills
        if (c.archA) {
            const arch = data.archetypes.find(a => a.id === c.archA);
            if (arch && arch.proficiencies && arch.proficiencies.skills) {
                arch.proficiencies.skills.forEach(s => add(mapStringToId(s)));
            }
        }
        if (c.archB) {
            const arch = data.archetypes.find(a => a.id === c.archB);
            if (arch && arch.proficiencies && arch.proficiencies.skills) {
                arch.proficiencies.skills.forEach(s => add(mapStringToId(s)));
            }
        }

        // 4. Talent Choices
        c.talents.forEach(t => {
            if (t.flags && t.flags.select_skill && t.choice) {
                add(t.choice);
            }
            if (t.modifiers && t.modifiers.skill_train) {
                add(t.modifiers.skill_train);
            }
        });

        // 5. Build Localized List
        // We define the list here to ensure the ORDER is consistent
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

        // Map over the list and apply localization
        return fullList.map(sk => {
            const count = skillCounts[sk.id] || 0;
            let die = "-";
            if (count === 1) die = "d4"; // Trained
            if (count >= 2) die = "d6";  // Expert
            
            // Localize Name and Stat
            // Note: We use the IDs (e.g. 'athletics') to fetch the localized key if I added it to UI_Dictionary
            // Since I didn't explicitly add skill names in the previous step, I will map them to the stat keys or raw values
            // Ideally, update i18n with specific skill keys later.
            // For now, I will capitalize and return the English ID or a simple map
            
            const localizedName = {
                "athletics": "Athletics / Atletismo",
                "acrobatics": "Acrobatics / Acrobacias",
                "stealth": "Stealth / Sigilo",
                "craft": "Craft / Artesanía",
                "lore": "Lore / Saber",
                "investigate": "Investigate / Investigar",
                "scrutiny": "Scrutiny / Escrutinio",
                "survival": "Survival / Supervivencia",
                "medicine": "Medicine / Medicina",
                "influence": "Influence / Influencia",
                "deception": "Deception / Engaño",
                "intimidation": "Intimidation / Intimidación"
            }[sk.id];

            // Localize Stat (STR -> FUE)
            const localizedStat = t(`stat_${sk.stat.toLowerCase()}`);

            return {
                id: sk.id,
                name: localizedName, 
                stat: localizedStat,
                count: count,
                die: die
            };
        });
    },
    
    /* ------------------------------------------------------------------
       LOGIC: LEVEL UP SYSTEM
       ------------------------------------------------------------------ */

    // Temporary state for the leveling process
    levelState: {
        newHP: 0,
        selectedTalent: null,
        selectedStat: null,
        hitDie: 8
    },

    initLevelUp: () => {
        const c = CharGen.char;
        const nextLevel = c.level + 1;
        
        // Determine Hit Die based on Class Logic
        const data = I18n.getData('options');
        const archA = data.archetypes.find(a => a.id === c.archA);
        const archB = data.archetypes.find(a => a.id === c.archB);
        
        let hitDie = 8; // Default (Hybrid)
        if (archA.role === archB.role) {
            if (archA.role === 'Warrior') hitDie = 10;
            if (archA.role === 'Spellcaster') hitDie = 6;
        }
        
        CharGen.levelState = {
            newHP: 0,
            selectedTalent: null,
            selectedStat: null,
            hitDie: hitDie
        };

        CharGen.renderLevelUpModal(nextLevel);
    },

    renderLevelUpModal: (nextLevel) => {
        const c = CharGen.char;
        const state = CharGen.levelState;
        
        // 1. Create Overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        // 2. Build Content
        let html = `
            <div class="modal-content">
                <div class="modal-header">Level Up: ${c.level} ➜ ${nextLevel}</div>
                
                <!-- STEP 1: HP -->
                <div class="levelup-step">
                    <h4>1. Increase Hit Points (Hit Die: d${state.hitDie})</h4>
                    <div class="hp-roll-container">
                        <button id="btn-roll-hp" class="roll-btn">🎲 Roll HP</button>
                        <div id="hp-result" style="font-family:var(--font-mono); font-size:1.2rem;">--</div>
                    </div>
                    <p class="text-muted" style="font-size:0.8rem;">Roll d${state.hitDie} + CON Mod (${c.stats.CON}). Min 1.</p>
                </div>

                <!-- STEP 2: TALENT -->
                <div class="levelup-step">
                    <h4>2. Choose New Talent</h4>
                    <select id="sel-new-talent" style="width:100%; padding:8px;">
                        <option value="">-- Select a Talent --</option>
                        ${CharGen.getValidTalentOptions().map((t, idx) => 
                            `<option value="${idx}">${t.name} [${t.sourceName}] (${t.cost})</option>`
                        ).join('')}
                    </select>
                    <div id="new-talent-desc" style="margin-top:5px; font-size:0.85rem; color:#ccc; min-height:40px; background:rgba(0,0,0,0.2); padding:5px;"></div>
                </div>

                <!-- STEP 3: SYNERGY/STAT (Levels 5 & 10) -->
                ${ (nextLevel === 5 || nextLevel === 10) ? `
                    <div class="levelup-step">
                        <h4>3. Milestone Bonus</h4>
                        <p style="color:var(--accent-gold);">You gain a <strong>Synergy Feat</strong> automatically!</p>
                        <label>Select Attribute Boost (+1):</label>
                        <div class="stat-grid" style="grid-template-columns: repeat(3, 1fr); gap:5px; margin-top:5px;">
                            ${['STR','DEX','CON','INT','WIS','CHA'].map(s => 
                                `<button class="stat-boost-btn" data-stat="${s}">${s}</button>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:2rem;">
                    <button id="btn-cancel-lvl" class="btn-secondary">Cancel</button>
                    <button id="btn-confirm-lvl" class="btn-primary" disabled>Confirm Level Up</button>
                </div>
            </div>
        `;

        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        // --- HELPER: Check Readiness ---
        // Defined before listeners to avoid ReferenceError
        const checkReady = () => {
            const confirmBtn = document.getElementById('btn-confirm-lvl');
            if (!confirmBtn) return;

            let ready = state.newHP > 0 && state.selectedTalent !== null;
            
            // Milestone Check
            if (nextLevel === 5 || nextLevel === 10) {
                if (!state.selectedStat) ready = false;
            }
            
            confirmBtn.disabled = !ready;
        };

        // --- LISTENERS ---

        // HP Roll
        const btnRollHP = document.getElementById('btn-roll-hp');
        btnRollHP.onclick = () => {
            const roll = Math.floor(Math.random() * state.hitDie) + 1;
            const conMod = c.stats.CON || 0;
            const total = Math.max(1, roll + conMod);
            
            state.newHP = total;
            document.getElementById('hp-result').textContent = `${roll} (Roll) + ${conMod} (CON) = +${total} HP`;
            btnRollHP.disabled = true; 
            checkReady();
        };

        // Talent Select
        const talentSel = document.getElementById('sel-new-talent');
        const talentDesc = document.getElementById('new-talent-desc');
        const validTalents = CharGen.getValidTalentOptions();

        talentSel.onchange = (e) => {
            const idx = e.target.value;
            if (idx !== "") {
                const t = validTalents[idx];
                state.selectedTalent = t;
                talentDesc.textContent = `${t.type} • ${t.effect}`;
            } else {
                state.selectedTalent = null;
                talentDesc.textContent = "";
            }
            checkReady();
        };

        // Stat Boost (Level 5/10)
        if (nextLevel === 5 || nextLevel === 10) {
            const statBtns = document.querySelectorAll('.stat-boost-btn');
            statBtns.forEach(btn => {
                btn.onclick = (e) => {
                    statBtns.forEach(b => b.classList.remove('selected'));
                    e.target.classList.add('selected');
                    state.selectedStat = e.target.dataset.stat;
                    checkReady();
                };
            });
        }

        // Close / Confirm
        document.getElementById('btn-cancel-lvl').onclick = () => document.body.removeChild(overlay);
        
        const confirmBtn = document.getElementById('btn-confirm-lvl');
        confirmBtn.onclick = () => {
            CharGen.applyLevelUp(nextLevel);
            document.body.removeChild(overlay);
        };
    },

    /* --- NEW HELPER: CHECK REQUIREMENTS --- */
    checkRequirements: (item) => {
        if (!item.req) return { pass: true };

        const stats = CharGen.char.stats;
        const requirements = item.req.split(',').map(s => s.trim());
        let errorMsg = "";

        for (let r of requirements) {
            // Parse "STR +2" or "CON 13" (if using scores)
            // Our system uses Modifiers (-2 to +5)
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

    /**
     * Generates a list of purchasable talents based on Archetypes.
     * Filters out non-repeatable talents that are already known.
     */
    getValidTalentOptions: () => {
        const c = CharGen.char;
        const data = I18n.getData('options');
        const archA = data.archetypes.find(a => a.id === c.archA);
        const archB = data.archetypes.find(a => a.id === c.archB);

        let pool = [];
        
        // Helper to tag source
        const process = (arch) => {
            arch.talents.forEach(t => {
                // Check if we already have it
                const alreadyHas = c.talents.some(known => known.name === t.name);
                
                // Check if Repeatable
                const isRepeatable = t.flags && t.flags.repeatable;

                // Add if (Not Owned) OR (Owned AND Repeatable)
                if (!alreadyHas || isRepeatable) {
                    pool.push({ ...t, sourceName: arch.name });
                }
            });
        };

        process(archA);
        // Only process ArchB if different (Hybrid) to avoid duplicates in pool
        if (archA.id !== archB.id) process(archB);

        return pool;
    },

    /**
     * Commits the changes to the character object
     */
    applyLevelUp: (newLevel) => {
        const c = CharGen.char;
        const state = CharGen.levelState;
        const data = I18n.getData('options');

        // Snapshot previous Maximums to calculate gains later
        const prevMaxHP = c.derived.maxHP;
        const prevMaxMP = c.derived.maxMP;
        const prevMaxLuck = c.derived.maxLuck;

        // 1. Commit Basic Changes
        c.level = newLevel;
        
        // Add the NEW roll to the BASE HP (not the derived max)
        // This prevents double-counting modifiers like "Toughness"
        c.baseHP += state.newHP; 

        // 2. Add Talent
        if (state.selectedTalent) {
            const t = state.selectedTalent;
            // Handle Choice Modal for special talents
            if (t.flags && (t.flags.select_mod || t.flags.select_skill || t.flags.select_property)) {
                let arch = data.archetypes.find(a => a.name === t.sourceName);
                if (!arch) arch = data.archetypes.find(a => a.id === c.archA);
                setTimeout(() => {
                   CharGen.renderChoiceModal(t, arch.id, 0, 'levelup-context');
                }, 200); 
            } else {
                c.talents.push(t);
            }
        }

        // 3. Apply Milestones (Stat Boosts)
        if (newLevel === 5 || newLevel === 10) {
            if (state.selectedStat) {
                c.stats[state.selectedStat] += 1;
            }
        }

        // 4. Recalculate Derived Stats
        // This updates c.derived.maxHP/MP/STA based on new Level and new Stats
        CharGen.calculateDerived();
        CharGen.calculateDefenses();

        // 5. Update Current Values (Heal the difference)
        // If Max HP went up by 8, Current HP goes up by 8.
        const hpGain = c.derived.maxHP - prevMaxHP;
        const mpGain = c.derived.maxMP - prevMaxMP;
        const luckGain = c.derived.maxLuck - prevMaxLuck;

        if (hpGain > 0) c.current.hp += hpGain;
        if (mpGain > 0) c.current.mp += mpGain;
        if (luckGain > 0) c.current.luck += luckGain;
        
        // Refresh STA (usually full refresh on level up logic, or just match cap increase)
        // Let's refill STA completely on level up as a reward
        c.current.sta = c.derived.maxSTA;

        // 6. Refresh UI
        if (!state.selectedTalent || !(state.selectedTalent.flags && (state.selectedTalent.flags.select_mod || state.selectedTalent.flags.select_skill || state.selectedTalent.flags.select_property))) {
            CharGen.renderSheet(CharGen.container);
            alert(`Level Up Complete! You are now Level ${newLevel}.\nHP Increased by ${hpGain}.`);
        }
    },

};














