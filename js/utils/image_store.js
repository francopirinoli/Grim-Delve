/**
 * image_store.js
 * Handles saving user-uploaded images to IndexedDB.
 * This avoids the 5MB limit of LocalStorage.
 */

const DB_NAME = 'GrimDelve_Assets';
const STORE_NAME = 'user_images';
const DB_VERSION = 1;

export const ImageStore = {
    
    db: null,

    init: () => {
        return new Promise((resolve, reject) => {
            if (ImageStore.db) return resolve(ImageStore.db);

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = (e) => {
                ImageStore.db = e.target.result;
                console.log("ImageStore DB Initialized");
                resolve(ImageStore.db);
            };

            request.onerror = (e) => {
                console.error("ImageStore DB Error", e);
                reject(e);
            };
        });
    },

    /**
     * Saves a Blob/File and returns a unique ID.
     */
    saveImage: async (file) => {
        await ImageStore.init();
        
        return new Promise((resolve, reject) => {
            // Create a unique ID
            const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const transaction = ImageStore.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const item = {
                id: id,
                data: file,
                timestamp: Date.now()
            };

            const request = store.put(item);

            request.onsuccess = () => resolve(id);
            request.onerror = (e) => reject(e);
        });
    },

    /**
     * Retrieves a Blob by ID.
     */
    getImage: async (id) => {
        await ImageStore.init();
        
        return new Promise((resolve, reject) => {
            const transaction = ImageStore.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = (e) => {
                const result = e.target.result;
                resolve(result ? result.data : null);
            };
            
            request.onerror = (e) => reject(e);
        });
    },

    /**
     * Helper: Converts an Image ID to a usable Object URL for <img> tags.
     */
    getUrl: async (id) => {
        const blob = await ImageStore.getImage(id);
        if (blob) {
            return URL.createObjectURL(blob);
        }
        return null;
    }
};