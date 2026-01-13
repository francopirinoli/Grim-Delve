/**
 * main.js
 * Main Entry Point for Grim Delve.
 * Handles initialization, data loading, module routing, and global events.
 * v3.5: Localized
 */

import { I18n } from './utils/i18n.js';
import { Storage } from './utils/storage.js';

// Import Modules
import { Dashboard } from './modules/dashboard.js';
import { Rulebook } from './modules/rulebook.js';
import { CharGen } from './modules/chargen.js';
import { MonsterBuilder } from './modules/monster_builder.js';
import { ItemBuilder } from './item_builder.js';
import { Library } from './modules/library.js';
import { TableLookup } from './modules/table_lookup.js';

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Grim Delve System Initializing...");
    
    // 1. Initialize Localization & Load JSON Data
    // This must happen before any UI is rendered
    await I18n.init();

    // 2. Setup Sidebar Navigation
    initNavigation();

    // 3. Load Default Module (Dashboard)
    // Check if a specific module was active (persisted state could go here)
    loadModule('dashboard');

    // 4. Setup Global Backup/Restore
    setupPersistence();
});

/**
 * Sets up click listeners for the sidebar buttons.
 */
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('mobile-menu-btn');

    // Mobile Toggle
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Navigation Logic
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Logic
            const moduleName = btn.dataset.module;
            loadModule(moduleName);

            // Auto-Close Sidebar on Mobile
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('open');
            }
        });
    });

    // Close Sidebar when clicking outside (Mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && 
            sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !menuBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Language Toggle Event Listener (Global Refresh)
    window.addEventListener('i18n-changed', (e) => {
        // Re-load the current module to apply new language
        const activeBtn = document.querySelector('.nav-btn.active');
        if (activeBtn) {
            loadModule(activeBtn.dataset.module);
        }
    });
}

/**
 * Clears the main content area and initializes the requested module.
 */
function loadModule(moduleName) {
    const contentArea = document.getElementById('main-content');
    
    // 1. Reset State
    contentArea.innerHTML = '';
    contentArea.scrollTop = 0;
    
    // Remove specific class hooks if present
    document.body.classList.remove('mode-play'); 

    // 2. Route to Module
    switch(moduleName) {
        case 'dashboard':
            Dashboard.init(contentArea);
            break;
        case 'rules':
            Rulebook.init(contentArea);
            break;
        case 'chargen':
            CharGen.init(contentArea);
            break;
        case 'bestiary':
            MonsterBuilder.init(contentArea);
            break;
        case 'artificer':
            ItemBuilder.init(contentArea);
            break;
        case 'library':
            Library.init(contentArea);
            break;
        case 'tables':
            TableLookup.init(contentArea);
            break;
        default:
            contentArea.innerHTML = `<p style="padding:2rem; color:#888;">Module <strong>${moduleName}</strong> not implemented.</p>`;
    }
}

/**
 * Setup Backup and Restore buttons in the sidebar footer.
 */
function setupPersistence() {
    const btnBackup = document.getElementById('btn-backup');
    const btnRestore = document.getElementById('btn-restore');
    const fileRestore = document.getElementById('file-restore');

    if (btnBackup) {
        btnBackup.addEventListener('click', async () => {
            await Storage.backupAll();
            // Optional: Simple visual feedback
            const originalText = btnBackup.textContent;
            btnBackup.textContent = "✅";
            setTimeout(() => btnBackup.textContent = originalText, 1000);
        });
    }

    if (btnRestore && fileRestore) {
        btnRestore.addEventListener('click', () => fileRestore.click());
        
        fileRestore.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const json = JSON.parse(ev.target.result);
                    if (Storage.restoreBackup(json)) {
                        alert("Database Restored. Reloading...");
                        location.reload();
                    }
                } catch (err) {
                    console.error(err);
                    alert("Error: Invalid Backup File.");
                }
            };
            reader.readAsText(file);
        });
    }
}
