// src/features/stats/screens/YearStats.screen.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Title, Paragraph, DataTable, Icon, Text, useTheme } from 'react-native-paper';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StatsStackParamList } from '@/navigation/types';
import { useNavigation } from '@react-navigation/native';

import { getAll } from '@/features/training/storage';
import { getAll as getAllReadiness } from '@/features/readiness/storage';
import type { TrainingRecord } from '@/shared/lib/training';
import { inferType, TYPE_ICON, type TrainingType } from '@/shared/lib/training';
import { pad2, toMonthKey } from '@/shared/lib/date';
import { CartesianChart, Line } from 'victory-native';
import MonthChart from '@/features/stats/components/MonthChart';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/cs';
import 'dayjs/locale/sk';
import 'dayjs/locale/en';

type Props = StackScreenProps<StatsStackParamList, 'YearStats'>;

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  sectionTitle: { marginBottom: 8 },
});

const SMOOTH_WINDOW_DAYS = 21;

/* ----------------------- Helpers: kalendár + MA ----------------------- */
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function daysOfYear(year: string): string[] {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(toISO(d));
  return out;
}
function movingAverage(values: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const s = Math.max(0, i - half);
    const e = Math.min(values.length - 1, i + half);
    let sum = 0;
    for (let j = s; j <= e; j++) sum += values[j];
    return sum / (e - s + 1);
  });
}

/* ----------------------- Helpers: ročné série ------------------------- */
// 0/1 indikátor v daný deň podľa predicate
function dailyIndicatorForYear(
  year: string,
  calendar: string[], // YYYY-MM-DD pre každý deň v roku
  recs: TrainingRecord[],
  predicate: (rec: TrainingRecord, t: TrainingType) => boolean
) {
  const index = new Map(calendar.map((d, i) => [d, i]));
  const arr = new Array<number>(calendar.length).fill(0);
  for (const r of recs) {
    const dstr = toISO(new Date(r.date as any));
    if (!dstr.startsWith(year)) continue;
    const t = inferType(r);
    if (!predicate(r, t)) continue;
    const i = index.get(dstr);
    if (i != null) arr[i] = 1;
  }
  return arr;
}

// Prefix: posledných `need` dní predošlého roka (0/1 indikátor)
function indicatorPrefixBeforeYear(
  year: string,
  need: number,
  recs: TrainingRecord[],
  predicate: (rec: TrainingRecord, t: TrainingType) => boolean
) {
  const prev = String(Number(year) - 1);
  const calPrev = daysOfYear(prev);
  const last = calPrev.slice(-need);
  const set = new Set(last);
  const arr = new Array<number>(last.length).fill(0);

  for (const r of recs) {
    const dstr = toISO(new Date(r.date as any));
    if (!set.has(dstr)) continue;
    const t = inferType(r);
    if (!predicate(r, t)) continue;
    const idx = last.indexOf(dstr);
    if (idx >= 0) arr[idx] = 1;
  }
  return arr;
}

// Readiness: 0..10 alebo null, pre daný rok
function dailyReadinessForYear(
  year: string,
  calendar: string[],
  readiness: Array<{ date: string; score: number }>
) {
  const index = new Map(calendar.map((d, i) => [d, i]));
  const out: (number | null)[] = new Array(calendar.length).fill(null);
  for (const it of readiness) {
    if (!String(it.date).startsWith(year)) continue;
    const i = index.get(it.date.slice(0, 10));
    if (i != null) out[i] = Math.max(0, Math.min(10, it.score));
  }
  return out;
}
function readinessPrefixBeforeYear(
  year: string,
  need: number,
  readiness: Array<{ date: string; score: number }>
) {
  const prev = String(Number(year) - 1);
  const calPrev = daysOfYear(prev);
  const last = calPrev.slice(-need);
  const index = new Map(last.map((d, i) => [d, i]));
  const out: (number | null)[] = new Array(last.length).fill(null);
  for (const it of readiness) {
    const d = it.date.slice(0, 10);
    const i = index.get(d);
    if (i != null) out[i] = Math.max(0, Math.min(10, it.score));
  }
  return out;
}

/* ------------------------ EMA + normalizácia -------------------------- */
// Klasická per-sample EMA nad 0/1; vracia pole [0..1]
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
// half-life → alpha (komfortný spôsob ladenia „ako rýchlo zabúdať“)
const alphaFromHalfLife = (hlDays: number) => 1 - Math.pow(2, -1 / Math.max(1, hlDays));

/* -------------------------- Buckets (match) --------------------------- */
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

