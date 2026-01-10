/**
 * i18n.js
 * Localization and Data Management Utility.
 * Handles loading JSON data files and translating UI elements.
 */

const UI_DICTIONARY = {
    "en": {
        "nav_home": "Rules Reference",
        "nav_chargen": "Character Creator",
        "nav_bestiary": "Monster Architect",
        "nav_items": "The Artificer",
        "nav_library": "My Library",
        "nav_tables": "Tables & Rolls", // <--- NEW LINE
        "welcome_title": "Welcome to the Dark",
        "welcome_text": "Select a module from the left to begin.",
        "loading": "Loading Data..."
    },
    "es": {
        "nav_home": "Reglas de Juego",
        "nav_chargen": "Creador de Personajes",
        "nav_bestiary": "Arquitecto de Monstruos",
        "nav_items": "El Artificiero",
        "nav_library": "Mi Biblioteca",
        "nav_tables": "Tablas y Dados", // <--- NEW LINE
        "welcome_title": "Bienvenido a la Oscuridad",
        "welcome_text": "Selecciona un módulo a la izquierda para comenzar.",
        "loading": "Cargando Datos..."
    }
};

// Central Store for loaded JSON content
const DATA_STORE = {
    rules: null,
    options: null,
    items: null,
    monsters: null,
    bestiary: null,
    tables: null // <--- NEW LINE
};

export const I18n = {
    
    currentLang: 'en',

    /**
     * Initialize the localization system.
     * Loads default language data and sets up event listeners.
     */
    init: async () => {
        console.log("Initializing Localization...");
        
        // Load English data by default
        await I18n.loadData('en');
        I18n.updateDOM();

        // Setup Sidebar Toggle Buttons
        const btnEn = document.getElementById('btn-lang-en');
        const btnEs = document.getElementById('btn-lang-es');

        if(btnEn && btnEs) {
            btnEn.addEventListener('click', () => I18n.switchLanguage('en'));
            btnEs.addEventListener('click', () => I18n.switchLanguage('es'));
        }
    },

    /**
     * Switches the app language and reloads data.
     * @param {string} lang - 'en' or 'es'
     */
    switchLanguage: async (lang) => {
        if (lang === I18n.currentLang) return;

        console.log(`Switching Language to: ${lang}`);
        I18n.currentLang = lang;

        // Update Toggle Buttons Visual State
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`btn-lang-${lang}`).classList.add('active');

        // Reload Data
        await I18n.loadData(lang);

        // Update UI Text
        I18n.updateDOM();

        // Dispatch Event so Modules know to re-render
        const event = new CustomEvent('i18n-changed', { detail: { lang } });
        window.dispatchEvent(event);
    },

    /**
     * Fetches all JSON files for the specified language.
     */
    loadData: async (lang) => {
    try {
        const [rules, options, items, monsters, bestiary, tables] = await Promise.all([
            fetch(`./data/rules_${lang}.json`).then(res => res.json()),
            fetch(`./data/options_${lang}.json`).then(res => res.json()),
            fetch(`./data/items_${lang}.json`).then(res => res.json()),
            fetch(`./data/monsters_${lang}.json`).then(res => res.json()),
            fetch(`./data/bestiary_${lang}.json`).then(res => res.json()),
            fetch(`./data/tables_${lang}.json`).then(res => res.json()) // <--- Loaded here
        ]);

        DATA_STORE.rules = rules;
        DATA_STORE.options = options;
        DATA_STORE.items = items;
        DATA_STORE.monsters = monsters;
        DATA_STORE.bestiary = bestiary;
        DATA_STORE.tables = tables; // <--- Stored here
        
        console.log(`Data loaded for [${lang}]`, DATA_STORE);

    } catch (error) {
        console.warn(`Failed to load data for language: ${lang}.`, error);
        if (lang !== 'en') {
            console.log("Falling back to English data...");
            await I18n.loadData('en');
        }
    }
},

    /**
     * Updates all HTML elements with the 'data-i18n' attribute.
     */
    updateDOM: () => {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (UI_DICTIONARY[I18n.currentLang][key]) {
                el.textContent = UI_DICTIONARY[I18n.currentLang][key];
            }
        });
    },

    /**
     * Get a specific UI string.
     * @param {string} key 
     */
    t: (key) => {
        return UI_DICTIONARY[I18n.currentLang][key] || `[${key}]`;
    },

    /**
     * Accessor for the loaded JSON data.
     * @param {string} type - 'rules', 'options', 'items', 'monsters', 'bestiary'
     */
    getData: (type) => {
        return DATA_STORE[type];
    }
};