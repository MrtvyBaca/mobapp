// src/shared/lib/readiness.ts
export type ReadinessAnswers = {
  trainingLoadYesterday: number; // 0–10 (vyššie = horšie)
  muscleSoreness: number; // 0–10 (horšie)
  muscleFatigue: number; // 0–10 (horšie)
  mentalStress: number; // 0–10 (horšie)
  injury: number; // 0–10 (horšie)
  illness: number; // 0–10 (horšie)
  sleepLastNight: number; // 0–10 (lepšie)
  nutritionQuality: number; // 0–10 (lepšie)
  mood24h: number; // 0–10 (lepšie)
  recoveryEnergyToday: number; // 0–10 (lepšie)
  menstrual: number; // 0–10 (horšie; ak neplatí, nech je 0)
};

export type ReadinessEntry = {
  id: string; // UUID / ULID
  userId: string; // kto to uložil
  date: string; // 'YYYY-MM-DD' (unikát na usera)
  answers: ReadinessAnswers;
  score: number; // 0..10
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  schemaVersion: 1;
};

// ktoré sú "pozitívne" vs "negatívne"
export const POSITIVE_KEYS: (keyof ReadinessAnswers)[] = [
  'sleepLastNight',
  'nutritionQuality',
  'mood24h',
  'recoveryEnergyToday',
];
export const NEGATIVE_KEYS: (keyof ReadinessAnswers)[] = [
  'trainingLoadYesterday',
  'muscleSoreness',
  'muscleFatigue',
  'mentalStress',
  'injury',
  'illness',
  'menstrual',
];

export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
export function round1(x: number) {
  return Math.round(x * 10) / 10;
}

export function computeReadinessScore(a: ReadinessAnswers): number {
  // mapuj negatívne: 10 -> 0 (zlé), 0 -> 10 (dobré)
  const posSum = POSITIVE_KEYS.reduce((s, k) => s + (a[k] ?? 0), 0);
  const negInv = NEGATIVE_KEYS.reduce((s, k) => s + (10 - (a[k] ?? 0)), 0);
  const total = posSum + negInv; // rozsah 0..(4*10 + 7*10) = 110
  const normalized = (total / 110) * 10; // premapuj na 0..10
  return round1(normalized);
}

// defaulty (všetko neutrálne = 5, okrem "menstrual" = 0)
export function defaultAnswers(): ReadinessAnswers {
  return {
    trainingLoadYesterday: 5,
    muscleSoreness: 5,
    muscleFatigue: 5,
    mentalStress: 5,
    injury: 0,
    illness: 0,
    sleepLastNight: 5,
    nutritionQuality: 5,
    mood24h: 5,
    recoveryEnergyToday: 5,
    menstrual: 0,
  };
}
