
# Design Document: Project "Grim Delve" (v2.0)

## 1. Project Overview
A single-page application (SPA) serving as the digital companion for the **Dark Pulp RPG system**. The app functions offline, requires no backend server, and utilizes local storage/file handling for data persistence.

### Core Objectives
1.  **Accessibility:** Instant access to rules via search, hyperlinking, and interactive tables.
2.  **Automation with Choice:** Calculating derived stats automatically while allowing full manual override for the DM.
3.  **Procedural Generation:** "Rollable" buttons for every random table in the book (Ancestry, Loot, Encounters, etc.).
4.  **Localization:** Seamless toggling between English (`en`) and Spanish (`es`) across the entire interface.

---

## 2. Aesthetic & UI/UX Design
*Style: "Old School Dark Mode" – Winterveil inspired.*

*   **Color Palette:**
    *   **Background:** Deep Charcoal (`#121212`) to Slate Grey (`#1e1e1e`).
    *   **Text:** Off-White / Parchment (`#e0e0e0`).
    *   **Accents:** Desaturated Gold (Wealth/XP), Muted Crimson (Health/Danger), Spectral Blue (Magic), Dull Green (Verdant/Nature).
    *   **Borders:** 1px solid lines with CSS-rendered corner flourishes.
*   **Typography:**
    *   **Headers:** *Cinzel* or *IM Fell English* (Serif, evokes print).
    *   **Body:** *Inter* or *Lato* (Sans-serif, high readability).
    *   **Data:** *Fira Code* (Monospace, retro terminal feel for stats).
*   **Layout:**
    *   **Sidebar (Collapsible):** Navigation (Rules, Char Gen, Bestiary, Artificer, Settings).
    *   **Main Content Area:** The active module.
    *   **Interactive Tables:** Any table in the text (e.g., Whiff Tables) will have a "Roll" button in the header that highlights the result row.

---

## 3. Technical Architecture

### Tech Stack
*   **HTML5:** Semantic structure.
*   **CSS3:** Variables for theming, Flexbox/Grid, print media queries.
*   **JavaScript (ES6+):** Native Modules. No frameworks.

### Directory Structure
```text
/root
  /assets
    /fonts
    /images (Placeholders for user uploads)
  /css
    main.css
    print.css
  /data (The "Database" - JSON files)
    rules_en.json / rules_es.json
    tables_en.json / tables_es.json (For random generation logic)
    options_en.json / options_es.json (Ancestries, Classes, Items)
  /js
    /utils
      dice.js (Random number generation)
      storage.js (Save/Load/Export)
      i18n.js (Language toggler)
    /modules
      rulebook.js (Renderer for rules & search)
      chargen.js (Character logic)
      monster_builder.js (DM tools logic)
      item_builder.js (Item logic)
    app.js (Router & Initialization)
  index.html
```

---

## 4. Functional Modules

### Module A: The Interactive Rulebook
*   **Structure:** Content loaded from JSON.
*   **Features:**
    *   **Sidebar TOC:** Chapters -> Sections.
    *   **Keyword System:** Tooltips for terms like *Advantage*, *Sunder*, *Grappled*.
    *   **Search:** Real-time filtering.
    *   **Interactive Tables:** Tables like "Melee Whiff Table" or "Dungeon Dressing" will have a button. Clicking it simulates the die roll and highlights the result.

### Module B: Character Creator (The Adventurer)
*   **Workflow (Reordered):**
    1.  **Bio (Origins):**
        *   Dropdowns for Ancestry & Background.
        *   **Button:** "Roll Random Bio" (d10 for Ancestry, d20 for Background).
        *   *Logic:* Displays the Feats and Skill training associated with the choice.
    2.  **Class (Archetypes):**
        *   Select Archetype A + Archetype B.
        *   **Button:** "Roll Destiny" (2d12 to pick random archetypes).
        *   *Logic:* Auto-detects "Class Name" (e.g., Soldier + Guardian = Knight).
        *   *Logic:* Calculates Max HP, MP, STA, and Luck formulas.
    3.  **Attributes (Stats):**
        *   **Button:** "Roll Array" (Rolls d12 on the Array Table).
        *   **Input:** Drag/Drop or Manual Entry to assign the array numbers to STR, DEX, CON, etc.
    4.  **Gear (Loadout):**
        *   Shop interface. Shows Inventory Slots (calculated from STR+CON).
        *   **Button:** "Roll Starting Gear" (Based on Background tables).
*   **Sheet View:**
    *   Interactive sheet for play (HP tracking).
    *   **PDF Mode:** CSS-driven print view that hides buttons and formats for A4/Letter paper.

### Module C: Monster Architect (The DM's Workshop)
*   **Philosophy:** *Defaults are suggestions; everything is editable.*
*   **The Builder:**
    1.  **Chassis:** Select Role & Level. Auto-fills stats.
        *   *Edit:* User can click the "HP" or "Attack DC" field and type a new number.
    2.  **Family:** Select Family (e.g., Construct). Auto-populates abilities.
        *   *Edit:* User can delete an ability, edit the text of an ability, or add a custom one.
    3.  **Randomization:** Button to "Generate Random Encounter" based on TPL (Total Party Level).
*   **The Card View:**
    *   Visual stat block (Magic: The Gathering style).
    *   **Image Upload:** Option to link a local image URL or upload a small file (stored in local storage).
    *   **Export:** Save monster as JSON or Print to PDF card.

### Module D: The Artificer's Bench (Magic Items)
*   **The Builder:**
    *   **Inputs:** Select Base Item, Tier, and Effect.
    *   **Button:** "Roll Random Loot" (Uses Tables A, B, C from Chapter 11).
*   **Edit Mode:**
    *   The generated Name, Description, Value, and Effect mechanics are text areas. The DM can rewrite "Fire Damage" to "Void Damage" or change the gold value instantly.
*   **Card View:** Printable item cards for handing out to players.

---

## 5. Localization Strategy (Spanish/English)

*   **Structure:** Two parallel JSON files for every data set.
*   **Implementation:** A global state variable `currentLang` ('en' or 'es').
*   **Switching:** A toggle switch in the sidebar. When flipped, the app re-renders the current view using the keys from the alternate language file.
*   **User Content:** Characters/Monsters created by the user will be saved in the language they were written in (unless we implement complex mapping, but for now, user input is language-agnostic).

---

## 6. Development Phases

1.  **Data Structure (JSON):** Creating the "Database" of rules, classes, and tables. This serves as the content audit.
2.  **Skeleton (HTML/CSS):** Building the Dark Pulp/Grim Delve visual theme.
3.  **Logic - Core:** Dice rolling utilities, storage handlers, language switching.
4.  **Logic - CharGen:** Implementing the specific sequencing and math.
5.  **Logic - DM Tools:** Implementing the Editable Monster/Item Cards.

---

# Action Plan: Phase 1 (Data Structure)

I will now begin **Phase 1**. I need to convert your markdown text into structured JSON data to ensure we have a consistent database for the app to read.

I will generate three key JSON structures for you to review (in code blocks):
1.  `archetypes.json` (For Classes).
2.  `ancestries_backgrounds.json` (For Bio).
3.  `monsters_data.json` (Chassis and Families).

