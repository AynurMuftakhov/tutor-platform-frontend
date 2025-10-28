import type { LessonNote } from '../types/lessonNotes';

const DB_NAME = 'lesson-notes';
const STORE_NAME = 'notes';
const DB_VERSION = 1;

export interface CachedLessonNote extends LessonNote {
    cachedAt: string;
}

const isIndexedDbSupported = (): boolean => {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
};

let dbPromise: Promise<IDBDatabase | null> | undefined;

const openDb = (): Promise<IDBDatabase | null> => {
    if (!isIndexedDbSupported()) {
        return Promise.resolve(null);
    }

    if (!dbPromise) {
        dbPromise = new Promise<IDBDatabase | null>((resolve, reject) => {
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'lessonId' });
                }
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error ?? new Error('Failed to open lesson notes store'));
            };

            request.onblocked = () => {
                reject(new Error('IndexedDB blocked while opening lesson notes store'));
            };
        }).catch((error) => {
            console.warn('Lesson notes cache unavailable', error);
            return null;
        });
    }

    return dbPromise as Promise<IDBDatabase | null>;
};

const runTransaction = async <T>(
    mode: IDBTransactionMode,
    runner: (store: IDBObjectStore) => Promise<T> | T
): Promise<T | null> => {
    const db = await openDb();
    if (!db) {
        return null;
    }

    return new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);

        let settled = false;
        const finalizeResolve = (value: T | null) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };
        const finalizeReject = (error: unknown) => {
            if (settled) return;
            settled = true;
            reject(error);
        };

        let resultValue: T | null = null;

        tx.onerror = () => finalizeReject(tx.error ?? new Error('IndexedDB transaction error'));
        tx.oncomplete = () => finalizeResolve(resultValue);

        try {
            Promise.resolve(runner(store))
                .then((result) => {
                    resultValue = (result as T) ?? null;
                })
                .catch((error) => finalizeReject(error));
        } catch (error) {
            finalizeReject(error);
        }
    }).catch(() => null);
};

export const saveLessonNoteCache = async (note: LessonNote): Promise<void> => {
    await runTransaction('readwrite', (store) => {
        const record: CachedLessonNote = {
            ...note,
            cachedAt: note.updatedAt || new Date().toISOString()
        };
        store.put(record);
    });
};

export const loadLessonNoteCache = async (lessonId: string): Promise<CachedLessonNote | null> => {
    const result = await runTransaction('readonly', (store) => {
        return new Promise<CachedLessonNote | null>((resolve, reject) => {
            const request = store.get(lessonId);
            request.onsuccess = () => {
                const value = request.result as CachedLessonNote | undefined;
                resolve(value ?? null);
            };
            request.onerror = () => reject(request.error);
        });
    });

    return result ?? null;
};

export const clearLessonNoteCache = async (lessonId: string): Promise<void> => {
    await runTransaction('readwrite', (store) => {
        store.delete(lessonId);
    });
};