type BucketKey = 'Cardio'|'Weight'|'Mobility'|'Ice';
const BUCKETS: Array<{
  key: BucketKey;
  color: string;
  titleKey: string; // i18n key pre titulok grafu
  match: (rec: TrainingRecord, t: TrainingType) => boolean;
  // cieľová frekvencia (k/7) → 100 %
  targetPer7: number;
  // half-life na EMA (dni)
  hl: number;
}> = [
  { key: 'Cardio',   color: '#22c55e', titleKey: 'stats.year.charts.cardioVsReady',   match: (r,t)=> rxCardio.test(recordText(r,t))   || /condition.*cardio|cardio.*condition/.test(recordText(r,t)), targetPer7: 4/7, hl: 5 },
  { key: 'Weight',   color: '#7c3aed', titleKey: 'stats.year.charts.weightVsReady',   match: (r,t)=> rxWeight.test(recordText(r,t))   || /condition.*weight|weight.*condition/.test(recordText(r,t)), targetPer7: 3/7, hl: 7 },
  { key: 'Mobility', color: '#eab308', titleKey: 'stats.year.charts.mobilityVsReady', match: (r,t)=> rxMobility.test(recordText(r,t)) || /condition.*mobility|mobility.*condition/.test(recordText(r,t)), targetPer7: 6/7, hl: 4 },
  { key: 'Ice',      color: '#3b82f6', titleKey: 'stats.year.charts.iceVsReady',      match: (r,t)=> rxIce.test(recordText(r,t)),                                              targetPer7: 3/7, hl: 7 },
];

