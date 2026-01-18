/**
 * monster_tuner.js
 * Internal Dev Tool for visual auditing and image positioning.
 * v3: Adds Persistence (survives refresh) and Library Injection.
 */

import { MonsterRenderer } from './monster_builder.js';
import { I18n } from '../utils/i18n.js';

const STORAGE_KEY = 'grim_tuner_changes';

export const MonsterTuner = {
    container: null,
    dataEn: [],
    dataEs: [],
    currentId: null,
    
    // Stores overrides: { "mob_id": { imgPos: {...}, imageUrl: "..." } }
    savedChanges: {}, 

    // State for temporary edits in the UI
    activeSettings: {
        imgUrl: "",
        imgX: 0,
        imgY: 0,
        imgScale: 1.0
    },

    init: async (container) => {
        MonsterTuner.container = container;
        container.innerHTML = '<p style="text-align:center; padding:2rem; color:#888;">Loading Master Bestiaries...</p>';
        
        // 1. Load Persistence
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) MonsterTuner.savedChanges = JSON.parse(stored);

        // 2. Load File Data
        await MonsterTuner.loadData();
        
        // 3. Render
        MonsterTuner.renderLayout();
    },

    loadData: async () => {
        try {
            const t = Date.now();
            const [en, es] = await Promise.all([
                fetch(`./data/bestiary_en.json?t=${t}`).then(r => r.json()),
                fetch(`./data/bestiary_es.json?t=${t}`).then(r => r.json())
            ]);
            
            // 4. Apply Saved Changes to Data IMMEDIATELY
            // This ensures when we download, we get the modified version
            MonsterTuner.applyPersistence(en);
            MonsterTuner.applyPersistence(es);

            MonsterTuner.dataEn = en;
            MonsterTuner.dataEs = es;
            
            // Sort
            MonsterTuner.dataEn.sort((a, b) => a.name.localeCompare(b.name));
            
            console.log(`Tuner Loaded & Patched: ${en.length} EN, ${es.length} ES`);
        } catch (e) {
            console.error("Failed to load bestiaries:", e);
            MonsterTuner.container.innerHTML = `<p style="color:red; text-align:center;">Error loading Bestiary JSON. Check console.</p>`;
        }
    },

    // Helper to overwrite file data with local storage data
    applyPersistence: (dataArray) => {
        dataArray.forEach(mob => {
            if (MonsterTuner.savedChanges[mob.id]) {
                const patch = MonsterTuner.savedChanges[mob.id];
                if (patch.imgPos) mob.imgPos = patch.imgPos;
                if (patch.imageUrl) mob.imageUrl = patch.imageUrl;
            }
        });
    },

    renderLayout: () => {
        const html = `
            <div class="tuner-layout">
                <!-- Sidebar -->
                <div class="tuner-sidebar">
                    <div class="tuner-search">
                        <input type="text" id="tuner-search" placeholder="Search Monster...">
                    </div>
                    <div id="tuner-list" class="tuner-list"></div>
                    <div class="tuner-footer" style="flex-direction:column;">
                        <div style="display:flex; gap:5px; width:100%;">
                            <button id="btn-dl-en" class="btn-small" style="flex:1;">💾 DL English</button>
                            <button id="btn-dl-es" class="btn-small" style="flex:1;">💾 DL Spanish</button>
                        </div>
                        <button id="btn-clear-cache" class="btn-small" style="width:100%; border-color:#8a2c2c; color:#8a2c2c; margin-top:5px;">⚠ Clear Saved Edits</button>
                        <div style="font-size:0.7em; color:#666; text-align:center; margin-top:5px;">
                            Changes are saved to browser.<br>Download to update files.
                        </div>
                    </div>
                </div>

                <!-- Main Work Area -->
                <div class="tuner-workspace">
                    <div class="tuner-controls">
                        <div class="control-group" style="flex:2">
                            <label>Image URL</label>
                            <input type="text" id="tune-url" placeholder="https://..." style="width:100%;">
                        </div>
                        <div class="control-group">
                            <label>Zoom <span id="val-scale" style="color:var(--accent-gold);">1.0</span></label>
                            <input type="range" id="tune-scale" min="0.1" max="3.0" step="0.1" value="1.0">
                        </div>
                        <div class="control-group">
                            <label>Pan X <span id="val-x" style="color:var(--accent-gold);">0</span></label>
                            <input type="range" id="tune-x" min="-200" max="200" step="5" value="0">
                        </div>
                        <div class="control-group">
                            <label>Pan Y <span id="val-y" style="color:var(--accent-gold);">0</span></label>
                            <input type="range" id="tune-y" min="-200" max="200" step="5" value="0">
                        </div>
                        <div class="control-group">
                            <label>&nbsp;</label>
                            <button id="btn-apply-changes" class="btn-primary" style="height:34px; line-height:1;">APPLY</button>
                        </div>
                    </div>

                    <div class="tuner-dual-view">
                        <div class="tuner-pane">
                            <div class="pane-label">ENGLISH</div>
                            <div id="render-en" class="card-wrapper">Select a monster...</div>
                        </div>
                        <div class="tuner-pane">
                            <div class="pane-label">ESPAÑOL</div>
                            <div id="render-es" class="card-wrapper">Select a monster...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        MonsterTuner.container.innerHTML = html;
        MonsterTuner.renderList();
        MonsterTuner.attachListeners();
    },

    renderList: (filter = "") => {
        const listEl = document.getElementById('tuner-list');
        if (!listEl) return;

        listEl.innerHTML = MonsterTuner.dataEn.map((m, idx) => {
            if (filter && !m.name.toLowerCase().includes(filter)) return '';
            const isActive = m.id === MonsterTuner.currentId ? 'active' : '';
            // Highlight if modified
            const isModified = MonsterTuner.savedChanges[m.id] ? 'color:var(--accent-gold);' : '';
            const marker = MonsterTuner.savedChanges[m.id] ? ' *' : '';
            
            return `<div class="tuner-item ${isActive}" style="${isModified}" data-id="${m.id}">${m.name}${marker}</div>`;
        }).join('');
        
        listEl.querySelectorAll('.tuner-item').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('.tuner-item').forEach(b => b.classList.remove('active'));
                el.classList.add('active');
                MonsterTuner.selectMonster(el.dataset.id);
            });
        });
    },

    selectMonster: (id) => {
        MonsterTuner.currentId = id;
        
        // Find in arrays (Already patched by loadData)
        const monEn = MonsterTuner.dataEn.find(m => m.id === id);
        const monEs = MonsterTuner.dataEs.find(m => m.id === id);

        if (!monEn) return;

        // Populate Inputs
        const pos = monEn.imgPos || { x: 0, y: 0, scale: 1.0 };
        MonsterTuner.activeSettings = {
            imgUrl: monEn.imageUrl || "",
            imgX: pos.x,
            imgY: pos.y,
            imgScale: pos.scale
        };

        document.getElementById('tune-url').value = MonsterTuner.activeSettings.imgUrl;
        document.getElementById('tune-x').value = MonsterTuner.activeSettings.imgX;
        document.getElementById('tune-y').value = MonsterTuner.activeSettings.imgY;
        document.getElementById('tune-scale').value = MonsterTuner.activeSettings.imgScale;
        
        // Reset Button State
        const btn = document.getElementById('btn-apply-changes');
        btn.textContent = "APPLY";
        btn.style.background = "";

        MonsterTuner.updateLabels();
        MonsterTuner.renderPreview(monEn, monEs);
    },

    renderPreview: (monEn, monEs) => {
        const rEn = document.getElementById('render-en');
        const rEs = document.getElementById('render-es');

        if (!monEn) return;

        // Apply Live Inputs (Visual Only)
        const tempEn = JSON.parse(JSON.stringify(monEn));
        const tempEs = monEs ? JSON.parse(JSON.stringify(monEs)) : null;

        const pos = { 
            x: parseInt(MonsterTuner.activeSettings.imgX), 
            y: parseInt(MonsterTuner.activeSettings.imgY), 
            scale: parseFloat(MonsterTuner.activeSettings.imgScale) 
        };
        const url = MonsterTuner.activeSettings.imgUrl;

        tempEn.imgPos = pos;
        if (url) tempEn.imageUrl = url;
        if (tempEs) {
            tempEs.imgPos = pos;
            if (url) tempEs.imageUrl = url;
        }

        rEn.innerHTML = MonsterRenderer.getHTML(tempEn, url || tempEn.imageUrl, 'en');
        if (tempEs) {
            rEs.innerHTML = MonsterRenderer.getHTML(tempEs, url || tempEs.imageUrl, 'es');
        } else {
            rEs.innerHTML = `<div style="padding:20px; color:#666; text-align:center;">No Spanish Data</div>`;
        }
    },

    attachListeners: () => {
        // Search
        document.getElementById('tuner-search').addEventListener('input', (e) => {
            MonsterTuner.renderList(e.target.value.toLowerCase());
        });

        // Controls
        const updateState = () => {
            MonsterTuner.activeSettings.imgUrl = document.getElementById('tune-url').value;
            MonsterTuner.activeSettings.imgX = document.getElementById('tune-x').value;
            MonsterTuner.activeSettings.imgY = document.getElementById('tune-y').value;
            MonsterTuner.activeSettings.imgScale = document.getElementById('tune-scale').value;
            
            MonsterTuner.updateLabels();

            const btn = document.getElementById('btn-apply-changes');
            btn.textContent = "APPLY *";
            btn.style.background = "#d32f2f"; // Red = Unsaved

            if (MonsterTuner.currentId) {
                const monEn = MonsterTuner.dataEn.find(m => m.id === MonsterTuner.currentId);
                const monEs = MonsterTuner.dataEs.find(m => m.id === MonsterTuner.currentId);
                MonsterTuner.renderPreview(monEn, monEs);
            }
        };

        ['tune-url', 'tune-x', 'tune-y', 'tune-scale'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateState);
        });

        // APPLY Button
        document.getElementById('btn-apply-changes').addEventListener('click', () => {
            if (!MonsterTuner.currentId) return;

            // 1. Define Changes
            const newPatch = {
                imageUrl: MonsterTuner.activeSettings.imgUrl,
                imgPos: {
                    x: parseInt(MonsterTuner.activeSettings.imgX),
                    y: parseInt(MonsterTuner.activeSettings.imgY),
                    scale: parseFloat(MonsterTuner.activeSettings.imgScale)
                }
            };

            // 2. Save to Memory (Array)
            const enItem = MonsterTuner.dataEn.find(m => m.id === MonsterTuner.currentId);
            if (enItem) { Object.assign(enItem, newPatch); }
            
            const esItem = MonsterTuner.dataEs.find(m => m.id === MonsterTuner.currentId);
            if (esItem) { Object.assign(esItem, newPatch); }

            // 3. Save to LocalStorage
            MonsterTuner.savedChanges[MonsterTuner.currentId] = newPatch;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(MonsterTuner.savedChanges));

            // 4. Inject to Live Library
            if (I18n.currentLang === 'en' && enItem) I18n.updateEntry('bestiary', enItem);
            if (I18n.currentLang === 'es' && esItem) I18n.updateEntry('bestiary', esItem);

            // 5. Update UI
            MonsterTuner.renderList(document.getElementById('tuner-search').value);
            const btn = document.getElementById('btn-apply-changes');
            btn.textContent = "SAVED!";
            btn.style.backgroundColor = "var(--accent-blue)";
        });

        // Download Buttons
        const download = (data, filename) => {
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        };

        document.getElementById('btn-dl-en').addEventListener('click', () => download(MonsterTuner.dataEn, 'bestiary_en.json'));
        document.getElementById('btn-dl-es').addEventListener('click', () => download(MonsterTuner.dataEs, 'bestiary_es.json'));

        // Clear Cache
        document.getElementById('btn-clear-cache').addEventListener('click', () => {
            if(confirm("This will erase all your Tuner edits. Are you sure?")) {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            }
        });
    },

    updateLabels: () => {
        document.getElementById('val-x').textContent = MonsterTuner.activeSettings.imgX;
        document.getElementById('val-y').textContent = MonsterTuner.activeSettings.imgY;
        document.getElementById('val-scale').textContent = MonsterTuner.activeSettings.imgScale;
    }
};