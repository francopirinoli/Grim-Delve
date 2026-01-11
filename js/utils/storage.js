/**
 * storage.js
 * Handles LocalStorage operations for Characters, Monsters, and Items.
 */

const KEYS = {
    CHARACTERS: 'grim_delve_chars',
    MONSTERS: 'grim_monsters',
    ITEMS: 'grim_delve_items'
};

export const Storage = {

    /**
     * Helper: Get parsed JSON array from key.
     */
    getLibrary: (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Export data to a JSON file.
     */
    exportJSON: (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename + ".json";
        a.click();
        URL.revokeObjectURL(url);
    },

    /* --- CHARACTERS --- */
    saveCharacter: (charObj) => {
        if (!charObj.id) {
            charObj.id = 'char_' + Date.now();
            charObj.created = new Date().toLocaleDateString();
        }
        charObj.modified = new Date().toLocaleDateString();

        const library = Storage.getLibrary(KEYS.CHARACTERS);
        const index = library.findIndex(c => c.id === charObj.id);
        if (index > -1) library[index] = charObj;
        else library.push(charObj);

        localStorage.setItem(KEYS.CHARACTERS, JSON.stringify(library));
        return charObj.id;
    },

    getCharacters: () => Storage.getLibrary(KEYS.CHARACTERS),
    getCharacter: (id) => Storage.getLibrary(KEYS.CHARACTERS).find(c => c.id === id),
    deleteCharacter: (id) => {
        let lib = Storage.getLibrary(KEYS.CHARACTERS);
        lib = lib.filter(c => c.id !== id);
        localStorage.setItem(KEYS.CHARACTERS, JSON.stringify(lib));
    },

    /* --- MONSTERS --- */
    saveMonster: (monObj) => {
        if (!monObj.id) monObj.id = 'mon_' + Date.now();
        monObj.source = 'custom'; // Enforce source
        
        const library = Storage.getLibrary(KEYS.MONSTERS);
        const index = library.findIndex(m => m.id === monObj.id);
        if (index > -1) library[index] = monObj;
        else library.push(monObj);

        localStorage.setItem(KEYS.MONSTERS, JSON.stringify(library));
        return monObj.id;
    },
    
    getMonsters: () => Storage.getLibrary(KEYS.MONSTERS),
    
    /* --- ITEMS (New) --- */
    saveItem: (itemObj) => {
        if (!itemObj.id) itemObj.id = 'item_' + Date.now();
        
        const library = Storage.getLibrary(KEYS.ITEMS);
        const index = library.findIndex(i => i.id === itemObj.id);
        if (index > -1) library[index] = itemObj;
        else library.push(itemObj);

        localStorage.setItem(KEYS.ITEMS, JSON.stringify(library));
        return itemObj.id;
    },

    /**
     * Creates a full backup of all app data.
     */
    backupAll: async () => {
        const backup = {
            characters: JSON.parse(localStorage.getItem(KEYS.CHARACTERS) || '[]'),
            monsters: JSON.parse(localStorage.getItem(KEYS.MONSTERS) || '[]'),
            items: JSON.parse(localStorage.getItem(KEYS.ITEMS) || '[]'),
            // We do NOT backup images here to keep file size manageable for JSON.
            // Images are persistent in IndexedDB.
            timestamp: new Date().toISOString(),
            version: "3.0"
        };
        
        Storage.exportJSON(backup, `GrimDelve_Backup_${Date.now()}`);
    },

    /**
     * Restores data from a backup object.
     */
    restoreBackup: (json) => {
        if (!json.characters || !json.monsters) return false;
        
        if (confirm("This will OVERWRITE your current library. Are you sure?")) {
            localStorage.setItem(KEYS.CHARACTERS, JSON.stringify(json.characters));
            localStorage.setItem(KEYS.MONSTERS, JSON.stringify(json.monsters));
            localStorage.setItem(KEYS.ITEMS, JSON.stringify(json.items || []));
            return true;
        }
        return false;
    },

    getItems: () => Storage.getLibrary(KEYS.ITEMS),
    
    deleteItem: (id) => {
        let lib = Storage.getLibrary(KEYS.ITEMS);
        lib = lib.filter(i => i.id !== id);
        localStorage.setItem(KEYS.ITEMS, JSON.stringify(lib));
    }
};