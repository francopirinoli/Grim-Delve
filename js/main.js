/**
 * Main Entry Point for Grim Delve
 * Handles initialization, data loading, and module routing.
 */

import { I18n } from './utils/i18n.js';
import { Rulebook } from './modules/rulebook.js';
import { CharGen } from './modules/chargen.js';
import { MonsterBuilder } from './modules/monster_builder.js';
import { Library } from './modules/library.js';
import { ItemBuilder } from './modules/item_builder.js';
import { TableLookup } from './modules/table_lookup.js'; 
import { Dashboard } from './modules/dashboard.js';

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Grim Delve System Initializing...");
    
    // 1. Initialize Localization & Load JSON Data
    await I18n.init();

    // 2. Setup Sidebar Navigation
    initNavigation();

    // 3. Load Default Module (Rules) on startup
    const activeBtn = document.querySelector('.nav-btn.active');
    if (activeBtn) {
        loadModule(activeBtn.dataset.module);
    } else {
        loadModule('home');
    }
     // Backup & Restore
    const btnBackup = document.getElementById('btn-backup');
    const btnRestore = document.getElementById('btn-restore');
    const fileRestore = document.getElementById('file-restore');

    if (btnBackup) {
        btnBackup.addEventListener('click', async () => {
            const { Storage } = await import('./utils/storage.js');
            Storage.backupAll();
        });
    }

    if (btnRestore && fileRestore) {
        btnRestore.addEventListener('click', () => fileRestore.click());
        
        fileRestore.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const { Storage } = await import('./utils/storage.js');
            
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const json = JSON.parse(ev.target.result);
                    if (Storage.restoreBackup(json)) {
                        alert("Restoration Complete. Reloading...");
                        location.reload();
                    }
                } catch (err) {
                    alert("Invalid Backup File.");
                }
            };
            reader.readAsText(file);
        });
    }
});

/**
 * Sets up click listeners for the sidebar buttons.
 */
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('mobile-menu-btn');

    // 1. Mobile Toggle Logic
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // 2. Navigation Logic
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            navButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');

            const moduleName = btn.dataset.module;
            loadModule(moduleName);

            // Auto-Close Sidebar on Mobile
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('open');
            }
        });
    });

    // 3. Close Sidebar when clicking outside (Optional Polish)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && 
            sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !menuBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

/**
 * Clears the main content area and initializes the requested module.
 * @param {string} moduleName - The data-module attribute of the clicked button.
 */
function loadModule(moduleName) {
    const contentArea = document.getElementById('main-content');
    
    // 1. Reset State
    contentArea.innerHTML = '';
    contentArea.className = ''; 
    contentArea.scrollTop = 0;  

    // ADD ANIMATION CLASS
    contentArea.classList.add('fade-in'); 

    console.log(`Switching to module: ${moduleName}`);

    // 2. Route to Module
    switch(moduleName) {
        // ... (Existing switch cases remain unchanged) ...
        case 'dashboard':
        case 'home':
            import('./modules/dashboard.js').then(m => m.Dashboard.init(contentArea));
            break;
        case 'rules':
            import('./modules/rulebook.js').then(m => m.Rulebook.init(contentArea));
            break;
        case 'chargen':
            import('./modules/chargen.js').then(m => m.CharGen.init(contentArea));
            break;
        case 'bestiary':
            import('./modules/monster_builder.js').then(m => m.MonsterBuilder.init(contentArea));
            break;
        case 'artificer':
            import('./modules/item_builder.js').then(m => m.ItemBuilder.init(contentArea));
            break;
        case 'library':
            import('./modules/library.js').then(m => m.Library.init(contentArea));
            break;
        case 'tables':
            import('./modules/table_lookup.js').then(m => m.TableLookup.init(contentArea));
            break;
        default:
            contentArea.innerHTML = `<p>Module <strong>${moduleName}</strong> not found.</p>`;
    }
}
