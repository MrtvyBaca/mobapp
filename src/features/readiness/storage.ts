// src/features/readiness/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  computeReadinessScore,
  defaultAnswers,
  type ReadinessEntry,
  type ReadinessAnswers,
} from '@/shared/lib/readiness';

const KEY_V2 = 'readiness_v2'; // nový kľúč so schemaVersion
const LEGACY_KEYS = ['readiness_v1', 'readiness']; // pre migráciu zo starších verzií
// v oboch storage súboroch
import { getUserId } from '@/shared/lib/user';

async function getCurrentUserId(): Promise<string> {
  return await getUserId(); // číta z AsyncStorage; ensureUserId sa už zavolal v App.tsx
}

// --- robustné ID (UUID, fallback ak nie je k dispozícii) ---
function makeId(): string {
  const c = (globalThis as any).crypto;
  return c?.randomUUID
    ? c.randomUUID()
    : `rid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
export interface Repo<T, Draft> {
  getAll(): Promise<T[]>;
  getRange(from: string, to: string): Promise<T[]>;
  upsert(draft: Draft): Promise<T>;
  update(id: string, patch: Partial<Draft>): Promise<T | null>;
  remove(id: string): Promise<void>; // soft delete odporúčané
}

// --- čítanie/zápis novej verzie ---
async function readAllV2(): Promise<ReadinessEntry[]> {
  const raw = await AsyncStorage.getItem(KEY_V2);
  if (!raw) {
    // skúsiť migráciu zo starých kľúčov
    const migrated = await migrateLegacyIfNeeded();
    return migrated ?? [];
  }
  try {
    const list = JSON.parse(raw) as ReadinessEntry[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeAllV2(list: ReadinessEntry[]) {
  await AsyncStorage.setItem(KEY_V2, JSON.stringify(list));
}

// --- migrácia zo starého formátu (bez id/userId/schemaVersion) ---
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
            (typeof old?.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(old.id)
              ? old.id
              : undefined);
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

      await writeAllV2(migrated);
      // voliteľne odstráň starý kľúč:
      // await AsyncStorage.removeItem(k);
      return migrated;
    } catch {
      // ignoruj, skús ďalší legacy kľúč
    }
  }
  return null;
}

// --------- Public API (rovnaké podpisy ako máš) ---------

export async function getAll(): Promise<ReadinessEntry[]> {
  const userId = await getCurrentUserId();
  const list = await readAllV2();
  return list
    .filter((e) => e.userId === userId && !e.deleted)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getByDate(date: string): Promise<ReadinessEntry | null> {
  const userId = await getCurrentUserId();
  const list = await readAllV2();
  return list.find((e) => e.userId === userId && e.date === date && !e.deleted) ?? null;
}

export async function upsertForDate(
  date: string,
  answers: ReadinessAnswers,
): Promise<ReadinessEntry> {
  const userId = await getCurrentUserId();
  const list = await readAllV2();
  const now = new Date().toISOString();
  const idx = list.findIndex((e) => e.userId === userId && e.date === date && !e.deleted);
  const score = computeReadinessScore(answers);

  if (idx >= 0) {
    const prev = list[idx];
    const next: ReadinessEntry = { ...prev, answers, score, updatedAt: now, schemaVersion: 1 };
    list[idx] = next;
    await writeAllV2(list);
    return next;
  }

  const entry: ReadinessEntry = {
    id: makeId(),
    userId,
    date,
    answers,
    score,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
  list.push(entry);
  await writeAllV2(list);
  return entry;
}

export async function getRangeInclusive(
  startDate: string,
  endDate: string,
): Promise<ReadinessEntry[]> {
  const userId = await getCurrentUserId();
  const list = await readAllV2();
  return list
    .filter((e) => e.userId === userId && !e.deleted && e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// (voliteľné) "soft delete" ak budeš chcieť
export async function deleteByDate(date: string): Promise<void> {
  const userId = await getCurrentUserId();
  const list = await readAllV2();
  const idx = list.findIndex((e) => e.userId === userId && e.date === date && !e.deleted);
  if (idx < 0) return;
  list[idx] = { ...list[idx], deleted: true, updatedAt: new Date().toISOString() } as any;
  await writeAllV2(list);
}
