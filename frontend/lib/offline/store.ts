/**
 * Armazenamento offline (IndexedDB) para leitura de dados sem conexão.
 * Guarda a última resposta bem-sucedida de cada consulta GET do Supabase,
 * por usuário (namespace pelo `sub` do JWT). É só cache de LEITURA — nada de
 * escrita offline aqui.
 *
 * Observação de privacidade: como qualquer recurso offline, isto grava dados
 * financeiros no aparelho. Fica restrito ao dispositivo do usuário e é limpo
 * no logout.
 */

const DB_NAME = "mg-offline";
const STORE = "reads";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponível"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export interface CachedRead {
  body: string;
  contentRange: string | null;
  ts: number;
}

export async function idbGet(key: string): Promise<CachedRead | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as CachedRead) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: CachedRead): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* cache é best-effort: falha não deve quebrar a leitura online */
  }
}

/** Limpa todo o cache offline (usado no logout). */
export async function idbClear(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* nada a fazer */
  }
}
