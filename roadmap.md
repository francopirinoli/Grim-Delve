# 🗺️ Project Roadmap: Grim Delve

## 📍 Phase 1: Foundation & Data Structure
**Goal:** Establish the project architecture, define the visual style, and digitize the rulebook content into a structured format.

*   **1.1 Project Setup**
    *   Create directory structure (`/css`, `/js/modules`, `/data`, `/assets`).
    *   Create `index.html` shell with basic layout (Sidebar + Main Content).
    *   Initialize `main.js` as the entry point (ES6 Module).
*   **1.2 The Database (JSON Creation)**
    *   *Consistency Check Step:* Convert Markdown text into structured JSON files. We will review these to ensure no rules are missing.
    *   `rules_en.json` / `rules_es.json`: Chapter text, headers, and tables.
    *   `options_en.json` / `options_es.json`: Ancestries, Backgrounds, Archetypes, Feats.
    *   `monsters_en.json` / `monsters_es.json`: Monster Roles (math) and Families (abilities).
    *   `items_en.json` / `items_es.json`: Weapon stats, Armor tables, Reagent recipes, Magic Item effects.
*   **1.3 Visual Theme (CSS)**
    *   Define CSS Variables for the "Dark Pulp" palette (Charcoal, Gold, Crimson).
    *   Import Fonts (*Cinzel* for headers, *Inter* for body, *Fira Code* for stats).
    *   Create utility classes for layout (Grid/Flexbox).
    *   Design the sidebar navigation.

## 📍 Phase 2: The Core Engine & Rulebook
**Goal:** Make the app functional. Load data, switch languages, and read the book.

*   **2.1 Localization Engine (`i18n.js`)**
    *   Create the function to fetch the correct JSON file based on the selected language (`en`/`es`).
    *   Create a function to update the DOM text content dynamically when the language toggle is flipped.
*   **2.2 Dice Roller (`dice.js`)**
    *   Build a utility to handle `1d20`, `2d6`, `d12`, etc.
    *   Create the visual feedback system (a toast notification or log showing the roll result).
*   **2.3 Interactive Rulebook (`rulebook.js`)**
    *   **Renderer:** Parse the JSON rule data into HTML.
    *   **Keyword System:** Regex script to find keywords (e.g., *Advantage*) and wrap them in `<span class="tooltip">`.
    *   **Table Logic:** Script to make static tables interactive. Add "Roll" buttons to tables (e.g., "Whiff Table") that trigger the Dice Roller and highlight the result row.
    *   **Search:** Create a filter function for the sidebar and content area.

## 📍 Phase 3: The Character Creator
**Goal:** Implement the Player tool with the specific flow defined in the Design Doc.

*   **3.1 State Management (`chargen.js`)**
    *   Create a temporary object to hold the character data being built.
*   **3.2 Step 1: Bio (Origins)**
    *   Dropdowns for Ancestry/Background.
    *   **Randomizer:** "Roll Random Bio" button logic.
    *   Display selected Feats/Skills.
*   **3.3 Step 2: Class (Archetypes)**
    *   Archetype Selection UI.
    *   **Randomizer:** "Roll Destiny" button logic.
    *   **Calculator:** Auto-generate "Class Name" and calculate Resource caps (HP/MP/STA/Luck) based on Full/Hybrid rules.
*   **3.4 Step 3: Attributes (Stats)**
    *   **Randomizer:** "Roll Array" button (1d12 Array Table logic).
    *   Input fields to assign values to STR, DEX, CON, INT, WIS, CHA.
*   **3.5 Step 4: Gear (Loadout)**
    *   Shop UI.
    *   **Randomizer:** "Roll Starting Gear" button based on Background.
    *   Inventory Slot calculator (STR + CON + 8).
*   **3.6 The Character Sheet (View Mode)**
    *   Render the final character into a clean, usable sheet.
    *   Add `+` / `-` buttons for tracking HP/MP/STA.
    *   **Print Styling:** Create `print.css` to format this view for PDF export (A4/Letter).

## 📍 Phase 4: DM Tools (Architects)
**Goal:** Create the tools for Monsters and Magic Items with full editing capabilities.

*   **4.1 Monster Architect (`monster.js`)**
    *   **Input UI:** Dropdowns for Role, Level, Family.
    *   **Calculator:** Auto-fill the "Chassis" stats.
    *   **Edit Mode:** Ensure all input fields are editable text areas, not static text. Allow DMs to override the calculated HP/DC.
    *   **Card View:** Render the monster as a distinct "Card" element.
    *   **Randomizer:** "Generate Encounter" logic based on TPL.
*   **4.2 Magic Item Architect (`items.js`)**
    *   **Input UI:** Base Item, Rarity, Effect Table.
    *   **Randomizer:** "Roll Random Loot" logic (Chapter 11 tables).
    *   **Edit Mode:** Allow renaming and stat tweaking.
    *   **Card View:** Render item cards (print-friendly).

## 📍 Phase 5: Persistence & Delivery
**Goal:** Save user data and prepare for launch.

*   **5.1 Local Storage (`storage.js`)**
    *   Implement auto-save for the current active character/monster.
    *   Create a "My Library" sidebar tab to list saved creations.
*   **5.2 Import/Export**
    *   **Export:** Convert the character object to a `.json` file download.
    *   **Import:** File reader to parse a uploaded `.json` file and load it into the app.
*   **5.3 Final Polish**
    *   Accessibility check (Color contrast, font size).
    *   Mobile responsiveness check (Tables scrolling, menus collapsing).
    *   **Spanish Translation:** Verify all automated text keys and JSON content.
