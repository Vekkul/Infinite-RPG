
import { SaveData, SaveMetadata } from '../types';
import { RPG_SAVE_KEY } from '../constants';

const DB_NAME = 'InfiniteRPG_DB';
const STORE_NAME = 'saves';
const DB_VERSION = 2; // Increment version for schema changes if needed
const CURRENT_SAVE_VERSION = 1;

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
                // Create object store with 'id' as the key path
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveGameToStorage = async (data: Omit<SaveData, 'version' | 'timestamp' | 'id'>, slotId: string = 'manual_1'): Promise<void> => {
    const saveData: SaveData = {
        ...data,
        id: slotId,
        version: CURRENT_SAVE_VERSION,
        timestamp: Date.now(),
    };

    // Try IndexedDB first
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(saveData); // key is in the object now
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (idbError) {
        console.warn("IndexedDB save failed, attempting localStorage fallback.", idbError);
        // Fallback to LocalStorage
        try {
            const json = JSON.stringify(saveData);
            localStorage.setItem(`${RPG_SAVE_KEY}_${slotId}`, json);
        } catch (lsError) {
            console.error("LocalStorage save failed.", lsError);
            throw new Error("Failed to save game. Storage quota exceeded.");
        }
    }
};

export const loadGameFromStorage = async (slotId: string = 'manual_1'): Promise<SaveData | null> => {
    // 1. Try IndexedDB
    try {
        const db = await openDB();
        const idbData = await new Promise<SaveData | undefined>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(slotId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
        
        if (idbData) return idbData;
    } catch (e) {
        console.warn("IndexedDB load failed or empty, checking localStorage.", e);
    }

    // 2. Check LocalStorage
    const localData = localStorage.getItem(`${RPG_SAVE_KEY}_${slotId}`);
    if (localData) {
        try {
            return JSON.parse(localData) as SaveData;
        } catch (e) {
            console.error("Failed to parse localStorage data", e);
        }
    }
    
    // 3. Legacy Fallback (Single Slot)
    if (slotId === 'manual_1') {
         const legacyData = localStorage.getItem(RPG_SAVE_KEY);
         if (legacyData) {
            try {
                const parsed = JSON.parse(legacyData);
                // Migrate on the fly
                return {
                    ...parsed,
                    id: 'manual_1',
                    version: 0,
                    timestamp: Date.now()
                } as SaveData;
            } catch (e) { /* ignore */ }
         }
    }

    return null;
};

export const listSaves = async (): Promise<SaveMetadata[]> => {
    const saves: SaveMetadata[] = [];

    // IndexedDB
    try {
        const db = await openDB();
        const allSaves = await new Promise<SaveData[]>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });

        allSaves.forEach(save => {
            const locationName = save.worldData?.locations.find(l => l.id === save.playerLocationId)?.name || 'Unknown Location';
            saves.push({
                id: save.id,
                timestamp: save.timestamp,
                version: save.version,
                playerName: save.player.name,
                playerLevel: save.player.level,
                playerClass: save.player.className,
                locationName,
                isAutoSave: save.id.startsWith('auto')
            });
        });
    } catch (e) {
        console.warn("Failed to list saves from IDB", e);
    }

    // LocalStorage (Scan for keys)
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${RPG_SAVE_KEY}_`)) {
            const slotId = key.replace(`${RPG_SAVE_KEY}_`, '');
            // Avoid duplicates if IDB worked
            if (saves.some(s => s.id === slotId)) continue;

            try {
                const data = JSON.parse(localStorage.getItem(key)!) as SaveData;
                const locationName = data.worldData?.locations.find(l => l.id === data.playerLocationId)?.name || 'Unknown Location';
                saves.push({
                    id: slotId,
                    timestamp: data.timestamp,
                    version: data.version,
                    playerName: data.player.name,
                    playerLevel: data.player.level,
                    playerClass: data.player.className,
                    locationName,
                    isAutoSave: slotId.startsWith('auto')
                });
            } catch (e) { /* ignore corrupt LS data */ }
        }
    }

    return saves.sort((a, b) => b.timestamp - a.timestamp);
};

export const getLatestSaveMetadata = async (): Promise<SaveMetadata | null> => {
    const saves = await listSaves();
    if (saves.length === 0) return null;
    return saves[0]; // listSaves sorts by timestamp desc
};

export const deleteSave = async (slotId: string): Promise<void> => {
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(slotId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (e) {
        console.warn("Failed to delete from IDB", e);
    }
    
    localStorage.removeItem(`${RPG_SAVE_KEY}_${slotId}`);
};

export const checkSaveExists = async (slotId: string = 'manual_1'): Promise<boolean> => {
    try {
        const db = await openDB();
        const count = await new Promise<number>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count(slotId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
        if (count > 0) return true;
    } catch (e) { /* Ignore IDB errors */ }
    
    return !!localStorage.getItem(`${RPG_SAVE_KEY}_${slotId}`) || (slotId === 'manual_1' && !!localStorage.getItem(RPG_SAVE_KEY));
};
