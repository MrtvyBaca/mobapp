// src/features/settings/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainingType } from '@/shared/lib/training';

export type Settings = {
  monthlyTargets: Record<string, number>;
  monthlyMinutesTarget?: number; // voliteľne: celkový cieľ min/mesiac
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
    return {
      ...DEFAULTS,
      ...parsed,
      monthlyTargets: { ...DEFAULTS.monthlyTargets, ...parsed.monthlyTargets },
    };
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(next: Settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export async function upsertMonthlyTarget(key: string, value: number | null): Promise<void> {
  const s = await getSettings();
  const next = { ...(s.monthlyTargets ?? {}) };
  if (value == null) delete next[key];
  else next[key] = value;
  await saveSettings({ ...s, monthlyTargets: next });
}