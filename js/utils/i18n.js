/**
 * i18n.js
 * Localization, Data Management, and Normalization Utility.
 * Handles loading JSON data, translating UI, and normalizing data logic.
 * v5.0: Specialist Update (Crafting, Exploits, & Workbench)
 */

const UI_DICTIONARY = {
    "en": {
        "dash_browse_mon": "Browse Bestiary",
        "dash_browse_mon_desc": "View and manage your library of creatures.",
        "sheet_saves": "Saving Throws",
        "save_fort": "Fortitude",
        "save_ref": "Reflex",
        "save_will": "Will",
        "btn_import_json": "Import JSON",
        // --- NAVIGATION ---
        "nav_dashboard": "Dashboard",
        "nav_home": "Rules Reference",
        "nav_chargen": "Character Creator",
        "nav_bestiary": "Monster Architect",
        "nav_items": "The Artificer",
        "nav_library": "My Library",
        "nav_tables": "Tables & Rolls",

        // --- TABS & HEADERS ---
        "magic_tab_title": "Grimoire & Workbench", // Renamed from Magic Items
        "magic_header": "Attuned / Equipped Magic",
        "header_spells": "Spells & Exploits", // New
        "header_crafting": "Schematics & Workbench", // New
        "sheet_features": "Features & Talents",
        "sheet_notes": "Notes",
        "sheet_inv": "Inventory",
        "cg_combat_stats": "Combat Stats",

        // --- CRAFTING & EXPLOITS (New) ---
        "btn_craft": "Craft",
        "btn_use_exploit": "Execute",
        "lbl_materials": "Materials:",
        "lbl_luck_cost": "Luck Cost",
        "lbl_recipe": "Recipe",
        "msg_craft_success": "Crafting Successful",
        "msg_craft_fail": "Crafting Failed",
        "lbl_passive_effect": "Passive Effect",
        
        // --- COMBAT LOGIC (New) ---
        "wep_fist": "Unarmed Strike",
        "wep_martial_arts": "Martial Arts",
        "lbl_proficient": "Proficient",
        "lbl_atk_bonus": "Atk",
        "lbl_dmg": "Dmg",
        
        // --- GENERIC ---
        "btn_save": "Save",
        "btn_cancel": "Cancel",
        "btn_confirm": "Confirm",
        "btn_delete": "Delete",
        "btn_edit": "Edit",
        "btn_view": "View",
        "btn_print": "Print",
        "btn_copy": "Copy",
        "btn_cast": "CAST",
        "btn_equip": "Equip",
        "btn_unequip": "Unequip",
        "lbl_loading": "Loading...",
        "lbl_name": "Name",
        "lbl_desc": "Description",
        "lbl_effect": "Effect",
        "lbl_cost": "Cost",
        "lbl_source": "Source",
        "lbl_level": "Level",
        "lbl_range": "Range",
        "lbl_duration": "Duration",
        "lbl_target": "Target",
        "lbl_contains": "Contains:",

        // --- CHARGEN ---
        "cg_step_bio": "Origins",
        "cg_step_class": "Class",
        "cg_step_stats": "Attributes",
        "cg_step_gear": "Gear",
        "cg_step_sheet": "Final Sheet",
        "cg_btn_next": "Next",
        "cg_btn_back": "Back",
        "cg_btn_finish": "Finish",
        "cg_lbl_identity": "Identity",
        "cg_lbl_name": "Character Name",
        "cg_lbl_portrait": "Portrait",
        "cg_ph_url": "Paste Image URL...",
        "cg_btn_upload": "Or Upload File",
        "cg_lbl_ancestry": "Ancestry",
        "cg_lbl_anc_feat": "Ancestry Feat",
        "cg_lbl_background": "Background",
        "cg_btn_roll_bio": "Roll Random Origins",
        "cg_sel_bonus": "Select Bonus",
        "cg_sel_skill": "Select Skill",
        "cg_sel_resist": "Select Resistance",
        "cg_lbl_arch_a": "Archetype A",
        "cg_lbl_arch_b": "Archetype B",
        "cg_btn_roll_class": "Roll Destiny (2d12)",
        "cg_lbl_talents": "Starting Talents",
        "cg_txt_pure": "Pure Class: Select 2 Talents.",
        "cg_txt_hybrid": "Hybrid Class: Select 1 Talent from EACH.",
        "cg_lbl_array": "Stat Array",
        "cg_lbl_manual": "Manual Edit",
        "cg_txt_array": "Assign values to attributes below.",
        "cg_btn_roll_stats": "Roll Array (1d12)",
        "cg_shop_title": "Equipment Shop",
        "cg_tab_wep": "Weapons",
        "cg_tab_arm": "Armor",
        "cg_tab_gear": "Gear",
        "cg_btn_kit": "Equip Background Gear",
        "cg_btn_kit_added": "Gear Added",
        "cg_lbl_slots": "Inventory Slots",
        "cg_warn_enc": "ENCUMBERED",
        "cg_currency": "{g}g {s}s {c}c",
        "cg_derived_vitals": "Derived Vitals",
        "cg_initiative": "Initiative",
        "cg_base_def": "Base Defense",
        "cg_class_features": "Class Features",
        "cg_lbl_skill_training": "Skill Training",
        "cg_lbl_wealth": "Starting Wealth",
        "cg_lbl_starting_gear": "Starting Gear",
        "cg_lbl_synergy_lvl": "Level {lvl} Synergy",
        "cg_lbl_role": "Role",
        "cg_lbl_resource": "Resource",
        "cg_lbl_stats": "Stats",
        "cg_lbl_skill": "Skill",
        "cg_lbl_weapons": "Weapons",
        "cg_lbl_armor": "Armor",
        "cg_lbl_selected": "{current}/{max} Selected",
        "cg_lbl_talents_header": "{name} Talents",

        // --- SHEET & HUD ---
        "btn_level_up": "Level Up",
        "btn_level_up_ready": "LEVEL UP!",
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
        "sheet_origin_traits": "Origin Traits",
        "sheet_class_features": "Class Features",
        "sheet_arch_talents": "Archetype Talents",
        "sheet_dodge": "Dodge",
        "sheet_parry": "Parry",
        "sheet_block": "Block",
        "magic_import": "Import from Artificer",
        "magic_empty": "No items found.",
        
        // --- INVENTORY ---
        "inv_gold": "Gold",
        "inv_silver": "Silver",
        "inv_copper": "Copper",
        "inv_capacity": "Capacity",
        "inv_item_header": "Item Name",
        "inv_slots_header": "Slots",
        "inv_actions_header": "Actions",
        "inv_empty": "Inventory is empty.",
        "btn_save_lib": "Save to Library",
        "btn_shop": "Open Shop",
        "btn_add_custom": "Add Custom Item",
        "shop_modal_title": "Provisions & Gear",

        // --- SKILLS ---
        "skill_athletics": "Athletics",
        "skill_acrobatics": "Acrobatics",
        "skill_stealth": "Stealth",
        "skill_craft": "Craft",
        "skill_lore": "Lore",
        "skill_investigate": "Investigate",
        "skill_scrutiny": "Scrutiny",
        "skill_survival": "Survival",
        "skill_medicine": "Medicine",
        "skill_influence": "Influence",
        "skill_deception": "Deception",
        "skill_intimidation": "Intimidation",

        // --- ATTRIBUTES & ROLES ---
        "stat_str": "STR",
        "stat_dex": "DEX",
        "stat_con": "CON",
        "stat_int": "INT",
        "stat_wis": "WIS",
        "stat_cha": "CHA",
        "role_warrior": "Warrior",
        "role_spellcaster": "Spellcaster",
        "role_specialist": "Specialist",

        // --- LIBRARY & MONSTERS ---
        "lib_tab_char": "Characters",
        "lib_tab_mon": "Bestiary",
        "lib_tab_item": "Items",
        "lib_search": "Search...",
        "lib_no_char": "No characters found.",
        "lib_no_mon": "No monsters found.",
        "lib_no_item": "No items found.",
        "mon_lbl_role": "Role",
        "mon_lbl_level": "Level",
        "mon_lbl_family": "Family",
        "mon_chassis": "Chassis Stats",
        "mon_stat_hp": "HP",
        "mon_stat_as": "AS",
        "mon_stat_spd": "Speed",
        "mon_stat_atk": "Atk DC",
        "mon_stat_def": "Def DC",
        "mon_stat_save": "Save DC",
        "mon_stat_dmg": "Dmg",
        "mon_sect_traits": "Traits",
        "mon_sect_actions": "Actions",
        "mon_sect_danger": "Danger Abilities",
        "mon_btn_add": "Add Custom Ability",
        "mon_lbl_custom": "Custom Ability",
        "mon_type_action": "Action",
        "mon_type_trait": "Trait",
        "mon_type_reaction": "Reaction",
        "mon_type_danger": "Danger (DP)",
        "mon_lbl_notes": "GM Notes / Loot",
        "mon_sect_universal": "Universal Traits",
        "mon_lbl_basic_attack": "Basic Attack",
        "mon_lbl_manual_dmg": "Manual Damage",
        "mon_lbl_flavor": "Flavor",
        "mon_btn_roll_flavor": "Roll Random Flavor",
        "mon_default_atk_name": "Standard Attack",
        "mon_default_atk_desc": "Deals {dmg} damage.",
        "role_soldier": "Soldier",
        "role_brute": "Brute",
        "role_skirmisher": "Skirmisher",
        "role_controller": "Controller",
        "role_artillery": "Artillery",
        "role_lurker": "Lurker",
        "role_minion": "Minion",
        "role_solo": "Solo",

        // --- IMAGE CONTROLS ---
        "lbl_zoom": "Zoom",
        "lbl_pan_x": "Pan X",
        "lbl_pan_y": "Pan Y",
        "lbl_reset": "Reset",
        "lbl_upload": "Upload",
        "lbl_paste_url": "Paste Image URL...",

        // --- ITEM BUILDER ---
        "item_mode_forge": "Forge",
        "item_mode_loot": "Loot Gen",
        "item_lbl_base": "Base Item",
        "item_lbl_blueprint": "Blueprint",
        "item_lbl_search": "Search Effects...",
        "item_tier_1": "Common (Tier 1)",
        "item_tier_2": "Uncommon (Tier 2)",
        "item_tier_3": "Rare (Tier 3)",
        "item_btn_loot_1": "Tier 1: Scavenge",
        "item_btn_loot_2": "Tier 2: Stash",
        "item_btn_loot_3": "Tier 3: Hoard",
        "item_lbl_editor": "Item Editor",
        "item_is_magic": "Is Magic?",
        "item_req_prefix": "Requires 3x ",
        "item_cat_weapon": "Weapon",
        "item_cat_armor": "Armor & Shields",
        "item_cat_trinket": "Wondrous Item",
        "item_name_fmt": "{adj} {noun}",
        "item_default_name": "New Item",
        "item_default_desc": "Select a base item or edit fields to begin.",
        "item_ph_magic_name": "Magic Prefix/Name",
        "item_ph_tags": "Tags",
        "item_ph_type": "Type",
        "item_ph_damage": "Damage",
        "item_ph_ac": "AS",
        "item_ph_slots": "Slots",
        "lbl_commodity": "Commodity",
        "lbl_unit": "Unit",
        "lbl_value": "Value",
        "lbl_material": "Material",
        "lbl_form": "Form",
        "lbl_subject": "Subject",
        "lbl_reagent": "Reagent",

        // --- TAGS ---
        "tag_melee": "Melee",
        "tag_ranged": "Ranged",
        "tag_finesse": "Finesse",
        "tag_light": "Light",
        "tag_heavy": "Heavy",
        "tag_two_handed": "Two-Handed",
        "tag_reach": "Reach",
        "tag_thrown": "Thrown",
        "tag_loading": "Loading",
        "tag_precise": "Precise",
        "tag_sunder": "Sunder",
        "tag_messy": "Messy",
        "tag_guard": "Guard",
        "tag_brace": "Brace",
        "lbl_worn": "Worn",
        "lbl_unarmored": "Unarmored",

        // --- DASHBOARD ---
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
        "dash_heroes": "Heroes",
        "dash_monsters": "Monsters",
        "dash_items": "Items",
        "dash_recent": "Recent Activity",

        // --- TABLES ---
        "tbl_roll": "Roll",
        "tbl_result": "Result",
        "tbl_btn_roll": "Roll {dice}"
    },
    "es": {
        "dash_browse_mon": "Explorar Bestiario",
        "dash_browse_mon_desc": "Ver y gestionar tu biblioteca de criaturas.",
        "sheet_saves": "Tiradas de Salvación",
        "save_fort": "Fortaleza",
        "save_ref": "Reflejos",
        "save_will": "Voluntad",
        "btn_import_json": "Importar JSON",
        // --- NAVIGATION ---
        "nav_dashboard": "Tablero",
        "nav_home": "Reglas",
        "nav_chargen": "Creador de PJs",
        "nav_bestiary": "Creador de Criaturas",
        "nav_items": "El Artificiero",
        "nav_library": "Biblioteca",
        "nav_tables": "Tablas y Dados",

        // --- TABS & HEADERS ---
        "magic_tab_title": "Grimorio y Taller", // Renamed
        "magic_header": "Magia Vinculada / Equipada",
        "header_spells": "Hechizos y Tretas", // New
        "header_crafting": "Esquemas y Taller", // New
        "sheet_features": "Rasgos y Talentos",
        "sheet_notes": "Notas",
        "sheet_inv": "Inventario",
        "cg_combat_stats": "Estadísticas de Combate",

        // --- CRAFTING & EXPLOITS (New) ---
        "btn_craft": "Fabricar",
        "btn_use_exploit": "Ejecutar",
        "lbl_materials": "Materiales:",
        "lbl_luck_cost": "Coste Suerte",
        "lbl_recipe": "Receta",
        "msg_craft_success": "Fabricación Exitosa",
        "msg_craft_fail": "Fallo de Fabricación",
        "lbl_passive_effect": "Efecto Pasivo",

        // --- COMBAT LOGIC (New) ---
        "wep_fist": "Golpe Desarmado",
        "wep_martial_arts": "Artes Marciales",
        "lbl_proficient": "Competente",
        "lbl_atk_bonus": "Atq",
        "lbl_dmg": "Daño",

        // --- GENERIC ---
        "btn_save": "Guardar",
        "btn_cancel": "Cancelar",
        "btn_confirm": "Confirmar",
        "btn_delete": "Borrar",
        "btn_edit": "Editar",
        "btn_view": "Ver",
        "btn_print": "Imprimir",
        "btn_copy": "Copiar",
        "btn_cast": "LANZAR",
        "btn_equip": "Equipar",
        "btn_unequip": "Desequipar",
        "lbl_loading": "Cargando...",
        "lbl_name": "Nombre",
        "lbl_desc": "Descripción",
        "lbl_effect": "Efecto",
        "lbl_cost": "Coste",
        "lbl_source": "Fuente",
        "lbl_level": "Nivel",
        "lbl_range": "Rango",
        "lbl_duration": "Duración",
        "lbl_target": "Objetivo",
        "lbl_contains": "Contiene:",

        // --- CHARGEN ---
        "cg_step_bio": "Orígenes",
        "cg_step_class": "Clase",
        "cg_step_stats": "Atributos",
        "cg_step_gear": "Equipo",
        "cg_step_sheet": "Hoja Final",
        "cg_btn_next": "Siguiente",
        "cg_btn_back": "Atrás",
        "cg_btn_finish": "Terminar",
        "cg_lbl_identity": "Identidad",
        "cg_lbl_name": "Nombre del Personaje",
        "cg_lbl_portrait": "Retrato",
        "cg_ph_url": "Pegar URL de Imagen...",
        "cg_btn_upload": "O Subir Archivo",
        "cg_lbl_ancestry": "Ascendencia",
        "cg_lbl_anc_feat": "Talento Ancestral",
        "cg_lbl_background": "Trasfondo",
        "cg_btn_roll_bio": "Tirar Orígenes",
        "cg_sel_bonus": "Elegir Bono",
        "cg_sel_skill": "Elegir Habilidad",
        "cg_sel_resist": "Elegir Resistencia",
        "cg_lbl_arch_a": "Arquetipo A",
        "cg_lbl_arch_b": "Arquetipo B",
        "cg_btn_roll_class": "Tirar Destino (2d12)",
        "cg_lbl_talents": "Talentos Iniciales",
        "cg_txt_pure": "Clase Pura: Elige 2 Talentos.",
        "cg_txt_hybrid": "Clase Híbrida: Elige 1 de CADA.",
        "cg_lbl_array": "Matriz de Estadísticas",
        "cg_lbl_manual": "Manual",
        "cg_txt_array": "Asigna los valores abajo.",
        "cg_btn_roll_stats": "Tirar Matriz (1d12)",
        "cg_shop_title": "Tienda",
        "cg_tab_wep": "Armas",
        "cg_tab_arm": "Armadura",
        "cg_tab_gear": "Equipo",
        "cg_btn_kit": "Equipar Kit de Trasfondo",
        "cg_btn_kit_added": "Equipo Añadido",
        "cg_lbl_slots": "Espacios de Inv.",
        "cg_warn_enc": "SOBRECARGA",
        "cg_currency": "{g}o {s}p {c}c",
        "cg_derived_vitals": "Vitales Derivados",
        "cg_initiative": "Iniciativa",
        "cg_base_def": "Defensa Base",
        "cg_class_features": "Rasgos de Clase",
        "cg_lbl_skill_training": "Entrenamiento de Habilidad",
        "cg_lbl_wealth": "Riqueza Inicial",
        "cg_lbl_starting_gear": "Equipo Inicial",
        "cg_lbl_synergy_lvl": "Sinergia Nivel {lvl}",
        "cg_lbl_role": "Rol",
        "cg_lbl_resource": "Recurso",
        "cg_lbl_stats": "Estadísticas",
        "cg_lbl_skill": "Habilidad",
        "cg_lbl_weapons": "Armas",
        "cg_lbl_armor": "Armadura",
        "cg_lbl_selected": "{current}/{max} Seleccionados",
        "cg_lbl_talents_header": "Talentos de {name}",

        // --- SHEET & HUD ---
        "btn_level_up": "Subir Nivel",
        "btn_level_up_ready": "¡SUBIR NIVEL!",
        "sheet_levelup": "Subir Nivel",
        "sheet_save": "Guardar",
        "sheet_print": "Imprimir",
        "sheet_hp": "Puntos de Vida",
        "sheet_mp": "Maná",
        "sheet_sta": "Aguante",
        "sheet_luck": "Suerte",
        "sheet_xp": "XP",
        "sheet_ac": "Armadura",
        "sheet_def": "Defensas",
        "sheet_skills": "Habilidades",
        "sheet_attacks": "Ataques",
        "sheet_origin_traits": "Rasgos de Origen",
        "sheet_class_features": "Rasgos de Clase",
        "sheet_arch_talents": "Talentos de Arquetipo",
        "sheet_dodge": "Esquivar",
        "sheet_parry": "Parar",
        "sheet_block": "Bloq.",
        "magic_import": "Importar del Artificiero",
        "magic_empty": "No hay objetos.",

        // --- INVENTORY ---
        "inv_gold": "Oro",
        "inv_silver": "Plata",
        "inv_copper": "Cobre",
        "inv_capacity": "Capacidad",
        "inv_item_header": "Objeto",
        "inv_slots_header": "Espacios",
        "inv_actions_header": "Acciones",
        "inv_empty": "El inventario está vacío.",
        "btn_save_lib": "Guardar en Biblioteca",
        "btn_shop": "Abrir Tienda",
        "btn_add_custom": "Añadir Personalizado",
        "shop_modal_title": "Provisiones y Equipo",

        // --- SKILLS ---
        "skill_athletics": "Atletismo",
        "skill_acrobatics": "Acrobacias",
        "skill_stealth": "Sigilo",
        "skill_craft": "Artesanía",
        "skill_lore": "Saber",
        "skill_investigate": "Investigar",
        "skill_scrutiny": "Escrutinio",
        "skill_survival": "Supervivencia",
        "skill_medicine": "Medicina",
        "skill_influence": "Influencia",
        "skill_deception": "Engaño",
        "skill_intimidation": "Intimidación",

        // --- ATTRIBUTES & ROLES ---
        "stat_str": "FUE",
        "stat_dex": "DES",
        "stat_con": "CON",
        "stat_int": "INT",
        "stat_wis": "SAB",
        "stat_cha": "CAR",
        "role_warrior": "Guerrero",
        "role_spellcaster": "Lanzador",
        "role_specialist": "Especialista",

        // --- LIBRARY & MONSTERS ---
        "lib_tab_char": "Personajes",
        "lib_tab_mon": "Bestiario",
        "lib_tab_item": "Objetos",
        "lib_search": "Buscar...",
        "lib_no_char": "No hay personajes.",
        "lib_no_mon": "No hay monstruos.",
        "lib_no_item": "No hay objetos.",
        "mon_lbl_role": "Rol",
        "mon_lbl_level": "Nivel",
        "mon_lbl_family": "Familia",
        "mon_chassis": "Estadísticas Base",
        "mon_stat_hp": "PV",
        "mon_stat_as": "AS",
        "mon_stat_spd": "Vel",
        "mon_stat_atk": "Ataque",
        "mon_stat_def": "Defensa",
        "mon_stat_save": "Salv.",
        "mon_stat_dmg": "Daño",
        "mon_sect_traits": "Rasgos",
        "mon_sect_actions": "Acciones",
        "mon_sect_danger": "Habilidades de Peligro",
        "mon_btn_add": "Añadir Habilidad",
        "mon_lbl_custom": "Habilidad Personalizada",
        "mon_type_action": "Acción",
        "mon_type_trait": "Rasgo",
        "mon_type_reaction": "Reacción",
        "mon_type_danger": "Peligro (PP)",
        "mon_lbl_notes": "Notas GM / Botín",
        "mon_sect_universal": "Rasgos Universales",
        "mon_lbl_basic_attack": "Ataque Básico",
        "mon_lbl_manual_dmg": "Daño Manual",
        "mon_lbl_flavor": "Sabor / Ambientación",
        "mon_btn_roll_flavor": "Generar Sabor",
        "mon_default_atk_name": "Ataque Estándar",
        "mon_default_atk_desc": "Inflige {dmg} de daño.",
        "role_soldier": "Soldado",
        "role_brute": "Bruto",
        "role_skirmisher": "Hostigador",
        "role_controller": "Controlador",
        "role_artillery": "Artillería",
        "role_lurker": "Acechador",
        "role_minion": "Esbirro",
        "role_solo": "Solo (Jefe)",

        // --- IMAGE CONTROLS ---
        "lbl_zoom": "Zoom",
        "lbl_pan_x": "Pan X",
        "lbl_pan_y": "Pan Y",
        "lbl_reset": "Reiniciar",
        "lbl_upload": "Subir",
        "lbl_paste_url": "Pegar URL de Imagen...",

        // --- ITEM BUILDER ---
        "item_mode_forge": "Forja",
        "item_mode_loot": "Botín",
        "item_lbl_base": "Objeto Base",
        "item_lbl_blueprint": "Plano",
        "item_lbl_search": "Buscar Efectos...",
        "item_tier_1": "Común (Nivel 1)",
        "item_tier_2": "Poco Común (Nivel 2)",
        "item_tier_3": "Raro (Nivel 3)",
        "item_btn_loot_1": "Nivel 1: Chatarrería",
        "item_btn_loot_2": "Nivel 2: Alijo",
        "item_btn_loot_3": "Nivel 3: Tesoro",
        "item_lbl_editor": "Editor",
        "item_is_magic": "¿Mágico?",
        "item_req_prefix": "Requiere 3x ",
        "item_cat_weapon": "Arma",
        "item_cat_armor": "Armadura y Escudos",
        "item_cat_trinket": "Objeto Maravilloso",
        "item_name_fmt": "{noun} {adj}",
        "item_default_name": "Nuevo Objeto",
        "item_default_desc": "Elige un objeto base o edita los campos.",
        "item_ph_magic_name": "Prefijo Mágico/Nombre",
        "item_ph_tags": "Etiquetas",
        "item_ph_type": "Tipo",
        "item_ph_damage": "Daño",
        "item_ph_ac": "AS",
        "item_ph_slots": "Espacios",
        "lbl_commodity": "Mercancía",
        "lbl_unit": "Unidad",
        "lbl_value": "Valor",
        "lbl_material": "Material",
        "lbl_form": "Forma",
        "lbl_subject": "Sujeto",
        "lbl_reagent": "Reactivo",

        // --- TAGS ---
        "tag_melee": "Cuerpo a Cuerpo",
        "tag_ranged": "A Distancia",
        "tag_finesse": "Sutil",
        "tag_light": "Ligera",
        "tag_heavy": "Pesada",
        "tag_two_handed": "A Dos Manos",
        "tag_reach": "Alcance",
        "tag_thrown": "Arrojadiza",
        "tag_loading": "Recarga",
        "tag_precise": "Precisa",
        "tag_sunder": "Hender",
        "tag_messy": "Desordenada",
        "tag_guard": "Guardia",
        "tag_brace": "Preparar",
        "lbl_worn": "Puesto",
        "lbl_unarmored": "Sin Armadura",

        // --- DASHBOARD ---
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
        "dash_heroes": "Héroes",
        "dash_monsters": "Monstruos",
        "dash_items": "Objetos",
        "dash_recent": "Actividad Reciente",

        // --- TABLES ---
        "tbl_roll": "Tirada",
        "tbl_result": "Resultado",
        "tbl_btn_roll": "Tirar {dice}"
    }
};

