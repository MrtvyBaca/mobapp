// screens/MonthStats.screen.tsx
import React from 'react';
import { ScrollView, View, StyleSheet, Dimensions } from 'react-native';
import { Card, Title, Paragraph, DataTable, Text, Button, ProgressBar } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';

import type { StatsStackParamList } from '@/navigation/types';
import { type TrainingRecord } from '@/shared/lib/training';
import { getAll } from '@/features/training/storage';
import { inferType, TYPE_ICON, type TrainingType } from '@/shared/lib/training';
import { pad2, toMonthKey } from '@/shared/lib/date';
import { getSettings, type Settings } from '@/features/settings/storage';

type Props = StackScreenProps<StatsStackParamList, 'MonthStats'>;

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  sectionTitle: { marginBottom: 8 },
  barWrap: { height: 180, alignItems: 'flex-end', paddingVertical: 8, flexDirection: 'row' },
  barCol: { alignItems: 'center' },
  bar: { width: 12, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: '#6c9efc' },
  barX: { fontSize: 10, textAlign: 'center', marginTop: 6, opacity: 0.7 },
  hrRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 },
  hrLabel: { width: 120 },
});

const daysInMonth = (year: number, m1to12: number) => new Date(year, m1to12, 0).getDate();

export default function MonthStatsScreen({ route }: Props) {
  const nav = useNavigation();
  const { month } = route.params; // "YYYY-MM"

  const [records, setRecords] = React.useState<TrainingRecord[]>([]);
  const [settings, setSettings] = React.useState<Settings | null>(null);

  const load = React.useCallback(async () => {
    const [list, s] = await Promise.all([getAll(), getSettings()]);
    setRecords(list);
    setSettings(s);
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  // filter pre mesiac
  const monthRecs = React.useMemo(
    () => records.filter((r) => toMonthKey(r.date) === month),
    [records, month],
  );

  // súhrn
  const totalSessions = monthRecs.length;
  const totalMinutes = monthRecs.reduce((s, r) => s + Number(r.duration || 0), 0);
  const avgMinutes = totalSessions ? Math.round(totalMinutes / totalSessions) : 0;

  // podľa typu
  const byType = React.useMemo(() => {
    const acc = new Map<TrainingType, { sessions: number; minutes: number }>();
    for (const r of monthRecs) {
      const t = inferType(r);
      const curr = acc.get(t) ?? { sessions: 0, minutes: 0 };
      curr.sessions += 1;
      curr.minutes += Number(r.duration || 0);
      acc.set(t, curr);
    }
    return Array.from(acc.entries())
      .map(([type, v]) => ({
        type,
        ...v,
        avg: v.sessions ? Math.round(v.minutes / v.sessions) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [monthRecs]);

  // denný priebeh (1..N)
  const [y, m] = month.split('-').map(Number);
  const N = daysInMonth(y, m);
  const daily = React.useMemo(() => {
    const arr = Array.from({ length: N }, (_, i) => i + 1).map((dayNum) => {
      const key = `${month}-${pad2(dayNum)}`;
      const minutes = monthRecs
        .filter((r) => r.date.startsWith(key))
        .reduce((s, r) => s + Number(r.duration || 0), 0);
      return { dayNum, key, minutes };
    });
    return arr;
  }, [monthRecs, N, month]);

  const maxDaily = Math.max(1, ...daily.map((d) => d.minutes));
  const barWidth = 12;
  const barGap = 6;
  const chartWidth = daily.length * (barWidth + barGap) + 16;
  const minChartWidth = Math.max(chartWidth, Dimensions.get('window').width - 32);

  // Ciele z nastavení – splnenie podľa počtu tréningov daného typu
  const targetRows = React.useMemo(() => {
    const targets = Object.entries(settings?.monthlyTargets ?? {}) as Array<[TrainingType, number]>;
    if (!targets.length) return [];
    const counts: Record<TrainingType, number> = {} as any;
    for (const r of monthRecs) {
      const t = inferType(r);
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return targets.map(([type, target]) => {
      const done = counts[type] ?? 0;
      const progress = Math.max(0, Math.min(1, target ? done / target : 0));
      return { type, target, done, progress };
    });
  }, [settings, monthRecs]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {/* Header mesiaca */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Štatistiky za {month}</Title>
          {totalSessions ? (
            <>
              <Paragraph>Tréningov: {totalSessions}</Paragraph>
              <Paragraph>Minút spolu: {totalMinutes}</Paragraph>
              <Paragraph>Priemer na tréning: {avgMinutes} min</Paragraph>
            </>
          ) : (
            <Paragraph>Žiadne dáta pre tento mesiac.</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Mesačné ciele (nastavenia) */}
      <Card style={styles.card}>
        <Card.Content>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Title style={styles.sectionTitle}>Mesačné ciele</Title>
            {/* ak máš route 'Settings', zapni tlačidlo */}
            {/* @ts-ignore */}
            <Button compact onPress={() => (nav as any).navigate?.('Settings')}>
              Nastaviť
            </Button>
          </View>

          {!targetRows.length ? (
            <Paragraph>Žiadne ciele. Otvor „Nastaviť“ a pridaj kvóty na typ tréningu.</Paragraph>
          ) : (
            targetRows.map((r) => (
              <View key={r.type} style={{ marginBottom: 10 }}>
                <Text>
                  {TYPE_ICON[r.type]} {r.type} — {r.done}/{r.target}
                </Text>
                <ProgressBar progress={r.progress} />
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Podľa typu – tabuľka */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Podľa typu tréningu</Title>
          {byType.length === 0 ? (
            <Paragraph>Žiadne dáta.</Paragraph>
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Typ</DataTable.Title>
                <DataTable.Title numeric>Tréningov</DataTable.Title>
                <DataTable.Title numeric>Minút</DataTable.Title>
                <DataTable.Title numeric>Priemer</DataTable.Title>
              </DataTable.Header>
              {byType.map((r) => (
                <DataTable.Row key={r.type}>
                  <DataTable.Cell>
                    {TYPE_ICON[r.type]} {r.type}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>{r.sessions}</DataTable.Cell>
                  <DataTable.Cell numeric>{r.minutes}</DataTable.Cell>
                  <DataTable.Cell numeric>{r.avg}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          )}
        </Card.Content>
      </Card>

      {/* Denný priebeh (spoľahlivý horizontálny bar chart) */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Denný priebeh (minúty)</Title>
          {daily.every((d) => d.minutes === 0) ? (
            <Paragraph>Žiadne dáta.</Paragraph>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={[styles.barWrap, { width: minChartWidth }]}>
                {daily.map((d, i) => (
                  <View key={d.key} style={[styles.barCol, { width: barWidth + barGap }]}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(6, Math.round((d.minutes / maxDaily) * 160)),
                          width: barWidth,
                        },
                      ]}
                    />
                    {i % 5 === 0 || i === daily.length - 1 ? (
                      <Text style={styles.barX}>{pad2(d.dayNum)}</Text>
                    ) : (
                      <View style={{ height: 16 }} />
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
