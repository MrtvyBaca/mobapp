import { readRecords } from 'react-native-health-connect';

export type Workout = {
  id: string;
  start: string;             // ← namiesto startTime
  end: string;               // ← namiesto endTime
  type: string;              // ← z ExerciseSession.exerciseType (alebo title)
  distanceMeters?: number;
  caloriesKcal?: number;
};

export async function fetchWorkouts(fromISO: string, toISO: string): Promise<Workout[]> {
  const res = await readRecords('ExerciseSession', {
    timeRangeFilter: { operator: 'between', startTime: fromISO, endTime: toISO },
  });

  const records = Array.isArray(res) ? res : (res as any)?.records ?? [];

  return records.map((r: any) => ({
    id: r.metadata?.id ?? r.uid ?? `${r.startTime}-${r.endTime}`,
    start: r.startTime,                     // ← premapované
    end: r.endTime,                         // ← premapované
    type: r.exerciseType ?? r.title ?? 'unknown',
    distanceMeters: r.distance ?? r.distanceMeters,    // podľa toho, čo knižnica vracia
    caloriesKcal: r.totalCalories ?? r.caloriesKcal,   // dto
  }));
}
