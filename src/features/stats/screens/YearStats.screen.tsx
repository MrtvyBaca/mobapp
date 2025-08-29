// src/features/stats/screens/YearStats.screen.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Title, Paragraph, DataTable, Icon, Text, useTheme } from 'react-native-paper';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StatsStackParamList } from '@/navigation/types';
import { useNavigation } from '@react-navigation/native';

import { getAll } from '@/features/training/storage';
import type { TrainingRecord } from '@/shared/lib/training';
import { inferType } from '@/shared/lib/training';
import { pad2, toMonthKey } from '@/shared/lib/date';
import { CartesianChart, Line } from 'victory-native';

type Props = StackScreenProps<StatsStackParamList, 'YearStats'>;

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  sectionTitle: { marginBottom: 8 },
});

const SMOOTH_WINDOW_DAYS = 21; // jemné vyhladzovanie (zmeň na 14/28 podľa chuti)

// Pomocné
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

export default function YearStatsScreen({ route }: Props) {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const year = route.params.year;

  const [records, setRecords] = React.useState<TrainingRecord[]>([]);
  React.useEffect(() => {
    (async () => {
      const all = await getAll();
      setRecords(all);
    })();
  }, []);

  // záznamy v danom roku
  const inYear = React.useMemo(
    () => records.filter(r => String(new Date(r.date).getFullYear()) === year),
    [records, year]
  );

  // agregácia podľa typu
  const byType = inYear.reduce<Record<string, { sessions: number; minutes: number }>>(
    (acc, r) => {
      const t = inferType(r);
      if (!acc[t]) acc[t] = { sessions: 0, minutes: 0 };
      acc[t].sessions += 1;
      acc[t].minutes += Number(r.duration || 0);
      return acc;
    },
    {}
  );
  const typeRows = Object.entries(byType)
    .sort((a, b) => b[1].minutes - a[1].minutes)
    .map(([type, v]) => ({ type, ...v }));

  // mesiace (Jan–Dec)
  const monthRows = React.useMemo(() => {
    const rows: { key: string; sessions: number; minutes: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${pad2(m)}`; // YYYY-MM
      const subset = inYear.filter(r => toMonthKey(r.date) === key);
      const sessions = subset.length;
      const minutes = subset.reduce((s, r) => s + Number(r.duration || 0), 0);
      rows.push({ key, sessions, minutes });
    }
    return rows;
  }, [inYear, year]);

  const totalSessions = inYear.length;
  const totalMinutes = inYear.reduce((s, r) => s + Number(r.duration || 0), 0);

  // --- Jemný trend: denná séria + 21-dňový kĺzavý priemer ---
  const trendData = React.useMemo(() => {
    const calendar = daysOfYear(year); // všetky dni roka
    const countsByDate = new Map<string, number>();
    for (const r of inYear) {
      const key = toISO(new Date(r.date));
      countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
    }
    const dailyCounts = calendar.map(d => countsByDate.get(d) || 0);
    const smoothed = movingAverage(dailyCounts, SMOOTH_WINDOW_DAYS);

    // x = index dňa (1..N), y = vyhladený počet tréningov
    return calendar.map((_, i) => ({ t: i + 1, trend: smoothed[i] }));
  }, [inYear, year]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {/* Súhrn roka */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Súhrn roka {year}</Title>
          {totalSessions ? (
            <>
              <Paragraph>Tréningov: {totalSessions}</Paragraph>
              <Paragraph>Minút spolu: {totalMinutes}</Paragraph>

              {typeRows.length === 0 ? (
                <Paragraph style={{ marginTop: 8 }}>Žiadne dáta podľa typu.</Paragraph>
              ) : (
                <DataTable style={{ marginTop: 8 }}>
                  <DataTable.Header>
                    <DataTable.Title>Typ</DataTable.Title>
                    <DataTable.Title numeric>Tréningov</DataTable.Title>
                    <DataTable.Title numeric>Minút</DataTable.Title>
                  </DataTable.Header>
                  {typeRows.map((r) => (
                    <DataTable.Row key={r.type}>
                      <DataTable.Cell>{r.type}</DataTable.Cell>
                      <DataTable.Cell numeric>{r.sessions}</DataTable.Cell>
                      <DataTable.Cell numeric>{r.minutes}</DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              )}
            </>
          ) : (
            <Paragraph>Žiadne dáta v tomto roku.</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Jemný trend tréningov (denný 21-dňový priemer) */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Trend tréningov (jemný 21-dňový priemer)</Text>
          <View style={{ height: 240 }}>
            {trendData.length ? (
              <CartesianChart data={trendData} xKey="t" yKeys={['trend']}>
                {({ points }) => <Line points={points.trend} strokeWidth={2} />}
              </CartesianChart>
            ) : (
              <Text>Žiadne dáta pre rok {year}.</Text>
            )}
          </View>
          <Text style={{ marginTop: 8, opacity: 0.7 }}>
            Čiara ukazuje plynulý trend (čím väčšie okno, tým jemnejší).
          </Text>
        </Card.Content>
      </Card>

      {/* Mesiace v roku */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Mesiace {year}</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Mesiac</DataTable.Title>
              <DataTable.Title numeric>Tréningov</DataTable.Title>
              <DataTable.Title numeric>Minút</DataTable.Title>
            </DataTable.Header>
            {monthRows.map((m) => (
              <DataTable.Row
                key={m.key}
                onPress={() => navigation.navigate('MonthStats', { month: m.key })}
              >
                <DataTable.Cell>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text>{m.key}</Text>
                    <View style={{ marginLeft: 6 }}>
                      <Icon source="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
                    </View>
                  </View>
                </DataTable.Cell>
                <DataTable.Cell numeric>{m.sessions}</DataTable.Cell>
                <DataTable.Cell numeric>{m.minutes}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
