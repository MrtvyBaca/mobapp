// src/features/settings/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainingType } from '@/shared/lib/training';

export type Settings = {
  monthlyTargets: Partial<Record<TrainingType, number>>; // napr. { Silový: 8, Beh: 6 }
  monthlyMinutesTarget?: number;                         // voliteľne: celkový cieľ min/mesiac
};

const SETTINGS_KEY = 'app_settings_v1';

const DEFAULTS: Settings = {
  monthlyTargets: {},
};

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as Settings;
    return { ...DEFAULTS, ...parsed, monthlyTargets: { ...DEFAULTS.monthlyTargets, ...parsed.monthlyTargets } };
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(next: Settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export async function upsertMonthlyTarget(type: TrainingType, value: number | null) {
  const s = await getSettings();
  const mt = { ...(s.monthlyTargets ?? {}) };
  if (value == null || value <= 0) {
    delete mt[type];
  } else {
    mt[type] = Math.round(value);
  }
  await saveSettings({ ...s, monthlyTargets: mt });
}
