// sync.ts
import { ensureHCInitialized } from './init';
import { requestHealthPermissions } from './permissions';
import { fetchWorkouts } from './fetch';
import { mapHealthToTraining } from './map';
import { add, getAll } from '@/features/training/storage';
import { ExerciseType } from 'react-native-health-connect';

// pomocník: prevedie číslo z ExerciseType -> 'running', 'walking', ...
function exerciseTypeToString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') {
    // nájdi kľúč v enum-like objekte podľa hodnoty
    const key = Object.keys(ExerciseType).find(k => (ExerciseType as any)[k] === v);
    return (key ?? `type_${v}`).toLowerCase();
  }
  return 'unknown';
}

function startOfDayISO(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString();
}
function endOfDayISO(d = new Date()) {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x.toISOString();
}

/** Normalizuje tvar workoutu pre mapHealthToTraining. */
function normalizeForMapper(w: any): {
  id: string;
  start: string;
  end: string;
  type: string;                // ← garantovane string
  distanceMeters?: number;
  caloriesKcal?: number;
} {
  const start = w.start ?? w.startTime;
  const end = w.end ?? w.endTime;

  // môže prísť: w.type (string), w.exerciseType (number), alebo title (string)
  const rawType = w.type ?? w.exerciseType ?? w.title ?? 'unknown';
  const type = exerciseTypeToString(rawType);       // ← prevod na string

  return {
    id: w.id ?? w?.metadata?.id ?? w.uid ?? `${start}-${end}`,
    start,
    end,
    type,                                           // ← string (lowercase)
    distanceMeters: w.distanceMeters ?? w.distance ?? undefined,
    caloriesKcal: w.caloriesKcal ?? w.totalCalories ?? undefined,
  };
}

/** Stiahne tréningy z posledných N dní a uloží ich (bez duplicit podľa (date,duration,distance)). */
export async function syncHealth({ days = 14 } = {}): Promise<number> {
  // 1) Init + permissions
  const inited = await ensureHCInitialized();
  if (!inited) throw new Error('Health Connect init zlyhal.');

  const ok = await requestHealthPermissions();
  if (!ok) throw new Error('Zamietnuté povolenia v Health Connect.');

  // 2) Obdobie
  const to = new Date();
  const from = new Date(); from.setDate(to.getDate() - days);
  const fromISO = startOfDayISO(from);
  const toISO = endOfDayISO(to);

  console.log('[HC] fetching workouts', fromISO, '→', toISO);

  // 3) Načítaj z HC
  const workouts = await fetchWorkouts(fromISO, toISO);
  console.log('[HC] workouts count:', workouts.length);
  if (!workouts.length) return 0;

  // 4) Dedup + ukladanie
  const existing = await getAll();
  let created = 0;

  for (const w of workouts) {
    const draftInput = normalizeForMapper(w);
    const draft = mapHealthToTraining(draftInput as any);

    const dupe = existing.find(r =>
      r.date === draft.date &&
      Math.abs((r.durationSeconds ?? r.duration * 60) - (draft.durationSeconds ?? draft.duration * 60)) <= 60 &&
      Math.abs((r.distanceMeters ?? 0) - (draft.distanceMeters ?? 0)) <= 50
    );
    if (dupe) continue;

    await add(draft);
    created++;
  }

  return created;
}
