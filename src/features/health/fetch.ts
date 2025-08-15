import { Platform } from 'react-native';
import AppleHealthKit from 'react-native-health';
import { readRecords } from 'react-native-health-connect';

export type HealthWorkout = {
  id: string;
  start: string;        // ISO
  end: string;          // ISO
  type: string;         // napr. "running", "cycling", "walking", ...
  distanceMeters?: number;
  caloriesKcal?: number;
  route?: Array<{ lat: number; lon: number; t: number }>;
};

/** Načíta tréningy v intervale (vrátane) */
export async function fetchWorkouts(fromISO: string, toISO: string): Promise<HealthWorkout[]> {
  if (Platform.OS === 'ios') {
    const opts = { startDate: fromISO, endDate: toISO };
    const workouts = await new Promise<any[]>((resolve, reject) => {
      AppleHealthKit.getSamples(opts, (err: any, res: any[]) => (err ? reject(err) : resolve(res)));
    });

    // Apple hist. data vracajú rôzne typy – zmapujeme si známe
    return workouts.map((w) => ({
      id: String(w.uuid ?? `${w.startDate}-${w.endDate}`),
      start: w.startDate,
      end: w.endDate,
      type: String(w.workoutActivityType ?? w.activityName ?? 'other').toLowerCase(),
      distanceMeters: typeof w.totalDistance === 'number' ? w.totalDistance : undefined,
      caloriesKcal: typeof w.totalEnergyBurned === 'number' ? w.totalEnergyBurned : undefined,
      // route by sme vedeli dočítať zvlášť (getWorkoutRoute), necháme na neskôr
    }));
  } else {
    // Health Connect
    const sessions = await readRecords('ExerciseSession', {
      timeRangeFilter: { operator: 'between', startTime: fromISO, endTime: toISO },
    });

    return sessions.records.map((r: any) => ({
      id: r.metadata?.id ?? `${r.startTime}-${r.endTime}`,
      start: r.startTime,
      end: r.endTime,
      type: String(r.exerciseType ?? 'other').toLowerCase(), // napr. RUNNING, CYCLING...
      distanceMeters: r?.distance?.inMeters,
      caloriesKcal: r?.energy?.inKilocalories,
      // GPS stream Health Connect štandardne nevracia – stačí summary
    }));
  }
}
