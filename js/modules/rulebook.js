import { I18n } from '../utils/i18n.js';
import { Dice } from '../utils/dice.js';

export const Rulebook = {
    
    // Hover-over definitions for common terms
    keywords: {
        "Advantage": "Roll 2d20, keep the Highest.",
        "Disadvantage": "Roll 2d20, keep the Lowest.",
        "Critical Pass": "Natural 20. Auto-Success + Bonus.",
        "Whiff": "Natural 1. Auto-Fail + Danger Point.",
        "Danger Point": "GM currency to trigger bad events.",
        "Stamina": "Warrior Resource. Regains on Crit or Catch Breath.",
        "Mana": "Caster Resource. Regains on Long Rest.",
        "Luck": "Specialist Resource. Regains on Crit or Long Rest.",
        "Blinded": "Disadvantage on Attacks/Checks. Enemies have Advantage.",
        "Frightened": "Cannot move closer. Disadvantage on checks.",
        "Dazed": "Action OR Move only. No Reactions.",
        "Stunned": "Incapacitated. Auto-fail Defense.",
        "Grappled": "Speed 0.",
        "Restrained": "Speed 0. Disadvantage on DEX saves/Attacks.",
        "Prone": "Disadvantage on Attacks. Melee has Advantage against you.",
        "Weakened": "Damage dealt is halved."
    },

    init: (container) => {
        // Add CSS class for specific rulebook layout
        container.classList.add('rulebook-container');
        Rulebook.renderLayout(container);
    },

    renderLayout: (container) => {
        const data = I18n.getData('rules');
        if (!data) return;

        // 1. The Shell
        const html = `
            <div class="rb-layout">
                <nav class="rb-toc">
                    <div class="rb-search-box">
                        <input type="text" id="rb-search" placeholder="Search Rules...">
                    </div>
                    <ul id="rb-toc-list"></ul>
                </nav>
                <article class="rb-content" id="rb-viewer">
                    <div class="rb-placeholder">
                        <h3>Grim Delve Rulebook</h3>
                        <p>Select a section to begin reading.</p>
                    </div>
                </article>
            </div>
        `;
        container.innerHTML = html;

        // 2. Populate TOC
        Rulebook.renderTOC(data);

        // 3. Search Listener
        document.getElementById('rb-search').addEventListener('input', Rulebook.handleSearch);

        // 4. Load first chapter by default
        if(data.length > 0) Rulebook.loadChapter(data[0].id);
    },

    renderTOC: (data) => {
        const list = document.getElementById('rb-toc-list');
        list.innerHTML = data.map(chapter => `
            <li class="toc-chapter">
                <div class="toc-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
                    ${chapter.title} <span class="toc-chevron">▼</span>
                </div>
                <ul class="toc-sections collapsed">
                    ${chapter.sections.map(sect => `
                        <li class="toc-item" data-id="${sect.id}" onclick="import('./js/modules/rulebook.js').then(m => m.Rulebook.scrollToSection('${sect.id}'))">
                            ${sect.title}
                        </li>
                    `).join('')}
                </ul>
            </li>
        `).join('');
        
        // Bind clicks for chapter loading (headings)
        list.querySelectorAll('.toc-header').forEach((header, index) => {
            header.addEventListener('click', () => {
                Rulebook.loadChapter(data[index].id);
            });
        });
    },

    loadChapter: (chapterId) => {
        const data = I18n.getData('rules');
        const chapter = data.find(c => c.id === chapterId);
        const viewer = document.getElementById('rb-viewer');
        
        if (!chapter) return;

        let html = `<h1 class="rb-chapter-title">${chapter.title}</h1>`;
        
        chapter.sections.forEach(sect => {
            html += `
                <section id="${sect.id}" class="rb-section">
                    <h3 class="rb-section-title">${sect.title}</h3>
                    <div class="rb-text">
                        ${Rulebook.processContent(sect.content)}
                    </div>
                </section>
                <hr class="rb-divider">
            `;
        });

        viewer.innerHTML = html;
        viewer.scrollTop = 0;

        // Attach interactive elements
        Rulebook.attachTableRollers(viewer);
    },

    scrollToSection: (sectionId) => {
        // Find the chapter containing this section
        const data = I18n.getData('rules');
        const chapter = data.find(c => c.sections.some(s => s.id === sectionId));
        
        if (chapter) {
            // Load chapter if not already there (optimization check omitted for brevity)
            Rulebook.loadChapter(chapter.id);
            
            // Scroll to section
            setTimeout(() => {
                const el = document.getElementById(sectionId);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    },

    processContent: (text) => {
        let processed = text;
        
        // 1. Inject Keywords
        for (const [key, desc] of Object.entries(Rulebook.keywords)) {
            // Matches whole word, global
            const regex = new RegExp(`\\b(${key})\\b`, 'g'); 
            processed = processed.replace(regex, `<span class="keyword" title="${desc}">$1</span>`);
        }

        // 2. Dynamic Data Injection
        // Char Options
        if (text.includes('[[DYNAMIC_ANCESTRIES]]')) processed = processed.replace('[[DYNAMIC_ANCESTRIES]]', Rulebook.generateAncestryTable());
        if (text.includes('[[DYNAMIC_BACKGROUNDS]]')) processed = processed.replace('[[DYNAMIC_BACKGROUNDS]]', Rulebook.generateBackgroundTable());
        if (text.includes('[[DYNAMIC_ARCHETYPES]]')) processed = processed.replace('[[DYNAMIC_ARCHETYPES]]', Rulebook.generateArchetypeTable());
        if (text.includes('[[DYNAMIC_CLASSES]]')) processed = processed.replace('[[DYNAMIC_CLASSES]]', Rulebook.generateClassTable());
        
        // Items & Economy
        if (text.includes('[[DYNAMIC_ARMOR]]')) processed = processed.replace('[[DYNAMIC_ARMOR]]', Rulebook.generateArmorTable());
        if (text.includes('[[DYNAMIC_WEAPONS]]')) processed = processed.replace('[[DYNAMIC_WEAPONS]]', Rulebook.generateWeaponTable());
        if (text.includes('[[DYNAMIC_GEAR]]')) processed = processed.replace('[[DYNAMIC_GEAR]]', Rulebook.generateGearTable());
        if (text.includes('[[DYNAMIC_REAGENTS]]')) processed = processed.replace('[[DYNAMIC_REAGENTS]]', Rulebook.generateReagentTable());

        // Bestiary
        if (text.includes('[[DYNAMIC_CHASSIS_TABLES]]')) processed = processed.replace('[[DYNAMIC_CHASSIS_TABLES]]', Rulebook.generateChassisTables());
        if (text.includes('[[DYNAMIC_FAMILY_REFERENCE]]')) processed = processed.replace('[[DYNAMIC_FAMILY_REFERENCE]]', Rulebook.generateFamilyReference());
        
        return processed;
    },

    /* --- DYNAMIC GENERATORS: CHAR OPTIONS --- */
    
    generateAncestryTable: () => {
        const opts = I18n.getData('options');
        if (!opts) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>Ancestry</th><th>Desc</th><th>Key Trait Example</th></tr></thead><tbody>`;
        opts.ancestries.forEach(a => {
            const feat = a.feats && a.feats.length > 0 ? a.feats[0].name : "-";
            html += `<tr><td><strong>${a.name}</strong></td><td>${a.description}</td><td>${feat}</td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    generateBackgroundTable: () => {
        const opts = I18n.getData('options');
        if (!opts) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>Background</th><th>Skill</th><th>Special Ability</th></tr></thead><tbody>`;
        opts.backgrounds.forEach(b => {
            html += `<tr><td><strong>${b.name}</strong></td><td>${b.skill}</td><td><strong>${b.feat.name}:</strong> ${b.feat.effect}</td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    generateArchetypeTable: () => {
        const opts = I18n.getData('options');
        if (!opts) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>Archetype</th><th>Role</th><th>Resource</th><th>Focus</th></tr></thead><tbody>`;
        opts.archetypes.forEach(a => {
            html += `<tr><td><strong>${a.name}</strong></td><td>${a.role}</td><td>${a.resource}</td><td>${a.description}</td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    generateClassTable: () => {
        const opts = I18n.getData('options');
        if (!opts) return "<em>Data missing.</em>";
        
        const sortedClasses = [...opts.classes].sort((a, b) => a.name.localeCompare(b.name));
        
        let html = `<table class="table">
            <thead>
                <tr>
                    <th>Class Name</th>
                    <th>Type</th>
                    <th>Archetypes</th>
                </tr>
            </thead>
            <tbody>`;
            
        sortedClasses.forEach(c => {
            const archA = opts.archetypes.find(a => a.name === c.components[0]);
            const archB = opts.archetypes.find(a => a.name === c.components[1]);

            let type = "Hybrid Class"; 
            let style = "color:var(--text-muted);"; 

            if (archA && archB) {
                if (archA.id === archB.id) {
                    type = "Pure Class";
                    style = "color:var(--accent-gold); font-weight:bold;";
                } else if (archA.role === archB.role) {
                    type = `Full ${archA.role}`;
                    style = "color:var(--accent-blue); font-weight:bold;";
                }
            }

            html += `<tr>
                <td><strong>${c.name}</strong></td>
                <td><span style="font-size:0.85em; ${style}">${type}</span></td>
                <td>${c.components[0]} + ${c.components[1]}</td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        return html;
    },

    /* --- DYNAMIC GENERATORS: ITEMS --- */

    generateArmorTable: () => {
        const data = I18n.getData('items');
        if (!data) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>Armor</th><th>AS</th><th>Slots</th><th>Cost</th><th>Notes</th></tr></thead><tbody>`;
        data.armor.forEach(i => {
            html += `<tr><td><strong>${i.name}</strong></td><td>${i.as}</td><td>${i.slots}</td><td>${i.cost}</td><td><span style="font-size:0.85em">${i.penalty || i.description || "-"}</span></td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    generateWeaponTable: () => {
        const data = I18n.getData('items');
        if (!data) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>Weapon</th><th>Dmg</th><th>Slots</th><th>Cost</th><th>Properties</th></tr></thead><tbody>`;
        data.weapons.forEach(w => {
            const tags = w.tags ? w.tags.join(', ') : '-';
            html += `<tr><td><strong>${w.name}</strong></td><td>${w.damage}</td><td>${w.slots}</td><td>${w.cost}</td><td><span style="font-size:0.85em">${tags}</span></td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    generateGearTable: () => {
        const data = I18n.getData('items');
        if (!data) return "<em>Data missing.</em>";
        
        const groups = {};
        [...data.gear, ...data.materials].forEach(item => {
            const type = item.type || "Misc";
            if (!groups[type]) groups[type] = [];
            groups[type].push(item);
        });

        let html = "";
        for (const [type, items] of Object.entries(groups)) {
            html += `<h4>${type}</h4><table class="table"><thead><tr><th>Item</th><th>Slots</th><th>Cost</th><th>Effect</th></tr></thead><tbody>`;
            items.forEach(i => {
                 html += `<tr><td><strong>${i.name}</strong></td><td>${i.slots}</td><td>${i.cost}</td><td><span style="font-size:0.85em">${i.effect || i.description}</span></td></tr>`;
            });
            html += `</tbody></table>`;
        }
        return html;
    },

    generateReagentTable: () => {
        const data = I18n.getData('items');
        if (!data) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>Reagent</th><th>Type</th><th>Cost (Mats)</th><th>DC</th><th>Effect</th></tr></thead><tbody>`;
        data.reagents.forEach(r => {
            html += `<tr><td><strong>${r.name}</strong></td><td>${r.type}</td><td>${r.cost}</td><td>${r.craft_dc}</td><td><span style="font-size:0.85em">${r.effect}</span></td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    /* --- DYNAMIC GENERATORS: MONSTERS --- */

    generateChassisTables: () => {
        const data = I18n.getData('monsters');
        if (!data || !data.chassis) return "<em>Data missing.</em>";

        let html = "";
        for (const [role, levels] of Object.entries(data.chassis)) {
            const roleName = role.charAt(0).toUpperCase() + role.slice(1);
            html += `<h4>${roleName}</h4>`;
            html += `<table class="table" style="font-size:0.85rem;">`;
            html += `<thead><tr>
                <th>Lvl</th><th>HP</th><th>AS</th><th>Spd</th>
                <th>Atk DC</th><th>Def DC</th><th>Save DC</th><th>Dmg</th>
            </tr></thead><tbody>`;
            
            levels.forEach(stat => {
                html += `<tr>
                    <td><strong>${stat.lvl}</strong></td>
                    <td>${stat.hp}</td>
                    <td>${stat.as}</td>
                    <td>${stat.speed}</td>
                    <td style="color:var(--accent-crimson)">${stat.atk_dc}</td>
                    <td style="color:var(--accent-blue)">${stat.def_dc}</td>
                    <td>${stat.save_dc}</td>
                    <td>${stat.dmg}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
        }
        return html;
    },

    generateFamilyReference: () => {
        const data = I18n.getData('monsters');
        if (!data || !data.families) return "<em>Data missing.</em>";

        let html = "";
        for (const [key, fam] of Object.entries(data.families)) {
            html += `<div class="rb-family-block" style="margin-bottom:2rem; padding:1rem; border:1px solid #444; background:rgba(0,0,0,0.2);">`;
            html += `<h3 style="color:var(--accent-gold); border-bottom:1px solid #444; padding-bottom:5px;">${fam.name}</h3>`;
            html += `<p><em>${fam.description}</em></p>`;

            if (fam.universal_traits) {
                html += `<h5>Universal Traits</h5><ul>`;
                fam.universal_traits.forEach(t => {
                    html += `<li><strong>${t.name}:</strong> ${t.effect}</li>`;
                });
                html += `</ul>`;
            }

            const harvestTrait = fam.universal_traits.find(t => t.name === "Harvestable");
            if (harvestTrait) {
                 html += `<div style="background:rgba(255,255,255,0.05); padding:5px; border-left:3px solid var(--accent-blue); margin:10px 0; font-size:0.9rem;"><strong>Harvesting:</strong> ${harvestTrait.effect}</div>`;
            }
            
            // Briefly list sample danger abilities
            if (fam.danger_abilities) {
                 html += `<h5>Signature Danger Abilities</h5><ul style="font-size:0.9rem;">`;
                 fam.danger_abilities.slice(0, 3).forEach(ab => {
                     html += `<li><strong>${ab.name} (${ab.cost}):</strong> ${ab.effect}</li>`;
                 });
                 html += `<li><em>...and more.</em></li></ul>`;
            }

            html += `</div>`;
        }
        return html;
    },

    /* --- UTILITIES --- */
    
    attachTableRollers: (container) => {
        const tables = container.querySelectorAll('table');
        tables.forEach(table => {
            const th = table.querySelector('th');
            // Check for dice string (d6, d12, etc)
            if (th && /[dD]\d+/.test(th.textContent)) {
                const diceStr = th.textContent.match(/[dD]\d+/)[0];
                const btn = document.createElement('button');
                btn.className = 'roll-btn-table';
                btn.innerHTML = `🎲 ${diceStr}`;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    Rulebook.rollTable(table, diceStr);
                };
                th.innerHTML = '';
                th.appendChild(btn);
            }
        });
    },

    rollTable: (table, diceNotation) => {
        const result = Dice.roll(diceNotation);
        const rollVal = result.total;

        table.querySelectorAll('tr').forEach(tr => tr.classList.remove('highlight-row'));

        const rows = table.querySelectorAll('tr');
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const cellText = rows[i].cells[0].textContent.trim();
            let isMatch = false;
            
            // Handle "1-4" ranges or "1"
            if (cellText.includes('-')) {
                const [min, max] = cellText.split('-').map(n => parseInt(n));
                if (rollVal >= min && rollVal <= max) isMatch = true;
            } else {
                // Handle "1 (Nat 1)" vs "1"
                const num = parseInt(cellText);
                if (!isNaN(num) && num === rollVal) isMatch = true;
            }

            if (isMatch) {
                rows[i].classList.add('highlight-row');
                rows[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                // Simple toast for feedback
                // alert(`Roll: ${rollVal}\nResult: ${rows[i].cells[1].textContent}`); 
                break;
            }
        }
    },

    handleSearch: (e) => {
        const term = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.toc-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(term)) {
                item.style.display = 'block';
                item.parentElement.classList.remove('collapsed');
            } else {
                item.style.display = 'none';
            }
        });
    }
};