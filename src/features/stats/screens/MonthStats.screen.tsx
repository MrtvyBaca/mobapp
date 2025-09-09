// -----------------------------------------------------------
// File: src/features/stats/screens/MonthStats.screen.tsx
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, DataTable } from 'react-native-paper';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StatsStackParamList } from '@/navigation/types';
import { type TrainingRecord } from '@/shared/lib/training';
import { getAll } from '@/features/training/storage';
import { inferType, TYPE_ICON, type TrainingType } from '@/shared/lib/training';
import { pad2, toMonthKey } from '@/shared/lib/date';
import dayjs from 'dayjs';
import 'dayjs/locale/cs';
import 'dayjs/locale/sk';
import 'dayjs/locale/en';
import { useTranslation } from 'react-i18next';
import { getAll as getAllReadiness } from '@/features/readiness/storage';
import MonthChart from '@/features/stats/components/MonthChart';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
/* ---------- styles ---------- */
const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  sectionTitle: { marginBottom: 8 },
});

/* ---------- utils used only here ---------- */
const daysInMonth = (year: number, m1to12: number) => new Date(year, m1to12, 0).getDate();
const norm = (s: any) => String(s ?? '').toLowerCase();
function recordText(rec: TrainingRecord, t: TrainingType) {
  const any = rec as any;
  return [
    norm(t), norm(any.type), norm(any.category), norm(any.subtype), norm(any.title),
    norm(any.name), norm(any.activity), norm(any.notes), norm(any.note), norm(any.comment),
  ].join(' ');
}
const rxIce      = /(^(|\W)ice(\W|$))|ľad|led|curl|rink/;
const rxWeight   = /weight|strength|sil(ov|a|y)?|posil|dřep|dre(p|py)|bench|deadlift|ohy(b|b)y|tlak/;
const rxCardio   = /cardio|kardio|beh|běh|run|bike|kolo|cyklo|swim|plav|row|vesl|erg|hiit|tabata/;
const rxMobility = /mobility|mobilit|stretch|streč|joga|jóga|yoga|prehab|rehab/;

type Bucket = {
  key: 'Ice'|'Weight'|'Cardio'|'Mobility';
  title: string;
  match: (rec: TrainingRecord, t: TrainingType) => boolean;
};
// Ciele: koľko tréningov / 7 dní je „100 %“
const TARGET_DAYS: Record<'Cardio'|'Weight'|'Ice'|'Mobility', number> = {
  Cardio: 4,
  Weight: 3,
  Ice:    3,
  Mobility: 6,
};

const pStar   = (x: number) => x / 7;            // cieľový podiel dní
const gainFor = (x: number) => 7 / x;            // škálovanie → 100 % pri p*
const alphaFromHalfLife = (h: number) => 1 - Math.pow(2, -1 / h);

// half-life via „ako často“: h = 7 / X
const EMA_ALPHA: Record<keyof typeof TARGET_DAYS, number> = Object.fromEntries(
  Object.entries(TARGET_DAYS).map(([k, X]) => [k, alphaFromHalfLife(7 / X)])
) as any;

const EMA_GAIN: Record<keyof typeof TARGET_DAYS, number> = Object.fromEntries(
  Object.entries(TARGET_DAYS).map(([k, X]) => [k, gainFor(X)])
) as any;

// Váhy do „Všetko“ (mix typov). Môžeš ponechať 1:1:1:1 alebo doladiť.
const EMA_WEIGHT: Record<Bucket['key'], number> = {
  Cardio: 1,
  Weight: 1,
  Mobility: 1,
  Ice: 1,
};

const BUCKETS: Bucket[] = [
  { key: 'Ice',      title: 'Ice',      match: (rec, t) => rxIce.test(recordText(rec, t)) },
  { key: 'Weight',   title: 'Weight',   match: (rec, t) => rxWeight.test(recordText(rec, t)) || /condition.*weight|weight.*condition/.test(recordText(rec, t)) },
  { key: 'Cardio',   title: 'Cardio',   match: (rec, t) => rxCardio.test(recordText(rec, t)) || /condition.*cardio|cardio.*condition/.test(recordText(rec, t)) },
  { key: 'Mobility', title: 'Mobility', match: (rec, t) => rxMobility.test(recordText(rec, t)) || /condition.*mobility|mobility.*condition/.test(recordText(rec, t)) },
];

