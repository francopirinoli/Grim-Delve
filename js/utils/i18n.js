/**
 * i18n.js
 * Localization and Data Management Utility.
 * Handles loading JSON data files and translating UI elements.
 */

const UI_DICTIONARY = {
    "en": {
        "lib_no_char": "No characters found.",
        "lib_no_item": "No items found.",
        "lib_loading": "Loading...",
        "btn_import_json": "Import JSON",
        // CHARGEN (Wizard & Sheet)
        "cg_step_bio": "Origins",
        "cg_step_class": "Class",
        "cg_step_stats": "Attributes",
        "cg_step_gear": "Gear",
        "cg_step_sheet": "Final Sheet",
        "cg_btn_next": "Next",
        "cg_btn_back": "Back",
        "cg_btn_finish": "Finish",

        // Step 1: Bio
        "cg_lbl_identity": "Identity",
        "cg_lbl_name": "Character Name",
        "cg_lbl_portrait": "Portrait",
        "cg_ph_url": "Paste Image URL...",
        "cg_btn_upload": "Or Upload File",
        "cg_lbl_ancestry": "Ancestry",
        "cg_lbl_background": "Background",
        "cg_btn_roll_bio": "Roll Random Origins",
        "cg_sel_bonus": "Select Bonus",
        "cg_sel_skill": "Select Skill",
        "cg_sel_resist": "Select Resistance",

        // Step 2: Class
        "cg_lbl_arch_a": "Archetype A",
        "cg_lbl_arch_b": "Archetype B",
        "cg_btn_roll_class": "Roll Destiny (2d12)",
        "cg_lbl_talents": "Starting Talents",
        "cg_txt_pure": "Pure Class: Select 2 Talents.",
        "cg_txt_hybrid": "Hybrid Class: Select 1 Talent from EACH.",

        // Step 3: Stats
        "cg_lbl_array": "Stat Array",
        "cg_lbl_manual": "Manual Edit",
        "cg_txt_array": "Assign values to attributes below.",
        "cg_btn_roll_stats": "Roll Array (1d12)",
        "cg_txt_manual": "Enter modifiers directly.",

        // Step 4: Gear
        "cg_shop_title": "Equipment Shop",
        "cg_tab_wep": "Weapons",
        "cg_tab_arm": "Armor",
        "cg_tab_gear": "Gear",
        "cg_btn_kit": "Equip Background Gear",
        "cg_lbl_slots": "Inventory Slots",
        "cg_warn_enc": "ENCUMBERED",

        // Step 5: Sheet
        "sheet_levelup": "Level Up",
        "sheet_save": "Save",
        "sheet_print": "Print Sheet",
        "sheet_hp": "Hit Points",
        "sheet_mp": "Mana",
        "sheet_sta": "Stamina",
        "sheet_luck": "Luck",
        "sheet_xp": "XP",
        "sheet_ac": "Armor Score",
        "sheet_def": "Defenses",
        "sheet_skills": "Skills",
        "sheet_attacks": "Attacks",
        "sheet_inv": "Inventory",
        "sheet_notes": "Notes",
        "sheet_features": "Features & Talents",
        "sheet_dodge": "Dodge",
        "sheet_parry": "Parry",
        "sheet_block": "Block",

        // Navigation
        "nav_dashboard": "Dashboard",
        "nav_home": "Rules Reference",
        "nav_chargen": "Character Creator",
        "nav_bestiary": "Monster Architect",
        "nav_items": "The Artificer",
        "nav_library": "My Library",
        "nav_tables": "Tables & Rolls",
        
        // Dashboard
        "dash_subtitle": "Dark Pulp RPG Companion",
        "dash_resume": "Resume",
        "dash_create": "Create New Character",
        "dash_new_char": "New Hero",
        "dash_new_char_desc": "Create a character from scratch.",
        "dash_new_mon": "New Monster",
        "dash_new_mon_desc": "Forge a beast or boss.",
        "dash_new_item": "New Item",
        "dash_new_item_desc": "Craft magical loot.",
        "dash_rules": "Rules",
        "dash_rules_desc": "Lookup tables and mechanics.",
        "dash_stats": "Library Stats",
        "dash_recent": "Recent Activity",
        "dash_heroes": "Heroes",
        "dash_monsters": "Monsters",
        "dash_items": "Items",

        // Library
        "lib_tab_char": "Characters",
        "lib_tab_mon": "Bestiary",
        "lib_tab_item": "Items",
        "lib_search": "Search...",
        "lib_import": "Import JSON",
        "btn_play": "Play",
        "btn_edit": "Edit",
        "btn_view": "View",
        "btn_copy": "Copy",
        "btn_delete": "Delete",

        // Builders (Shared)
        "lbl_name": "Name",
        "lbl_portrait": "Portrait",
        "lbl_upload": "Upload",
        "lbl_zoom": "Zoom",
        "lbl_pan_x": "Pan X",
        "lbl_pan_y": "Pan Y",
        "lbl_reset": "Reset",
        "lbl_role": "Role",
        "lbl_level": "Level",
        "lbl_family": "Family",
        "lbl_notes": "GM Notes / Loot",
        "btn_print": "Print",
        "btn_save_lib": "Save to Library",

        // Monster Builder
        "mon_chassis": "Chassis Stats",
        "mon_custom": "Add Custom Ability",
        "mon_add_btn": "Add to Stat Block",
        
        // Item Builder
        "item_base": "Base Item",
        "item_blueprint": "Blueprint",
        "item_search_eff": "Search Effects...",
        "item_editor": "Item Editor",
        "item_magic_q": "Magic?",
        "item_forge": "Forge",
        "item_loot": "Loot"
    },
    "es": {
        "lib_no_char": "No se encontraron personajes.",
        "lib_no_item": "No se encontraron objetos.",
        "lib_loading": "Cargando...",
        "btn_import_json": "Importar JSON",

        "cg_step_bio": "Orígenes",
        "cg_step_class": "Clase",
        "cg_step_stats": "Atributos",
        "cg_step_gear": "Equipo",
        "cg_step_sheet": "Hoja Final",
        "cg_btn_next": "Siguiente",
        "cg_btn_back": "Atrás",
        "cg_btn_finish": "Terminar",

        // Step 1: Bio
        "cg_lbl_identity": "Identidad",
        "cg_lbl_name": "Nombre del Personaje",
        "cg_lbl_portrait": "Retrato",
        "cg_ph_url": "Pegar URL de Imagen...",
        "cg_btn_upload": "O Subir Archivo",
        "cg_lbl_ancestry": "Ascendencia",
        "cg_lbl_background": "Trasfondo",
        "cg_btn_roll_bio": "Tirar Orígenes Aleatorios",
        "cg_sel_bonus": "Seleccionar Bono",
        "cg_sel_skill": "Seleccionar Habilidad",
        "cg_sel_resist": "Seleccionar Resistencia",

        // Step 2: Class
        "cg_lbl_arch_a": "Arquetipo A",
        "cg_lbl_arch_b": "Arquetipo B",
        "cg_btn_roll_class": "Tirar Destino (2d12)",
        "cg_lbl_talents": "Talentos Iniciales",
        "cg_txt_pure": "Clase Pura: Elige 2 Talentos.",
        "cg_txt_hybrid": "Clase Híbrida: Elige 1 Talento de CADA uno.",

        // Step 3: Stats
        "cg_lbl_array": "Matriz de Estadísticas",
        "cg_lbl_manual": "Edición Manual",
        "cg_txt_array": "Asigna valores a los atributos abajo.",
        "cg_btn_roll_stats": "Tirar Matriz (1d12)",
        "cg_txt_manual": "Introduce modificadores directamente.",

        // Step 4: Gear
        "cg_shop_title": "Tienda de Equipo",
        "cg_tab_wep": "Armas",
        "cg_tab_arm": "Armadura",
        "cg_tab_gear": "Equipo",
        "cg_btn_kit": "Equipar Equipo de Trasfondo",
        "cg_lbl_slots": "Espacios de Inventario",
        "cg_warn_enc": "SOBRECARGADO",

        // Step 5: Sheet
        "sheet_levelup": "Subir Nivel",
        "sheet_save": "Guardar",
        "sheet_print": "Imprimir",
        "sheet_hp": "Puntos de Vida",
        "sheet_mp": "Maná",
        "sheet_sta": "Aguante",
        "sheet_luck": "Suerte",
        "sheet_xp": "XP",
        "sheet_ac": "Puntuación de Armadura",
        "sheet_def": "Defensas",
        "sheet_skills": "Habilidades",
        "sheet_attacks": "Ataques",
        "sheet_inv": "Inventario",
        "sheet_notes": "Notas",
        "sheet_features": "Rasgos y Talentos",
        "sheet_dodge": "Esquivar",
        "sheet_parry": "Parar",
        "sheet_block": "Bloquear",

        // Navigation
        "nav_dashboard": "Tablero",
        "nav_home": "Reglas de Juego",
        "nav_chargen": "Creador de Personajes",
        "nav_bestiary": "Arquitecto de Monstruos",
        "nav_items": "El Artificiero",
        "nav_library": "Mi Biblioteca",
        "nav_tables": "Tablas y Dados",

        // Dashboard
        "dash_subtitle": "Compañero RPG de Fantasía Oscura",
        "dash_resume": "Reanudar",
        "dash_create": "Crear Nuevo Personaje",
        "dash_new_char": "Nuevo Héroe",
        "dash_new_char_desc": "Crear un personaje desde cero.",
        "dash_new_mon": "Nuevo Monstruo",
        "dash_new_mon_desc": "Forjar una bestia o jefe.",
        "dash_new_item": "Nuevo Objeto",
        "dash_new_item_desc": "Crear botín mágico.",
        "dash_rules": "Reglas",
        "dash_rules_desc": "Tablas y mecánicas.",
        "dash_stats": "Estadísticas",
        "dash_recent": "Actividad Reciente",
        "dash_heroes": "Héroes",
        "dash_monsters": "Monstruos",
        "dash_items": "Objetos",

        // Library
        "lib_tab_char": "Personajes",
        "lib_tab_mon": "Bestiario",
        "lib_tab_item": "Objetos",
        "lib_search": "Buscar...",
        "lib_import": "Importar JSON",
        "btn_play": "Jugar",
        "btn_edit": "Editar",
        "btn_view": "Ver",
        "btn_copy": "Copiar",
        "btn_delete": "Borrar",

        // Builders (Shared)
        "lbl_name": "Nombre",
        "lbl_portrait": "Retrato",
        "lbl_upload": "Subir",
        "lbl_zoom": "Zoom",
        "lbl_pan_x": "Pan X",
        "lbl_pan_y": "Pan Y",
        "lbl_reset": "Restablecer",
        "lbl_role": "Rol",
        "lbl_level": "Nivel",
        "lbl_family": "Familia",
        "lbl_notes": "Notas GM / Botín",
        "btn_print": "Imprimir",
        "btn_save_lib": "Guardar en Biblioteca",

        // Monster Builder
        "mon_chassis": "Estadísticas Base",
        "mon_custom": "Añadir Habilidad",
        "mon_add_btn": "Añadir al Bloque",

        // Item Builder
        "item_base": "Objeto Base",
        "item_blueprint": "Plano",
        "item_search_eff": "Buscar Efectos...",
        "item_editor": "Editor de Objetos",
        "item_magic_q": "¿Mágico?",
        "item_forge": "Forja",
        "item_loot": "Botín"
    }
};

