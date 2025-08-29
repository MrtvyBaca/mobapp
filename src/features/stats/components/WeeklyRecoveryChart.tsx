import React from 'react';
import { useTheme, Text } from 'react-native-paper';
import type { TrainingRecord } from '@/shared/lib/training';
import { toWeekStart, minutesByCategory } from '../lib/aggregators';

// input: záznamy za viac týždňov + map { dateKey: recovery(0-100) }
type Props = {
  records: TrainingRecord[];
  recoveryByDay: Record<string, number | undefined>; // kľúč 'YYYY-MM-DD'
};

export default function WeeklyRecoveryChart({ records, recoveryByDay }: Props) {
  const theme = useTheme();

  // agregácia po týždňoch
  const buckets = new Map<string, { byCat: Record<string, number>, recoveryAvg: number | null }>();

  // 1) tréningy
  for (const r of records) {
    const d = new Date(r.date);
    const wk = toWeekStart(d);
    const entry = buckets.get(wk) || { byCat: {}, recoveryAvg: null };
    const byCat = minutesByCategory([r]);
    for (const [cat, mins] of Object.entries(byCat)) {
      entry.byCat[cat] = (entry.byCat[cat] || 0) + mins;
    }
    buckets.set(wk, entry);
  }

  // 2) recovery priemer za týždeň
  for (const [wk, entry] of buckets) {
    // zober 7 dní od wk a spočítaj priemer
    const start = new Date(wk);
    const vals: number[] = [];
    for (let i=0;i<7;i++) {
      const d = new Date(start); d.setDate(start.getDate()+i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const v = recoveryByDay[key];
      if (typeof v === 'number') vals.push(v);
    }
    entry.recoveryAvg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : null;
  }

  // zoradené týždne
  const weeks = Array.from(buckets.keys()).sort();

  // unikátne kategórie
  const cats = Array.from(new Set(
    Array.from(buckets.values()).flatMap(b => Object.keys(b.byCat))
  ));

  // data pre bars
  const series = cats.map(cat => weeks.map((wk, idx) => ({
    x: wk.slice(5), // MM-DD
    y: buckets.get(wk)!.byCat[cat] || 0,
    label: `${cat}: ${buckets.get(wk)!.byCat[cat] || 0} min`,
  })));

  // data pre recovery line (0..100)
  const lineData = weeks.map(wk => ({
    x: wk.slice(5),
    y: (buckets.get(wk)!.recoveryAvg ?? 0),
  }));

  return (
    <>
      <Text variant="titleMedium">Týždňový súhrn: minúty podľa kategórie + priemerné recovery</Text>
        x={12}
        orientation="horizontal"
        gutter={16}
        data={cats.map(c => ({ name: c }))}

    </>
  );
}
