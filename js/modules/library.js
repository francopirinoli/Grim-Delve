/**
 * library.js
 * Central Hub for Characters, Monsters, and Items.
 * v4.1: Added Family Filter & Fixed Spanish Localization Logic.
 */

import { Storage } from '../utils/storage.js';
import { CharGen } from './chargen.js';
import { MonsterBuilder, MonsterRenderer } from './monster_builder.js';
import { ItemBuilder, ItemRenderer } from './item_builder.js';
import { I18n } from '../utils/i18n.js';
import { ImageStore } from '../utils/image_store.js';

export const Library = {
    
    container: null,
    currentTab: 'characters', // characters | bestiary | items
    
    filters: {
        search: '',
        role: 'all',
        family: 'all', // New Filter
        type: 'all', 
        source: 'all'
    },

    pagination: {
        page: 1,
        perPage: 20,
        totalPages: 1
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
        const t = I18n.t;
        const isMon = Library.currentTab === 'bestiary';
        const isItem = Library.currentTab === 'items';
        const isChar = Library.currentTab === 'characters';

        // Get Families for Dropdown
        let familyOptions = `<option value="all">-- ${t('mon_lbl_family')} --</option>`;
        if (isMon) {
            const monData = I18n.getData('monsters');
            if (monData && monData.families) {
                Object.keys(monData.families).forEach(key => {
                    const famName = monData.families[key].name;
                    familyOptions += `<option value="${key}">${famName}</option>`;
                });
            }
        }

        const html = `
            <div class="lib-static-top">
                <div class="lib-header">
                    <h2>${t('nav_library')}</h2>
                    <div class="lib-tabs">
                        <button class="lib-tab-btn ${isChar ? 'active' : ''}" data-tab="characters">👤 ${t('lib_tab_char')}</button>
                        <button class="lib-tab-btn ${isMon ? 'active' : ''}" data-tab="bestiary">💀 ${t('lib_tab_mon')}</button>
                        <button class="lib-tab-btn ${isItem ? 'active' : ''}" data-tab="items">⚒️ ${t('lib_tab_item')}</button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="filter-bar">
                    <input type="text" id="lib-search" placeholder="${t('lib_search')}" value="${Library.filters.search}">
                    
                    <!-- Monster Filters -->
                    <select id="filter-role" style="display: ${isMon ? 'block' : 'none'}">
                        <option value="all">-- ${t('mon_lbl_role')} --</option>
                        <option value="soldier">${t('role_soldier')}</option>
                        <option value="brute">${t('role_brute')}</option>
                        <option value="skirmisher">${t('role_skirmisher')}</option>
                        <option value="controller">${t('role_controller')}</option>
                        <option value="artillery">${t('role_artillery')}</option>
                        <option value="lurker">${t('role_lurker')}</option>
                        <option value="minion">${t('role_minion')}</option>
                        <option value="solo">${t('role_solo')}</option>
                    </select>

                    <select id="filter-family" style="display: ${isMon ? 'block' : 'none'}">
                        ${familyOptions}
                    </select>

                    <!-- Item Filters -->
                    <select id="filter-type" style="display: ${isItem ? 'block' : 'none'}">
                        <option value="all">-- All Types --</option>
                        <option value="Weapon">${t('item_cat_weapon')}</option>
                        <option value="Armor">${t('item_cat_armor')}</option>
                        <option value="Trinket">${t('item_cat_trinket')}</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Focus">Focus</option>
                        <option value="Loot">Loot</option>
                    </select>

                    <!-- Source Filter -->
                    <select id="filter-source" style="display: ${isChar ? 'none' : 'block'}">
                        <option value="all">-- ${t('lbl_source')} --</option>
                        <option value="official">Official</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>

                <!-- Action Bar -->
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-bottom:1rem;">
                    ${isChar ? `<button class="btn-primary" id="btn-import-char">📥 ${t('btn_import_json')}</button>` : ''}
                    ${isMon ? `<button class="btn-primary" id="btn-import-mon">📥 ${t('btn_import_json')}</button>` : ''}
                    ${isItem ? `<button class="btn-primary" id="btn-import-item">📥 ${t('btn_import_json')}</button>` : ''}
                     <input type="file" id="lib-file-input" style="display:none" accept=".json">
                </div>
            </div>

            <!-- Content Grid & Pagination -->
            <div class="lib-scroll-area">
                <div id="library-grid" class="library-grid">
                    <!-- Cards Injected Here -->
                </div>
                <div id="lib-pagination-controls" class="lib-pagination">
                    <!-- Pagination Buttons -->
                </div>
            </div>
        `;
        
        Library.container.innerHTML = html;
        Library.attachListeners();
        
        // Restore filter state values
        if(isMon) {
            document.getElementById('filter-role').value = Library.filters.role;
            document.getElementById('filter-family').value = Library.filters.family;
        }

        Library.refreshContent();
    },

    attachListeners: () => {
        // Tabs
        Library.container.querySelectorAll('.lib-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Library.currentTab = btn.dataset.tab;
                
                // Reset Filters on Tab Change
                Library.filters = { search: '', role: 'all', family: 'all', type: 'all', source: 'all' };
                Library.pagination.page = 1;
                
                Library.renderShell(); 
            });
        });

        // Generic Filter Binding
        const bind = (id, key) => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', (e) => {
                Library.filters[key] = e.target.value.toLowerCase();
                Library.pagination.page = 1; // Reset page on filter change
                Library.refreshContent();
            });
        };

        bind('lib-search', 'search');
        bind('filter-role', 'role');
        bind('filter-family', 'family'); // New listener
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
        const t = I18n.t;
        const grid = document.getElementById('library-grid');
        grid.innerHTML = `<div style="color:#666; text-align:center; grid-column:1/-1;">${t('lbl_loading')}</div>`;

        if (Library.currentTab === 'characters') Library.renderCharacters(grid);
        else if (Library.currentTab === 'bestiary') Library.renderBestiary(grid);
        else if (Library.currentTab === 'items') Library.renderItems(grid);
    },

    renderPagination: () => {
        const container = document.getElementById('lib-pagination-controls');
        if(!container) return;

        const { page, totalPages } = Library.pagination;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <button id="btn-prev-page" ${page === 1 ? 'disabled' : ''}>«</button>
            <span>Page ${page} / ${totalPages}</span>
            <button id="btn-next-page" ${page === totalPages ? 'disabled' : ''}>»</button>
        `;

        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');

        if(btnPrev) btnPrev.onclick = () => {
            Library.pagination.page--;
            Library.refreshContent();
        };
        if(btnNext) btnNext.onclick = () => {
            Library.pagination.page++;
            Library.refreshContent();
        };
    },

    lazyLoadImages: async (container) => {
        const imgs = container.querySelectorAll('img[data-img-id]');
        for (const img of imgs) {
            const id = img.dataset.imgId;
            if (id) {
                try {
                    const url = await ImageStore.getUrl(id);
                    if (url) img.src = url;
                } catch(e) { console.warn("Image load fail", e); }
            }
        }
    },

    /* ------------------------------------------------------------------
       RENDERERS
       ------------------------------------------------------------------ */

    renderCharacters: (grid) => {
        const t = I18n.t;
        const chars = Storage.getCharacters();
        const filtered = chars.filter(c => c && c.name && c.name.toLowerCase().includes(Library.filters.search));

        // Pagination
        Library.pagination.totalPages = Math.ceil(filtered.length / Library.pagination.perPage);
        const start = (Library.pagination.page - 1) * Library.pagination.perPage;
        const pageItems = filtered.slice(start, start + Library.pagination.perPage);

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#555;">${t('lib_no_char')}</div>`;
            Library.renderPagination();
            return;
        }

        grid.innerHTML = pageItems.map(c => `
            <div class="lib-card custom">
                <div class="lib-card-thumb">
                    ${c.imageId ? `<img src="" data-img-id="${c.imageId}">` : 
                      c.imageUrl ? `<img src="${c.imageUrl}">` : 
                      `<div class="lib-thumb-placeholder">👤</div>`}
                </div>
                <div class="lib-card-body">
                    <div class="lib-card-name">${c.name}</div>
                    <div class="lib-card-meta">${t('lbl_level')} ${c.level} ${c.className || 'Adventurer'}</div>
                    
                    <div class="lib-mini-stats">
                        <div class="lms-box"><div class="lms-label">${t('mon_stat_hp')}</div><div class="lms-val" style="color:#d32f2f">${c.current ? c.current.hp : 0}/${c.derived ? c.derived.maxHP : 0}</div></div>
                        <div class="lms-box"><div class="lms-label">${t('stat_con')}</div><div class="lms-val" style="color:#388e3c">${c.current ? c.current.sta : 0}/${c.derived ? c.derived.maxSTA : 0}</div></div>
                        <div class="lms-box"><div class="lms-label">${t('sheet_mp')}</div><div class="lms-val" style="color:#1976d2">${c.current ? c.current.mp : 0}/${c.derived ? c.derived.maxMP : 0}</div></div>
                    </div>
                </div>
                <div class="lib-card-footer">
                    <button class="lib-btn primary action-play" data-id="${c.id}">▶ ${t('btn_view')}</button>
                    <button class="lib-btn action-edit" data-id="${c.id}">✏️ ${t('btn_edit')}</button>
                    <button class="lib-btn delete action-delete" data-id="${c.id}" data-type="char">🗑️</button>
                </div>
            </div>
        `).join('');

        Library.lazyLoadImages(grid);
        Library.bindCardActions(grid, 'char');
        Library.renderPagination();
    },

    renderItems: (grid) => {
        const t = I18n.t;
        const items = Storage.getLibrary('grim_delve_items') || [];
        const f = Library.filters;

        const filtered = items.filter(i => {
            if (f.search && !i.name.toLowerCase().includes(f.search)) return false;
            if (f.type !== 'all' && i.type !== f.type) return false;
            return true;
        });

        // Pagination
        Library.pagination.totalPages = Math.ceil(filtered.length / Library.pagination.perPage);
        const start = (Library.pagination.page - 1) * Library.pagination.perPage;
        const pageItems = filtered.slice(start, start + Library.pagination.perPage);

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#555;">${t('lib_no_item')}</div>`;
            Library.renderPagination();
            return;
        }

        grid.innerHTML = pageItems.map(i => {
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
                        <button class="lib-btn primary action-view-item" data-id="${i.id}">👁️ ${t('btn_view')}</button>
                        <button class="lib-btn action-edit" data-id="${i.id}" data-type="item">✏️ ${t('btn_edit')}</button>
                        <button class="lib-btn delete action-delete" data-id="${i.id}" data-type="item">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        Library.lazyLoadImages(grid);
        Library.bindCardActions(grid, 'item');
        Library.renderPagination();
    },

    renderBestiary: (grid) => {
        const t = I18n.t;
        
        // 1. Get & Normalize Data
        const rawOfficial = I18n.getData('bestiary') || [];
        const official = rawOfficial.map(m => ({
            id: m.id,
            name: m.name,
            role: m.role.toLowerCase(),
            family: m.family,
            level: m.level,
            source: 'official',
            imageUrl: m.imageUrl || null,
            imgPos: m.imgPos || { x:0, y:0, scale:1 },
            stats: {
                hp: m.stats.hp,
                as: m.stats.as,
                speed: m.stats.speed,
                atk: m.combat ? m.combat.atk_dc : m.stats.atk,
                def: m.combat ? m.combat.def_dc : m.stats.def,
                save: m.combat ? m.combat.save_dc : m.stats.save,
                dmg: m.combat ? m.combat.dmg : m.stats.dmg
            },
            traits: m.abilities ? m.abilities.filter(a => a.type === "Passive" || a.type === "Trait") : m.traits,
            actions: m.abilities ? m.abilities.filter(a => a.type === "Action" || a.type === "Attack" || a.type === "Magic") : m.actions,
            danger_abilities: m.abilities ? m.abilities.filter(a => a.type === "Danger") : m.danger_abilities,
            notes: m.loot ? `Loot: ${m.loot}` : m.notes
        }));
        
        const custom = Storage.getLibrary('grim_monsters') || [];
        const all = [...custom, ...official];
        const f = Library.filters;
        
        // 2. Filter with Language Logic
        const filtered = all.filter(m => {
            // Search (Name)
            if (f.search && !m.name.toLowerCase().includes(f.search)) return false;
            
            // Role Filter (Robust Spanish Check)
            if (f.role !== 'all') {
                const mRoleRaw = m.role.toLowerCase(); // e.g. "soldier" or "soldado"
                const filterRaw = f.role.toLowerCase(); // e.g. "soldier"
                const filterLocalized = t('role_' + filterRaw).toLowerCase(); // e.g. "soldado"
                
                // Matches if monster role equals internal ID OR localized name
                const matchesRole = (mRoleRaw === filterRaw) || (mRoleRaw === filterLocalized);
                if (!matchesRole) return false;
            }

            // Family Filter (Internal ID check)
            if (f.family !== 'all') {
                if (m.family !== f.family) return false;
            }
            
            // Source Filter
            if (f.source !== 'all' && (m.source || 'custom') !== f.source) return false;
            
            return true;
        });

        // 3. Pagination
        Library.pagination.totalPages = Math.ceil(filtered.length / Library.pagination.perPage);
        const start = (Library.pagination.page - 1) * Library.pagination.perPage;
        const pageItems = filtered.slice(start, start + Library.pagination.perPage);

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#555;">${t('lib_no_mon')}</div>`;
            Library.renderPagination();
            return;
        }

        // 4. Render
        grid.innerHTML = pageItems.map(m => {
            const isCustom = (m.source !== 'official');
            
            // Translate Role
            const roleKey = 'role_' + (m.role || '').toLowerCase();
            const roleName = t(roleKey) !== roleKey ? t(roleKey) : m.role;
            const displayRole = roleName.charAt(0).toUpperCase() + roleName.slice(1);

            // --- IMAGE FIX ---
            let imgHTML = `<div class="lib-thumb-placeholder">💀</div>`;
            
            // Calculate Style string for Pan/Zoom
            const pos = m.imgPos || { x: 0, y: 0, scale: 1.0 };
            const imgStyle = `transform: translate(${pos.x}px, ${pos.y}px) scale(${pos.scale});`;

            if (m.imageId) {
                imgHTML = `<img src="" data-img-id="${m.imageId}" style="${imgStyle}">`;
            } else if (m.imageUrl) {
                imgHTML = `<img src="${m.imageUrl}" style="${imgStyle}">`;
            }

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
                        <div class="lib-card-meta">${t('lbl_level')} ${m.level} ${displayRole}</div>
                        
                        <div class="lib-mini-stats">
                            <div class="lms-box"><div class="lms-label">${t('mon_stat_hp')}</div><div class="lms-val" style="color:#d32f2f">${m.stats.hp}</div></div>
                            <div class="lms-box"><div class="lms-label">${t('mon_stat_as')}</div><div class="lms-val">${m.stats.as}</div></div>
                            <div class="lms-box"><div class="lms-label">${t('mon_stat_atk')}</div><div class="lms-val">${m.stats.atk}</div></div>
                        </div>
                    </div>
                    <div class="lib-card-footer">
                        <button class="lib-btn primary action-view" data-id="${m.id}" data-source="${m.source || 'custom'}">👁️ ${t('btn_view')}</button>
                        <button class="lib-btn action-edit" data-id="${m.id}" data-source="${m.source || 'custom'}">${isCustom ? '✏️ '+t('btn_edit') : '📋 '+t('btn_copy')}</button>
                        ${isCustom ? `<button class="lib-btn delete action-delete" data-id="${m.id}" data-type="mon">🗑️</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        Library.lazyLoadImages(grid);
        Library.bindCardActions(grid, 'mon');
        Library.renderPagination();
    },

    /* ------------------------------------------------------------------
       INTERACTIONS
       ------------------------------------------------------------------ */

    bindCardActions: (grid, type) => {
        // --- DELETE ---
        grid.querySelectorAll('.action-delete').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                if(confirm(I18n.t('btn_confirm') + "?")) {
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

        // --- EDIT ---
        grid.querySelectorAll('.action-edit').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                
                if (type === 'char') {
                    const char = Storage.getCharacter(id);
                    if (char) {
                        CharGen.loadCharacter(char);
                        const navBtn = document.querySelector('[data-module="chargen"]');
                        if (navBtn) navBtn.click();
                    }
                }
                else if (type === 'mon') {
                    const source = btn.dataset.source;
                    let mob;
                    if (source === 'official') {
                        const raw = I18n.getData('bestiary').find(m => m.id === id);
                        if(raw) {
                            mob = {
                                ...raw,
                                source: 'official', // Builder handles this as a clone
                                stats: {
                                    hp: raw.stats.hp, as: raw.stats.as, speed: raw.stats.speed,
                                    atk: raw.combat.atk_dc, def: raw.combat.def_dc, save: raw.combat.save_dc, dmg: raw.combat.dmg
                                },
                                traits: raw.abilities.filter(a => a.type === "Passive" || a.type === "Trait"),
                                actions: raw.abilities.filter(a => a.type === "Action" || a.type === "Attack" || a.type === "Magic"),
                                danger_abilities: raw.abilities.filter(a => a.type === "Danger"),
                                notes: raw.loot ? `Loot: ${raw.loot}` : raw.notes,
                                imgPos: raw.imgPos || { x:0, y:0, scale:1 }
                            };
                        }
                    } else {
                        mob = Storage.getLibrary('grim_monsters').find(m => m.id === id);
                    }
                    if(mob) {
                        MonsterBuilder.loadMonster(mob);
                        document.querySelector('[data-module="bestiary"]').click();
                    }
                } else if (type === 'item') {
                    const item = Storage.getLibrary('grim_delve_items').find(i => i.id === id);
                    if(item) {
                        ItemBuilder.loadItem(item); 
                        document.querySelector('[data-module="artificer"]').click();
                    }
                }
            };
        });

        // --- PLAY (Characters) ---
        grid.querySelectorAll('.action-play').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const char = Storage.getCharacter(id);
                if (char) {
                    CharGen.initPlayMode(char);
                }
            };
        });

        // --- VIEW (Monsters) ---
        grid.querySelectorAll('.action-view').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const source = btn.dataset.source;
                let mob;
                
                if (source === 'official') {
                    const raw = I18n.getData('bestiary').find(m => m.id === id);
                    if(raw) {
                        mob = {
                           ...raw,
                           stats: {
                               hp: raw.stats.hp, 
                               as: raw.stats.as, 
                               speed: raw.stats.speed,
                               atk: raw.combat.atk_dc, 
                               def: raw.combat.def_dc, 
                               save: raw.combat.save_dc, 
                               dmg: raw.combat.dmg
                           },
                           traits: raw.abilities.filter(a => a.type === "Passive" || a.type === "Trait"),
                           actions: raw.abilities.filter(a => a.type === "Action" || a.type === "Attack" || a.type === "Magic"),
                           danger_abilities: raw.abilities.filter(a => a.type === "Danger"),
                           notes: raw.loot ? `Loot: ${raw.loot}` : raw.notes,
                           imgPos: raw.imgPos || { x:0, y:0, scale:1 }
                        };
                    }
                } else {
                    mob = Storage.getLibrary('grim_monsters').find(m => m.id === id);
                }
                
                if(mob) Library.openMonsterModal(mob);
            };
        });
        
        // --- VIEW (Items) ---
        grid.querySelectorAll('.action-view-item').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const item = Storage.getLibrary('grim_delve_items').find(i => i.id === id);
                if(item) Library.openItemModal(item);
            };
        });
    },

    /* --- MODALS --- */

    openMonsterModal: async (mob) => {
        const t = I18n.t;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        let src = mob.imageUrl;
        if(mob.imageId) {
             try {
                 const url = await ImageStore.getUrl(mob.imageId);
                 if(url) src = url;
             } catch(e) {}
        }

        // Use Renderer
        const cardHtml = MonsterRenderer.getHTML(mob, src);

        overlay.innerHTML = `
            <div class="view-monster-modal" style="max-width:500px;">
                ${cardHtml}
                <div style="text-align:center; margin-top:10px;">
                    <button class="btn-primary" id="btn-close-modal">${t('btn_cancel')}</button>
                    <button class="btn-secondary" id="btn-print-modal">${t('btn_print')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-close-modal').onclick = () => overlay.remove();
        
        // FIX: Contextual Printing from Library
        document.getElementById('btn-print-modal').onclick = () => {
            // Check or Create Print Root
            let printRoot = document.getElementById('print-sheet-root');
            if (!printRoot) {
                printRoot = document.createElement('div');
                printRoot.id = 'print-sheet-root';
                printRoot.className = 'print-only';
                document.body.appendChild(printRoot);
            }

            printRoot.innerHTML = '';
            // Wrap to center for print
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'center';
            wrapper.style.paddingTop = '2cm';
            wrapper.innerHTML = cardHtml;
            
            printRoot.appendChild(wrapper);
            window.print();
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    },

    openItemModal: async (item) => {
        const t = I18n.t;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        let src = item.imageUrl;
        if(item.imageId) {
            try {
                const url = await ImageStore.getUrl(item.imageId);
                if(url) src = url;
            } catch(e) {}
        }

        const cardHtml = ItemRenderer.getHTML(item, src);

        overlay.innerHTML = `
            <div class="view-monster-modal" style="max-width:400px;">
                ${cardHtml}
                <div style="text-align:center; margin-top:10px;">
                    <button class="btn-primary" id="btn-close-modal">${t('btn_cancel')}</button>
                    <button class="btn-secondary" id="btn-print-modal">${t('btn_print')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-close-modal').onclick = () => overlay.remove();
        
        // FIX: Contextual Printing from Library
        document.getElementById('btn-print-modal').onclick = () => {
            // Check or Create Print Root
            let printRoot = document.getElementById('print-sheet-root');
            if (!printRoot) {
                printRoot = document.createElement('div');
                printRoot.id = 'print-sheet-root';
                printRoot.className = 'print-only';
                document.body.appendChild(printRoot);
            }

            printRoot.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'center';
            wrapper.style.paddingTop = '2cm';
            wrapper.innerHTML = cardHtml;
            
            printRoot.appendChild(wrapper);
            window.print();
        };

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
                // Simple heuristic to detect type
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
