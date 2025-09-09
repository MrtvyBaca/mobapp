// src/features/readiness/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  computeReadinessScore,
  type ReadinessEntry,
  type ReadinessAnswers,
} from '@/shared/lib/readiness';
import { getUserId } from '@/shared/lib/user';

/* =========================
 * Konštanty a pomocníci
 * ========================= */

const KEY_V2 = 'readiness_v2';             // starší formát: celé pole záznamov
const LEGACY_KEYS = ['readiness_v1', 'readiness'];

const REC_KEY = (id: string) => `R_V2:${id}`;                // per-record
const IDX_KEY = (userId: string) => `R_V2_IDX:${userId}`;    // per-user index (pole id-čiek)

/** robustné id */
function makeId(): string {
  const c = (globalThis as any).crypto;
  return c?.randomUUID
    ? c.randomUUID()
    : `rid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function getCurrentUserId(): Promise<string> {
  return await getUserId();
}

/** poradie: najnovší hore – podľa date (desc), potom updatedAt (desc) */
function compareEntry(a: ReadinessEntry, b: ReadinessEntry): number {
  const d = b.date.localeCompare(a.date);
  return d !== 0 ? d : (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
}

/** načítaj záznam podľa id */
async function readRecord(id: string): Promise<ReadinessEntry | null> {
  const v = await AsyncStorage.getItem(REC_KEY(id));
  if (!v) return null;
  try { return JSON.parse(v) as ReadinessEntry; } catch { return null; }
}

/** zapíš záznam */
async function writeRecord(rec: ReadinessEntry): Promise<void> {
  await AsyncStorage.setItem(REC_KEY(rec.id), JSON.stringify(rec));
}

/** odstráň záznam */
async function removeRecord(id: string): Promise<void> {
  await AsyncStorage.removeItem(REC_KEY(id));
}

/** načítaj index pre usera */
async function readIndex(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(IDX_KEY(userId));
  if (!raw) return [];
  try {
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) ? ids : [];
  } catch { return []; }
}

/** zapíš index pre usera */
async function writeIndex(userId: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(IDX_KEY(userId), JSON.stringify(ids));
}

/** nájdi pozíciu na vloženie `rec` do indexu `ids` (lineárne; stačí) */
async function findInsertPosInIndex(userId: string, ids: string[], rec: ReadinessEntry): Promise<number> {
  for (let i = 0; i < ids.length; i++) {
    const other = await readRecord(ids[i]);
    if (!other) continue;
    if (compareEntry(rec, other) < 0) return i; // rec patrí pred other
  }
  return ids.length;
}

/** očisti index od ID-čiek bez záznamu */
async function pruneDanglingIds(userId: string): Promise<void> {
  const ids = await readIndex(userId);
  if (ids.length === 0) return;
  const kv = await AsyncStorage.multiGet(ids.map(REC_KEY));
  const okIds = kv.map((pair, i) => (pair[1] ? ids[i] : null)).filter(Boolean) as string[];
  if (okIds.length !== ids.length) await writeIndex(userId, okIds);
}

/* =========================
 * Migrácie
 * ========================= */

/** prečítaj celý blokový formát (ak existuje) */
async function readAllV2Array(): Promise<ReadinessEntry[] | null> {
  const raw = await AsyncStorage.getItem(KEY_V2);
  if (!raw) return null;
  try {
    const list = JSON.parse(raw) as ReadinessEntry[];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

/** migrácia zo starých legacy kľúčov do KEY_V2 (blok) */
async function migrateLegacyIfNeeded(): Promise<ReadinessEntry[] | null> {
  for (const k of LEGACY_KEYS) {
    const raw = await AsyncStorage.getItem(k);
    if (!raw) continue;

    try {
      const legacy = JSON.parse(raw) as any[];
      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const migrated: ReadinessEntry[] = (legacy ?? [])
        .map((old) => {
          const date: string | undefined =
            old?.date ||
            (typeof old?.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(old.id) ? old.id : undefined);
          if (!date) return null;

          const ans: ReadinessAnswers = {
            trainingLoadYesterday: Number(old?.answers?.trainingLoadYesterday ?? 5),
            muscleSoreness: Number(old?.answers?.muscleSoreness ?? 5),
            muscleFatigue: Number(old?.answers?.muscleFatigue ?? 5),
            mentalStress: Number(old?.answers?.mentalStress ?? 5),
            injury: Number(old?.answers?.injury ?? 0),
            illness: Number(old?.answers?.illness ?? 0),
            sleepLastNight: Number(old?.answers?.sleepLastNight ?? 5),
            nutritionQuality: Number(old?.answers?.nutritionQuality ?? 5),
            mood24h: Number(old?.answers?.mood24h ?? 5),
            recoveryEnergyToday: Number(old?.answers?.recoveryEnergyToday ?? 5),
            menstrual: Number(old?.answers?.menstrual ?? 0),
          };

          return {
            id: makeId(),
            userId,
            date,
            answers: ans,
            score: Number.isFinite(old?.score) ? Number(old.score) : computeReadinessScore(ans),
            createdAt: old?.createdAt ?? now,
            updatedAt: now,
            schemaVersion: 1 as const,
          } satisfies ReadinessEntry;
        })
        .filter(Boolean) as ReadinessEntry[];

      await AsyncStorage.setItem(KEY_V2, JSON.stringify(migrated));
      return migrated;
    } catch {
      // ignore and try next legacy key
    }
  }
  return null;
}

/** Migrácia z KEY_V2 (blok) → per-record + per-user index */
async function migrateV2ArrayToShardedIfNeeded(): Promise<void> {
  const currentUserId = await getCurrentUserId();
  const existingIdx = await AsyncStorage.getItem(IDX_KEY(currentUserId));
  if (existingIdx) return; // už migrované

  // Načítaj blok (alebo ho vytvor migráciou z legacy)
  let all = await readAllV2Array();
  if (!all) {
    const migrated = await migrateLegacyIfNeeded();
    all = migrated ?? [];
  }

  if (!all || all.length === 0) {
    // aj tak vytvor prázdny index pre aktuálneho usera
    await writeIndex(currentUserId, []);
    return;
  }

  // zapíš per-record a vytvor indexy pre všetkých userov
  const byUser: Record<string, ReadinessEntry[]> = Object.create(null);
  for (const rec of all) {
    if (!rec?.id || !rec?.userId) continue;
    (byUser[rec.userId] ??= []).push(rec);
    await writeRecord(rec);
  }

  const userIds = Object.keys(byUser);
  for (const uid of userIds) {
    const list = byUser[uid].slice().sort(compareEntry);
    const ids = list.map(r => r.id);
    await writeIndex(uid, ids);
  }

  // (voliteľne) môžeš odstrániť KEY_V2
  // await AsyncStorage.removeItem(KEY_V2);
}

/** Zabezpečí existenciu a konzistenciu indexu pre usera */
async function ensureIndexForUser(userId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(IDX_KEY(userId));
  if (!raw) {
    await migrateV2ArrayToShardedIfNeeded();
    const again = await AsyncStorage.getItem(IDX_KEY(userId));
    if (!again) await writeIndex(userId, []);
  }
  await pruneDanglingIds(userId);
}

/* =========================
 * Public API – rovnaká filozofia ako tréningy
 * ========================= */

export async function getAll(): Promise<ReadinessEntry[]> {
  const userId = await getCurrentUserId();
  await ensureIndexForUser(userId);

  const ids = await readIndex(userId);
  if (ids.length === 0) return [];

  const kv = await AsyncStorage.multiGet(ids.map(REC_KEY));
  const items = kv
    .map(([, v]) => (v ? (JSON.parse(v) as ReadinessEntry) : null))
    .filter(Boolean) as ReadinessEntry[];

  items.sort(compareEntry);
  return items;
}

export async function getByDate(date: string): Promise<ReadinessEntry | null> {
  const userId = await getCurrentUserId();
  await ensureIndexForUser(userId);

  const ids = await readIndex(userId);
  if (ids.length === 0) return null;

  // lineárne pre hľadanie jedného dňa (v praxi do stovák záznamov OK)
  for (const id of ids) {
    const rec = await readRecord(id);
    if (rec && rec.date === date) return rec;
  }
  return null;
}

/** Vloží/aktualizuje záznam pre dátum; udrží index v správnom poradí. */
export async function upsertForDate(date: string, answers: ReadinessAnswers): Promise<ReadinessEntry> {
  const userId = await getCurrentUserId();
  await ensureIndexForUser(userId);

  const now = new Date().toISOString();
  const score = computeReadinessScore(answers);
  const ids = await readIndex(userId);

  // existuje záznam pre tento deň?
  for (let i = 0; i < ids.length; i++) {
    const rec = await readRecord(ids[i]);
    if (!rec) continue;
    if (rec.userId === userId && rec.date === date) {
      const next: ReadinessEntry = { ...rec, answers, score, updatedAt: now };
      await writeRecord(next);
      // dátum sa nemení → poradie ostáva; pre istotu by sa dalo re-sortnúť
      return next;
    }
  }

  // nový záznam
  const entry: ReadinessEntry = {
    id: makeId(),
    userId,
    date,
    answers,
    score,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1 as const,
  };
  await writeRecord(entry);

  // vlož do indexu podľa poradia (nové id na správne miesto)
  const pos = await findInsertPosInIndex(userId, ids, entry);
  ids.splice(pos, 0, entry.id);
  await writeIndex(userId, ids);

  return entry;
}

/** Aktualizácia podľa id (napr. ak by si menil dátum). Udrží poradie indexu. */
export async function updateById(id: string, patch: Partial<Pick<ReadinessEntry, 'date'|'answers'|'score'>>): Promise<ReadinessEntry | null> {
  const prev = await readRecord(id);
  if (!prev) return null;

  const next: ReadinessEntry = {
    ...prev,
    ...patch,
    // ak nie je score v patchi, prepočítaj zo (nových) answers
    score: patch.score ?? computeReadinessScore(patch.answers ?? prev.answers),
    updatedAt: new Date().toISOString(),
  };
  await writeRecord(next);

  // ak sa zmenil dátum → preusporiadaj index
  if (patch.date && patch.date !== prev.date) {
    const userId = prev.userId;
    await ensureIndexForUser(userId);
    const ids = await readIndex(userId);
    const oldPos = ids.indexOf(id);
    if (oldPos >= 0) ids.splice(oldPos, 1);
    const pos = await findInsertPosInIndex(userId, ids, next);
    ids.splice(pos, 0, id);
    await writeIndex(userId, ids);
  }

  return next;
}

/** Odstráň podľa id (rovnako ako tréningy) */
export async function remove(id: string): Promise<void> {
  const rec = await readRecord(id);
  if (!rec) { await removeRecord(id); return; }
  const userId = rec.userId;

  await removeRecord(id);
  await ensureIndexForUser(userId);
  const ids = await readIndex(userId);
  const pos = ids.indexOf(id);
  if (pos >= 0) {
    ids.splice(pos, 1);
    await writeIndex(userId, ids);
  }
}

/** Backward-compat: odstránenie podľa dátumu (nájde id a zavolá remove) */
export async function deleteByDate(date: string): Promise<void> {
  const userId = await getCurrentUserId();
  await ensureIndexForUser(userId);
  const ids = await readIndex(userId);
  for (const id of ids) {
    const rec = await readRecord(id);
    if (rec && rec.date === date) {
      await remove(id);
      return;
    }
  }
}

/** Rozsah podľa dátumov (vrátane) – urobíme cez index, bez načítania celého KEY_V2 */
export async function getRangeInclusive(startDate: string, endDate: string): Promise<ReadinessEntry[]> {
  const userId = await getCurrentUserId();
  await ensureIndexForUser(userId);

  const ids = await readIndex(userId);
  if (ids.length === 0) return [];

  const kv = await AsyncStorage.multiGet(ids.map(REC_KEY));
  const items = (kv
    .map(([, v]) => (v ? (JSON.parse(v) as ReadinessEntry) : null))
    .filter(Boolean) as ReadinessEntry[])
    .filter(e => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date)); // na osi X rastúco

  return items;
}

/** Stránkovanie: presne ako tréningy – cursor = posledné `id` z predošlej stránky */
export async function listPaginated({
  limit,
  cursor,
}: {
  limit: number;
  cursor: string | null;
}): Promise<{ items: ReadinessEntry[]; nextCursor: string | null; hasMore: boolean }> {
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
    .map(([, v]) => (v ? (JSON.parse(v) as ReadinessEntry) : null))
    .filter(Boolean) as ReadinessEntry[];

  items.sort(compareEntry); // pre istotu rovnaké poradie

  const nextCursor = pageIds.length === limit ? pageIds[pageIds.length - 1] : null;
  return { items, nextCursor, hasMore: nextCursor !== null };
}
