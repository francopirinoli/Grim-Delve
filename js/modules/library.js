/**
 * library.js
 * Central Hub for Characters, Monsters, and Items.
 * v3.1: Integrated Viewers (Stat Blocks & Item Cards)
 */

import { Storage } from '../utils/storage.js';
import { CharGen } from './chargen.js';
// Import Renderers and Builders
import { MonsterBuilder, MonsterRenderer } from './monster_builder.js';
import { ItemBuilder, ItemRenderer } from './item_builder.js';
import { I18n } from '../utils/i18n.js';
import { ImageStore } from '../utils/image_store.js';

export const Library = {
    
    container: null,
    currentTab: 'characters', // characters | bestiary | items
    filters: {
        search: '',
        role: 'all', // For monsters
        type: 'all', // For items
        source: 'all'
    },

    init: (container) => {
        container.classList.add('library-module');
        Library.container = container;
        Library.renderShell();
    },

    /**
     * Renders the Frame (Tabs, Filters, Scroll Area)
     */
    renderShell: () => {
        const isMon = Library.currentTab === 'bestiary';
        const isItem = Library.currentTab === 'items';
        const isChar = Library.currentTab === 'characters';

        const html = `
            <div class="lib-static-top">
                <div class="lib-header">
                    <h2>My Library</h2>
                    <div class="lib-tabs">
                        <button class="lib-tab-btn ${isChar ? 'active' : ''}" data-tab="characters">👤 Characters</button>
                        <button class="lib-tab-btn ${isMon ? 'active' : ''}" data-tab="bestiary">💀 Bestiary</button>
                        <button class="lib-tab-btn ${isItem ? 'active' : ''}" data-tab="items">⚒️ Items</button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="filter-bar">
                    <input type="text" id="lib-search" placeholder="Search..." value="${Library.filters.search}">
                    
                    <!-- Monster Filters -->
                    <select id="filter-role" style="display: ${isMon ? 'block' : 'none'}">
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

                    <!-- Item Filters -->
                    <select id="filter-type" style="display: ${isItem ? 'block' : 'none'}">
                        <option value="all">All Types</option>
                        <option value="Weapon">Weapons</option>
                        <option value="Armor">Armor</option>
                        <option value="Trinket">Trinkets</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Focus">Focus</option>
                        <option value="Loot">Loot</option>
                    </select>

                    <select id="filter-source" style="display: ${isChar ? 'none' : 'block'}">
                        <option value="all">All Sources</option>
                        <option value="official">Official</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>

                <!-- Action Bar -->
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-bottom:1rem;">
                     ${isChar ? `<button class="btn-primary" id="btn-import-char">📥 Import JSON</button>` : ''}
                     ${isMon ? `<button class="btn-primary" id="btn-import-mon">📥 Import JSON</button>` : ''}
                     ${isItem ? `<button class="btn-primary" id="btn-import-item">📥 Import JSON</button>` : ''}
                     <input type="file" id="lib-file-input" style="display:none" accept=".json">
                </div>
            </div>

            <!-- Content Grid -->
            <div class="lib-scroll-area">
                <div id="library-grid" class="library-grid">
                    <!-- Cards Injected Here -->
                </div>
            </div>
        `;
        
        Library.container.innerHTML = html;
        Library.attachListeners();
        Library.refreshContent();
    },

    attachListeners: () => {
        // Tabs
        Library.container.querySelectorAll('.lib-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Library.currentTab = btn.dataset.tab;
                Library.renderShell(); 
            });
        });

        // Filters
        const bind = (id, key) => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', (e) => {
                Library.filters[key] = e.target.value.toLowerCase();
                Library.refreshContent();
            });
        };
        bind('lib-search', 'search');
        bind('filter-role', 'role');
        bind('filter-type', 'type');
        bind('filter-source', 'source');

        // Import Logic
        const fileInput = document.getElementById('lib-file-input');
        const importBtns = ['btn-import-char', 'btn-import-mon', 'btn-import-item'];
        
        importBtns.forEach(id => {
            const btn = document.getElementById(id);
            if(btn) btn.onclick = () => fileInput.click();
        });

        if(fileInput) {
            fileInput.onchange = (e) => Library.handleImport(e);
        }
    },

    refreshContent: () => {
        const grid = document.getElementById('library-grid');
        grid.innerHTML = '<div style="color:#666; text-align:center; grid-column:1/-1;">Loading...</div>';

        if (Library.currentTab === 'characters') Library.renderCharacters(grid);
        else if (Library.currentTab === 'bestiary') Library.renderBestiary(grid);
        else if (Library.currentTab === 'items') Library.renderItems(grid);
    },

    /**
     * Helper: Updates <img> src attributes after render
     */
    lazyLoadImages: async (container) => {
        const imgs = container.querySelectorAll('img[data-img-id]');
        for (const img of imgs) {
            const id = img.dataset.imgId;
            if (id) {
                const url = await ImageStore.getUrl(id);
                if (url) img.src = url;
            }
        }
    },

    /* ------------------------------------------------------------------
       RENDERERS
       ------------------------------------------------------------------ */

    renderCharacters: (grid) => {
        const chars = Storage.getCharacters();
        const filtered = chars.filter(c => c.name.toLowerCase().includes(Library.filters.search));

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#555;">No characters found.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(c => `
            <div class="lib-card custom">
                <div class="lib-card-thumb">
                    ${c.imageId ? `<img src="" data-img-id="${c.imageId}">` : 
                      c.imageUrl ? `<img src="${c.imageUrl}">` : 
                      `<div class="lib-thumb-placeholder">👤</div>`}
                </div>
                <div class="lib-card-body">
                    <div class="lib-card-name">${c.name}</div>
                    <div class="lib-card-meta">Lvl ${c.level} ${c.className}</div>
                    
                    <div class="lib-mini-stats">
                        <div class="lms-box"><div class="lms-label">HP</div><div class="lms-val" style="color:#d32f2f">${c.current.hp}/${c.derived.maxHP}</div></div>
                        <div class="lms-box"><div class="lms-label">STA</div><div class="lms-val" style="color:#388e3c">${c.current.sta}/${c.derived.maxSTA}</div></div>
                        <div class="lms-box"><div class="lms-label">MP</div><div class="lms-val" style="color:#1976d2">${c.current.mp}/${c.derived.maxMP}</div></div>
                    </div>
                </div>
                <div class="lib-card-footer">
                    <button class="lib-btn primary action-play" data-id="${c.id}">▶ Play</button>
                    <button class="lib-btn action-edit" data-id="${c.id}">✏️ Edit</button>
                    <button class="lib-btn delete action-delete" data-id="${c.id}" data-type="char">🗑️</button>
                </div>
            </div>
        `).join('');

        Library.lazyLoadImages(grid);
        Library.bindCardActions(grid, 'char');
    },

    renderBestiary: (grid) => {
        // 1. Get Official
        const rawOfficial = I18n.getData('bestiary') || [];
        const official = rawOfficial.map(m => ({ ...m, source: 'official', id: m.id || m.name })); 
        
        // 2. Get Custom
        const custom = Storage.getLibrary('grim_monsters') || [];
        
        // 3. Merge & Filter
        const all = [...custom, ...official];
        const f = Library.filters;
        
        const filtered = all.filter(m => {
            if (f.search && !m.name.toLowerCase().includes(f.search)) return false;
            if (f.role !== 'all' && m.role.toLowerCase() !== f.role) return false;
            if (f.source !== 'all' && (m.source || 'custom') !== f.source) return false;
            return true;
        });

        grid.innerHTML = filtered.map(m => {
            const isCustom = (m.source !== 'official');
            const roleCap = m.role.charAt(0).toUpperCase() + m.role.slice(1);
            
            let imgHTML = `<div class="lib-thumb-placeholder">💀</div>`;
            if (m.imageId) imgHTML = `<img src="" data-img-id="${m.imageId}">`;
            else if (m.imageUrl) imgHTML = `<img src="${m.imageUrl}">`;

            return `
                <div class="lib-card ${isCustom ? 'custom' : 'official'}">
                    <div class="lib-card-thumb">
                        ${imgHTML}
                        <div style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.7); padding:2px 6px; border-radius:3px; font-size:0.6rem; color:#fff;">
                            ${isCustom ? 'CUSTOM' : 'OFFICIAL'}
                        </div>
                    </div>
                    <div class="lib-card-body">
                        <div class="lib-card-name">${m.name}</div>
                        <div class="lib-card-meta">Lvl ${m.level} ${roleCap}</div>
                        
                        <div class="lib-mini-stats">
                            <div class="lms-box"><div class="lms-label">HP</div><div class="lms-val" style="color:#d32f2f">${m.stats.hp}</div></div>
                            <div class="lms-box"><div class="lms-label">AS</div><div class="lms-val">${m.stats.as}</div></div>
                            <div class="lms-box"><div class="lms-label">ATK</div><div class="lms-val">${m.stats.atk}</div></div>
                        </div>
                    </div>
                    <div class="lib-card-footer">
                        <button class="lib-btn primary action-view" data-id="${m.id}" data-source="${m.source || 'custom'}">👁️ View</button>
                        <button class="lib-btn action-edit" data-id="${m.id}" data-source="${m.source || 'custom'}">${isCustom ? '✏️ Edit' : '📋 Copy'}</button>
                        ${isCustom ? `<button class="lib-btn delete action-delete" data-id="${m.id}" data-type="mon">🗑️</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        Library.lazyLoadImages(grid);
        Library.bindCardActions(grid, 'mon');
    },

    renderItems: (grid) => {
        const items = Storage.getLibrary('grim_delve_items') || [];
        const f = Library.filters;

        const filtered = items.filter(i => {
            if (f.search && !i.name.toLowerCase().includes(f.search)) return false;
            if (f.type !== 'all' && i.type !== f.type) return false;
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#555;">No items found. Create some in the Artificer!</div>`;
            return;
        }

        grid.innerHTML = filtered.map(i => {
            const isMagic = i.isMagic;
            
            let imgHTML = `<div class="lib-thumb-placeholder">⚔️</div>`;
            if (i.imageId) imgHTML = `<img src="" data-img-id="${i.imageId}">`;
            else if (i.imageUrl) imgHTML = `<img src="${i.imageUrl}">`;

            return `
                <div class="lib-card item ${isMagic ? 'magic' : ''}">
                    <div class="lib-card-thumb">
                        ${imgHTML}
                    </div>
                    <div class="lib-card-body">
                        <div class="lib-card-name">${i.name}</div>
                        <div class="lib-card-meta">${i.type} • ${i.cost}</div>
                        <div style="font-size:0.8rem; color:#aaa; flex-grow:1; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">
                            ${i.description}
                        </div>
                    </div>
                    <div class="lib-card-footer">
                        <button class="lib-btn primary action-view-item" data-id="${i.id}">👁️ View</button>
                        <button class="lib-btn delete action-delete" data-id="${i.id}" data-type="item">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        Library.lazyLoadImages(grid);
        Library.bindCardActions(grid, 'item');
    },

    /* ------------------------------------------------------------------
       INTERACTIONS
       ------------------------------------------------------------------ */

    bindCardActions: (grid, type) => {
        // DELETE
        grid.querySelectorAll('.action-delete').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                if(confirm("Delete this permanently?")) {
                    const id = btn.dataset.id;
                    if (type === 'char') Storage.deleteCharacter(id);
                    else if (type === 'mon') {
                        let lib = Storage.getLibrary('grim_monsters');
                        lib = lib.filter(x => x.id !== id);
                        localStorage.setItem('grim_monsters', JSON.stringify(lib));
                    }
                    else if (type === 'item') {
                        let lib = Storage.getLibrary('grim_delve_items');
                        lib = lib.filter(x => x.id !== id);
                        localStorage.setItem('grim_delve_items', JSON.stringify(lib));
                    }
                    Library.refreshContent();
                }
            };
        });

        // EDIT (Route to Builder)
        grid.querySelectorAll('.action-edit').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                
                if (type === 'char') {
                    const char = Storage.getCharacter(id);
                    CharGen.loadCharacter(char);
                    document.querySelector('[data-module="chargen"]').click();
                } else if (type === 'mon') {
                    const source = btn.dataset.source;
                    let mob;
                    if (source === 'official') mob = I18n.getData('bestiary').find(m => m.id === id);
                    else mob = Storage.getLibrary('grim_monsters').find(m => m.id === id);
                    
                    if(mob) {
                        MonsterBuilder.loadMonster(mob);
                        document.querySelector('[data-module="bestiary"]').click();
                    }
                }
            };
        });

        // VIEW / PLAY
        grid.querySelectorAll('.action-play').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const char = Storage.getCharacter(id);
                
                if (char) {
                    // Switch to CharGen module context visually
                    const mainNav = document.querySelector('[data-module="chargen"]');
                    if(mainNav) mainNav.classList.add('active');
                    
                    // Initialize Play Mode
                    CharGen.initPlayMode(char);
                } else {
                    alert("Error: Character not found.");
                }
            };
        });

        grid.querySelectorAll('.action-view').forEach(btn => {
            btn.onclick = (e) => {
                const id = btn.dataset.id;
                const source = btn.dataset.source;
                let mob;
                if (source === 'official') mob = I18n.getData('bestiary').find(m => m.id === id);
                else mob = Storage.getLibrary('grim_monsters').find(m => m.id === id);
                
                if(mob) Library.openMonsterModal(mob);
            };
        });
        
        grid.querySelectorAll('.action-view-item').forEach(btn => {
            btn.onclick = (e) => {
                const id = btn.dataset.id;
                const item = Storage.getLibrary('grim_delve_items').find(i => i.id === id);
                if(item) Library.openItemModal(item);
            };
        });
    },

    /* --- MODALS --- */

    openMonsterModal: async (mob) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        let src = mob.imageUrl;
        if(mob.imageId) src = await ImageStore.getUrl(mob.imageId);

        // Use Renderer
        const cardHtml = MonsterRenderer.getHTML(mob, src);

        overlay.innerHTML = `
            <div class="view-monster-modal" style="max-width:500px; padding:0; background:transparent; box-shadow:none;">
                ${cardHtml}
                <div style="text-align:center; margin-top:10px;">
                    <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    <button class="btn-secondary" onclick="window.print()">Print</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    },

    openItemModal: async (item) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        let src = item.imageUrl;
        if(item.imageId) src = await ImageStore.getUrl(item.imageId);

        // Use Renderer
        const cardHtml = ItemRenderer.getHTML(item, src);

        overlay.innerHTML = `
            <div class="view-monster-modal" style="max-width:400px; padding:0; background:transparent; box-shadow:none;">
                ${cardHtml}
                <div style="text-align:center; margin-top:10px;">
                    <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    },

    handleImport: (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                
                if (json.stats && json.derived) { 
                    Storage.saveCharacter(json);
                    alert("Character Imported");
                } else if (json.role && json.family) { 
                    json.id = 'mon_' + Date.now();
                    const lib = Storage.getLibrary('grim_monsters');
                    lib.push(json);
                    localStorage.setItem('grim_monsters', JSON.stringify(lib));
                    alert("Monster Imported");
                } else if (json.cost && json.type) { 
                    json.id = 'item_' + Date.now();
                    const lib = Storage.getLibrary('grim_delve_items');
                    lib.push(json);
                    localStorage.setItem('grim_delve_items', JSON.stringify(lib));
                    alert("Item Imported");
                } else {
                    alert("Unknown file type.");
                }
                Library.refreshContent();
            } catch (err) {
                console.error(err);
                alert("Invalid JSON.");
            }
        };
        reader.readAsText(file);
    }
};