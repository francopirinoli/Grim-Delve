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
import { TableLookup } from './modules/table_lookup.js'; // <--- NEW LINE

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
});

/**
 * Sets up click listeners for the sidebar buttons.
 */
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            navButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');

            const moduleName = btn.dataset.module;
            loadModule(moduleName);
        });
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

    console.log(`Switching to module: ${moduleName}`);

    // 2. Route to Module
    switch(moduleName) {
        case 'home':
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
            
        case 'tables': // <--- NEW CASE
            TableLookup.init(contentArea);
            break;

        default:
            contentArea.innerHTML = `<p>Module <strong>${moduleName}</strong> not found.</p>`;
    }
}
