/**
 * dashboard.js
 * The Home Screen / Command Center.
 * v3.5: Localized
 */

import { Storage } from '../utils/storage.js';
import { CharGen } from './chargen.js';
import { MonsterBuilder } from './monster_builder.js';
import { ItemBuilder } from './item_builder.js';
import { I18n } from '../utils/i18n.js';

export const Dashboard = {
    container: null,

    init: (container) => {
        Dashboard.container = container;
        Dashboard.render();
    },

    render: () => {
        // 1. Gather Data
        const chars = Storage.getCharacters();
        const monsters = Storage.getLibrary('grim_monsters');
        const items = Storage.getLibrary('grim_delve_items');

        // 2. Find "Last Played" Character (Sort by modified date)
        const lastChar = chars.sort((a, b) => new Date(b.modified) - new Date(a.modified))[0];

        // 3. Aggregate Recent History (Top 5 most recently created/modified)
        const history = [
            ...chars.map(c => ({...c, type: 'char', date: new Date(c.modified || Date.now())})),
            ...monsters.map(m => ({...m, type: 'mon', date: new Date(m.id.split('_')[1] || Date.now())})), 
            ...items.map(i => ({...i, type: 'item', date: new Date(i.id.split('_')[1] || Date.now())}))
        ].sort((a, b) => b.date - a.date).slice(0, 5);

        // 4. Localization Helper
        const t = I18n.t;

        // 5. Build HTML
        const html = `
            <div class="dashboard-layout">
                
                <!-- Hero Section -->
                <div class="dash-hero">
                    <h1>Grim Delve</h1>
                    <p class="dash-subtitle">${t('dash_subtitle')}</p>
                    
                    <div class="dash-hero-actions">
                        ${lastChar ? 
                            `<button id="btn-dash-resume" class="btn-primary btn-large">▶ ${t('dash_resume')}: ${lastChar.name}</button>` : 
                            `<button id="btn-dash-create" class="btn-primary btn-large">➕ ${t('dash_create')}</button>`
                        }
                    </div>
                </div>

                <!-- Quick Actions Grid -->
                <div class="dash-grid">
                    <div class="dash-card action-card" id="card-new-char">
                        <div class="dash-icon">👤</div>
                        <h3>${t('dash_new_char')}</h3>
                        <p>${t('dash_new_char_desc')}</p>
                    </div>
                    <div class="dash-card action-card" id="card-new-mon">
                        <div class="dash-icon">💀</div>
                        <h3>${t('dash_new_mon')}</h3>
                        <p>${t('dash_new_mon_desc')}</p>
                    </div>
                    <div class="dash-card action-card" id="card-new-item">
                        <div class="dash-icon">⚒️</div>
                        <h3>${t('dash_new_item')}</h3>
                        <p>${t('dash_new_item_desc')}</p>
                    </div>
                    <div class="dash-card action-card" id="card-rules">
                        <div class="dash-icon">📜</div>
                        <h3>${t('dash_rules')}</h3>
                        <p>${t('dash_rules_desc')}</p>
                    </div>
                </div>

                <!-- Two Column Lower Section -->
                <div class="dash-split">
                    
                    <!-- Stats / Library Overview -->
                    <div class="dash-panel">
                        <h3>${t('dash_stats')}</h3>
                        <div class="dash-stats-row">
                            <div class="stat-bubble">
                                <span class="stat-num">${chars.length}</span>
                                <span class="stat-label">${t('dash_heroes')}</span>
                            </div>
                            <div class="stat-bubble">
                                <span class="stat-num">${monsters.length}</span>
                                <span class="stat-label">${t('dash_monsters')}</span>
                            </div>
                            <div class="stat-bubble">
                                <span class="stat-num">${items.length}</span>
                                <span class="stat-label">${t('dash_items')}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="dash-panel">
                        <h3>${t('dash_recent')}</h3>
                        <div class="recent-list">
                            ${history.length > 0 ? history.map(h => Dashboard.renderHistoryItem(h)).join('') : '<p class="text-muted">-</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        Dashboard.container.innerHTML = html;
        Dashboard.attachListeners(lastChar);
    },

    renderHistoryItem: (item) => {
        const t = I18n.t;
        let icon = '❓';
        let label = item.name;
        let action = t('btn_edit');
        
        // Icon logic & Localization of Types
        if (item.type === 'char') { 
            icon = '👤'; 
            // Handle class name safely
            const cls = item.className || 'Adventurer';
            label = `${item.name} <span style="font-size:0.8em; color:#666;">(Lvl ${item.level} ${cls})</span>`;
        }
        if (item.type === 'mon') { 
            icon = '💀'; 
            // Translate Role if possible
            const roleKey = 'role_' + (item.role || '').toLowerCase();
            const roleName = t(roleKey) !== roleKey ? t(roleKey) : item.role;
            label = `${item.name} <span style="font-size:0.8em; color:#666;">(${roleName})</span>`;
        }
        if (item.type === 'item') { 
            icon = '⚔️'; 
            label = `${item.name} <span style="font-size:0.8em; color:#666;">(${item.type})</span>`;
        }

        return `
            <div class="recent-item" data-type="${item.type}" data-id="${item.id}">
                <div style="display:flex; align-items:center; gap:10px; flex-grow:1;">
                    <span class="recent-icon">${icon}</span>
                    <div class="recent-info">
                        <div class="recent-name">${label}</div>
                    </div>
                </div>
                <button class="btn-small">${action}</button>
            </div>
        `;
    },

    attachListeners: (lastChar) => {
        // Hero Button
        const resumeBtn = document.getElementById('btn-dash-resume');
        if (resumeBtn && lastChar) {
            resumeBtn.onclick = () => {
                // Switch Nav Highlight
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                const charBtn = document.querySelector('[data-module="chargen"]');
                if(charBtn) charBtn.classList.add('active');
                
                // Load Char
                CharGen.initPlayMode(lastChar);
            };
        }
        
        const createBtn = document.getElementById('btn-dash-create');
        if (createBtn) {
            createBtn.onclick = () => document.querySelector('[data-module="chargen"]').click();
        }

        // Action Cards
        document.getElementById('card-new-char').onclick = () => document.querySelector('[data-module="chargen"]').click();
        
        document.getElementById('card-new-mon').onclick = () => {
            MonsterBuilder.currentMonster.id = null; // Reset
            document.querySelector('[data-module="bestiary"]').click();
        };

        document.getElementById('card-new-item').onclick = () => {
            ItemBuilder.currentItem.id = null; // Reset
            document.querySelector('[data-module="artificer"]').click();
        };

        document.getElementById('card-rules').onclick = () => document.querySelector('[data-module="rules"]').click();

        // Recent List
        document.querySelectorAll('.recent-item').forEach(item => {
            item.onclick = () => Dashboard.openHistoryItem(item.dataset.type, item.dataset.id);
        });
    },

    openHistoryItem: (type, id) => {
        if (type === 'char') {
            const data = Storage.getCharacter(id);
            if(data) {
                CharGen.loadCharacter(data);
                document.querySelector('[data-module="chargen"]').click();
            }
        } else if (type === 'mon') {
            const data = Storage.getLibrary('grim_monsters').find(m => m.id === id);
            if(data) {
                MonsterBuilder.loadMonster(data);
                document.querySelector('[data-module="bestiary"]').click();
            }
        } else if (type === 'item') {
             const data = Storage.getLibrary('grim_delve_items').find(i => i.id === id);
             if(data) {
                 ItemBuilder.loadItem(data);
                 document.querySelector('[data-module="artificer"]').click();
             }
        }
    }
};
