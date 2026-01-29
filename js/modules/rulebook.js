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
        container.classList.add('rulebook-container');
        Rulebook.renderLayout(container);
    },

    renderLayout: (container) => {
        const data = I18n.getData('rules');
        const t = I18n.t;

        if (!data) return container.innerHTML = `<p>${t('lbl_loading')}</p>`;

        const html = `
            <div class="rb-layout">
                <nav class="rb-toc">
                    <div class="rb-search-box">
                        <input type="text" id="rb-search" placeholder="${t('lib_search')}">
                    </div>
                    <ul id="rb-toc-list"></ul>
                </nav>
                <article class="rb-content" id="rb-viewer">
                    <div class="rb-placeholder">
                        <h3>Grim Delve</h3>
                        <p>${t('nav_home')}</p>
                    </div>
                </article>
            </div>
        `;
        container.innerHTML = html;

        Rulebook.renderTOC(data);

        document.getElementById('rb-search').addEventListener('input', Rulebook.handleSearch);

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

        Rulebook.attachTableRollers(viewer);
    },

    scrollToSection: (sectionId) => {
        const data = I18n.getData('rules');
        const chapter = data.find(c => c.sections.some(s => s.id === sectionId));
        
        if (chapter) {
            Rulebook.loadChapter(chapter.id);
            setTimeout(() => {
                const el = document.getElementById(sectionId);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    },

    processContent: (text) => {
        let processed = text;

        // 1. Dynamic Data Injection (Must happen BEFORE keyword processing)
        if (text.includes('[[DYNAMIC_ANCESTRIES]]')) processed = processed.replace('[[DYNAMIC_ANCESTRIES]]', Rulebook.generateAncestryTable());
        if (text.includes('[[DYNAMIC_BACKGROUNDS]]')) processed = processed.replace('[[DYNAMIC_BACKGROUNDS]]', Rulebook.generateBackgroundTable());
        if (text.includes('[[DYNAMIC_ARCHETYPES]]')) processed = processed.replace('[[DYNAMIC_ARCHETYPES]]', Rulebook.generateArchetypeTable());
        if (text.includes('[[DYNAMIC_CLASSES]]')) processed = processed.replace('[[DYNAMIC_CLASSES]]', Rulebook.generateClassTable());
        if (text.includes('[[DYNAMIC_ARMOR]]')) processed = processed.replace('[[DYNAMIC_ARMOR]]', Rulebook.generateArmorTable());
        if (text.includes('[[DYNAMIC_WEAPONS]]')) processed = processed.replace('[[DYNAMIC_WEAPONS]]', Rulebook.generateWeaponTable());
        if (text.includes('[[DYNAMIC_GEAR]]')) processed = processed.replace('[[DYNAMIC_GEAR]]', Rulebook.generateGearTable());
        if (text.includes('[[DYNAMIC_REAGENTS]]')) processed = processed.replace('[[DYNAMIC_REAGENTS]]', Rulebook.generateReagentTable());
        if (text.includes('[[DYNAMIC_CHASSIS_TABLES]]')) processed = processed.replace('[[DYNAMIC_CHASSIS_TABLES]]', Rulebook.generateChassisTables());
        if (text.includes('[[DYNAMIC_FAMILY_REFERENCE]]')) processed = processed.replace('[[DYNAMIC_FAMILY_REFERENCE]]', Rulebook.generateFamilyReference());
        if (text.includes('[[DYNAMIC_LOOT_TABLE_1]]')) processed = processed.replace('[[DYNAMIC_LOOT_TABLE_1]]', Rulebook.generateLootTable('tier_1'));
        if (text.includes('[[DYNAMIC_LOOT_TABLE_2]]')) processed = processed.replace('[[DYNAMIC_LOOT_TABLE_2]]', Rulebook.generateLootTable('tier_2'));
        if (text.includes('[[DYNAMIC_LOOT_TABLE_3]]')) processed = processed.replace('[[DYNAMIC_LOOT_TABLE_3]]', Rulebook.generateLootTable('tier_3'));
        if (text.includes('[[DYNAMIC_COMMODITIES]]')) processed = processed.replace('[[DYNAMIC_COMMODITIES]]', Rulebook.generateCommoditiesTable());
        if (text.includes('[[DYNAMIC_ART_GENERATOR]]')) processed = processed.replace('[[DYNAMIC_ART_GENERATOR]]', Rulebook.generateArtTable());
        if (text.includes('[[DYNAMIC_CURIOS]]')) processed = processed.replace('[[DYNAMIC_CURIOS]]', Rulebook.generateCuriosTable());
        if (text.includes('[[DYNAMIC_MAGIC_ARMOR]]')) processed = processed.replace('[[DYNAMIC_MAGIC_ARMOR]]', Rulebook.generateMagicTable('armor'));
        if (text.includes('[[DYNAMIC_MAGIC_WEAPONS]]')) processed = processed.replace('[[DYNAMIC_MAGIC_WEAPONS]]', Rulebook.generateMagicTable('weapon'));
        if (text.includes('[[DYNAMIC_MAGIC_WONDROUS]]')) processed = processed.replace('[[DYNAMIC_MAGIC_WONDROUS]]', Rulebook.generateMagicTable('wondrous'));

        // 2. Shield Headers (Temporary removal of headers to prevent tooltips inside them)
        const headers = [];
        processed = processed.replace(/<h[1-6]>.*?<\/h[1-6]>/gi, (match) => {
            headers.push(match);
            return `__HEADER_${headers.length - 1}__`;
        });

        // 3. Inject Keywords into Text Nodes only
        // Regex Logic: \b(Key)\b(?![^<]*>) checks that the word is NOT inside < > brackets
        for (const [key, desc] of Object.entries(Rulebook.keywords)) {
            const regex = new RegExp(`\\b(${key})\\b(?![^<]*>)`, 'gi'); 
            processed = processed.replace(regex, `<span class="keyword" title="${desc}">$1</span>`);
        }

        // 4. Restore Headers
        headers.forEach((h, i) => {
            processed = processed.replace(`__HEADER_${i}__`, h);
        });

        return processed;
    },

    /* --- DYNAMIC GENERATORS (Localized Headers) --- */
    
    generateAncestryTable: () => {
        const t = I18n.t;
        const opts = I18n.getData('options');
        if (!opts) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>${t('cg_lbl_ancestry')}</th><th>${t('lbl_desc')}</th><th>${t('mon_type_trait')}</th></tr></thead><tbody>`;
        opts.ancestries.forEach(a => {
            const feat = a.feats && a.feats.length > 0 ? a.feats[0].name : "-";
            html += `<tr><td><strong>${a.name}</strong></td><td>${a.description}</td><td>${feat}</td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    generateBackgroundTable: () => {
        const t = I18n.t;
        const opts = I18n.getData('options');
        if (!opts) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>${t('cg_lbl_background')}</th><th>${t('sheet_skills')}</th><th>${t('mon_type_trait')}</th></tr></thead><tbody>`;
        opts.backgrounds.forEach(b => {
            html += `<tr><td><strong>${b.name}</strong></td><td>${b.skill}</td><td><strong>${b.feat.name}:</strong> ${b.feat.effect}</td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    generateArchetypeTable: () => {
        const t = I18n.t;
        const opts = I18n.getData('options');
        if (!opts) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>${t('cg_lbl_arch_a')}</th><th>${t('mon_lbl_role')}</th><th>${t('cg_lbl_resource')}</th><th>${t('lbl_desc')}</th></tr></thead><tbody>`;
        opts.archetypes.forEach(a => {
            html += `<tr><td><strong>${a.name}</strong></td><td>${a.role}</td><td>${a.resource}</td><td>${a.description}</td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    generateClassTable: () => {
        const t = I18n.t;
        const opts = I18n.getData('options');
        if (!opts) return "<em>Data missing.</em>";
        
        const sortedClasses = [...opts.classes].sort((a, b) => a.name.localeCompare(b.name));
        
        let html = `<table class="table">
            <thead>
                <tr>
                    <th>${t('cg_step_class')}</th>
                    <th>Type</th>
                    <th>${t('cg_lbl_arch_a')} + ${t('cg_lbl_arch_b')}</th>
                </tr>
            </thead>
            <tbody>`;
            
        sortedClasses.forEach(c => {
            const archA = opts.archetypes.find(a => a.name === c.components[0]);
            const archB = opts.archetypes.find(a => a.name === c.components[1]);

            let type = "Hybrid"; 
            let style = "color:var(--text-muted);"; 

            if (archA && archB) {
                const roleA = I18n.normalize('roles', archA.role);
                const roleB = I18n.normalize('roles', archB.role);

                if (archA.id === archB.id) {
                    type = "Pure";
                    style = "color:var(--accent-gold); font-weight:bold;";
                } else if (roleA === roleB) {
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

    generateArmorTable: () => {
        const t = I18n.t;
        const data = I18n.getData('items');
        if (!data) return "<em>Data missing.</em>";

        let html = `<table class="table">
            <thead>
                <tr>
                    <th>${t('item_cat_armor')}</th>
                    <th>${t('mon_stat_as')}</th>
                    <th>Req</th>
                    <th>${t('cg_lbl_slots')}</th>
                    <th>${t('lbl_cost')}</th>
                    <th>${t('lbl_desc')}</th>
                </tr>
            </thead>
            <tbody>`;

        data.armor.forEach(i => {
            const requirement = i.req ? i.req : "-";
            const penaltyDesc = i.penalty ? `<br><small style="color:var(--accent-crimson)">${i.penalty}</small>` : "";
            
            html += `<tr>
                <td><strong>${i.name}</strong></td>
                <td>${i.as}</td>
                <td style="font-size:0.8em; font-family:var(--font-mono);">${requirement}</td>
                <td>${i.slots}</td>
                <td>${i.cost}</td>
                <td><span style="font-size:0.85em">${i.description}${penaltyDesc}</span></td>
            </tr>`;
        });

        html += `</tbody></table>`;
        return html;
    },

    generateWeaponTable: () => {
        const t = I18n.t;
        const data = I18n.getData('items');
        if (!data) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>${t('item_cat_weapon')}</th><th>${t('mon_stat_dmg')}</th><th>${t('cg_lbl_slots')}</th><th>${t('lbl_cost')}</th><th>Tags</th></tr></thead><tbody>`;
        data.weapons.forEach(w => {
            const tags = w.tags ? w.tags.join(', ') : '-';
            html += `<tr><td><strong>${w.name}</strong></td><td>${w.damage}</td><td>${w.slots}</td><td>${w.cost}</td><td><span style="font-size:0.85em">${tags}</span></td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    generateGearTable: () => {
        const t = I18n.t;
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
            html += `<h4>${type}</h4><table class="table"><thead><tr><th>${t('lbl_name')}</th><th>${t('cg_lbl_slots')}</th><th>${t('lbl_cost')}</th><th>${t('lbl_effect')}</th></tr></thead><tbody>`;
            items.forEach(i => {
                 html += `<tr><td><strong>${i.name}</strong></td><td>${i.slots}</td><td>${i.cost}</td><td><span style="font-size:0.85em">${i.effect || i.description}</span></td></tr>`;
            });
            html += `</tbody></table>`;
        }
        return html;
    },

    generateReagentTable: () => {
        const t = I18n.t;
        const data = I18n.getData('items');
        if (!data) return "<em>Data missing.</em>";
        let html = `<table class="table"><thead><tr><th>${t('lbl_reagent')}</th><th>Type</th><th>${t('lbl_cost')}</th><th>DC</th><th>${t('lbl_effect')}</th></tr></thead><tbody>`;
        data.reagents.forEach(r => {
            html += `<tr><td><strong>${r.name}</strong></td><td>${r.type}</td><td>${r.cost}</td><td>${r.craft_dc}</td><td><span style="font-size:0.85em">${r.effect}</span></td></tr>`;
        });
        html += `</tbody></table>`;
        return html;
    },

    generateLootTable: (tier) => {
        const t = I18n.t;
        const data = I18n.getData('items');
        if (!data || !data.loot_tables[tier]) return "<em>Loot Data Missing</em>";
        
        const table = data.loot_tables[tier];
        let html = `<table class="table"><thead><tr><th width="50">d20</th><th>${t('lbl_name')}</th><th>${t('lbl_value')}</th><th>${t('cg_lbl_slots')}</th></tr></thead><tbody>`;
        
        table.forEach(r => {
            html += `<tr>
                <td><strong>${r.roll}</strong></td>
                <td>${r.name}</td>
                <td>${r.value}</td>
                <td>${r.slots}</td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        return html;
    },

    /* --- NEW CHAPTER 11 GENERATORS --- */

    generateCommoditiesTable: () => {
        const t = I18n.t;
        const data = I18n.getData('items');
        if (!data || !data.commodities) return "<em>Data Missing</em>";

        let html = `<table class="table"><thead><tr><th width="50">d20</th><th>${t('lbl_commodity')}</th><th>${t('lbl_unit')}</th><th>${t('cg_lbl_slots')}</th><th>${t('lbl_value')}</th></tr></thead><tbody>`;
        
        data.commodities.forEach((c, idx) => {
            html += `<tr>
                <td><strong>${idx + 1}</strong></td>
                <td>${c.name}</td>
                <td>${c.unit}</td>
                <td>${c.slots}</td>
                <td>${c.value}</td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        return html;
    },

    generateArtTable: () => {
        const t = I18n.t;
        const data = I18n.getData('items');
        if (!data || !data.art_generator) return "<em>Data Missing</em>";

        const gen = data.art_generator;
        let html = `<table class="table"><thead><tr><th width="50">d20</th><th>${t('lbl_material')}</th><th>${t('lbl_form')}</th><th>${t('lbl_subject')}</th></tr></thead><tbody>`;
        
        for (let i = 0; i < 20; i++) {
            html += `<tr>
                <td><strong>${i + 1}</strong></td>
                <td>${gen.materials[i] || '-'}</td>
                <td>${gen.forms[i] || '-'}</td>
                <td>${gen.subjects[i] || '-'}</td>
            </tr>`;
        }
        
        html += `</tbody></table>`;
        return html;
    },

    generateCuriosTable: () => {
        const t = I18n.t;
        const data = I18n.getData('items');
        if (!data || !data.curios) return "<em>Data Missing</em>";

        let html = `<table class="table"><thead><tr><th width="50">d20</th><th>${t('lbl_name')}</th><th>${t('lbl_effect')}</th></tr></thead><tbody>`;
        
        data.curios.forEach(c => {
            html += `<tr>
                <td><strong>${c.roll}</strong></td>
                <td>${c.name}</td>
                <td><span style="font-size:0.85em">${c.effect}</span></td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        return html;
    },

    generateMagicTable: (type) => {
        const t = I18n.t;
        const data = I18n.getData('items');
        if (!data || !data.magic_effects[type]) return "<em>Data Missing</em>";

        const tiers = ['tier_1', 'tier_2', 'tier_3'];
        const tierLabels = [t('item_tier_1'), t('item_tier_2'), t('item_tier_3')];
        let html = "";

        tiers.forEach((tierKey, idx) => {
            const items = data.magic_effects[type][tierKey];
            if (!items) return;

            html += `<h4>${tierLabels[idx]}</h4>`;
            html += `<table class="table"><thead><tr><th width="50">d20</th><th>${t('lbl_name')}</th><th>${t('lbl_reagent')}</th><th>${t('lbl_effect')}</th></tr></thead><tbody>`;
            
            items.forEach((item, rIdx) => {
                html += `<tr>
                    <td><strong>${rIdx + 1}</strong></td>
                    <td>${item.name}</td>
                    <td style="color:var(--accent-gold); font-size:0.8em;">${item.reagent}</td>
                    <td><span style="font-size:0.85em">${item.effect}</span></td>
                </tr>`;
            });
            html += `</tbody></table>`;
        });

        return html;
    },

    /* --- DYNAMIC GENERATORS: MONSTERS --- */

    generateChassisTables: () => {
        const t = I18n.t;
        const data = I18n.getData('monsters');
        if (!data || !data.chassis) return "<em>Data missing.</em>";

        let html = "";
        for (const [role, levels] of Object.entries(data.chassis)) {
            // Localize Role Name
            const roleName = t('role_' + role) !== ('role_' + role) ? t('role_' + role) : role;
            const displayRole = roleName.charAt(0).toUpperCase() + roleName.slice(1);
            
            html += `<h4>${displayRole}</h4>`;
            html += `<table class="table" style="font-size:0.85rem;">`;
            html += `<thead><tr>
                <th>${t('mon_lbl_level')}</th><th>${t('mon_stat_hp')}</th><th>${t('mon_stat_as')}</th><th>${t('mon_stat_spd')}</th>
                <th>${t('mon_stat_atk')}</th><th>${t('mon_stat_def')}</th><th>${t('mon_stat_save')}</th><th>${t('mon_stat_dmg')}</th>
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
        const t = I18n.t;
        const data = I18n.getData('monsters');
        if (!data || !data.families) return "<em>Data missing.</em>";

        let html = "";
        for (const [key, fam] of Object.entries(data.families)) {
            html += `<div class="rb-family-block" style="margin-bottom:2rem; padding:1rem; border:1px solid #444; background:rgba(0,0,0,0.2);">`;
            html += `<h3 style="color:var(--accent-gold); border-bottom:1px solid #444; padding-bottom:5px;">${fam.name}</h3>`;
            html += `<p><em>${fam.description}</em></p>`;

            if (fam.universal_traits) {
                html += `<h5>${t('mon_sect_traits')}</h5><ul>`;
                fam.universal_traits.forEach(trait => {
                    html += `<li><strong>${trait.name}:</strong> ${trait.effect}</li>`;
                });
                html += `</ul>`;
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
            // Check for dice string (d6, d12, etc) inside the first header
            // OR if the first header IS the dice string (e.g. "d20")
            if (th) {
                let diceStr = null;
                const txt = th.textContent.trim();
                
                if (/[dD]\d+/.test(txt)) {
                    diceStr = txt.match(/[dD]\d+/)[0];
                }

                if (diceStr) {
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
            
            // Handle range "1-2"
            if (cellText.includes('-')) {
                const [min, max] = cellText.split('-').map(n => parseInt(n));
                if (rollVal >= min && rollVal <= max) isMatch = true;
            } else {
                const num = parseInt(cellText);
                if (!isNaN(num) && num === rollVal) isMatch = true;
            }

            if (isMatch) {
                rows[i].classList.add('highlight-row');
                rows[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
