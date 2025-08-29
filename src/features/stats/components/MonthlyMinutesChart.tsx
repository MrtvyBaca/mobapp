import React from 'react';

import type { TrainingRecord } from '@/shared/lib/training';

type Props = {
  monthKey: string; // 'YYYY-MM'
  records: TrainingRecord[]; // len pre daný mesiac
  recoveryByDay: Record<string, number | undefined>;
};

export default function MonthlyMinutesChart({ monthKey, records, recoveryByDay }: Props) {
  const byDay = new Map<string, number>();
  for (const r of records) {
    const dkey = r.date; // YYYY-MM-DD
    byDay.set(dkey, (byDay.get(dkey)||0) + (Number(r.duration)||0));
  }

  const days = Array.from(byDay.keys()).sort();

  const bars = days.map(d => ({
    x: d.slice(8), // DD
    y: byDay.get(d)!,
    label: `${d}: ${byDay.get(d)} min`,
  }));

  const line = days.map(d => ({
    x: d.slice(8),
    y: recoveryByDay[d] ?? 0,
  }));

  return (
    <>

    </>
  );
}
