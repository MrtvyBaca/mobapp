// storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainingRecord, TrainingDraft } from '@/shared/lib/training';
import { inferType } from '@/shared/lib/training';
import { getUserId } from '@/shared/lib/user';

// =========================
// Konštanty a pomocníci
// =========================

const KEY_V2 = 'treninky_v2';              // starší formát: celé pole záznamov
const LEGACY_KEYS = ['treninky'];          // úplne starý formát bez id/userId

const REC_KEY = (id: string) => `T_V2:${id}`;                // per-record
const IDX_KEY = (userId: string) => `T_V2_IDX:${userId}`;    // index pre používateľa (pole id-čiek)

/** robustné id */
function makeId(): string {
  const c = (globalThis as any).crypto;
  return c?.randomUUID
    ? c.randomUUID()
    : `rid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** dátum YYYY-MM-DD (lokálne pásmo je OK pre denníkový záznam) */
function toYmd(d: string | Date): string {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** poradie: najnovší hore – podľa date (desc), potom updatedAt (desc) */
function compareRec(a: TrainingRecord, b: TrainingRecord): number {
  const d = b.date.localeCompare(a.date);
  return d !== 0 ? d : (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
}

/** nájdi pozíciu na vloženie `rec` do indexu `ids` pre usera – lineárne (jednoduché, 1000+ je OK) */
async function findInsertPosInIndex(userId: string, ids: string[], rec: TrainingRecord): Promise<number> {
  for (let i = 0; i < ids.length; i++) {
    const other = await readRecord(ids[i]);
    if (!other) continue; // „dieru“ preskoč
    // ak má byť rec pred other, vlož sem
    if (compareRec(rec, other) < 0) return i;
  }
  return ids.length;
}

async function getCurrentUserId(): Promise<string> {
  return await getUserId(); // ensureUserId sa volá v App.tsx
}

// =========================
// Nízkoúrovňové čítania/zápisy
// =========================

async function readRecord(id: string): Promise<TrainingRecord | null> {
  const v = await AsyncStorage.getItem(REC_KEY(id));
  if (!v) return null;
  try {
    return JSON.parse(v) as TrainingRecord;
  } catch {
    return null;
  }
}

async function writeRecord(rec: TrainingRecord): Promise<void> {
  await AsyncStorage.setItem(REC_KEY(rec.id), JSON.stringify(rec));
}

async function removeRecord(id: string): Promise<void> {
  await AsyncStorage.removeItem(REC_KEY(id));
}

async function readIndex(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(IDX_KEY(userId));
  if (!raw) return [];
  try {
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

async function writeIndex(userId: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(IDX_KEY(userId), JSON.stringify(ids));
}

/** vyčistí index od ID-čiek, ktoré už nemajú záznam (ak sa stane) */
async function pruneDanglingIds(userId: string): Promise<void> {
  const ids = await readIndex(userId);
  if (ids.length === 0) return;
  const keys = ids.map(REC_KEY);
  const kv = await AsyncStorage.multiGet(keys);
  const okIds = kv
    .map((pair, i) => (pair[1] ? ids[i] : null))
    .filter(Boolean) as string[];
  if (okIds.length !== ids.length) {
    await writeIndex(userId, okIds);
  }
}

// =========================
// Migrácie
// =========================

/** Migrácia úplne starého formátu (bez id/userId) → do KEY_V2 (pole) */
async function migrateLegacyIfNeeded(): Promise<TrainingRecord[] | null> {
  for (const k of LEGACY_KEYS) {
    const raw = await AsyncStorage.getItem(k);
    if (!raw) continue;

    try {
      const legacy = JSON.parse(raw) as any[];
      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const migrated: TrainingRecord[] = (legacy ?? [])
        .filter(Boolean)
        .map((old: any) => {
          const date = old?.date ? toYmd(old.date) : toYmd(new Date());
          const duration = Number(old?.duration ?? 0);
          const rec: TrainingRecord = {
            schemaVersion: 1 as const,
            id: makeId(),
            userId,
            date,
            duration: Number.isFinite(duration) ? duration : 0,
            description: old?.description ?? '',
            category: old?.category ?? undefined,
            group: old?.group ?? undefined,
            subtype: old?.subtype ?? undefined,
            type: inferType({
              category: old?.category,
              group: old?.group,
              subtype: old?.subtype,
              type: old?.type,
              description: old?.description,
            }),
            createdAt: old?.createdAt ?? now,
            updatedAt: old?.updatedAt ?? now,
          };
          return rec;
        });

      await AsyncStorage.setItem(KEY_V2, JSON.stringify(migrated));
      // voliteľne: await AsyncStorage.removeItem(k);
      return migrated;
    } catch {
      // ignoruj, skús ďalší kľúč
    }
  }
  return null;
}

/** Migrácia z KEY_V2 (pole všetkých záznamov) → per-record + per-user index */
async function migrateV2ArrayToShardedIfNeeded(): Promise<void> {
  // ak už existuje per-user index pre aktuálneho usera, berme to ako migrované
  const currentUserId = await getCurrentUserId();
  const existingIdx = await AsyncStorage.getItem(IDX_KEY(currentUserId));
  if (existingIdx) return;

  // pozri, či existuje KEY_V2 alebo či vieme vytvoriť z legacy
  let raw = await AsyncStorage.getItem(KEY_V2);
  if (!raw) {
    const migrated = await migrateLegacyIfNeeded();
    if (!migrated) return; // nie je čo migrovať
    raw = JSON.stringify(migrated);
  }

  try {
    const all = JSON.parse(raw) as TrainingRecord[];
    if (!Array.isArray(all) || all.length === 0) {
      // aj tak vytvor prázdny index pre aktuálneho usera (nech máme baseline)
      await writeIndex(currentUserId, []);
      // voliteľne: await AsyncStorage.removeItem(KEY_V2);
      return;
    }

    // roztrieď podľa userId
    const byUser: Record<string, TrainingRecord[]> = Object.create(null);
    for (const rec of all) {
      if (!rec?.id || !rec?.userId) continue;
      (byUser[rec.userId] ??= []).push(rec);
      await writeRecord(rec); // uloženie per-record
    }

    // vytvor indexy pre všetkých userov, utrieď podľa compareRec
    const userIds = Object.keys(byUser);
    for (const uid of userIds) {
      const list = byUser[uid].slice().sort(compareRec);
      const ids = list.map((r) => r.id);
      await writeIndex(uid, ids);
    }

    // voliteľne odstráň starý blokový kľúč
    // await AsyncStorage.removeItem(KEY_V2);
  } catch {
    // ak by parse zlyhal, jednoducho inicializuj prázdny index
    await writeIndex(currentUserId, []);
  }
}

/** Zabezpečí, že pre aktuálneho usera existuje per-user index (a že je konzistentný) */
async function ensureIndexForUser(userId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(IDX_KEY(userId));
  if (!raw) {
    // skús migráciu z v2 array
    await migrateV2ArrayToShardedIfNeeded();
    // ak stále nič, urob prázdny index
    const again = await AsyncStorage.getItem(IDX_KEY(userId));
    if (!again) {
      await writeIndex(userId, []);
    }
  }
  // pre istotu očisti „dierky“
  await pruneDanglingIds(userId);
}

// =========================
// Verejné API (kompatibilné s tvojím kódom)
// =========================

export async function getAll(): Promise<TrainingRecord[]> {
  const userId = await getCurrentUserId();
  await ensureIndexForUser(userId);

  const ids = await readIndex(userId);
  if (ids.length === 0) return [];

  // načítaj všetky (pozor na veľké počty – ale toto voláš skôr výnimočne)
  const kv = await AsyncStorage.multiGet(ids.map(REC_KEY));
  const items = kv
    .map(([, v]) => (v ? (JSON.parse(v) as TrainingRecord) : null))
    .filter(Boolean) as TrainingRecord[];

  // index by mal už byť v poradí; ak by niekedy „ušiel“, dotrieď
  items.sort(compareRec);
  return items;
}

export async function add(draft: TrainingDraft): Promise<TrainingRecord> {
  const userId = await getCurrentUserId();
  await ensureIndexForUser(userId);

  const now = new Date().toISOString();
  const rec: TrainingRecord = {
    id: makeId(),
    userId,
    date: toYmd(draft.date),
    duration: Number(draft.duration || 0),
    description: draft.description ?? '',
    category: draft.category,
    group: draft.group,
    subtype: draft.subtype,
    type:
      draft.type ??
      inferType({
        category: draft.category,
        group: draft.group,
        subtype: draft.subtype,
        type: draft.type,
        description: draft.description,
      }),
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1 as const,
  };

  // zapíš záznam
  await writeRecord(rec);

  // vlož do indexu na správne miesto (podľa poradia)
  const ids = await readIndex(userId);
  const pos = await findInsertPosInIndex(userId, ids, rec);
  ids.splice(pos, 0, rec.id);
  await writeIndex(userId, ids);

  return rec;
}

export async function update(id: string, patch: Partial<TrainingDraft>): Promise<TrainingRecord | null> {
  // načítaj pôvodný záznam
  const prev = await readRecord(id);
  if (!prev) return null;

  const next: TrainingRecord = {
    ...prev,
    ...patch,
    date: patch.date ? toYmd(patch.date) : prev.date,
    duration: patch.duration != null ? Number(patch.duration) : prev.duration,
    type:
      patch.type ??
      inferType({
        category: patch.category ?? prev.category,
        group: patch.group ?? prev.group,
        subtype: patch.subtype ?? prev.subtype,
        type: prev.type,
        description: patch.description ?? prev.description,
      }),
    updatedAt: new Date().toISOString(),
  };

  // zapíš záznam
  await writeRecord(next);

  // ak sa mohlo zmeniť poradie, preusporiadaj index
  const userId = prev.userId;
  await ensureIndexForUser(userId);
  const ids = await readIndex(userId);

  const oldPos = ids.indexOf(id);
  if (oldPos >= 0) {
    ids.splice(oldPos, 1);
    const pos = await findInsertPosInIndex(userId, ids, next);
    ids.splice(pos, 0, id);
    await writeIndex(userId, ids);
  } else {
    // keby záznam v indexe chýbal, jednoducho ho doplň na správne miesto
    const pos = await findInsertPosInIndex(userId, ids, next);
    ids.splice(pos, 0, id);
    await writeIndex(userId, ids);
  }

  return next;
}

export async function remove(id: string): Promise<void> {
  const rec = await readRecord(id);
  if (!rec) {
    // nič netreba – ale pre istotu odstráň key
    await removeRecord(id);
    return;
  }
  const userId = rec.userId;

  // odstráň záznam
  await removeRecord(id);

  // odstráň z indexu
  await ensureIndexForUser(userId);
  const ids = await readIndex(userId);
  const pos = ids.indexOf(id);
  if (pos >= 0) {
    ids.splice(pos, 1);
    await writeIndex(userId, ids);
  }
}

export async function listPaginated({
  limit,
  cursor,
}: {
  limit: number;
  cursor: string | null;
}): Promise<{ items: TrainingRecord[]; nextCursor: string | null; hasMore: boolean }> {
  const userId = await getCurrentUserId();
  await ensureIndexForUser(userId);

  const ids = await readIndex(userId);
  if (ids.length === 0) return { items: [], nextCursor: null, hasMore: false };

  let start = 0;
  if (cursor) {
    const i = ids.indexOf(cursor);
    start = i >= 0 ? i + 1 : 0;
  }

  const pageIds = ids.slice(start, start + limit);
  if (pageIds.length === 0) return { items: [], nextCursor: null, hasMore: false };

  const kv = await AsyncStorage.multiGet(pageIds.map(REC_KEY));
  const items = kv
    .map(([, v]) => (v ? (JSON.parse(v) as TrainingRecord) : null))
    .filter(Boolean) as TrainingRecord[];

  // „pre istotu“ udrž poradie – malo by sedieť s indexom
  items.sort(compareRec);

  const nextCursor = pageIds.length === limit ? pageIds[pageIds.length - 1] : null;
  return { items, nextCursor, hasMore: nextCursor !== null };
}

// =========================
// Rozhranie pre budúci remote (repo pattern)
// =========================

export interface TrainingsRepo {
  getAll(): Promise<TrainingRecord[]>;
  listPaginated(p: { limit: number; cursor: string | null }): Promise<{
    items: TrainingRecord[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  add(draft: TrainingDraft): Promise<TrainingRecord>;
  update(id: string, patch: Partial<TrainingDraft>): Promise<TrainingRecord | null>;
  remove(id: string): Promise<void>;
}

/** Lokálna (AsyncStorage) implementácia – dnes používaná */
export const LocalRepo: TrainingsRepo = {
  getAll,
  listPaginated,
  add,
  update,
  remove,
};

/** Sem neskôr doplníš REST/GraphQL/Firestore implementáciu s rovnakým rozhraním */
export const repo: TrainingsRepo = LocalRepo;
