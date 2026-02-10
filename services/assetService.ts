
const DB_NAME = 'InfiniteRPG_Assets';
const STORE_NAME = 'assets';
const DB_VERSION = 1;

interface AssetRecord {
  id: string;
  data: Blob;
  mimeType: string;
  timestamp: number;
}

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
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const assetService = {
    // Convert Base64 to Blob and store it, returning a UUID
    saveBase64Asset: async (base64Data: string, mimeType: string = 'image/png'): Promise<string> => {
        try {
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            const id = crypto.randomUUID();

            const db = await openDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.put({
                    id,
                    data: blob,
                    mimeType,
                    timestamp: Date.now()
                } as AssetRecord);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });

            return id;
        } catch (error) {
            console.error("Failed to save asset:", error);
            // Fallback: If DB fails, we return the base64 string itself, 
            // the useAsset hook will need to handle this edge case.
            return base64Data; 
        }
    },

    loadAsset: async (id: string): Promise<Blob | null> => {
        // Optimization: If the ID looks like a raw base64 string (legacy/fallback), don't query DB
        if (id.length > 100 || id.startsWith('PHN2Zy')) return null;

        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(id);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const record = request.result as AssetRecord;
                    resolve(record ? record.data : null);
                };
            });
        } catch (error) {
            console.error("Failed to load asset:", error);
            return null;
        }
    }
};
