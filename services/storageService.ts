
import { SaveData } from '../types';
import { JRPG_SAVE_KEY } from '../constants';

const DB_NAME = 'InfiniteJRPG_DB';
const STORE_NAME = 'saves';
const DB_VERSION = 1;

// Helper to open the database
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
             reject(new Error("IndexedDB not supported"));
             return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

export const saveGameToStorage = async (data: SaveData): Promise<void> => {
    // Try IndexedDB first (Async, supports large blobs like our World Map)
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(data, JRPG_SAVE_KEY);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
        
        // If successful, attempt to clear the old localStorage key to free up space/avoid confusion
        try {
            localStorage.removeItem(JRPG_SAVE_KEY); 
        } catch (e) { /* ignore */ }

    } catch (idbError) {
        console.warn("IndexedDB save failed, attempting localStorage fallback.", idbError);
        // Fallback to LocalStorage (Synchronous, limited size)
        // This might fail if the map image is too big, but it's a last resort.
        try {
            const json = JSON.stringify(data);
            localStorage.setItem(JRPG_SAVE_KEY, json);
        } catch (lsError) {
            console.error("LocalStorage save failed.", lsError);
            throw new Error("Failed to save game. Storage quota exceeded.");
        }
    }
};

export const loadGameFromStorage = async (): Promise<SaveData | null> => {
    // 1. Try IndexedDB
    try {
        const db = await openDB();
        const idbData = await new Promise<SaveData | undefined>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(JRPG_SAVE_KEY);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
        
        if (idbData) return idbData;
    } catch (e) {
        console.warn("IndexedDB load failed or empty, checking localStorage.", e);
    }

    // 2. Check LocalStorage (Migration path / Fallback)
    const localData = localStorage.getItem(JRPG_SAVE_KEY);
    if (localData) {
        try {
            return JSON.parse(localData) as SaveData;
        } catch (e) {
            console.error("Failed to parse localStorage data", e);
        }
    }
    return null;
};

export const checkSaveExists = async (): Promise<boolean> => {
    try {
        const db = await openDB();
        const count = await new Promise<number>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count(JRPG_SAVE_KEY);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
        if (count > 0) return true;
    } catch (e) { /* Ignore IDB errors during check */ }
    
    // Check local storage as well
    return !!localStorage.getItem(JRPG_SAVE_KEY);
};
