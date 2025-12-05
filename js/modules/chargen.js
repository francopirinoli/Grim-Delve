import { I18n } from '../utils/i18n.js';
import { Dice } from '../utils/dice.js';
import { Storage } from '../utils/storage.js';

export const CharGen = {

    /**
     * Load an existing character object into the editor
     */
    loadCharacter: (savedChar) => {
        CharGen.char = JSON.parse(JSON.stringify(savedChar)); // Deep copy
        CharGen.currentStep = 5; // Jump to Final Sheet
        // Note: If you want to edit stats/bio, the logic supports it because
        // the state is loaded.
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
        // Only reset if starting fresh, otherwise keep state for navigation
        if (!CharGen.char.name && !CharGen.char.ancestry) {
            CharGen.resetChar();
        }
        CharGen.currentStep = 1;
        CharGen.renderShell();
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
        const html = `
            <div class="chargen-layout">
                <!-- Progress Sidebar -->
                <div class="chargen-sidebar">
                    <h3>${I18n.t('nav_chargen')}</h3>
                    <ul class="step-list">
                        <li class="step-item active" data-step="1">1. Origins</li>
                        <li class="step-item" data-step="2">2. Class</li>
                        <li class="step-item" data-step="3">3. Attributes</li>
                        <li class="step-item" data-step="4">4. Gear</li>
                        <li class="step-item" data-step="5">5. Final Sheet</li>
                    </ul>
                </div>

                <!-- Main Input Area -->
                <div class="chargen-content">
                    <div id="step-container"></div>
                    
                    <div class="chargen-footer">
                        <button id="btn-prev" class="btn-secondary" disabled>Back</button>
                        <button id="btn-next" class="btn-primary">Next</button>
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
     * Renders the specific content for the current step
     */
    renderStep: () => {
        const container = document.getElementById('step-container');
        container.innerHTML = ''; // Clear previous content

        // Visual Update of Sidebar
        document.querySelectorAll('.step-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.step) === CharGen.currentStep);
        });

        // Button State Management
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if (prevBtn && nextBtn) {
            prevBtn.disabled = (CharGen.currentStep === 1);
            // FIX: Always reset Next button to Enabled by default.
            // Specific steps (like Step 3) can disable it again in their render function if conditions aren't met.
            nextBtn.disabled = false; 
            nextBtn.textContent = (CharGen.currentStep === 5) ? "Finish" : "Next";
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

        // Step 2 Validation (Class & Talents)
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
        if (!data) {
            el.innerHTML = '<p>Error: Data not loaded.</p>';
            return;
        }

        const allSkills = [
            {id: "athletics", name: "Athletics (STR)"},
            {id: "acrobatics", name: "Acrobatics (DEX)"},
            {id: "stealth", name: "Stealth & Thievery (DEX)"},
            {id: "craft", name: "Craft & Tinker (INT)"},
            {id: "lore", name: "Lore & Knowledge (INT)"},
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
                    <div class="form-group">
                        <label class="form-label">Character Name</label>
                        <input type="text" id="char-name" value="${CharGen.char.name}" placeholder="Enter name...">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Ancestry</label>
                        <select id="sel-ancestry">
                            <option value="">-- Select Ancestry --</option>
                            ${data.ancestries.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Dynamic Feat Selector -->
                    <div class="form-group" id="feat-group" style="display:none; border-left: 2px solid var(--accent-blue); padding-left: 10px;">
                        <label class="form-label">Ancestry Feat</label>
                        <select id="sel-anc-feat">
                            <option value="">-- Choose One --</option>
                        </select>
                        <div id="feat-desc-tiny" style="font-size:0.8rem; color:#888; margin-top:5px; font-style:italic;"></div>
                    </div>

                    <!-- Dynamic Bonus Choice (Stats) -->
                    <div id="ancestry-options" style="display:none; margin-bottom:1.5rem; padding:10px; border:1px dashed var(--accent-gold); border-radius:4px;">
                        <label class="form-label" style="font-size:0.9rem;">Select Bonus</label>
                        <select id="sel-anc-choice">
                            <option value="">-- Select --</option>
                            <option value="hp_flat">Bonus Hit Points (+4)</option>
                            <option value="mp_flat">Bonus Mana (+2)</option>
                            <option value="sta_flat">Bonus Stamina (+1)</option>
                            <option value="slots_flat">Bonus Inventory Slot (+1)</option>
                        </select>
                    </div>

                    <!-- Dynamic Skill Choice -->
                    <div id="ancestry-skill-options" style="display:none; margin-bottom:1.5rem; padding:10px; border:1px dashed var(--accent-blue); border-radius:4px;">
                        <label class="form-label" style="font-size:0.9rem;">Select Skill</label>
                        <select id="sel-anc-skill">
                            <option value="">-- Select Skill --</option>
                            <!-- Populated dynamically -->
                        </select>
                    </div>

                    <!-- Dynamic Element Choice -->
                    <div id="ancestry-element-options" style="display:none; margin-bottom:1.5rem; padding:10px; border:1px dashed var(--accent-crimson); border-radius:4px;">
                        <label class="form-label" style="font-size:0.9rem;">Select Resistance</label>
                        <select id="sel-anc-element">
                            <option value="">-- Select Element --</option>
                            <!-- Populated dynamically -->
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Background</label>
                        <select id="sel-background">
                            <option value="">-- Select Background --</option>
                            ${data.backgrounds.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                        </select>
                    </div>

                    <button id="btn-random-bio" class="roll-btn">
                        🎲 Roll Random Origins
                    </button>
                </div>

                <!-- Preview Card -->
                <div class="info-column">
                    <div id="bio-preview" class="preview-card">
                        <p class="text-muted" style="text-align:center; margin-top:2rem;">Select options to view details.</p>
                    </div>
                </div>
            </div>
        `;
        el.innerHTML = html;

        // --- Elements ---
        const ancSelect = document.getElementById('sel-ancestry');
        const featGroup = document.getElementById('feat-group');
        const featSelect = document.getElementById('sel-anc-feat');
        const optDiv = document.getElementById('ancestry-options');
        const optSelect = document.getElementById('sel-anc-choice');
        const skillDiv = document.getElementById('ancestry-skill-options');
        const skillSelect = document.getElementById('sel-anc-skill');
        const bgSelect = document.getElementById('sel-background');

        // --- Helpers ---
        
        const populateFeats = (ancId) => {
            featSelect.innerHTML = '<option value="">-- Choose One --</option>';
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
        
        // Add this where you define other listeners
        const elemSelect = document.getElementById('sel-anc-element');
        if (elemSelect) {
            elemSelect.addEventListener('change', (e) => {
                CharGen.char.ancestryElement = e.target.value;
            });
        }
        };

        const checkDynamicOptions = () => {
            const ancId = ancSelect.value;
            const featIdx = featSelect.value;
            
            // 1. Hide All Dynamic Sections initially
            optDiv.style.display = 'none'; // Stat Bonus (Human)
            skillDiv.style.display = 'none'; // Skill Choice
            // We need a new container for Element Choice if you haven't added one to the HTML yet
            // Let's inject it dynamically or assume we add it to the HTML structure below
            let elemDiv = document.getElementById('ancestry-element-options');
            if (elemDiv) elemDiv.style.display = 'none';

            if (ancId && featIdx !== "") {
                const anc = data.ancestries.find(a => a.id === ancId);
                const feat = anc.feats[featIdx];
                const mods = feat.modifiers;

                if (mods) {
                    // A. Stat Bonus (Human: Resourceful)
                    if (mods.select_bonus) {
                        optDiv.style.display = 'block';
                    } else {
                        CharGen.char.ancestryChoice = null;
                        optSelect.value = "";
                    }

                    // B. Element Selection (Draconid)
                    if (mods.select_element) {
                        // Ensure the UI container exists (See Part C below for HTML update)
                        if (elemDiv) {
                            elemDiv.style.display = 'block';
                            const elemSelect = document.getElementById('sel-anc-element');
                            elemSelect.innerHTML = '<option value="">-- Select Element --</option>';
                            mods.select_element.forEach(el => {
                                const opt = document.createElement('option');
                                opt.value = el;
                                opt.textContent = el;
                                elemSelect.appendChild(opt);
                            });
                            // Restore state
                            if (CharGen.char.ancestryElement) elemSelect.value = CharGen.char.ancestryElement;
                        }
                    }

                    // C. Skill Selection (Smallfolk / Human)
                    if (mods.select_skill) {
                        skillDiv.style.display = 'block';
                        skillSelect.innerHTML = '<option value="">-- Select Skill --</option>';
                        
                        let options = [];
                        if (mods.select_skill === "any") {
                            // Allow all skills (Human)
                            options = allSkills;
                        } else if (Array.isArray(mods.select_skill)) {
                            // Allow specific subset (Smallfolk)
                            options = allSkills.filter(s => mods.select_skill.includes(s.id));
                        }

                        options.forEach(s => {
                            const opt = document.createElement('option');
                            opt.value = s.id;
                            opt.textContent = s.name;
                            skillSelect.appendChild(opt);
                        });

                        // Restore state
                        if (CharGen.char.ancestrySkill) {
                             if(options.some(o => o.id === CharGen.char.ancestrySkill)) {
                                 skillSelect.value = CharGen.char.ancestrySkill;
                             } else {
                                 CharGen.char.ancestrySkill = null;
                             }
                        }
                    } else {
                        CharGen.char.ancestrySkill = null;
                    }
                }
            }
        };

        // --- Restore State ---
        if (CharGen.char.ancestry) {
            ancSelect.value = CharGen.char.ancestry;
            populateFeats(CharGen.char.ancestry);
            if (CharGen.char.ancestryFeatIndex !== null && CharGen.char.ancestryFeatIndex !== undefined) {
                featSelect.value = CharGen.char.ancestryFeatIndex;
            }
            checkDynamicOptions();
            if (CharGen.char.ancestryChoice) optSelect.value = CharGen.char.ancestryChoice;
            if (CharGen.char.ancestrySkill) skillSelect.value = CharGen.char.ancestrySkill;
        }
        if (CharGen.char.background) bgSelect.value = CharGen.char.background;

        CharGen.updateBioPreview();

        // --- Listeners ---
        
        ancSelect.addEventListener('change', (e) => {
            CharGen.char.ancestry = e.target.value;
            CharGen.char.ancestryFeatIndex = null;
            populateFeats(e.target.value);
            checkDynamicOptions();
            CharGen.updateBioPreview();
        });

        featSelect.addEventListener('change', (e) => {
            CharGen.char.ancestryFeatIndex = e.target.value;
            checkDynamicOptions();
            
            const anc = data.ancestries.find(a => a.id === CharGen.char.ancestry);
            const feat = anc.feats[e.target.value];
            document.getElementById('feat-desc-tiny').textContent = feat ? feat.effect : "";
        });

        optSelect.addEventListener('change', (e) => {
            CharGen.char.ancestryChoice = e.target.value;
        });

        skillSelect.addEventListener('change', (e) => {
            CharGen.char.ancestrySkill = e.target.value;
        });

        bgSelect.addEventListener('change', (e) => {
            CharGen.char.background = e.target.value;
            CharGen.updateBioPreview();
        });
        
        document.getElementById('char-name').addEventListener('input', (e) => CharGen.char.name = e.target.value);

        document.getElementById('btn-random-bio').addEventListener('click', () => {
            CharGen.rollRandomBio();
            // Refresh UI logic
            ancSelect.value = CharGen.char.ancestry;
            populateFeats(CharGen.char.ancestry);
            
            const anc = data.ancestries.find(a => a.id === CharGen.char.ancestry);
            const randFeatIdx = Math.floor(Math.random() * anc.feats.length);
            CharGen.char.ancestryFeatIndex = randFeatIdx;
            featSelect.value = randFeatIdx;
            
            bgSelect.value = CharGen.char.background;
            checkDynamicOptions();
            
            // If skill choice popped up randomly, pick one
            if (skillDiv.style.display === 'block') {
                 const opts = skillSelect.options;
                 const randOpt = Math.floor(Math.random() * (opts.length - 1)) + 1; // Skip index 0 placeholder
                 if (opts[randOpt]) {
                     skillSelect.value = opts[randOpt].value;
                     CharGen.char.ancestrySkill = opts[randOpt].value;
                 }
            }
             // If stat choice popped up, pick one
            if (optDiv.style.display === 'block') {
                 const opts = optSelect.options;
                 const randOpt = Math.floor(Math.random() * (opts.length - 1)) + 1;
                 if(opts[randOpt]) {
                     optSelect.value = opts[randOpt].value;
                     CharGen.char.ancestryChoice = opts[randOpt].value;
                 }
            }

            CharGen.updateBioPreview();
        });
    },

    calculateDerived: () => {
        const c = CharGen.char;
        const s = c.stats;
        const data = I18n.getData('options');
        if (!data) return;

        // ... [Keep existing Class Analysis logic (isFullWarrior, etc.)] ...
        // Ensure archA/archB/hasCaster logic remains here
        // [Class Analysis Block - assume it's here]
        let isFullWarrior = false;
        let isFullCaster = false;
        let isFullSpecialist = false;
        let hasWarrior = false;
        let hasCaster = false;
        let hasSpecialist = false;
        let archA = null;
        let archB = null;

        if (c.archA && c.archB) {
            archA = data.archetypes.find(a => a.id === c.archA);
            archB = data.archetypes.find(a => a.id === c.archB);

            if (archA && archB) {
                isFullWarrior = (archA.role === "Warrior" && archB.role === "Warrior");
                isFullCaster = (archA.role === "Spellcaster" && archB.role === "Spellcaster");
                isFullSpecialist = (archA.role === "Specialist" && archB.role === "Specialist");
                
                hasWarrior = (archA.role === "Warrior" || archB.role === "Warrior");
                hasCaster = (archA.role === "Spellcaster" || archB.role === "Spellcaster");
                hasSpecialist = (archA.role === "Specialist" || archB.role === "Specialist");
            }
        }

        const d = c.derived;
        const level = c.level;
        
        // Handle Stats (default to 0 to prevent NaNs)
        const str = s.STR || 0;
        const dex = s.DEX || 0;
        const con = s.CON || 0;
        const int = s.INT || 0;
        const wis = s.WIS || 0;
        const cha = s.CHA || 0;

        // Hit Die Determination
        let hitDie = 8;
        if (isFullWarrior) hitDie = 10;
        if (isFullCaster) hitDie = 6;

        // --- BASE HP LOGIC (The Fix) ---
        // At Level 1, Base HP is deterministic (Hit Die + CON).
        // We recalculate it constantly to reflect CON changes.
        if (c.level === 1) {
            c.baseHP = Math.max(1, hitDie + con);
        }
        // Safety fallback
        if (!c.baseHP) c.baseHP = Math.max(1, hitDie + con);

        // Reset Derived Stats to Base
        d.maxHP = c.baseHP; // Start clean
        d.maxSTA = 0;       // Start clean
        d.maxMP = 0;        // Start clean
        d.slots = 8 + str + con; // Recalc base slots

        // Stamina Base
        if (isFullWarrior) {
            const phys = [str, dex, con].sort((a,b) => b - a);
            d.maxSTA = Math.max(1, phys[0] + phys[1]);
        } else if (hasWarrior) {
            d.maxSTA = Math.max(1, str, dex, con);
        }

        // Mana Base
        if (hasCaster) {
            let castMod = 0;
            if (archA && ["INT","WIS","CHA"].some(st => archA.primary_stats.includes(st))) 
                castMod = Math.max(castMod, s[archA.primary_stats[0]]||0);
            if (archB && ["INT","WIS","CHA"].some(st => archB.primary_stats.includes(st))) 
                castMod = Math.max(castMod, s[archB.primary_stats[0]]||0);
            
            // Fallback
            if (castMod === 0) castMod = Math.max(int, wis, cha);

            if (isFullCaster) d.maxMP = ((level + 1) * 2) + castMod;
            else d.maxMP = (level + 1) + castMod;
        }

        // Luck Base
        d.maxLuck = 1; 
        if (isFullSpecialist) d.maxLuck = Math.max(1, cha * 2);
        else if (hasSpecialist) d.maxLuck = Math.max(1, cha);


        // --- MODIFIER APPLICATION ---
        const applyModifiers = (mods) => {
            if (!mods) return;
            // Add to the clean values
            if (mods.hp_flat) d.maxHP += mods.hp_flat;
            if (mods.mp_flat) d.maxMP += mods.mp_flat;
            if (mods.sta_flat) d.maxSTA += mods.sta_flat;
            if (mods.luck_flat) d.maxLuck += mods.luck_flat;
            if (mods.slots_flat) d.slots += mods.slots_flat;
            
            if (mods.sta_mod) {
                const val = s[mods.sta_mod] || 0;
                d.maxSTA += val;
            }
        };

        // 1. Ancestry
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

        // 2. Talents
        if (c.talents.length > 0) {
            c.talents.forEach(t => {
                if (t.modifiers) applyModifiers(t.modifiers);
            });
        }

        // 3. Synergy Feats
        if (c.classId) {
            const cls = data.classes.find(cl => cl.id === c.classId);
            if (cls) {
                const activeFeats = cls.synergy_feats.filter(f => f.level <= c.level);
                activeFeats.forEach(f => {
                    if (f.modifiers) applyModifiers(f.modifiers);
                });
            }
        }

        // Cleanup
        if (d.maxHP < 1) d.maxHP = 1;
        if (d.maxMP < 0) d.maxMP = 0;
        if (d.maxSTA < 0) d.maxSTA = 0;
        if (d.maxLuck < 1) d.maxLuck = 1;
        if (d.slots < 8) d.slots = 8;

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
        
        if (!ancId && !bgId) {
            previewEl.innerHTML = '<p style="color:#666; text-align:center; margin-top:2rem;">Select an Ancestry and Background to view traits.</p>';
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
                        <div class="preview-label" style="margin-top:10px;">Ancestry Feats (Choose 1 later):</div>
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
                html += `
                    <div class="preview-section" style="border-top: 1px solid #333; padding-top: 1rem;">
                        <div class="preview-header">${bg.name}</div>
                        <div class="preview-text"><em>${bg.description}</em></div>
                        
                        <div class="split-view" style="gap: 10px; margin-top:10px;">
                            <div>
                                <div class="preview-label">Skill Training</div>
                                <div class="preview-text">${bg.skill}</div>
                            </div>
                            <div>
                                <div class="preview-label">Starting Wealth</div>
                                <div class="preview-text">${bg.gear[bg.gear.length-1]}</div> 
                            </div>
                        </div>

                        <div class="feat-box">
                            <div style="font-weight:bold; color:var(--accent-blue);">${bg.feat.name}</div>
                            <div>${bg.feat.effect}</div>
                        </div>

                        <div class="preview-label" style="margin-top:10px;">Starting Gear:</div>
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
        if (!data) return;

        const html = `
            <div class="split-view">
                <!-- Inputs -->
                <div class="input-column">
                    <div class="form-group">
                        <label class="form-label">Archetype A</label>
                        <select id="sel-arch-a">
                            <option value="">-- Select First Archetype --</option>
                            ${data.archetypes.map(a => `<option value="${a.id}">${a.name} (${a.role})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Archetype B</label>
                        <select id="sel-arch-b">
                            <option value="">-- Select Second Archetype --</option>
                            ${data.archetypes.map(a => `<option value="${a.id}">${a.name} (${a.role})</option>`).join('')}
                        </select>
                    </div>

                    <button id="btn-random-class" class="roll-btn">
                        🎲 Roll Destiny (2d12)
                    </button>
                </div>

                <!-- Preview Card -->
                <div class="info-column">
                    <div id="class-preview" class="preview-card">
                        <p class="text-muted" style="text-align:center; margin-top:2rem;">Select two Archetypes to reveal your Class.</p>
                    </div>
                </div>
            </div>

            <!-- Talent Selection Area -->
            <div id="talent-selection-ui" class="talent-section" style="display:none;">
                <div style="margin-bottom:10px;">
                    <h3 style="margin:0;">Starting Talents</h3>
                    <p class="text-muted" style="font-size:0.85rem;">
                        <span id="talent-instruction">Select abilities.</span>
                        <span id="talent-count" style="float:right; font-weight:bold;">0/2 Selected</span>
                    </p>
                </div>
                <div id="talent-columns" class="talent-columns">
                    <!-- Injected by renderTalentSelectors -->
                </div>
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

        if (!idA || !idB) {
            previewEl.innerHTML = '<p style="color:#666; text-align:center; margin-top:2rem;">Select two Archetypes to reveal your Class.</p>';
            talentUI.style.display = 'none';
            return;
        }

        const archA = data.archetypes.find(a => a.id === idA);
        const archB = data.archetypes.find(a => a.id === idB);
        
        // Find Class Name
        const foundClass = data.classes.find(c => 
            (c.components[0] === archA.name && c.components[1] === archB.name) ||
            (c.components[0] === archB.name && c.components[1] === archA.name)
        );

        if (!foundClass) return;

        CharGen.char.classId = foundClass.id;
        CharGen.char.className = foundClass.name;

        // Helper to render one archetype card
        const renderArchCard = (arch) => `
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:4px; margin-bottom:10px; border-left:3px solid var(--accent-blue);">
                <div style="font-weight:bold; color:var(--text-main);">${arch.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:5px;">${arch.role} • ${arch.resource}</div>
                <div style="font-size:0.8rem; font-style:italic; margin-bottom:8px;">${arch.description}</div>
                <div style="font-size:0.75rem;">
                    <strong>Primary:</strong> ${arch.primary_stats.join(', ')}<br>
                    <strong>Skills:</strong> ${arch.proficiencies.skills.join(', ')}
                </div>
            </div>
        `;

        let archHtml = '';
        if (idA === idB) {
            // Pure Class - Show once, emphasize focus
            archHtml = `
                <div style="margin-bottom:1rem;">
                    <div style="font-size:0.8rem; text-transform:uppercase; color:var(--accent-gold); margin-bottom:5px;">Pure Path</div>
                    ${renderArchCard(archA)}
                </div>
            `;
        } else {
            // Hybrid Class - Show both
            archHtml = `
                <div style="margin-bottom:1rem;">
                    <div style="font-size:0.8rem; text-transform:uppercase; color:var(--accent-gold); margin-bottom:5px;">Archetypes</div>
                    ${renderArchCard(archA)}
                    ${renderArchCard(archB)}
                </div>
            `;
        }

        // Render Preview
        const lvl1Feat = foundClass.synergy_feats.find(f => f.level === 1);
        const html = `
            <div class="preview-section">
                <div class="preview-header" style="color:var(--accent-gold); border-bottom: 1px solid var(--accent-gold);">${foundClass.name}</div>
                <div class="preview-text" style="margin-bottom:1rem;"><em>${foundClass.description}</em></div>
                
                ${archHtml}

                <div class="feat-box" style="margin-top:1rem;">
                    <div class="preview-label" style="color:var(--accent-blue);">Level 1 Synergy Feat</div>
                    <div style="font-weight:bold;">${lvl1Feat.name}</div>
                    <div style="font-size:0.85rem; margin-top:4px;">${lvl1Feat.effect}</div>
                </div>
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
        
        container.innerHTML = '';

        // Helper to render a list
        const makeList = (arch, colId) => {
            let html = `<div class="talent-col" id="${colId}"><h4>${arch.name} Talents</h4>`;
            arch.talents.forEach((t, idx) => {
                const isSelected = CharGen.char.talents.some(sel => sel.name === t.name);
                // FIX: Removed onclick, added data attributes
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
            instruct.textContent = "Pure Class: Select 2 Talents from your Archetype.";
            container.innerHTML = makeList(archA, 'col-pure');
            container.style.gridTemplateColumns = "1fr";
        } else {
            instruct.textContent = "Hybrid Class: Select 1 Talent from EACH Archetype.";
            container.innerHTML = makeList(archA, 'col-a') + makeList(archB, 'col-b');
            container.style.gridTemplateColumns = "1fr 1fr";
        }

        // FIX: Attach Event Listeners via JS to handle Scope
        container.querySelectorAll('.talent-opt').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget; // Important: currentTarget gets the div with data attrs
                const archId = target.dataset.arch;
                const idx = parseInt(target.dataset.idx);
                const colId = target.dataset.col;
                CharGen.toggleTalent(archId, idx, colId);
            });
        });
        
        CharGen.updateTalentCount();
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
        const isManual = CharGen.statState.manualMode;

        const html = `
            <div class="split-view">
                <div class="input-column">
                    
                    <!-- Header & Toggle -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h3 style="margin:0;">Stat Array</h3>
                        <div class="mode-toggle">
                            <span>Manual Edit</span>
                            <label class="switch">
                                <input type="checkbox" id="toggle-manual" ${isManual ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- Standard Mode Controls -->
                    <div id="standard-controls" style="display: ${isManual ? 'none' : 'block'}">
                        <div class="info-box" id="array-name" style="text-align:center; margin-bottom:10px; font-style:italic;">
                            ${CharGen.statState.arrayValues.length > 0 ? "Assign values to attributes below." : "Roll the dice to generate your array."}
                        </div>
                        
                        <div id="pool-container" class="stat-pool">
                            ${CharGen.renderPoolButtons()}
                        </div>

                        <button id="btn-roll-stats" class="roll-btn" style="width:100%; margin-bottom:1rem;">
                            🎲 Roll Array (1d12)
                        </button>
                    </div>

                    <!-- The Stat Grid -->
                    <div class="stat-grid">
                        ${['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(stat => `
                            <div class="stat-box ${!isManual ? 'interactive' : ''} ${CharGen.char.stats[stat] !== null ? 'filled' : ''}" data-stat="${stat}">
                                <label style="color:var(--accent-gold); font-weight:bold; display:block; margin-bottom:5px;">${stat}</label>
                                ${isManual 
                                    ? `<input type="number" class="manual-input" data-stat="${stat}" value="${CharGen.char.stats[stat] || 0}">`
                                    : `<div class="stat-value-display">${CharGen.char.stats[stat] !== null ? (CharGen.char.stats[stat] > 0 ? '+'+CharGen.char.stats[stat] : CharGen.char.stats[stat]) : '--'}</div>`
                                }
                            </div>
                        `).join('')}
                    </div>
                    
                    <p class="text-muted" style="font-size:0.8rem; margin-top:10px; text-align:center;">
                        ${isManual ? "Enter stats freely (-2 to +5)." : "Click a number, then click a Stat box."}
                    </p>
                </div>

                <!-- Preview Column -->
                <div class="info-column">
                    <div id="stats-preview" class="preview-card">
                        <div class="preview-header">Derived Vitals</div>
                        <!-- Populated by updateStatPreview -->
                    </div>
                </div>
            </div>
        `;
        el.innerHTML = html;

        // Event Listeners
        document.getElementById('toggle-manual').addEventListener('change', (e) => {
            CharGen.statState.manualMode = e.target.checked;
            CharGen.statState.assignedIndices = {};
            CharGen.char.stats = { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null };
            CharGen.renderStats(el);
            CharGen.calculateDerived();
            CharGen.validateStats();
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
                });
            });
        }

        CharGen.calculateDerived(); 
        CharGen.validateStats(); 
        CharGen.calculateDefenses(); 
    },

    renderPoolButtons: () => {
        if (CharGen.statState.arrayValues.length === 0) return '<span class="text-muted">- No Array -</span>';
        
        return CharGen.statState.arrayValues.map((val, idx) => {
            const isUsed = Object.keys(CharGen.statState.assignedIndices).includes(String(idx));
            const isSelected = (CharGen.statState.selectedValIndex === idx);
            
            return `<button class="pool-btn ${isUsed ? 'used' : ''} ${isSelected ? 'selected' : ''}" 
                    data-idx="${idx}" ${isUsed ? 'disabled' : ''}>
                    ${val > 0 ? '+'+val : val}
                    </button>`;
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
        }

        CharGen.statState.arrayValues = values;
        CharGen.statState.assignedIndices = {};
        CharGen.char.stats = { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null };
        
        const arrayNameEl = document.getElementById('array-name');
        if(arrayNameEl) arrayNameEl.innerHTML = `<strong>Roll ${roll}: ${name}</strong>`;
        
        const container = document.getElementById('step-container');
        if(container) CharGen.renderStats(container);
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
                CharGen.calculateDerived();
                CharGen.validateStats();
                return;
            }
        }

        if (state.selectedValIndex !== null) {
            const val = state.arrayValues[state.selectedValIndex];
            state.assignedIndices[state.selectedValIndex] = statKey;
            CharGen.char.stats[statKey] = val;
            state.selectedValIndex = null;
            
            CharGen.renderStats(document.getElementById('step-container'));
            CharGen.calculateDerived();
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

        // ... (Keep existing Class Analysis & Hit Die logic) ...
        // [Assuming ArchA/ArchB/HasCaster logic is here]
        let isFullWarrior = false;
        let isFullCaster = false;
        let isFullSpecialist = false;
        let hasWarrior = false;
        let hasCaster = false;
        let hasSpecialist = false;
        let archA = null;
        let archB = null;

        if (c.archA && c.archB) {
            archA = data.archetypes.find(a => a.id === c.archA);
            archB = data.archetypes.find(a => a.id === c.archB);

            if (archA && archB) {
                isFullWarrior = (archA.role === "Warrior" && archB.role === "Warrior");
                isFullCaster = (archA.role === "Spellcaster" && archB.role === "Spellcaster");
                isFullSpecialist = (archA.role === "Specialist" && archB.role === "Specialist");
                
                hasWarrior = (archA.role === "Warrior" || archB.role === "Warrior");
                hasCaster = (archA.role === "Spellcaster" || archB.role === "Spellcaster");
                hasSpecialist = (archA.role === "Specialist" || archB.role === "Specialist");
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

        // --- BASE POOLS ---
        
        // 1. Hit Points
        let hitDie = 8;
        if (isFullWarrior) hitDie = 10;
        if (isFullCaster) hitDie = 6;
        if (d.maxHP === 0) d.maxHP = hitDie + con; // Init

        // 2. Stamina
        d.maxSTA = 0;
        if (isFullWarrior) {
            const phys = [str, dex, con].sort((a,b) => b - a);
            d.maxSTA = Math.max(1, phys[0] + phys[1]);
        } else if (hasWarrior) {
            d.maxSTA = Math.max(1, str, dex, con);
        }

        // 3. Mana
        d.maxMP = 0;
        if (hasCaster) {
            let castMod = 0;
            // Simple check for casting stat
            if(archA && ["INT","WIS","CHA"].some(stat => archA.primary_stats.includes(stat))) castMod = Math.max(castMod, s[archA.primary_stats[0]]||0);
            if(archB && ["INT","WIS","CHA"].some(stat => archB.primary_stats.includes(stat))) castMod = Math.max(castMod, s[archB.primary_stats[0]]||0);
            
            if (isFullCaster) d.maxMP = ((level + 1) * 2) + castMod;
            else d.maxMP = (level + 1) + castMod;
        }

        // 4. Luck
        d.maxLuck = 1; 
        if (isFullSpecialist) d.maxLuck = Math.max(1, cha * 2);
        else if (hasSpecialist) d.maxLuck = Math.max(1, cha);

        // 5. Slots
        d.slots = 8 + str + con;

        // --- MODIFIER APPLICATION ---
        const applyModifiers = (mods) => {
            if (!mods) return;
            if (mods.hp_flat) d.maxHP += mods.hp_flat;
            if (mods.mp_flat) d.maxMP += mods.mp_flat;
            if (mods.sta_flat) d.maxSTA += mods.sta_flat;
            if (mods.luck_flat) d.maxLuck += mods.luck_flat;
            if (mods.slots_flat) d.slots += mods.slots_flat;
            if (mods.sta_mod) d.maxSTA += (s[mods.sta_mod] || 0);
        };

        // A. Ancestry
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

        // B. Talents (Includes Ranger Choice)
        if (c.talents.length > 0) {
            c.talents.forEach(t => {
                if (t.modifiers) applyModifiers(t.modifiers);
                
                // RANGER SPECIAL LOGIC
                if (t.name === "Primal Bond Selection" && t.choice) {
                    // Normally we'd put this in JSON, but for conditional choices logic is easier here
                    // or update the Talent JSON to have 'modifiers' that are conditional (complex).
                    // Hardcoding the Ranger Choice effect here for safety:
                    /*
                       Hunter: Handled in Attack Logic (+1 Ranged).
                       Beast: Handled in Beast Logic.
                       Neither affects Derived Stats (HP/MP/Luck), so no derived update needed here.
                       BUT if we add more choices later, handle them here.
                    */
                }
            });
        }

        // C. Synergy Feats (NEW: This fixes the Level 5/10 Passive Bonuses)
        if (c.classId) {
            const cls = data.classes.find(cl => cl.id === c.classId);
            if (cls) {
                const activeFeats = cls.synergy_feats.filter(f => f.level <= c.level);
                activeFeats.forEach(f => {
                    if (f.modifiers) applyModifiers(f.modifiers);
                });
            }
        }

        // Cleanup
        if (d.maxMP < 0) d.maxMP = 0;
        if (d.maxSTA < 0) d.maxSTA = 0;
        if (d.maxLuck < 1) d.maxLuck = 1;
        if (d.slots < 8) d.slots = 8;

        CharGen.updateStatPreview(hitDie);
    },

    updateStatPreview: (hitDie) => {
        const d = CharGen.char.derived;
        const el = document.getElementById('stats-preview');
        if (!el) return;
        
        el.innerHTML = `
            <div class="preview-header">Vitals</div>
            
            <div class="resource-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 1rem;">
                <div class="resource-box" style="border-color: var(--accent-crimson);">
                    <div class="label">Hit Points</div>
                    <div class="resource-val">${d.maxHP}</div>
                    <div style="font-size:0.7rem;">(Die: d${hitDie})</div>
                </div>
                <div class="resource-box" style="border-color: #fff;">
                    <div class="label">Inv. Slots</div>
                    <div class="resource-val">${d.slots}</div>
                </div>
            </div>

            <div class="resource-grid" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px;">
                <div class="resource-box" style="opacity: ${d.maxSTA > 0 ? 1 : 0.3};">
                    <div class="label">Stamina</div>
                    <div class="resource-val">${d.maxSTA}</div>
                </div>
                <div class="resource-box" style="opacity: ${d.maxMP > 0 ? 1 : 0.3};">
                    <div class="label">Mana</div>
                    <div class="resource-val">${d.maxMP}</div>
                </div>
                <div class="resource-box" style="opacity: ${d.maxLuck > 1 ? 1 : 0.5};">
                    <div class="label">Luck</div>
                    <div class="resource-val">${d.maxLuck}</div>
                </div>
            </div>

            <div style="margin-top: 1.5rem;">
                 <div class="preview-header">Combat</div>
                 <div class="split-view" style="gap:10px;">
                    <div>
                        <div class="preview-label">Initiative</div>
                        <div class="preview-text">${CharGen.char.stats.DEX !== null ? (CharGen.char.stats.DEX >= 0 ? '+'+CharGen.char.stats.DEX : CharGen.char.stats.DEX) : '--'}</div>
                    </div>
                    <div>
                        <div class="preview-label">Defense Bonus</div>
                        <div class="preview-text">Dodge: ${CharGen.char.stats.DEX !== null ? CharGen.char.stats.DEX : '--'}</div>
                    </div>
                 </div>
            </div>
        `;
    },

/* ------------------------------------------------------------------
       STEP 4: GEAR (Cleaned)
       ------------------------------------------------------------------ */

    renderGear: (el) => {
        // Ensure currency object exists
        const w = CharGen.char.currency || { g: 0, s: 0, c: 0 };
        
        const html = `
            <div class="split-view">
                <!-- Selection Column (Shop) -->
                <div class="input-column">
                    <div class="shop-header">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <h3 style="margin:0;">Equipment Shop</h3>
                            <!-- WALLET DISPLAY -->
                            <div style="font-family:var(--font-mono); font-size:0.9rem; color:var(--accent-gold); background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:4px; border:1px solid var(--border-color);">
                                💰 ${w.g}g ${w.s}s ${w.c}c
                            </div>
                        </div>
                        <div class="shop-tabs">
                            <button class="tab-btn active" data-tab="weapons">Weapons</button>
                            <button class="tab-btn" data-tab="armor">Armor</button>
                            <button class="tab-btn" data-tab="gear">Gear</button>
                        </div>
                    </div>

                    <div id="shop-container" class="shop-list">
                        <!-- Items injected here by renderShopList -->
                    </div>
                    
                    <div id="bg-gear-section" style="margin-top:10px; border-top:1px solid #333; padding-top:10px;">
                        <button id="btn-bg-gear" class="roll-btn" style="width:100%;">
                            🎁 Equip Background Gear
                        </button>
                    </div>
                </div>

                <!-- Inventory Column -->
                <div class="info-column">
                    <h3>Inventory</h3>
                    <div class="slot-meter-container">
                        <div id="slot-fill" class="slot-meter-fill"></div>
                        <div id="slot-text" class="slot-text">0 / 8 Slots</div>
                    </div>
                    <div id="encumbrance-warning" style="color: var(--accent-crimson); display: none; margin-bottom: 5px; font-weight: bold; font-size: 0.8rem; text-align:center;">
                        ⚠️ ENCUMBERED (Speed Halved)
                    </div>
                    <div id="inv-list-container" class="shop-list" style="height: 300px;">
                        <!-- Inventory items injected here by updateInventoryUI -->
                    </div>
                </div>
            </div>
        `;
        
        el.innerHTML = html;

        // --- Event Listeners ---

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
        // Disable button if we detect background items already added to prevent duplicates/infinite money
        const hasBgItems = CharGen.char.inventory.some(i => i.type === "Background");
        if(hasBgItems) {
            bgBtn.disabled = true;
            bgBtn.textContent = "✅ Gear Added";
        } else {
            bgBtn.addEventListener('click', () => {
                CharGen.equipBackgroundGear(); 
                // Re-render this step to update the Wallet Display at the top
                CharGen.renderGear(el);
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
        
        // Regex to find number and unit (g, s, c)
        const match = costStr.toLowerCase().match(/(\d+)\s*([gsc])/);
        if (!match) return 0;

        const val = parseInt(match[1]);
        const unit = match[2];

        if (unit === 'g') return val * 100;
        if (unit === 's') return val * 10;
        return val;
    },

    // Convert character's current wealth to total Copper
    getWalletTotal: () => {
        const w = CharGen.char.currency || { g:0, s:0, c:0 };
        return (w.g * 100) + (w.s * 10) + (w.c);
    },

    // Update character wallet from a total Copper amount (Greedy Exchange)
    setWalletFromTotal: (totalCopper) => {
        const g = Math.floor(totalCopper / 100);
        const rem1 = totalCopper % 100;
        const s = Math.floor(rem1 / 10);
        const c = rem1 % 10;
        
        CharGen.char.currency = { g, s, c };
    },

    /* --- INVENTORY LOGIC --- */

    addToInventory: (item) => {
        // 1. Check Cost
        const costCopper = CharGen.parseCostToCopper(item.cost);
        const currentCopper = CharGen.getWalletTotal();

        // If it's not free ("-") and we can't afford it
        if (costCopper > 0 && currentCopper < costCopper) {
            alert(`Not enough coin! \nCost: ${item.cost} \nYou have: ${currentCopper}c value.`);
            return;
        }

        // 2. Deduct Cost
        if (costCopper > 0) {
            CharGen.setWalletFromTotal(currentCopper - costCopper);
        }

        // 3. Add Item
        const newItem = JSON.parse(JSON.stringify(item));
        CharGen.char.inventory.push(newItem);
        
        CharGen.updateInventoryUI();
        CharGen.calculateDefenses(); 
        CharGen.calculateArmorScore(); // Ensure armor updates
    },

    removeFromInventory: (index) => {
        CharGen.char.inventory.splice(index, 1);
        CharGen.updateInventoryUI();
        CharGen.calculateDefenses(); 
    },

    equipBackgroundGear: () => {
        const bgId = CharGen.char.background;
        const options = I18n.getData('options');
        const bg = options.backgrounds.find(b => b.id === bgId);
        const itemsData = I18n.getData('items');

        if (!bg || !bg.gear) return;

        // Reset Wallet before adding (prevents double-adding if button clicked twice)
        CharGen.char.currency = { g: 0, s: 0, c: 0 };
        // Note: Ideally we'd clear 'Background' items from inventory too, but simplistic addition is safer for MVP

        bg.gear.forEach(gearStr => {
            // 1. Check if this is Money (e.g., "10 Gold", "5 Silver")
            // Regex checks for Number + "Gold"/"Silver"/"Copper"
            const moneyMatch = gearStr.match(/(\d+)\s*(Gold|Silver|Copper)/i);
            
            if (moneyMatch) {
                const val = parseInt(moneyMatch[1]);
                const type = moneyMatch[2].toLowerCase();
                
                if (type.includes('gold')) CharGen.char.currency.g += val;
                else if (type.includes('silver')) CharGen.char.currency.s += val;
                else if (type.includes('copper')) CharGen.char.currency.c += val;
                
                return; // Skip adding this as an item
            }

            // 2. Standard Item Logic
            let slots = 0;
            const slotMatch = gearStr.match(/(\d+)\s*Slot/i);
            if (slotMatch) slots = parseFloat(slotMatch[1]);
            
            const cleanName = gearStr.replace(/\(.*\)/, '').trim();
            
            const dbItem = [...itemsData.weapons, ...itemsData.armor, ...itemsData.gear, ...itemsData.reagents]
                           .find(i => i.name.toLowerCase() === cleanName.toLowerCase());

            let finalItem = {
                name: gearStr,
                slots: slots,
                cost: "-",
                type: "Background"
            };

            if (dbItem) {
                finalItem = { ...dbItem, name: gearStr, cost: "-" }; // Keep flavor name but use DB stats
            }

            CharGen.char.inventory.push(finalItem);
        });

        const btn = document.getElementById('btn-bg-gear');
        if (btn) {
            btn.disabled = true;
            btn.textContent = "✅ Gear & Coin Added";
        }
        CharGen.updateInventoryUI();
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
        // Fix float precision
        currentSlots = Math.round(currentSlots * 100) / 100;

        const maxSlots = CharGen.char.derived.slots;
        const pct = Math.min(100, (currentSlots / maxSlots) * 100);

        // Render
        fillEl.style.width = `${pct}%`;
        fillEl.style.backgroundColor = currentSlots > maxSlots ? 'var(--accent-crimson)' : 'var(--accent-gold)';
        textEl.textContent = `${currentSlots} / ${maxSlots} Slots`;
        warnEl.style.display = currentSlots > maxSlots ? 'block' : 'none';

        listEl.innerHTML = CharGen.char.inventory.map((item, idx) => `
            <div class="inv-item">
                <span style="font-size:0.85rem; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${item.name}</span>
                <div style="display:flex; align-items:center;">
                    <span style="font-family:var(--font-mono); font-size:0.75rem; margin-right:5px; color:#888;">${item.slots || 0}</span>
                    <button class="remove-btn" data-idx="${idx}">×</button>
                </div>
            </div>
        `).join('');

        listEl.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => CharGen.removeFromInventory(e.target.dataset.idx));
        });
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

renderSheet: (el) => {
        const c = CharGen.char;
        const data = I18n.getData('options');
        
        // 1. Calculations
        CharGen.calculateDerived();
        CharGen.calculateDefenses(); 
        const armorScore = CharGen.calculateArmorScore();
        const def = c.defenses; 
        const skillsList = CharGen.calculateSkills();

        // 2. Initialization (Live State)
        if (c.current.hp === null) c.current.hp = c.derived.maxHP;
        if (c.current.mp === null) c.current.mp = c.derived.maxMP;
        if (c.current.sta === null) c.current.sta = c.derived.maxSTA;
        if (c.current.luck === null) c.current.luck = c.derived.maxLuck;
        if (!c.activeConditions) c.activeConditions = [];

        // 3. Metadata & Feats
        const ancestry = data.ancestries.find(a => a.id === c.ancestry) || { name: "Unknown", feats:[] };
        const background = data.backgrounds.find(b => b.id === c.background) || { name: "Unknown", feat: { name: "-", effect: "-" } };
        const cls = data.classes.find(cl => cl.id === c.classId) || { name: "Unknown", synergy_feats: [] };
        const synFeat = cls.synergy_feats.find(f => f.level === 1) || { name: "-", effect: "-" };
        
        let ancFeat = { name: "Attribute Bonus", effect: "Selected raw stats." };
        if (c.ancestryFeatIndex !== null && ancestry.feats && ancestry.feats[c.ancestryFeatIndex]) {
            ancFeat = ancestry.feats[c.ancestryFeatIndex];
        }

        // 4. Inventory Logic
        const weapons = [];
        const gear = [];
        const materials = { "Organics": 0, "Scrap": 0, "Flora": 0, "Essence": 0 };

        c.inventory.forEach(item => {
            if (item.type === 'Melee' || item.type === 'Ranged') {
                weapons.push(item);
                gear.push(item); 
            } else if (item.type === 'Material') {
                if(item.name.includes("Organics")) materials.Organics++;
                else if(item.name.includes("Scrap")) materials.Scrap++;
                else if(item.name.includes("Flora")) materials.Flora++;
                else if(item.name.includes("Essence")) materials.Essence++;
            } else {
                gear.push(item);
            }
        });

        const toolProfs = [];
        c.talents.forEach(t => {
            if (t.tags && t.tags.includes("Kit")) {
                if(t.name.startsWith("Kit:")) toolProfs.push(t.name.replace("Kit: ", ""));
                else if(t.name === "Poisoner") toolProfs.push("Poisoner's Kit");
                else if(t.name === "Saboteur") toolProfs.push("Thieves' Tools");
            }
        });
        if (background.skill && background.skill.includes("Proficiency")) toolProfs.push(background.skill.replace(" Proficiency", ""));

        // Synergy Warning
        const pendingSynergy = CharGen.checkSynergyGrant();
        let warningHtml = "";
        if (pendingSynergy) {
            warningHtml = `
                <div style="background: rgba(197, 160, 89, 0.15); border: 1px solid var(--accent-gold); padding: 15px; margin-bottom: 1.5rem; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
                    <div>
                        <strong style="color:var(--accent-gold); display:block; margin-bottom:4px;">⚠ Class Bonus Available</strong>
                        <span style="font-size:0.9rem; color:#ddd;">Your <strong>${pendingSynergy.featName}</strong> feature grants you a free talent: <strong>${pendingSynergy.grantName}</strong>.</span>
                    </div>
                    <button id="btn-resolve-synergy" class="btn-primary" style="padding: 5px 15px; font-size:0.9rem;">Select Now</button>
                </div>
            `;
        }

        // Helper: Defense Box
        const renderDefBox = (label, d) => {
            const opacity = d.val === null ? 0.3 : 1;
            const valStr = d.val !== null ? (d.val >= 0 ? `+${d.val}` : d.val) : "--";
            const dieStr = (d.die && d.die !== "-") ? `<span style="color:var(--accent-gold); font-size:0.7em;"> + ${d.die}</span>` : "";
            return `
                <div class="vital-box" style="opacity:${opacity}; flex-direction:column; justify-content:center; min-width: 90px;">
                    <span class="vital-label" style="margin-top:-25px; background:#e0e0e0; padding:0 5px;">${label}</span>
                    <div class="vital-value" style="font-size:1.4rem;">${valStr}${dieStr}</div>
                </div>
            `;
        };

        // Helper: Condition Checkbox
        const renderCond = (name) => {
            const isChecked = c.activeConditions.includes(name) ? 'checked' : '';
            return `<label class="cond-check"><input type="checkbox" class="cond-toggle" data-cond="${name}" ${isChecked}> ${name}</label>`;
        };

        // --- HTML START ---
        const html = `
            <div class="print-actions">
                <button id="btn-levelup" class="btn-primary" style="background:var(--accent-blue); border-color:var(--accent-blue);">⬆ Level Up</button>
                <button id="btn-print-pdf" class="btn-secondary">🖨️ Print to PDF</button>
                <button id="btn-save-lib" class="btn-primary">💾 Save to Library</button>
            </div>
            
            ${warningHtml}

            <!-- PAGE 1 -->
            <div class="sheet-wrapper">
                <!-- HEADER -->
                <div class="sheet-header">
                    <div style="flex-grow:1;">
                        <div class="sheet-name">${c.name || "Unnamed Hero"}</div>
                        <div style="color:#555; font-style:italic;">${ancestry.name} ${background.name}</div>
                    </div>
                    <div class="sheet-class-box">
                        <div style="font-size:0.8rem; text-transform:uppercase; color:#666;">Level ${c.level}</div>
                        <div style="display:flex; align-items:center; gap:5px; margin-top:5px;">
                            <span style="font-size:0.8rem; color:#666;">XP:</span>
                            <input type="number" id="inp-xp" class="sheet-input-sm" value="${c.current.xp}">
                            <span style="font-size:0.8rem; color:#666;">/ ${c.level * 10}</span>
                        </div>
                    </div>
                </div>

                <!-- ATTRIBUTES STRIP -->
                <div class="stat-block-horizontal">
                     ${['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(stat => `
                        <div class="mini-stat">
                            <div class="mini-stat-label">${stat}</div>
                            <div class="mini-stat-val">${(c.stats[stat] || 0) >= 0 ? '+' : ''}${c.stats[stat] || 0}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- VITALS ROW (INTERACTIVE) -->
                <div class="vitals-row" style="gap:15px; margin-bottom: 1.5rem;">
                    <div class="vital-box" style="border-color: var(--accent-crimson);">
                        <span class="vital-label">Hit Points</span>
                        <div class="vital-input-container">
                            <input type="number" id="inp-hp" class="sheet-input-lg" value="${c.current.hp}">
                            <span class="sheet-slash">/</span>
                            <span class="sheet-max">${c.derived.maxHP}</span>
                        </div>
                    </div>
                    <div class="vital-box">
                        <span class="vital-label">Stamina</span>
                        <div class="vital-input-container">
                            <input type="number" id="inp-sta" class="sheet-input-lg" value="${c.current.sta}">
                            <span class="sheet-slash">/</span>
                            <span class="sheet-max">${c.derived.maxSTA}</span>
                        </div>
                    </div>
                    <div class="vital-box">
                        <span class="vital-label">Mana</span>
                        <div class="vital-input-container">
                            <input type="number" id="inp-mp" class="sheet-input-lg" value="${c.current.mp}">
                            <span class="sheet-slash">/</span>
                            <span class="sheet-max">${c.derived.maxMP}</span>
                        </div>
                    </div>
                    <div class="vital-box">
                        <span class="vital-label">Luck</span>
                        <div class="vital-input-container">
                            <input type="number" id="inp-luck" class="sheet-input-lg" value="${c.current.luck}">
                            <span class="sheet-slash">/</span>
                            <span class="sheet-max">${c.derived.maxLuck}</span>
                        </div>
                    </div>
                </div>

                <!-- DEFENSES ROW -->
                <div class="sheet-section-title">Defenses & Speed</div>
                <div class="vitals-row" style="gap:10px; margin-bottom: 1.5rem;">
                    ${renderDefBox("Dodge (DEX)", def.dodge)}
                    ${renderDefBox("Parry (STR/DEX)", def.parry)}
                    ${renderDefBox("Block (CON)", def.block)}
                    <div class="vital-box" style="border: 2px solid #333; min-width: 90px; flex-direction:column; justify-content:center;">
                        <span class="vital-label" style="margin-top:-25px; background:#e0e0e0; padding:0 5px;">Armor Score</span>
                        <div class="vital-value" style="font-size:1.4rem;">${armorScore}</div>
                    </div>
                    <div class="vital-box" style="border: 1px dashed #555; min-width: 80px; flex-direction:column; justify-content:center;">
                        <span class="vital-label" style="margin-top:-25px; background:#e0e0e0; padding:0 5px;">Speed</span>
                        <div class="vital-value" style="font-size:1.4rem;">30<span style="font-size:0.6em">ft</span></div>
                    </div>
                </div>

                <div class="sheet-grid">
                    <!-- LEFT COL -->
                    <div class="col-left">
                        <div class="sheet-section-title">Skills</div>
                        <table class="sheet-table" style="font-size:0.85rem;">
                            ${skillsList.map(s => `
                                <tr style="${s.count > 0 ? 'font-weight:bold; background:rgba(0,0,0,0.05);' : 'color:#777;'}">
                                    <td>${s.name}</td>
                                    <td style="text-align:right;">${s.die !== '-' ? `+${s.die}` : '-'}</td>
                                </tr>
                            `).join('')}
                        </table>

                         <div class="sheet-section-title" style="margin-top:1rem;">Proficiencies</div>
                         <div style="font-size:0.8rem; color:#333;">
                            <strong>Tools:</strong> ${toolProfs.length ? toolProfs.join(', ') : 'None'}
                         </div>
                    </div>

                    <!-- RIGHT COL -->
                    <div class="col-right">
                        <div class="sheet-section-title">Attacks</div>
                        <table class="sheet-table">
                            <tr>
                                <th width="30%">Weapon</th>
                                <th width="15%">Atk</th>
                                <th width="20%">Dmg</th>
                                <th width="35%">Tags</th>
                            </tr>
                            ${weapons.length > 0 ? weapons.map(w => {
                                const isFinesse = (w.tags && w.tags.includes("Finesse")) || w.type === 'Ranged';
                                const isRanged = w.type === 'Ranged';
                                let atkMod = c.stats.STR || 0;
                                if (isRanged) atkMod = c.stats.DEX || 0;
                                else if (isFinesse) atkMod = Math.max(c.stats.STR || 0, c.stats.DEX || 0);
                                let dmgMod = atkMod; 
                                const sign = atkMod >= 0 ? '+' : '';
                                const dmgSign = dmgMod >= 0 ? '+' : '';
                                
                                return `<tr>
                                    <td>${w.name}</td>
                                    <td>${sign}${atkMod}</td>
                                    <td>${w.damage} ${sign}${dmgMod}</td>
                                    <td style="font-size:0.7rem;">${w.tags ? w.tags.join(', ') : ''}</td>
                                </tr>`;
                            }).join('') : '<tr><td colspan="4" style="text-align:center;">Unarmed (1d4 + STR)</td></tr>'}
                        </table>

                        <div class="sheet-section-title" style="margin-top:1rem;">Talents & Features</div>
                        <div class="feat-row"><strong>${ancFeat.name}</strong>: ${c.ancestryChoice ? `(${c.ancestryChoice}) ` : ''}${ancFeat.effect}</div>
                        <div class="feat-row"><strong>${background.feat.name}</strong>: ${background.feat.effect}</div>
                        <div class="feat-row" style="background:rgba(197, 160, 89, 0.1);"><strong>${synFeat.name}</strong>: ${synFeat.effect} ${synFeat.cost ? `<br><em>Cost: ${synFeat.cost}</em>` : ''}</div>
                        
                        ${c.talents.length > 0 ? c.talents.map(t => `
                            <div class="feat-row">
                                <strong>${t.name}</strong> 
                                ${t.choice ? `<span style="color:var(--accent-gold); font-weight:bold; font-size:0.9em;">(${t.choice.toUpperCase()})</span>` : ''}
                                <span style="color:#666; font-size:0.8em;">(${t.type})</span>: 
                                ${t.effect}
                                ${t.cost ? `<em style="float:right; font-size:0.75rem;">[${t.cost}]</em>` : ''}
                            </div>
                        `).join('') : ''}
                    </div>
                </div>
            </div>
            
            <!-- PAGE BREAK -->
            <div style="page-break-before: always;"></div>

            <!-- PAGE 2: INVENTORY, NOTES & RULES -->
            <div class="sheet-wrapper" style="margin-top: 20px;">
                <div class="sheet-header">
                    <div class="sheet-name">Inventory & Notes</div>
                </div>

                <div class="sheet-grid">
                    <div class="col-left">
                        <div class="sheet-section-title">Gear (${c.derived.slots} Slots)</div>
                        <div class="inv-grid">
                            ${Array.from({length: 12}).map((_, i) => {
                                const item = gear[i];
                                return `
                                <div class="inv-slot">
                                    <span class="slot-num">${i+1}</span>
                                    <span class="slot-content">${item ? item.name : ''}</span>
                                    <span class="slot-qty">${item && item.slots ? item.slots : ''}</span>
                                </div>`;
                            }).join('')}
                        </div>

                        <div class="sheet-section-title" style="margin-top:1rem;">Materials Pouch</div>
                        <div class="resource-grid" style="grid-template-columns: 1fr 1fr;">
                            <div class="resource-box"><div class="label">Organics</div><div class="resource-val" style="font-size:1.2rem;">${materials.Organics}</div></div>
                            <div class="resource-box"><div class="label">Scrap</div><div class="resource-val" style="font-size:1.2rem;">${materials.Scrap}</div></div>
                            <div class="resource-box"><div class="label">Flora</div><div class="resource-val" style="font-size:1.2rem;">${materials.Flora}</div></div>
                            <div class="resource-box"><div class="label">Essence</div><div class="resource-val" style="font-size:1.2rem;">${materials.Essence}</div></div>
                        </div>
                        <p style="font-size:0.7rem; text-align:center; margin-top:5px;">3 Bundles = 1 Inventory Slot</p>

                        <div class="sheet-section-title" style="margin-top:1rem;">Wealth</div>
                        <div class="currency-box">
                            <div><span>Gold:</span> ${c.currency.g}</div>
                            <div><span>Silver:</span> ${c.currency.s}</div>
                            <div><span>Copper:</span> ${c.currency.c}</div>
                        </div>
                    </div>

                    <div class="col-right">
                        <div class="sheet-section-title">Conditions</div>
                        <div class="cond-grid">
                            ${['Blinded', 'Burning', 'Bleeding', 'Charmed', 'Confused', 'Dazed', 'Deafened', 'Exhausted', 'Frightened', 'Grappled', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Weakened'].map(cond => 
                                renderCond(cond)
                            ).join('')}
                        </div>

                        <div class="sheet-section-title" style="margin-top:1rem;">Notes</div>
                        <textarea id="inp-notes" style="width:100%; height:150px; border:1px solid #ccc; padding:5px; font-family:var(--font-body);">${c.notes}</textarea>

                        <div class="sheet-section-title" style="margin-top:1rem;">Quick Rules</div>
                        <div class="rules-ref">
                            <p><strong>The Roll:</strong> d20 + Mod + Prof Die vs DC.</p>
                            <p><strong>Crit (Nat 20):</strong> Double Damage OR Gain 1 Luck.</p>
                            <p><strong>Whiff (Nat 1):</strong> GM Gains 1 Danger Point + Whiff Table.</p>
                            <hr style="margin:5px 0; border:0; border-top:1px solid #ccc;">
                            <p><strong>Death:</strong> 0 HP = Dying. Start of Turn: CON Check (DC 13). Pass = Stable. Fail = Dead.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 5. Inject
        el.innerHTML = html;

        // 6. Attach Listeners for Interactive Elements
        
        // Live Updates for Stats
        const bindInput = (id, field) => {
            const input = document.getElementById(id);
            if(input) {
                input.addEventListener('change', (e) => {
                    c.current[field] = parseInt(e.target.value);
                    // Auto-save on change? Or wait for Save button? 
                    // Let's rely on explicit save button for performance, but update object in memory
                });
            }
        };
        bindInput('inp-xp', 'xp');
        bindInput('inp-hp', 'hp');
        bindInput('inp-sta', 'sta');
        bindInput('inp-mp', 'mp');
        bindInput('inp-luck', 'luck');

        // Notes
        const noteInput = document.getElementById('inp-notes');
        if(noteInput) {
            noteInput.addEventListener('change', (e) => c.notes = e.target.value);
        }

        // Conditions
        el.querySelectorAll('.cond-toggle').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const cond = e.target.dataset.cond;
                if (e.target.checked) {
                    if (!c.activeConditions.includes(cond)) c.activeConditions.push(cond);
                } else {
                    c.activeConditions = c.activeConditions.filter(x => x !== cond);
                }
            });
        });

        // Button Listeners
        document.getElementById('btn-print-pdf').addEventListener('click', () => window.print());
        document.getElementById('btn-save-lib').addEventListener('click', CharGen.saveCharacter);
        
        const btnLevel = document.getElementById('btn-levelup');
        if (btnLevel) {
            if (c.level >= 10) {
                btnLevel.disabled = true;
                btnLevel.textContent = "Max Level";
            } else {
                btnLevel.onclick = () => CharGen.initLevelUp();
            }
        }

        if (pendingSynergy) {
            const btnSyn = document.getElementById('btn-resolve-synergy');
            if (btnSyn) {
                btnSyn.addEventListener('click', () => {
                    CharGen.resolveSynergyGrant(pendingSynergy);
                });
            }
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
        const data = I18n.getData('options'); // This line was missing
        
        let maxArmorAS = 0;
        let shieldBonus = 0;
        let otherBonus = 0;

        // 1. Check Inventory for Armor and Shields
        c.inventory.forEach(i => {
            // Armor doesn't stack, take highest
            if (i.as && !i.name.includes("Shield")) {
                if (i.as > maxArmorAS) maxArmorAS = i.as;
            }
            // Shields stack
            if (i.name.includes("Shield")) {
                shieldBonus = 1; // Base shield bonus
                // Note: Tower Shield penalty logic is handled in calculateDefenses, 
                // but if you have a specific item "Tower Shield" that gives +2 natively, check here.
                // For this system, "Tower Shield Training" is a passive talent that boosts this.
            }
        });

        // 2. Check Passive Talents
        let unarmoredDef = false;
        c.talents.forEach(t => {
            // Generic AS bonuses (e.g. Armored Behemoth, Iron Hide)
            if (t.modifiers && t.modifiers.as_bonus) otherBonus += t.modifiers.as_bonus;
            // Specific Unarmored Defense Check
            if (t.name === "Unarmored Defense") unarmoredDef = true;
            // Tower Shield Training Check
            if (t.name === "Tower Shield Training" && shieldBonus > 0) shieldBonus = 2;
        });

        // 3. Check Synergy Feats (Level 5/10 Class Bonuses)
        if (c.classId) {
            const cls = data.classes.find(cl => cl.id === c.classId);
            if (cls) {
                cls.synergy_feats.filter(f => f.level <= c.level).forEach(f => {
                    if (f.modifiers && f.modifiers.as_bonus) {
                        otherBonus += f.modifiers.as_bonus;
                    }
                });
            }
        }

        // 4. Calculate Total
        let total = maxArmorAS + shieldBonus + otherBonus;

        // Handle Unarmored Defense (Monk/Skirmisher logic)
        // If wearing no armor (maxArmorAS is 0), AS = DEX Mod
        if (unarmoredDef && maxArmorAS === 0) {
            const dex = c.stats.DEX || 0;
            const naturalArmor = Math.min(3, Math.max(0, dex)); 
            total = naturalArmor + shieldBonus + otherBonus;
        }

        return total;
    },

    /* ------------------------------------------------------------------
       LOGIC: SKILL CALCULATION
       ------------------------------------------------------------------ */
    
    calculateSkills: () => {
        const data = I18n.getData('options');
        const c = CharGen.char;
        const skillCounts = {}; 

        const add = (id) => {
            if (!id) return;
            skillCounts[id] = (skillCounts[id] || 0) + 1;
        };

        // ... (Existing helper: mapStringToId) ...
        const mapStringToId = (str) => {
            if (!str) return null;
            const s = str.toLowerCase();
            if (s.includes("athletics")) return "athletics";
            if (s.includes("acrobatics")) return "acrobatics";
            if (s.includes("stealth")) return "stealth";
            if (s.includes("craft")) return "craft";
            if (s.includes("lore")) return "lore";
            if (s.includes("investigate")) return "investigate";
            if (s.includes("scrutiny")) return "scrutiny";
            if (s.includes("survival")) return "survival";
            if (s.includes("medicine")) return "medicine";
            if (s.includes("influence")) return "influence";
            if (s.includes("deception")) return "deception";
            if (s.includes("intimidat")) return "intimidation";
            return null;
        };

        // 1. Ancestry Skills (Standard logic)
        if (c.ancestry && c.ancestryFeatIndex !== null) {
            const anc = data.ancestries.find(a => a.id === c.ancestry);
            const feat = anc.feats[c.ancestryFeatIndex];
            if (feat && feat.modifiers) {
                if (feat.modifiers.skill_train) add(feat.modifiers.skill_train);
                if (feat.modifiers.select_skill && c.ancestrySkill) add(c.ancestrySkill);
            }
        }

        // 2. Background Skills (Standard logic)
        if (c.background) {
            const bg = data.backgrounds.find(b => b.id === c.background);
            if (bg && bg.skill) add(mapStringToId(bg.skill));
        }

        // 3. Archetype Base Skills (Standard logic)
        // ... (Keep existing logic for looking up arch.proficiencies.skills) ...
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

        // 4. TALENT CHOICES (NEW)
        // Iterate through selected talents. If they have a 'choice' that is a skill ID, apply it.
        c.talents.forEach(t => {
            if (t.flags && t.flags.select_skill && t.choice) {
                add(t.choice); // e.g., 'stealth'
            }
            // Some talents might force a skill (rare in this system, but possible)
            if (t.modifiers && t.modifiers.skill_train) {
                add(t.modifiers.skill_train);
            }
        });
        

        // Format Output (Die Calculation)
        const fullList = [
            {id: "athletics", name: "Athletics", stat: "STR"},
            {id: "acrobatics", name: "Acrobatics", stat: "DEX"},
            {id: "stealth", name: "Stealth & Thievery", stat: "DEX"},
            {id: "craft", name: "Craft & Tinker", stat: "INT"},
            {id: "lore", name: "Lore & Knowledge", stat: "INT"},
            {id: "investigate", name: "Investigate", stat: "INT"},
            {id: "scrutiny", name: "Scrutiny", stat: "WIS"},
            {id: "survival", name: "Survival", stat: "WIS"},
            {id: "medicine", name: "Medicine", stat: "WIS"},
            {id: "influence", name: "Influence", stat: "CHA"},
            {id: "deception", name: "Deception", stat: "CHA"},
            {id: "intimidation", name: "Intimidation", stat: "CHA"}
        ];

        return fullList.map(sk => {
            const count = skillCounts[sk.id] || 0;
            let die = "-";
            if (count === 1) die = "d4"; // Trained
            if (count >= 2) die = "d6";  // Expert
            
            return {
                ...sk,
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

        // 1. Update Basic Stats
        c.level = newLevel;
        if (!c.baseHP) c.baseHP = c.derived.maxHP; // Safety init if missing
        c.baseHP += state.newHP; 

        // 2. Add Talent (With Choice Handling)
        if (state.selectedTalent) {
            const t = state.selectedTalent;
            
            // If talent requires a choice (like Arcane Specialization), trigger the modal
            if (t.flags && (t.flags.select_mod || t.flags.select_skill || t.flags.select_property)) {
                // Determine archetype ID for the modal logic
                // We search which archetype this talent belongs to by name
                let arch = data.archetypes.find(a => a.name === t.sourceName);
                // Fallback if sourceName is formatted differently
                if (!arch) arch = data.archetypes.find(a => a.id === c.archA);

                setTimeout(() => {
                   CharGen.renderChoiceModal(t, arch.id, 0, 'levelup-context');
                }, 200); 
            } else {
                // Simple add
                c.talents.push(t);
            }
        }

        // 3. Apply Milestones (Synergy + Stat)
        if (newLevel === 5 || newLevel === 10) {
            if (state.selectedStat) {
                c.stats[state.selectedStat] += 1;
            }
        }

        // 4. Recalculate
        CharGen.calculateDerived();
        CharGen.calculateDefenses();

        // 5. Refresh UI
        // If we launched the modal, it will handle the refresh on confirm.
        // If not, we do it here.
        if (!state.selectedTalent || !(state.selectedTalent.flags && (state.selectedTalent.flags.select_mod || state.selectedTalent.flags.select_skill || state.selectedTalent.flags.select_property))) {
            CharGen.renderSheet(CharGen.container);
            alert(`Level Up Complete! Welcome to Level ${newLevel}.`);
        }
    },
};