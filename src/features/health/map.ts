import { type TrainingDraft } from '@/shared/lib/training';

function toMinutes(sec: number) { return Math.round(sec / 60); }

function normalizeType(hwType: string): TrainingDraft['type'] {
  const t = hwType.toLowerCase();
  if (t.includes('run')) return 'Beh';
  if (t.includes('cycle') || t.includes('bike')) return 'Bicykel';
  if (t.includes('walk')) return 'Chôdza';
  if (t.includes('swim')) return 'Plávanie';
  return 'Kardio' as any; // fallback
}

/** Z Health workoutu sprav TrainingDraft */
export function mapHealthToTraining(hw: {
  id: string; start: string; end: string; type: string;
  distanceMeters?: number;
  caloriesKcal?: number;
}): TrainingDraft {
  const durSec = Math.max(0, Math.round((+new Date(hw.end) - +new Date(hw.start)) / 1000));
  const typ = normalizeType(hw.type);

  return {
    date: new Date(hw.start).toISOString().slice(0,10), // YYYY-MM-DD
    duration: toMinutes(durSec),
    description: 'Import z Health',
    category: 'Kondice',
    group: 'Kardio',
    type: typ,
    distanceMeters: hw.distanceMeters,
    durationSeconds: durSec,
    schemaVersion: 1 as const, // pre kompatibilitu s TrainingRecord
  };
}
