/**
 * library.js
 * Manages Saved Characters and the Bestiary (Official + Custom).
 * Handles filtering, rendering cards, and importing/exporting data.
 */

import { Storage } from '../utils/storage.js';
import { CharGen } from './chargen.js';
import { MonsterBuilder } from './monster_builder.js';
import { I18n } from '../utils/i18n.js';

export const Library = {
    
    // State
    container: null,
    currentTab: 'characters', // 'characters' or 'bestiary'
    filters: {
        search: '',
        role: 'all',
        family: 'all',
        level: 'all',
        source: 'all' // 'official', 'custom', 'all'
    },

    init: (container) => {
        // Apply Layout Class for Scrolling
        container.classList.add('library-module');
        Library.container = container;
        Library.renderShell();
    },

    /**
     * Renders the outer framework (Fixed Top + Scrolling Grid)
     */
    renderShell: () => {
        const html = `
            <!-- FIXED HEADER SECTION -->
            <div class="lib-static-top">
                <div class="lib-header">
                    <h2>My Library</h2>
                    <div class="lib-tabs">
                        <button class="lib-tab-btn ${Library.currentTab === 'characters' ? 'active' : ''}" data-tab="characters">👤 Characters</button>
                        <button class="lib-tab-btn ${Library.currentTab === 'bestiary' ? 'active' : ''}" data-tab="bestiary">💀 Bestiary</button>
                    </div>
                </div>

                <!-- Filter Bar (Bestiary Only) -->
                <div id="lib-filters" class="filter-bar" style="display: ${Library.currentTab === 'bestiary' ? 'grid' : 'none'};">
                    <input type="text" id="filter-search" placeholder="Search names..." value="${Library.filters.search}">
                    
                    <select id="filter-role">
                        <option value="all">All Roles</option>
                        <option value="soldier">Soldier</option>
                        <option value="brute">Brute</option>
                        <option value="skirmisher">Skirmisher</option>
                        <option value="controller">Controller</option>
                        <option value="artillery">Artillery</option>
                        <option value="lurker">Lurker</option>
                        <option value="minion">Minion</option>
                        <option value="solo">Solo</option>
                    </select>

                    <select id="filter-family">
                        <option value="all">All Families</option>
                        <option value="folk">Folk</option>
                        <option value="beasts">Beasts</option>
                        <option value="unliving">Unliving</option>
                        <option value="constructs">Constructs</option>
                        <option value="horrors">Horrors</option>
                        <option value="spirits">Spirits</option>
                        <option value="wyrms">Wyrms</option>
                        <option value="titans">Titans</option>
                        <option value="watchers">Watchers</option>
                        <option value="amorphous">Amorphous</option>
                        <option value="verdant">Verdant</option>
                        <option value="monstrosities">Monstrosities</option>
                    </select>

                    <select id="filter-level">
                        <option value="all">All Levels</option>
                        ${Array.from({length:10}, (_, i) => `<option value="${i+1}">Level ${i+1}</option>`).join('')}
                    </select>

                    <select id="filter-source">
                        <option value="all">All Sources</option>
                        <option value="official">Official</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>

                <!-- Action Buttons -->
                <div id="char-actions" style="display: ${Library.currentTab === 'characters' ? 'flex' : 'none'}; gap:10px; margin-bottom:1rem;">
                     <button class="btn-secondary" id="btn-import-char">📥 Import Character</button>
                     <input type="file" id="file-import-char" style="display:none" accept=".json">
                </div>

                <div id="bestiary-actions" style="display: ${Library.currentTab === 'bestiary' ? 'flex' : 'none'}; gap:10px; margin-bottom:1rem;">
                     <button class="btn-secondary" id="btn-import-mon">📥 Import Monster</button>
                     <input type="file" id="file-import-mon" style="display:none" accept=".json">
                </div>
            </div>

            <!-- SCROLLING CONTENT SECTION -->
            <div class="lib-scroll-area">
                <div id="library-grid" class="library-grid">
                    <!-- Content injected here -->
                </div>
            </div>
        `;
        
        Library.container.innerHTML = html;

        // --- EVENT LISTENERS ---
        
        // Tab Switching
        Library.container.querySelectorAll('.lib-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                Library.currentTab = e.target.dataset.tab;
                Library.renderShell(); 
                // No need to call refreshContent here as renderShell calls it at the end implicitly 
                // via re-running renderShell logic, but let's be safe:
                // Actually, renderShell replaces innerHTML, so we lose listeners if we recurse.
                // Better pattern: update state, re-render shell, then populate grid.
            });
        });

        // Filters
        const bindFilter = (id, key) => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', (e) => {
                Library.filters[key] = e.target.value.toLowerCase();
                Library.renderBestiaryList(); // Re-render just the grid
            });
        };
        bindFilter('filter-search', 'search');
        bindFilter('filter-role', 'role');
        bindFilter('filter-family', 'family');
        bindFilter('filter-level', 'level');
        bindFilter('filter-source', 'source');

        // Imports
        const setupImport = (btnId, inputId, type) => {
            const btn = document.getElementById(btnId);
            const input = document.getElementById(inputId);
            if(btn && input) {
                btn.onclick = () => input.click();
                input.onchange = (e) => Library.handleImport(e, type);
            }
        };
        setupImport('btn-import-char', 'file-import-char', 'character');
        setupImport('btn-import-mon', 'file-import-mon', 'monster');

        // Load Data into Grid
        Library.refreshContent();
    },

    refreshContent: () => {
        if (Library.currentTab === 'characters') {
            Library.renderCharacterList();
        } else {
            Library.renderBestiaryList();
        }
    },

    /* ------------------------------------------------------------------
       CHARACTER LIST LOGIC
       ------------------------------------------------------------------ */
    
    renderCharacterList: () => {
        const grid = document.getElementById('library-grid');
        const chars = Storage.getCharacters();

        if (chars.length === 0) {
            grid.innerHTML = `<p class="text-muted" style="grid-column: 1 / -1; text-align:center;">No characters saved yet. Go create one!</p>`;
            return;
        }

        grid.innerHTML = chars.map(char => `
            <div class="lib-card custom">
                <div class="lib-card-header">
                    <div class="lib-card-name">${char.name || "Unnamed"}</div>
                    <span class="badge source-custom">Local</span>
                </div>
                <div class="lib-card-meta">Level ${char.level} ${char.className}</div>
                <div class="lib-card-stats">
                    <div class="stat-pill hp">
                        <span class="stat-pill-label">HP</span>
                        <span class="stat-pill-value">${char.derived.maxHP}</span>
                    </div>
                    <div class="stat-pill ac">
                        <span class="stat-pill-label">STA</span>
                        <span class="stat-pill-value">${char.derived.maxSTA}</span>
                    </div>
                    <div class="stat-pill dc">
                        <span class="stat-pill-label">MP</span>
                        <span class="stat-pill-value">${char.derived.maxMP}</span>
                    </div>
                </div>
                <div class="lib-actions">
                    <button class="btn-small edit-btn" data-id="${char.id}">Edit</button>
                    <button class="btn-small export-btn" data-id="${char.id}">Export</button>
                    <button class="btn-small delete-btn" data-id="${char.id}" style="color:var(--accent-crimson);">Delete</button>
                </div>
            </div>
        `).join('');

        // Bind Buttons
        grid.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = () => {
                const char = Storage.getCharacter(btn.dataset.id);
                CharGen.loadCharacter(char);
                document.querySelector('[data-module="chargen"]').click();
            };
        });

        grid.querySelectorAll('.export-btn').forEach(btn => {
            btn.onclick = () => {
                const char = Storage.getCharacter(btn.dataset.id);
                Storage.exportJSON(char, `Character_${char.name.replace(/\s+/g, '_')}`);
            };
        });

        grid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = () => {
                if(confirm("Delete this character permanently?")) {
                    Storage.deleteCharacter(btn.dataset.id);
                    Library.refreshContent();
                }
            };
        });
    },

    /* ------------------------------------------------------------------
       BESTIARY LOGIC (Merge & Filter)
       ------------------------------------------------------------------ */

    renderBestiaryList: () => {
        const grid = document.getElementById('library-grid');
        
        // 1. Fetch & Normalize Official Data
        const rawOfficial = I18n.getData('bestiary') || [];
        
        const officialMobs = rawOfficial.map(m => ({
            id: m.id,
            name: m.name,
            role: m.role.toLowerCase(),
            family: m.family,
            level: m.level,
            source: 'official',
            stats: {
                hp: m.stats.hp,
                as: m.stats.as,
                speed: m.stats.speed,
                atk: m.combat.atk_dc,
                def: m.combat.def_dc,
                save: m.combat.save_dc,
                dmg: m.combat.dmg
            },
            traits: m.abilities.filter(a => a.type === "Passive" || a.type === "Trait"),
            actions: m.abilities.filter(a => a.type === "Action" || a.type === "Attack" || a.type === "Magic"),
            danger_abilities: m.abilities.filter(a => a.type === "Danger"),
            notes: `Loot: ${m.loot}`
        }));
        
        // 2. Fetch Custom Data
        const customMobs = Storage.getLibrary('grim_monsters') || [];
        const userMobs = customMobs.map(m => ({ ...m, source: 'custom' }));

        // 3. Merge
        const allMobs = [...userMobs, ...officialMobs];

        // 4. Filter
        const f = Library.filters;
        const filtered = allMobs.filter(m => {
            if (f.search && !m.name.toLowerCase().includes(f.search)) return false;
            if (f.role !== 'all' && m.role.toLowerCase() !== f.role) return false;
            if (f.family !== 'all' && m.family.toLowerCase() !== f.family) return false;
            if (f.level !== 'all' && m.level.toString() !== f.level) return false;
            if (f.source !== 'all' && m.source !== f.source) return false;
            return true;
        });

        // 5. Render
        if (filtered.length === 0) {
            grid.innerHTML = `<p class="text-muted" style="grid-column: 1 / -1; text-align:center;">No monsters match your filters.</p>`;
            return;
        }

        grid.innerHTML = filtered.map(m => {
            const isCustom = m.source === 'custom';
            const badgeText = isCustom ? 'Custom' : 'Official';
            const badgeClass = isCustom ? 'source-custom' : 'source-official';
            
            const roleCap = m.role.charAt(0).toUpperCase() + m.role.slice(1);
            const famCap = m.family.charAt(0).toUpperCase() + m.family.slice(1);
            
            // Stats
            const hp = m.stats.hp;
            const ac = m.stats.as;
            const atk = m.stats.atk;
            const def = m.stats.def;

            return `
                <div class="lib-card ${m.source}" data-id="${m.id}" data-source="${m.source}">
                    <div class="lib-card-header">
                        <div class="lib-card-name">${m.name}</div>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>
                    
                    <div class="lib-card-meta">
                        Lvl ${m.level} ${famCap} ${roleCap}
                    </div>
                    
                    <div class="lib-card-stats">
                        <div class="stat-pill hp">
                            <span class="stat-pill-label">HP</span>
                            <span class="stat-pill-value">${hp}</span>
                        </div>
                        <div class="stat-pill ac">
                            <span class="stat-pill-label">AS</span>
                            <span class="stat-pill-value">${ac}</span>
                        </div>
                        <div class="stat-pill dc">
                            <span class="stat-pill-label">Def/Atk</span>
                            <span class="stat-pill-value">${def}/${atk}</span>
                        </div>
                    </div>
                    
                    <div class="lib-actions">
                        <button class="view-btn" data-id="${m.id}" data-source="${m.source}">
                            ${isCustom ? '✏️ Edit' : '📋 Clone'}
                        </button>
                        ${isCustom ? `<button class="export-btn" data-id="${m.id}">💾</button>` : ''}
                        ${isCustom ? `<button class="delete-btn" data-id="${m.id}">🗑️</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // 6. Bind Event Listeners

        // A. Card Click (Open Modal)
        grid.querySelectorAll('.lib-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return; // Ignore button clicks

                const id = card.dataset.id;
                const source = card.dataset.source;
                
                let mobData;
                if (source === 'custom') {
                    mobData = userMobs.find(m => m.id === id);
                } else {
                    mobData = officialMobs.find(m => m.id === id);
                }

                if (mobData) Library.showFullCard(mobData);
            });
        });

        // B. Edit/Clone Button
        grid.querySelectorAll('.view-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const source = btn.dataset.source;
                
                let mobData;
                if (source === 'custom') {
                    mobData = userMobs.find(m => m.id === id);
                } else {
                    mobData = officialMobs.find(m => m.id === id);
                }

                if (mobData) {
                    document.querySelector('[data-module="bestiary"]').click();
                    setTimeout(() => {
                        MonsterBuilder.loadMonster(mobData);
                    }, 50);
                }
            };
        });

        // C. Delete Button
        grid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                if(confirm("Delete this custom monster?")) {
                    const id = btn.dataset.id;
                    let lib = Storage.getLibrary('grim_monsters');
                    lib = lib.filter(m => m.id !== id);
                    localStorage.setItem('grim_monsters', JSON.stringify(lib));
                    Library.refreshContent();
                }
            };
        });

        // D. Export Button
        grid.querySelectorAll('.export-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const mob = userMobs.find(m => m.id === id);
                if(mob) Storage.exportJSON(mob, `Monster_${mob.name.replace(/\s+/g, '_')}`);
            };
        });
    },

    /**
     * Displays a modal with the full Monster Card
     */
    showFullCard: (m) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const roleCap = m.role.charAt(0).toUpperCase() + m.role.slice(1);
        
        const displayTraits = m.traits || [];
        const displayActions = m.actions || [];
        const displayDanger = m.danger_abilities || [];
        
        if(m.custom_abilities) {
            m.custom_abilities.forEach(c => {
                if(c.type === 'trait') displayTraits.push(c);
                if(c.type === 'action') displayActions.push(c);
                if(c.type === 'danger') displayDanger.push(c);
            });
        }

        const renderRow = (item, isDanger) => {
             const cost = item.cost ? `(${item.cost})` : '';
             return `<div class="mc-ability ${isDanger ? 'mc-danger' : ''}">
                <span class="mc-ability-name">${item.name} ${cost}:</span> ${item.effect}
             </div>`;
        };

        const html = `
            <div class="view-monster-modal">
                <div class="monster-card">
                    <div class="mc-header">
                        <div class="mc-name">${m.name}</div>
                        <div class="mc-meta">Lvl ${m.level} ${roleCap}</div>
                    </div>
                    
                    <div class="mc-stats-grid">
                        <div class="mc-stat"><div class="mc-stat-label">HP</div><div class="mc-stat-val" style="color:#8a2c2c;">${m.stats.hp}</div></div>
                        <div class="mc-stat"><div class="mc-stat-label">Armor</div><div class="mc-stat-val">${m.stats.as}</div></div>
                        <div class="mc-stat"><div class="mc-stat-label">Atk DC</div><div class="mc-stat-val">${m.stats.atk}</div></div>
                        <div class="mc-stat"><div class="mc-stat-label">Def DC</div><div class="mc-stat-val">${m.stats.def}</div></div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #aaa; padding-bottom:5px; font-size:0.9rem;">
                        <span><strong>Speed:</strong> ${m.stats.speed} ft</span>
                        <span><strong>Save DC:</strong> ${m.stats.save}</span>
                    </div>

                    <div class="mc-section">
                        <div class="mc-section-title">Standard Attack</div>
                        <div class="mc-ability"><strong>Damage:</strong> ${m.stats.dmg}</div>
                    </div>

                    ${displayTraits.length ? `<div class="mc-section"><div class="mc-section-title">Traits</div>${displayTraits.map(t=>renderRow(t)).join('')}</div>` : ''}
                    ${displayActions.length ? `<div class="mc-section"><div class="mc-section-title">Actions</div>${displayActions.map(a=>renderRow(a)).join('')}</div>` : ''}
                    ${displayDanger.length ? `<div class="mc-section"><div class="mc-section-title" style="color:#8a2c2c;">Danger Abilities</div>${displayDanger.map(d=>renderRow(d,true)).join('')}</div>` : ''}
                    ${m.notes ? `<div class="mc-section" style="border-top:1px dashed #aaa; margin-top:10px; font-style:italic;">${m.notes}</div>` : ''}
                
                    <div style="margin-top:20px; text-align:center;">
                        <button id="btn-close-modal" class="btn-primary">Close</button>
                    </div>
                </div>
            </div>
        `;

        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        const close = () => document.body.removeChild(overlay);
        document.getElementById('btn-close-modal').onclick = close;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    },

    /* --- IMPORT LOGIC --- */

    handleImport: (event, type) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                
                if (type === 'character') {
                    if (json.stats && json.derived) {
                        Storage.saveCharacter(json);
                        alert("Character Imported!");
                        Library.refreshContent();
                    } else {
                        alert("Invalid Character file.");
                    }
                } else if (type === 'monster') {
                    if (json.stats && json.role) {
                        json.id = 'mon_imp_' + Date.now();
                        json.source = 'custom';
                        const lib = Storage.getLibrary('grim_monsters');
                        lib.push(json);
                        localStorage.setItem('grim_monsters', JSON.stringify(lib));
                        alert("Monster Imported!");
                        Library.refreshContent();
                    } else {
                        alert("Invalid Monster file.");
                    }
                }
            } catch (err) {
                console.error(err);
                alert("Error parsing JSON file.");
            }
        };
        reader.readAsText(file);
    }
};