function prevMonthKey(month: string) { // "YYYY-MM"
  const [yy, mm] = month.split('-').map(Number);
  const d = new Date(yy, mm - 2, 1);
  const y2 = d.getFullYear();
  const m2 = String(d.getMonth() + 1).padStart(2, '0');
  return `${y2}-${m2}`;
}

function dailyCountsForMonth(
  month: string, N: number, recs: TrainingRecord[],
  predicate: (rec: TrainingRecord, t: TrainingType)=>boolean
) {
  const arr = new Array<number>(N).fill(0);
  for (const r of recs) {
    const t = inferType(r);
    if (!predicate(r, t)) continue;
    const dstr = String(r.date).slice(0,10);
    if (toMonthKey(dstr) === month)  {
      const day = Number(dstr.slice(8,10));
      if (day>=1 && day<=N) arr[day-1] += 1;
    }
  }
  return arr;
}

function dailyCountsPrefixFromPrevMonth(
  month: string, recs: TrainingRecord[],
  predicate: (rec: TrainingRecord, t: TrainingType)=>boolean,
  need: number
) {
  const pm = prevMonthKey(month);
  const [yy, mm] = pm.split('-').map(Number);
  const Nprev = daysInMonth(yy, mm);
  const full = dailyCountsForMonth(pm, Nprev, recs, predicate);
  return full.slice(Math.max(0, Nprev - need));
}

function dailyReadinessForMonth(month: string, N: number, readiness: Array<{date:string; score:number}>) {
  const arr: (number|null)[] = new Array(N).fill(null);
  for (const it of readiness) {
    const dMonth = `${it.date.slice(0,4)}-${it.date.slice(5,7)}`;
    if (dMonth !== month) continue;
    const day = Number(it.date.slice(8,10));
    if (day>=1 && day<=N) arr[day-1] = Math.max(0, Math.min(10, it.score));
  }
  return arr;
}
function dailyReadinessPrefixFromPrevMonth(month: string, readiness: Array<{date:string; score:number}>, need:number) {
  const pm = prevMonthKey(month);
  const [yy, mm] = pm.split('-').map(Number);
  const Nprev = daysInMonth(yy, mm);
  const full = dailyReadinessForMonth(pm, Nprev, readiness);
  return full.slice(Math.max(0, Nprev - need));
}
// 0/1 indikátor: či v daný deň pre daný predicate bol aspoň jeden tréning
function dailyIndicatorForMonth(
  month: string, N: number, recs: TrainingRecord[],
  predicate: (rec: TrainingRecord, t: TrainingType)=>boolean
) {
  const arr = new Array<number>(N).fill(0);
  for (const r of recs) {
    const t = inferType(r);
    if (!predicate(r, t)) continue;
    const dstr = String(r.date).slice(0,10);
    if (toMonthKey(dstr) !== month) continue;
    const day = Number(dstr.slice(8,10));
    if (day>=1 && day<=N) arr[day-1] = 1;
  }
  return arr;
}
const ALL_KEYS = ['Cardio','Weight','Ice','Mobility'] as const;
const allWeights = ALL_KEYS.map(k => TARGET_DAYS[k]); // napr. 4,3,3,6

function combineWeighted(vectors: number[][], weights: number[]) {
  const L = vectors[0]?.length ?? 0, denom = weights.reduce((a,b)=>a+b,0) || 1;
  const out = new Array<number>(L).fill(0);
  for (let i=0;i<L;i++){
    let s=0; for (let j=0;j<vectors.length;j++) s += (vectors[j][i] ?? 0) * (weights[j] ?? 0);
    out[i] = s / denom; // 0..1
  }
  return out;
}



function dailyIndicatorPrefixFromPrevMonth(
  month: string, recs: TrainingRecord[],
  predicate: (rec: TrainingRecord, t: TrainingType)=>boolean,
  need: number // koľko dní prefixu (napr. 7)
) {
  const pm = prevMonthKey(month);
  const [yy, mm] = pm.split('-').map(Number);
  const Nprev = daysInMonth(yy, mm);
  const full = dailyIndicatorForMonth(pm, Nprev, recs, predicate);
  return full.slice(Math.max(0, Nprev - need));
}

