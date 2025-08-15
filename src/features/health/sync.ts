import { fetchWorkouts } from './fetch';
import { mapHealthToTraining } from './map';
import { add, getAll } from '@/features/training/storage';
import { requestHealthPermissions } from './permissions';
import { ensureHCInitialized } from './init';

function startOfDayISO(d = new Date()) {
  const x = new Date(d); x.setHours(0,0,0,0); return x.toISOString();
}
function endOfDayISO(d = new Date()) {
  const x = new Date(d); x.setHours(23,59,59,999); return x.toISOString();
}

/** Stiahne tréningy z posledných N dní a uloží ich (bez duplicit podľa (date,duration,distance)). */
export async function syncHealth({ days = 14 } = {}) {
      // len Android: zaisti init + povolenia

    await ensureHCInitialized();
    const ok = await requestHealthPermissions();
    if (!ok) throw new Error('Zamietnuté povolenia v Health Connect.');

  const to = new Date();
  const from = new Date(); from.setDate(to.getDate() - days);

  const workouts = await fetchWorkouts(startOfDayISO(from), endOfDayISO(to));
  if (!workouts.length) return 0;

  const existing = await getAll();
  let created = 0;

  for (const w of workouts) {
    const draft = mapHealthToTraining(w);
    const dupe = existing.find(r =>
      r.date === draft.date &&
      Math.abs((r.durationSeconds ?? r.duration*60) - (draft.durationSeconds ?? draft.duration*60)) <= 60 &&
      Math.abs((r.distanceMeters ?? 0) - (draft.distanceMeters ?? 0)) <= 50
    );
    if (dupe) continue;

    await add(draft);
    created++;
  }
  return created;
}