/* --- NORMALIZATION MAPS --- */
const SYSTEM_KEYS = {
    roles: {
        "guerrero": "Warrior", "warrior": "Warrior",
        "lanzador": "Spellcaster", "spellcaster": "Spellcaster", 
        "lanzador de conjuros": "Spellcaster",
        "especialista": "Specialist", "specialist": "Specialist"
    },
    stats: {
        "fuerza": "STR", "str": "STR",
        "destreza": "DEX", "dex": "DEX",
        "constitución": "CON", "con": "CON",
        "inteligencia": "INT", "int": "INT",
        "sabiduría": "WIS", "wis": "WIS",
        "carisma": "CHA", "cha": "CHA",
        "f": "STR", "d": "DEX", "c": "CON", "i": "INT", "s": "WIS", "car": "CHA"
    }
};

// Central Store
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

    t: (key) => {
        return UI_DICTIONARY[I18n.currentLang][key] || key;
    },

    fmt: (key, vars = {}) => {
        let str = UI_DICTIONARY[I18n.currentLang][key] || key;
        for (const [k, v] of Object.entries(vars)) {
            str = str.replace(`{${k}}`, v);
        }
        return str;
    },

    force: (key, lang) => {
        if (UI_DICTIONARY[lang] && UI_DICTIONARY[lang][key]) {
            return UI_DICTIONARY[lang][key];
        }
        return key;
    },

    normalize: (type, value) => {
        if (!value) return null;
        let lower = String(value).toLowerCase().trim();
        
        if (lower.startsWith('role_')) lower = lower.replace('role_', '');

        if (SYSTEM_KEYS[type] && SYSTEM_KEYS[type][lower]) {
            return SYSTEM_KEYS[type][lower];
        }
        return value;
    },

    matches: (userInput, translationKey) => {
        if (!userInput) return true;
        const localized = I18n.t(translationKey).toLowerCase();
        const raw = translationKey.replace('role_', '').replace('type_', '').toLowerCase();
        const input = userInput.toLowerCase();
        return localized.includes(input) || raw.includes(input);
    },
    
    updateEntry: (category, newItem) => {
        if (!DATA_STORE[category]) return;
        const idx = DATA_STORE[category].findIndex(i => i.id === newItem.id);
        if (idx > -1) DATA_STORE[category][idx] = newItem;
        else DATA_STORE[category].push(newItem);
    },

    getData: (type) => {
        return DATA_STORE[type];
    }

};

