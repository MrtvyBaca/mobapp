// src/features/training/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
// Ak používaš uuid:
// import 'react-native-get-random-values';
// import { v4 as uuidv4 } from 'uuid';

export type TrainingRecord = {
  id: string;
  date: string;
  duration: number;
  description?: string;
  category?: 'Kondice' | 'Ucebna';
  group?: 'Silovy' | 'Kardio' | 'Mobilita';
  subtype?: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
};

const DATA_KEY = 'treninky_v2';
const VERSION_KEY = 'treninky_version';
const CURRENT_VERSION = '2';

// fallback jednoduché id (ak nechceš uuid balík)
function makeId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}
async function writeJSON(key: string, val: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(val));
}

// MIGRÁCIA zo starého kľúča 'treninky' (bez id) → v2 s id
async function migrateIfNeeded() {
  const v = await AsyncStorage.getItem(VERSION_KEY);
  if (v === CURRENT_VERSION) return;

  // Ak už existuje v2, len zapíš verziu a koniec
  const v2 = await readJSON<TrainingRecord[]>(DATA_KEY);
  if (v2 && Array.isArray(v2)) {
    await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    return;
  }

  // Skús staré dáta
  const old = await readJSON<any[]>('treninky');
  if (!old || !Array.isArray(old)) {
    await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    await writeJSON(DATA_KEY, []);
    return;
  }

  const nowIso = new Date().toISOString();
  const migrated: TrainingRecord[] = old.map((r) => ({
    id: makeId(), // alebo uuidv4()
    date: r.date,
    duration: Number(r.duration ?? 0),
    description: r.description,
    category: r.category,
    group: r.group,
    subtype: r.subtype,
    type: r.type,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  await writeJSON(DATA_KEY, migrated);
  await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  // starý kľúč necháme, aby sme nič nepremazali (môžeš zmazať ak chceš)
}

// API
export async function getAll(): Promise<TrainingRecord[]> {
  await migrateIfNeeded();
  const list = await readJSON<TrainingRecord[]>(DATA_KEY);
  return Array.isArray(list) ? list : [];
}

export async function saveAll(list: TrainingRecord[]) {
  await writeJSON(DATA_KEY, list);
}

export async function add(rec: Omit<TrainingRecord, 'id' | 'createdAt' | 'updatedAt'>) {
  const list = await getAll();
  const now = new Date().toISOString();
  const withId: TrainingRecord = {
    ...rec,
    id: makeId(), // alebo uuidv4()
    createdAt: now,
    updatedAt: now,
  };
  const updated = [...list, withId];
  await saveAll(updated);
  return withId;
}

export async function updateById(id: string, patch: Partial<Omit<TrainingRecord, 'id' | 'createdAt'>>) {
  const list = await getAll();
  const updated = list.map((r) =>
    r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
  );
  await saveAll(updated);
}

export async function removeById(id: string) {
  const list = await getAll();
  const updated = list.filter((r) => r.id !== id);
  await saveAll(updated);
}

// Záloha / export
export async function exportJSON(): Promise<string> {
  const list = await getAll();
  return JSON.stringify(list, null, 2);
}

// Import (prepíše celé lokálne dáta)
export async function importJSON(json: string) {
  const list = JSON.parse(json) as TrainingRecord[];
  if (!Array.isArray(list)) throw new Error('Invalid JSON');
  await saveAll(list);
}
