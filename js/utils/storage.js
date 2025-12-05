/**
 * storage.js
 * Handles LocalStorage operations for Characters, Monsters, and Items.
 */

const KEYS = {
    CHARACTERS: 'grim_delve_chars',
    MONSTERS: 'grim_delve_monsters',
    ITEMS: 'grim_delve_items'
};

export const Storage = {

    /**
     * Save a character object. Generates an ID if missing.
     */
    saveCharacter: (charObj) => {
        if (!charObj.id) {
            charObj.id = 'char_' + Date.now();
            charObj.created = new Date().toLocaleDateString();
        }
        charObj.modified = new Date().toLocaleDateString();

        const library = Storage.getLibrary(KEYS.CHARACTERS);
        
        // Update existing or add new
        const index = library.findIndex(c => c.id === charObj.id);
        if (index > -1) {
            library[index] = charObj;
        } else {
            library.push(charObj);
        }

        localStorage.setItem(KEYS.CHARACTERS, JSON.stringify(library));
        return charObj.id;
    },

    /**
     * Retrieve all saved characters.
     */
    getCharacters: () => {
        return Storage.getLibrary(KEYS.CHARACTERS);
    },

    /**
     * Get a specific character by ID.
     */
    getCharacter: (id) => {
        const lib = Storage.getLibrary(KEYS.CHARACTERS);
        return lib.find(c => c.id === id);
    },

    /**
     * Delete a character by ID.
     */
    deleteCharacter: (id) => {
        let lib = Storage.getLibrary(KEYS.CHARACTERS);
        lib = lib.filter(c => c.id !== id);
        localStorage.setItem(KEYS.CHARACTERS, JSON.stringify(lib));
    },

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
    }
};