// EMA 0..1 nad 0/1 indikátorom; prefix sa pripočíta pred mesiac (warm-up)
function ewma01(curr: number[], alpha: number, prefix: number[] = []) {
  const joined = [...prefix, ...curr];
  const out: number[] = [];
  let s = joined.length ? joined[0] : 0;
  for (let i = 0; i < joined.length; i++) {
    const x = joined[i] ?? 0;
    s = alpha * x + (1 - alpha) * s;
    out.push(s);
  }
  return out.slice(prefix.length);
}


// Trailing priemer 0..1 cez okno `window` s prefixom (window-1 dní)
function trailingMean01(curr: number[], window: number, prefix: number[] = []) {
  const joined = [...prefix, ...curr];
  const out: number[] = [];
  let sum = 0;
  const q: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    const x = joined[i] ?? 0;
    q.push(x); sum += x;
    if (q.length > window) sum -= q.shift()!;
    out.push(sum / Math.min(window, q.length));
  }
  return out.slice(prefix.length);
}

/* ---------- Screen ---------- */
type Props = StackScreenProps<StatsStackParamList, 'MonthStats'>;

export default function MonthStatsScreen({ route }: Props) {
  const { month } = route.params; // "YYYY-MM"
  const { t,i18n } = useTranslation();
  const locale = i18n.language?.startsWith('cs') ? 'cs' : i18n.language?.startsWith('sk') ? 'sk' : 'en';

  const monthTitle = React.useMemo(() => {
    const [yy, mm] = month.split('-').map(Number);
    return dayjs(new Date(yy, mm - 1, 1)).locale(locale).format('MMMM YYYY');
  }, [month, locale]);

  const [records, setRecords] = React.useState<TrainingRecord[]>([]);
  const [ready, setReady] = React.useState<Array<{ date: string; score: number }>>([]);

  React.useEffect(() => {
    (async () => {
      const [list, rdy] = await Promise.all([getAll(), getAllReadiness()]);
      setRecords(list);
      setReady(rdy as any);
    })();
  }, []);

const monthRecs = React.useMemo(
  () => records.filter(r => toMonthKey(String(r.date)) === month),
  [records, month]
);

  // summary
  const totalSessions = monthRecs.length;
  const totalMinutes = monthRecs.reduce((s, r) => s + Number(r.duration || 0), 0);
  const avgMinutes = totalSessions ? Math.round(totalMinutes / totalSessions) : 0;

  // by type
  const byType = React.useMemo(() => {
    const acc = new Map<TrainingType, { sessions: number; minutes: number }>();
    for (const r of monthRecs) {
      const t = inferType(r);
      const curr = acc.get(t) ?? { sessions: 0, minutes: 0 };
      curr.sessions += 1; curr.minutes += Number(r.duration || 0);
      acc.set(t, curr);
    }
    return Array.from(acc.entries()).map(([type, v]) => ({ type, ...v, avg: v.sessions ? Math.round(v.minutes / v.sessions) : 0 }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [monthRecs]);

  // chart data
  const [y, m] = month.split('-').map(Number);
  const N = daysInMonth(y, m);

  const readinessArr  = React.useMemo(() => dailyReadinessForMonth(month, N, ready), [month, N, ready]);
  const readinessPref = React.useMemo(() => dailyReadinessPrefixFromPrevMonth(month, ready, 3), [month, ready]);
// Cardio ratio (EMA 0–1) s warm-up z posledných 7 dní predošlého mesiaca
const cardioIndicator = React.useMemo(
  () => dailyIndicatorForMonth(month, N, monthRecs, BUCKETS.find(b => b.key==='Cardio')!.match),
  [month, N, monthRecs]
);
const cardioIndicatorPref = React.useMemo(
  () => dailyIndicatorPrefixFromPrevMonth(
        month,
        records, // ⬅️ records, nie monthRecs
        BUCKETS.find(b => b.key==='Cardio')!.match,
        7
      ),
  [month, records]
);




// Per-bucket 0/1 indikátory (aktuálny mesiac) + prefixy (posl. 7 dní z predošlého)
const perBucketIndicator = React.useMemo(() => {
  const map = new Map<string, number[]>();
  for (const b of BUCKETS) {
    map.set(b.key, dailyIndicatorForMonth(month, N, monthRecs, b.match));
  }
  return map;
}, [month, N, monthRecs]);

const perBucketIndicatorPrefix = React.useMemo(() => {
  const map = new Map<string, number[]>();
  for (const b of BUCKETS) {
    map.set(b.key, dailyIndicatorPrefixFromPrevMonth(month, records, b.match, 7));
  }
  return map;
}, [month, records]);

// EMA 0..1 pre každý typ s vlastným alpha
// 0/1 indikátory + prefixy už máš (perBucketIndicator, perBucketIndicatorPrefix)

const perBucketEMA = React.useMemo(() => {
  const map = new Map<string, number[]>();
  for (const b of BUCKETS) {
    const x = perBucketIndicator.get(b.key) || new Array(N).fill(0);
    const p = perBucketIndicatorPrefix.get(b.key) || new Array(7).fill(0);
    const alpha = EMA_ALPHA[b.key as keyof typeof TARGET_DAYS];
    const ema = ewma01(x, alpha, p);      // 0..1
    const gain = EMA_GAIN[b.key as keyof typeof TARGET_DAYS];
    map.set(b.key, ema.map(v => Math.max(0, Math.min(1, v * gain)))); // norm → 0..1
  }
  return map;
}, [perBucketIndicator, perBucketIndicatorPrefix, N]);


// Pomocníci na vážené spojenie typov do „Všetko“
function combineWeighted(vectors: number[][], weights: number[]) {
  const L = vectors[0]?.length ?? 0;
  const denom = weights.reduce((a,b)=>a+b,0) || 1;
  const out = new Array<number>(L).fill(0);
  for (let i=0;i<L;i++){
    let s=0;
    for (let j=0;j<vectors.length;j++) s += (vectors[j][i] ?? 0) * (weights[j] ?? 0);
    out[i] = s / denom; // 0..1
  }
  return out;
}

// „Všetko“ ako vážený mix typov → indikátor 0..1 + prefix + EMA s alpha-váženým priemerom
const ALL_KEYS = ['Cardio','Weight','Mobility','Ice'] as const;
const allWeights = ALL_KEYS.map(k => EMA_WEIGHT[k]);
const allNorm = React.useMemo(() => {
  const vs = ALL_KEYS.map(k => perBucketEMA.get(k) || new Array(N).fill(0)); // už normované 0..1
  return combineWeighted(vs, allWeights); // 0..1
}, [perBucketEMA, N]);
const allAlpha = (() => {
  const denom = allWeights.reduce((a,b)=>a+b,0) || 1;
  return ALL_KEYS.reduce((s,k,i)=> s + allWeights[i]*EMA_ALPHA[k], 0) / denom;
})();

const allIndicator = React.useMemo(() => {
  const vs = ALL_KEYS.map(k => perBucketIndicator.get(k) || new Array(N).fill(0));
  return combineWeighted(vs, allWeights);
}, [perBucketIndicator, N]);

const allPrefixIndicator = React.useMemo(() => {
  const ps = ALL_KEYS.map(k => perBucketIndicatorPrefix.get(k) || new Array(7).fill(0));
  return combineWeighted(ps, allWeights);
}, [perBucketIndicatorPrefix]);

const allEMA = React.useMemo(
  () => ewma01(allIndicator, allAlpha, allPrefixIndicator),
  [allIndicator, allAlpha, allPrefixIndicator]
);

// alpha ~ 0.25 zodpovedá ~7-dňovému oknu; uprav podľa pocitu (0.15–0.3)
const cardioEMA = React.useMemo(
  () => ewma01(cardioIndicator, 0.25, cardioIndicatorPref),
  [cardioIndicator, cardioIndicatorPref]
);
// 7-dňový podiel dní s Cardio (0..1)
const cardioRatio7 = React.useMemo(
  () => trailingMean01(cardioIndicator, 7, cardioIndicatorPref),
  [cardioIndicator, cardioIndicatorPref]
);

  const perBucketCounts = React.useMemo(() => {
    const map = new Map<string, number[]>();
    for (const b of BUCKETS) map.set(b.key, dailyCountsForMonth(month, N, monthRecs, b.match));
    return map;
  }, [month, N, monthRecs]);

const perBucketPrefix = React.useMemo(() => {
  const map = new Map<string, (number|null)[]>();
  for (const b of BUCKETS) {
    map.set(
      b.key,
      dailyCountsPrefixFromPrevMonth(month, records, b.match, 7) // ⬅️ records
    );
  }
  return map;
}, [month, records]); // ⬅️ závislosť na records


  const allCounts = React.useMemo(() => dailyCountsForMonth(month, N, monthRecs, () => true), [month, N, monthRecs]);
  const allPrefix = React.useMemo(
  () => dailyCountsPrefixFromPrevMonth(month, records, () => true, 7), // ⬅️ records
  [month, records]                                                     // ⬅️ závislosť
);

const cardioRatioEMA = React.useMemo(
  () => ewma01(cardioIndicator, 0.25, cardioIndicatorPref), // alebo alpha z half-life
  [cardioIndicator, cardioIndicatorPref]
);


return (
  <ScrollView contentContainerStyle={styles.screen}>
    {/* Header */}
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.sectionTitle}>  {t('stats.header.titleMonth', { month: monthTitle })}</Title>
        {totalSessions ? (
          <>
            <Paragraph>{t('stats.table.sessions')} : {totalSessions}</Paragraph>
            <Paragraph>{t('stats.table.minutes')}: {totalMinutes}</Paragraph>
            <Paragraph>{t('stats.table.average')}: {avgMinutes}min</Paragraph>
          </>
        ) : (
          <Paragraph>{t('stats.summary.noDataMonth')}</Paragraph>
        )}
      </Card.Content>
    </Card>

    {/* Per-bucket EMA (0..1) – split */}
   {(['Cardio','Weight','Mobility','Ice'] as const).map(key => {
  const norm = perBucketEMA.get(key) || [];
  if (!norm.some(v => v > 0)) return null;
  const colorMap = { Cardio:'#22c55e', Weight:'#7c3aed', Mobility:'#eab308', Ice:'#3b82f6' } as const;
  const bucketName = t(`stats.bucket.${key}`, { defaultValue: key });
  return (
    <MonthChart
      key={key}
      
      title={t('stats.chart.titleBucket', { bucket: bucketName })}
      counts={norm}                    // už 0..1 (normované na cieľ)
      readiness={readinessArr}
      readinessPrefix={readinessPref}
      showBars={false}
      trainColor={colorMap[key]}
      readyColor="#1f3a93"
      showLeftAxis
      rightAxisMode="ratio"            // % ticky na ľavej spodnej osi
      layout="split"
      monthDays={N}
    />
  );
})}

{/* Combined */}
{allNorm.some(v => v > 0) && (
  <MonthChart
   title={t('stats.chart.titleAll')}
    counts={allNorm}                   // 0..1
    readiness={readinessArr}
    readinessPrefix={readinessPref}
    showBars={false}
    trainColor="#0ea5e9"
    readyColor="#1f3a93"
    showLeftAxis
    rightAxisMode="ratio"
    layout="split"
    monthDays={N}
  />
)}

    {/* Table by type */}
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.sectionTitle}>{t('stats.table.byType')}</Title>
        {byType.length === 0 ? (
          <Paragraph>{t('stats.summary.noDataMonth')}</Paragraph>
        ) : (
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>{t('stats.table.type')}</DataTable.Title>
              <DataTable.Title numeric>{t('stats.table.sessions')}</DataTable.Title>
              <DataTable.Title numeric>{t('stats.table.minutes')}</DataTable.Title>
            </DataTable.Header>
            {byType.map((r) => (
              <DataTable.Row key={r.type}>
                <DataTable.Cell>{TYPE_ICON[r.type]} {t(`enums.type.${r.type}`, { defaultValue: r.type })}</DataTable.Cell>
                <DataTable.Cell numeric>{r.sessions}</DataTable.Cell>
                <DataTable.Cell numeric>{r.minutes}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        )}
      </Card.Content>
    </Card>
  </ScrollView>
);


}