export default function YearStatsScreen({ route }: Props) {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('cs') ? 'cs' : i18n.language?.startsWith('sk') ? 'sk' : 'en';
  const year = route.params.year;
  const nf = React.useMemo(() => new Intl.NumberFormat(), []);

  const [records, setRecords] = React.useState<TrainingRecord[]>([]);
  const [ready, setReady] = React.useState<Array<{ date: string; score: number }>>([]);

  React.useEffect(() => {
    (async () => {
      const [all, rdy] = await Promise.all([getAll(), getAllReadiness()]);
      setRecords(all);
      setReady(rdy as any);
    })();
  }, []);

  /* -------------------------- agregácie (tabuľky) -------------------------- */
  const inYear = React.useMemo(
    () => records.filter(r => String(new Date(r.date).getFullYear()) === year),
    [records, year]
  );

  const byType = inYear.reduce<Record<string, { sessions: number; minutes: number }>>(
    (acc, r) => {
      const tpe = inferType(r);
      if (!acc[tpe]) acc[tpe] = { sessions: 0, minutes: 0 };
      acc[tpe].sessions += 1;
      acc[tpe].minutes += Number(r.duration || 0);
      return acc;
    },
    {}
  );
  const typeRows = Object.entries(byType)
    .sort((a, b) => b[1].minutes - a[1].minutes)
    .map(([type, v]) => ({ type, ...v }));

  const monthRows = React.useMemo(() => {
    const rows: { key: string; sessions: number; minutes: number; label: string }[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${pad2(m)}`;
      const subset = inYear.filter(r => toMonthKey(r.date) === key);
      const sessions = subset.length;
      const minutes = subset.reduce((s, r) => s + Number(r.duration || 0), 0);
      const label = dayjs(`${key}-01`).locale(locale).format('MMM YYYY');
      rows.push({ key, sessions, minutes, label });
    }
    return rows;
  }, [inYear, year, locale]);

  const totalSessions = inYear.length;
  const totalMinutes = inYear.reduce((s, r) => s + Number(r.duration || 0), 0);

  /* -------------------------- jemný ročný trend ---------------------------- */
  const trendData = React.useMemo(() => {
    const calendar = daysOfYear(year);
    const countsByDate = new Map<string, number>();
    for (const r of inYear) {
      const key = toISO(new Date(r.date));
      countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
    }
    const dailyCounts = calendar.map(d => countsByDate.get(d) || 0);
    const smoothed = movingAverage(dailyCounts, SMOOTH_WINDOW_DAYS);
    return calendar.map((_, i) => ({ t: i + 1, trend: smoothed[i] }));
  }, [inYear, year]);

  /* --------------------------- ročné grafy vs readiness -------------------- */
  const calendar = React.useMemo(() => daysOfYear(year), [year]);
  const N = calendar.length;

  // readiness (rok) + prefix (3 dni z konca minulého roka)
  const readinessArr  = React.useMemo(() => dailyReadinessForYear(year, calendar, ready), [year, calendar, ready]);
  const readinessPref = React.useMemo(() => readinessPrefixBeforeYear(year, 3, ready), [year, ready]);

  // Pre každý bucket: 0/1 indikátor → EMA → normalizácia na % podľa targetPer7
  const perBucketRatio = React.useMemo(() => {
    const map = new Map<BucketKey, number[]>();
    for (const b of BUCKETS) {
      const indicator = dailyIndicatorForYear(year, calendar, records, b.match);
      const prefix    = indicatorPrefixBeforeYear(year, 7, records, b.match);
      const alpha     = alphaFromHalfLife(b.hl);
      const ema       = ewma01(indicator, alpha, prefix); // 0..1
      const ratio     = ema.map(v => Math.min(1, v / b.targetPer7)); // škálovanie na 100 %
      map.set(b.key, ratio);
    }
    return map;
  }, [year, calendar, records]);

  // "All vs Readiness" – priemer normalizovaných pomerov naprieč bucketmi (0..1)
  const allRatio = React.useMemo(() => {
    const arr: number[] = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      let s = 0, c = 0;
      for (const b of BUCKETS) {
        const v = perBucketRatio.get(b.key)?.[i];
        if (v != null) { s += v; c++; }
      }
      arr[i] = c ? s / c : 0;
    }
    return arr;
  }, [perBucketRatio, N]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {/* Súhrn roka */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={[styles.sectionTitle, { textAlign: 'center' }]}>
            {t('stats.year.summaryTitle', { year })}
          </Title>

          {totalSessions ? (
            <>
              <Paragraph>{t('stats.summary.trainings')}: {nf.format(totalSessions)}</Paragraph>
              <Paragraph>{t('stats.summary.minutesTotal')}: {nf.format(totalMinutes)}</Paragraph>

              {typeRows.length === 0 ? (
                <Paragraph style={{ marginTop: 8 }}>
                  {t('stats.home.noDataByType')}
                </Paragraph>
              ) : (
                <DataTable style={{ marginTop: 8 }}>
                  <DataTable.Header>
                    <DataTable.Title>{t('stats.table.type')}</DataTable.Title>
                    <DataTable.Title numeric>{t('stats.table.sessions')}</DataTable.Title>
                    <DataTable.Title numeric>{t('stats.table.minutes')}</DataTable.Title>
                  </DataTable.Header>
                  {typeRows.map((r) => (
                    <DataTable.Row key={r.type}>
                      <DataTable.Cell>
                        {TYPE_ICON[r.type as keyof typeof TYPE_ICON]}{' '}
                        {t(`enums.type.${r.type}`, { defaultValue: r.type })}
                      </DataTable.Cell>
                      <DataTable.Cell numeric>{nf.format(r.sessions)}</DataTable.Cell>
                      <DataTable.Cell numeric>{nf.format(r.minutes)}</DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              )}
            </>
          ) : (
            <Paragraph>{t('stats.year.noDataYear', { year })}</Paragraph>
          )}
        </Card.Content>
      </Card>
      {/* ---- Ročné „vs Readiness“ grafy (split, % os) ---- */}
      {BUCKETS.map(b => {
        const series = perBucketRatio.get(b.key) || [];
        if (!series.some(v => v > 0)) return null;
        return (
          <MonthChart
            key={b.key}
            title={t(b.titleKey)}
            counts={series}                 // 0..1 (už normalizované na cieľ)
            readiness={readinessArr}        // 0..10
            readinessPrefix={readinessPref}
            showBars={false}
            trainColor={b.color}
            readyColor="#1f3a93"
            showLeftAxis
            rightAxisMode="ratio"           // 0..100 % ticky
            layout="split"                  // horný readiness, spodný tréningy
            monthDays={N}
            height={280}
          />
        );
      })}

      {/* „All vs Readiness“ – priemer bucketov */}
      {allRatio.some(v => v > 0) && (
        <MonthChart
          title={t('stats.year.charts.allVsReady')}
          counts={allRatio}               // 0..1 (priemer naprieč bucketmi)
          readiness={readinessArr}
          readinessPrefix={readinessPref}
          showBars={false}
          trainColor="#0ea5e9"
          readyColor="#1f3a93"
          showLeftAxis
          rightAxisMode="ratio"
          layout="split"
          monthDays={N}
          height={280}
        />
      )}

      {/* Mesiace v roku */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>{t('stats.year.monthsTitle', { year })}</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>{t('stats.table.month')}</DataTable.Title>
              <DataTable.Title numeric>{t('stats.table.sessions')}</DataTable.Title>
              <DataTable.Title numeric>{t('stats.table.minutes')}</DataTable.Title>
              <DataTable.Title numeric> </DataTable.Title>
            </DataTable.Header>

            {monthRows.map((m) => (
              <DataTable.Row
                key={m.key}
                onPress={() => navigation.navigate('MonthStats', { month: m.key })}
              >
                <DataTable.Cell>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text>{m.label}</Text>
                    <View style={{ marginLeft: 6 }}>
                      <Icon source="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
                    </View>
                  </View>
                </DataTable.Cell>
                <DataTable.Cell numeric>{nf.format(m.sessions)}</DataTable.Cell>
                <DataTable.Cell numeric>{nf.format(m.minutes)}</DataTable.Cell>
                <DataTable.Cell numeric> </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
