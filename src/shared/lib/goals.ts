// src/shared/lib/goals.ts
import type { TrainingRecord } from '@/shared/lib/training';

export type GoalKey =
  | 'Led:Individuál'
  | 'Led:Tímový'
  | 'Kondice:Silovy'
  | 'Kondice:Kardio'
  | 'Kondice:Mobilita';

export const GOAL_KEYS: GoalKey[] = [
  'Led:Individuál',
  'Led:Tímový',
  'Kondice:Silovy',
  'Kondice:Kardio',
  'Kondice:Mobilita',
];

export function goalKeyFromRecord(rec: TrainingRecord): GoalKey | null {
  if (rec.category === 'Led') {
    if (rec.subtype === 'Individuál') return 'Led:Individuál';
    if (rec.subtype === 'Tímový') return 'Led:Tímový';
    return null; // iné Ice podtypy nerátame do cieľov
  }
  if (rec.category === 'Kondice') {
    if (rec.group === 'Silovy') return 'Kondice:Silovy';
    if (rec.group === 'Kardio') return 'Kondice:Kardio';
    if (rec.group === 'Mobilita') return 'Kondice:Mobilita';
  }
  return null;
}

export function goalLabel(key: GoalKey, t: (k: string, o?: any) => string): string {
  switch (key) {
    case 'Led:Individuál':
      return `${t('screens.addTraining.ice', { defaultValue: 'Ice' })} • ${t('screens.addTraining.individual', { defaultValue: 'Individuál' })}`;
    case 'Led:Tímový':
      return `${t('screens.addTraining.ice', { defaultValue: 'Ice' })} • ${t('screens.addTraining.team', { defaultValue: 'Tímový' })}`;
    case 'Kondice:Silovy':
      return `${t('screens.addTraining.condition', { defaultValue: 'Kondice' })} • ${t('screens.addTraining.weight', { defaultValue: 'Silový' })}`;
    case 'Kondice:Kardio':
      return `${t('screens.addTraining.condition', { defaultValue: 'Kondice' })} • ${t('screens.addTraining.cardio', { defaultValue: 'Kardio' })}`;
    case 'Kondice:Mobilita':
      return `${t('screens.addTraining.condition', { defaultValue: 'Kondice' })} • ${t('screens.addTraining.mobility', { defaultValue: 'Mobilita' })}`;
  }
}

export function goalIcon(key: GoalKey): string {
  switch (key) {
    case 'Led:Individuál':
    case 'Led:Tímový':
      return 'curling';           // 🥌 MaterialCommunityIcons
    case 'Kondice:Silovy':
      return 'dumbbell';
    case 'Kondice:Kardio':
      return 'run';
    case 'Kondice:Mobilita':
      return 'meditation';
  }
}
