import type { TrainingRecord } from '@/shared/lib/training';

export type DayKey = string; // 'YYYY-MM-DD'

export function groupBy<T, K extends string | number>(
  arr: T[],
  key: (x: T) => K
): Record<K, T[]> {
  return arr.reduce((acc, cur) => {
    const k = key(cur);
    (acc[k] ||= []).push(cur);
    return acc;
  }, {} as Record<K, T[]>);
}

export function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
}

export function toWeekStart(d: Date) {
  const tmp = new Date(d);
  const wd = (tmp.getDay() + 6) % 7; // Po=0 ... Ne=6
  tmp.setDate(tmp.getDate() - wd);
  return `${tmp.getFullYear()}-${String(tmp.getMonth()+1).padStart(2,'0')}-${String(tmp.getDate()).padStart(2,'0')}`;
}

export function sumMinutes(items: TrainingRecord[]) {
  return items.reduce((s, r) => s + (Number(r.duration)||0), 0);
}

export function minutesByCategory(items: TrainingRecord[]) {
  return items.reduce<Record<string, number>>((acc, r) => {
    const k = r.category ?? 'Jine';
    acc[k] = (acc[k]||0) + (Number(r.duration)||0);
    return acc;
  }, {});
}
