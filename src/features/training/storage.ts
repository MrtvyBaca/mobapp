import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainingRecord, TrainingDraft } from '@/shared/lib/training';
import { inferType } from '@/shared/lib/training';
// v oboch storage súboroch
import { getUserId } from '@/shared/lib/user';

async function getCurrentUserId(): Promise<string> {
  return await getUserId(); // číta z AsyncStorage; ensureUserId sa už zavolal v App.tsx
}
const KEY_V2 = 'treninky_v2';
const LEGACY_KEYS = ['treninky']; // starý kľúč bez id


// — robustné id —
function makeId(): string {
  const c = (globalThis as any).crypto;
  return c?.randomUUID ? c.randomUUID() : `rid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toYmd(d: string | Date): string {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function readAllV2(): Promise<TrainingRecord[]> {
  const raw = await AsyncStorage.getItem(KEY_V2);
  if (!raw) {
    const migrated = await migrateLegacyIfNeeded();
    return migrated ?? [];
  }
  try {
    const list = JSON.parse(raw) as TrainingRecord[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeAllV2(list: TrainingRecord[]) {
  await AsyncStorage.setItem(KEY_V2, JSON.stringify(list));
}

// — Migrácia zo starého formátu (bez id/userId) —
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

      await writeAllV2(migrated);
      // voliteľne: await AsyncStorage.removeItem(k);
      return migrated;
    } catch {
      // ignoruj a skús ďalší kľúč
    }
  }
  return null;
}

// --------- Public API ---------

export async function getAll(): Promise<TrainingRecord[]> {
  const userId = await getCurrentUserId();
  const list = await readAllV2();
  return list
    .filter(r => r.userId === userId)
    .sort((a, b) => {
      // najnovší hore – najprv podľa dátumu, potom updatedAt
      const d = b.date.localeCompare(a.date);
      return d !== 0 ? d : (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    });
}

export async function add(draft: TrainingDraft): Promise<TrainingRecord> {
  const list = await readAllV2();
  const now = new Date().toISOString();

  const userId = await getCurrentUserId();   // ← TOTO MUSÍ BYŤ

  const rec: TrainingRecord = {
    id: makeId(),
    userId,                                  // ← teraz je definovaný
    date: toYmd(draft.date),
    duration: Number(draft.duration || 0),
    description: draft.description ?? '',
    category: draft.category,
    group: draft.group,
    subtype: draft.subtype,
    type: draft.type ?? inferType({
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

  list.push(rec);
  await writeAllV2(list);
  return rec;
}


export async function update(id: string, patch: Partial<TrainingDraft>): Promise<TrainingRecord | null> {
  const list = await readAllV2();
  const idx = list.findIndex(r => r.id === id);
  if (idx < 0) return null;

  const prev = list[idx];
  const next: TrainingRecord = {
    ...prev,
    ...patch,
    date: patch.date ? toYmd(patch.date) : prev.date,
    duration: patch.duration != null ? Number(patch.duration) : prev.duration,
    type: patch.type ?? inferType({
      category: patch.category ?? prev.category,
      group: patch.group ?? prev.group,
      subtype: patch.subtype ?? prev.subtype,
      type: prev.type,
      description: patch.description ?? prev.description,
    }),
    updatedAt: new Date().toISOString(),
  };

  list[idx] = next;
  await writeAllV2(list);
  return next;
}

export async function remove(id: string): Promise<void> {
  const list = await readAllV2();
  const filtered = list.filter(r => r.id !== id);
  await writeAllV2(filtered);
}