// Central Store for loaded JSON content
const DATA_STORE = {
    rules: null,
    options: null,
    items: null,
    monsters: null,
    bestiary: null,
    tables: null
};

export const I18n = {
    
    currentLang: 'en',

    init: async () => {
        console.log("Initializing Localization...");
        await I18n.loadData('en');
        I18n.updateDOM();

        const btnEn = document.getElementById('btn-lang-en');
        const btnEs = document.getElementById('btn-lang-es');

        if(btnEn && btnEs) {
            btnEn.addEventListener('click', () => I18n.switchLanguage('en'));
            btnEs.addEventListener('click', () => I18n.switchLanguage('es'));
        }
    },

    switchLanguage: async (lang) => {
        if (lang === I18n.currentLang) return;
        I18n.currentLang = lang;

        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`btn-lang-${lang}`).classList.add('active');

        await I18n.loadData(lang);
        I18n.updateDOM();

        const event = new CustomEvent('i18n-changed', { detail: { lang } });
        window.dispatchEvent(event);
    },

    loadData: async (lang) => {
        try {
            const [rules, options, items, monsters, bestiary, tables] = await Promise.all([
                fetch(`./data/rules_${lang}.json`).then(res => res.json()),
                fetch(`./data/options_${lang}.json`).then(res => res.json()),
                fetch(`./data/items_${lang}.json`).then(res => res.json()),
                fetch(`./data/monsters_${lang}.json`).then(res => res.json()),
                fetch(`./data/bestiary_${lang}.json`).then(res => res.json()),
                fetch(`./data/tables_${lang}.json`).then(res => res.json())
            ]);

            DATA_STORE.rules = rules;
            DATA_STORE.options = options;
            DATA_STORE.items = items;
            DATA_STORE.monsters = monsters;
            DATA_STORE.bestiary = bestiary;
            DATA_STORE.tables = tables;
            
        } catch (error) {
            console.warn(`Failed to load data for language: ${lang}.`, error);
            if (lang !== 'en') {
                await I18n.loadData('en');
            }
        }
    },

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

    getData: (type) => {
        return DATA_STORE[type];
    }
};