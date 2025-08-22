// screens/StatistikyScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, DataTable, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { StatsStackParamList } from '@/navigation/types';

import { getAll } from '@/features/training/storage';
import type { TrainingRecord } from '@/shared/lib/training';
import { inferType } from '@/shared/lib/training';
import {
  pad2,
  toMonthKey,
  toDateKey,
  mondayOf,
  weekStartKey,
  isoWeekInfo,
  startLabelFromWeekKey,
} from '@/shared/lib/date';
import { getRangeInclusive } from '@/features/readiness/storage';
type Mode = 'month' | 'week';
type Nav = StackNavigationProp<StatsStackParamList>;

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  sectionTitle: { marginBottom: 8 },
  tableCard: { borderRadius: 12, elevation: 3, overflow: 'hidden' },
});

export default function StatistikyScreen() {
  const navigation = useNavigation<Nav>();
  const [mode, setMode] = React.useState<Mode>('month');
  const [records, setRecords] = React.useState<TrainingRecord[]>([]);
  const [avgReadiness, setAvgReadiness] = React.useState<{ avg: number; n: number } | null>(null);
  // načítanie záznamov zo storage (v2) – pripravené na neskorší backend
  const load = React.useCallback(async () => {
    const list = await getAll();
    setRecords(list);
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const today = new Date();
  const currentMonthKey = toMonthKey(today);
  const currentWeekKey = weekStartKey(today);

  // záznamy v aktuálnom mesiaci/týždni
  const inCurrent = records.filter((r) =>
    mode === 'month'
      ? toMonthKey(r.date) === currentMonthKey
      : weekStartKey(r.date) === currentWeekKey,
  );

  const totalSessions = inCurrent.length;
  const totalMinutes = inCurrent.reduce((s, r) => s + Number(r.duration || 0), 0);

  // rozbitie podľa typu (široké kategórie) – používa spoločné inferType
  const byType = inCurrent.reduce<Record<string, { sessions: number; minutes: number }>>(
    (acc, r) => {
      const t = inferType(r);
      if (!acc[t]) acc[t] = { sessions: 0, minutes: 0 };
      acc[t].sessions += 1;
      acc[t].minutes += Number(r.duration || 0);
      return acc;
    },
    {},
  );
  const typeRows = Object.entries(byType)
    .sort((a, b) => b[1].minutes - a[1].minutes)
    .map(([type, v]) => ({ type, ...v, avg: v.sessions ? Math.round(v.minutes / v.sessions) : 0 }));
  const loadReadiness = React.useCallback(async () => {
    const today = new Date();
    if (mode === 'month') {
      const key = toMonthKey(today); // YYYY-MM
      const start = `${key}-01`;
      const end = `${key}-31`;
      const list = await getRangeInclusive(start, end);
      const n = list.length;
      const avg = n ? Math.round((list.reduce((s, e) => s + e.score, 0) / n) * 10) / 10 : 0;
      setAvgReadiness({ avg, n });
    } else {
      const start = weekStartKey(today); // pondelok
      const endDate = new Date(mondayOf(today));
      endDate.setDate(endDate.getDate() + 6);
      const end = toDateKey(endDate);
      const list = await getRangeInclusive(start, end);
      const n = list.length;
      const avg = n ? Math.round((list.reduce((s, e) => s + e.score, 0) / n) * 10) / 10 : 0;
      setAvgReadiness({ avg, n });
    }
  }, [mode]);
  useFocusEffect(
    React.useCallback(() => {
      load();
      loadReadiness();
    }, [load, loadReadiness]),
  );
  // ---- Posledné obdobia (kľúče) ----
  const recentPeriods = React.useMemo(() => {
    if (mode === 'month') {
      const keys: string[] = [];
      const dt = new Date(today);
      for (let i = 0; i < 6; i++) {
        keys.push(`${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`);
        dt.setMonth(dt.getMonth() - 1);
      }
      return keys.map((k) => {
        const subset = records.filter((r) => toMonthKey(r.date) === k);
        const sessions = subset.length;
        const minutes = subset.reduce((s, r) => s + Number(r.duration || 0), 0);
        return { key: k, sessions, minutes, avg: sessions ? Math.round(minutes / sessions) : 0 };
      });
    } else {
      const keys: string[] = [];
      let monday = mondayOf(today);
      for (let i = 0; i < 8; i++) {
        keys.push(toDateKey(monday)); // YYYY-MM-DD (pondelok)
        monday = new Date(monday);
        monday.setDate(monday.getDate() - 7);
      }
      return keys.map((k) => {
        const subset = records.filter((r) => weekStartKey(r.date) === k);
        const sessions = subset.length;
        const minutes = subset.reduce((s, r) => s + Number(r.duration || 0), 0);
        return { key: k, sessions, minutes, avg: sessions ? Math.round(minutes / sessions) : 0 };
      });
    }
  }, [mode, records]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {/* Výber obdobia */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Výber obdobia</Title>
          <SegmentedButtons
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
            buttons={[
              { value: 'month', label: 'Mesačne' },
              { value: 'week', label: 'Týždenne' },
            ]}
          />
        </Card.Content>
      </Card>

      {/* Súhrn */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Readiness (priemer)</Title>
          {avgReadiness?.n ? (
            <Paragraph>
              {avgReadiness.avg} / 10 • záznamov: {avgReadiness.n}
            </Paragraph>
          ) : (
            <Paragraph>Žiadne dáta pre toto obdobie.</Paragraph>
          )}
        </Card.Content>
      </Card>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>
            {mode === 'month'
              ? `Súhrn (${currentMonthKey})`
              : (() => {
                  const { week, year } = isoWeekInfo(currentWeekKey);
                  const yy = String(year).slice(-2);
                  const startLabel = startLabelFromWeekKey(currentWeekKey);
                  return `Súhrn (${yy}-W${pad2(week)} (${startLabel}))`;
                })()}
          </Title>
          {totalSessions ? (
            <>
              <Paragraph>Tréningov: {totalSessions}</Paragraph>
              <Paragraph>Minút spolu: {totalMinutes}</Paragraph>
              <Paragraph>
                Priemer na tréning: {Math.round(totalMinutes / totalSessions)} min
              </Paragraph>
            </>
          ) : (
            <Paragraph>Žiadne dáta v tomto období.</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Podľa typu */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Podľa typu tréningu</Title>
          {typeRows.length === 0 ? (
            <Paragraph>Žiadne dáta.</Paragraph>
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Typ</DataTable.Title>
                <DataTable.Title numeric>Tréningov</DataTable.Title>
                <DataTable.Title numeric>Minút</DataTable.Title>
                <DataTable.Title numeric>Priemer</DataTable.Title>
              </DataTable.Header>
              {typeRows.map((r) => (
                <DataTable.Row key={r.type}>
                  <DataTable.Cell>{r.type}</DataTable.Cell>
                  <DataTable.Cell numeric>{r.sessions}</DataTable.Cell>
                  <DataTable.Cell numeric>{r.minutes}</DataTable.Cell>
                  <DataTable.Cell numeric>{r.avg}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          )}
        </Card.Content>
      </Card>

      {/* Prehľad posledných období – klikateľné riadky */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>
            Prehľad {mode === 'month' ? 'posledných mesiacov' : 'posledných týždňov'}
          </Title>
          {recentPeriods.length === 0 ? (
            <Paragraph>Žiadne dáta.</Paragraph>
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>{mode === 'month' ? 'Mesiac' : 'Týždeň'}</DataTable.Title>
                <DataTable.Title numeric>Tréningov</DataTable.Title>
                <DataTable.Title numeric>Minút</DataTable.Title>
                <DataTable.Title numeric>Priemer</DataTable.Title>
              </DataTable.Header>
              {recentPeriods.map((p) => (
                <DataTable.Row
                  key={p.key}
                  onPress={() =>
                    mode === 'month'
                      ? navigation.navigate('MonthStats', { month: p.key })
                      : navigation.navigate('WeeklyStats', { weekStart: p.key })
                  }
                >
                  <DataTable.Cell>
                    {mode === 'month'
                      ? p.key
                      : (() => {
                          const { week, year } = isoWeekInfo(p.key);
                          const yy = String(year).slice(-2);
                          const startLabel = startLabelFromWeekKey(p.key);
                          return `${yy}-W${pad2(week)} (${startLabel})`;
                        })()}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>{p.sessions}</DataTable.Cell>
                  <DataTable.Cell numeric>{p.minutes}</DataTable.Cell>
                  <DataTable.Cell numeric>{p.avg}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
