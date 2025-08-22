// src/features/stats/screens/WeeklyStats.screen.tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, DataTable, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { StatsStackParamList } from '@/navigation/types';
import {
  weekStartKey,
  toDateKey,
  isoWeekInfo,
  startLabelFromWeekKey,
  pad2,
} from '@/shared/lib/date';
import { inferType } from '@/shared/lib/training';

type Props = StackScreenProps<StatsStackParamList, 'WeeklyStats'>;

type TrainingRecord = {
  date: string; // "YYYY-MM-DD"
  duration: number | string; // minúty
  description?: string;
  type?: string;
};

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  sectionTitle: { marginBottom: 8 },
  barWrap: {
    height: 180,
    alignItems: 'flex-end',
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bar: { width: 20, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: '#6c9efc' },
  barX: { fontSize: 11, textAlign: 'center', marginTop: 6, opacity: 0.7 },
  hrBarRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  hrBarLabel: { width: 100, fontSize: 13 },
  hrBarTrack: { flex: 1, height: 10, borderRadius: 6, backgroundColor: '#e5ecfb' },
  hrBarFill: { height: 10, borderRadius: 6, backgroundColor: '#6c9efc' },
});

function normalize(raw: any[]): TrainingRecord[] {
  return (raw ?? [])
    .filter((r) => r && r.date != null && !isNaN(Date.parse(r.date)))
    .map((r) => ({
      date: r.date,
      duration: typeof r.duration === 'string' ? Number(r.duration) : Number(r.duration ?? 0),
      description: r.description,
      type: r.type,
    }))
    .filter((r) => !isNaN(r.duration as number) && (r.duration as number) >= 0);
}

export default function WeeklyStats({ route }: Props) {
  const { weekStart } = route.params; // "YYYY-MM-DD" (pondelok)
  const [records, setRecords] = React.useState<TrainingRecord[]>([]);

  const load = React.useCallback(async () => {
    const json = await AsyncStorage.getItem('treninky');
    setRecords(normalize(json ? JSON.parse(json) : []));
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  // záznamy v danom týždni (Po–Ne)
  const weekRecs = React.useMemo(
    () => records.filter((r) => weekStartKey(r.date) === weekStart),
    [records, weekStart],
  );

  // súhrn
  const totalSessions = weekRecs.length;
  const totalMinutes = weekRecs.reduce((s, r) => s + Number(r.duration || 0), 0);
  const avgMinutes = totalSessions ? Math.round(totalMinutes / totalSessions) : 0;

  // podľa typu
  const byType = weekRecs.reduce<Record<string, { sessions: number; minutes: number }>>(
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
  const maxTypeMin = Math.max(1, ...typeRows.map((r) => r.minutes));

  // denný priebeh v týždni (7 dní od weekStart)
  const start = new Date(weekStart);
  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toDateKey(d);
    const minutes = weekRecs
      .filter((r) => toDateKey(r.date) === key)
      .reduce((s, r) => s + Number(r.duration || 0), 0);
    return { key, label: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`, minutes };
  });
  const maxDaily = Math.max(1, ...daily.map((d) => d.minutes));

  const { week, yy } = React.useMemo(() => {
    const info = isoWeekInfo(weekStart);
    return { week: info.week, yy: info.yy };
  }, [weekStart]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {/* Header týždňa */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>
            Štatistiky týždňa {yy}-W{pad2(week)} ({startLabelFromWeekKey(weekStart)})
          </Title>
          {totalSessions ? (
            <>
              <Paragraph>Tréningov: {totalSessions}</Paragraph>
              <Paragraph>Minút spolu: {totalMinutes}</Paragraph>
              <Paragraph>Priemer na tréning: {avgMinutes} min</Paragraph>
            </>
          ) : (
            <Paragraph>Žiadne dáta pre tento týždeň.</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Podľa typu – tabuľka + mini horizontálne bary */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Podľa typu tréningu</Title>
          {typeRows.length === 0 ? (
            <Paragraph>Žiadne dáta.</Paragraph>
          ) : (
            <>
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

              {/* mini horizontálne grafy */}
              <View style={{ marginTop: 10 }}>
                {typeRows.map((r) => (
                  <View key={`bar-${r.type}`} style={styles.hrBarRow}>
                    <Text style={styles.hrBarLabel}>{r.type}</Text>
                    <View style={styles.hrBarTrack}>
                      <View
                        style={[styles.hrBarFill, { width: `${(r.minutes / maxTypeMin) * 100}%` }]}
                      />
                    </View>
                    <Text style={{ width: 48, textAlign: 'right', marginLeft: 8 }}>
                      {r.minutes}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Denný priebeh (7 stĺpcov) */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Denný priebeh (minúty)</Title>
          {daily.every((d) => d.minutes === 0) ? (
            <Paragraph>Žiadne dáta.</Paragraph>
          ) : (
            <View style={styles.barWrap}>
              {daily.map((d) => (
                <View key={d.key} style={{ alignItems: 'center' }}>
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max(6, Math.round((d.minutes / maxDaily) * 160)) },
                    ]}
                  />
                  <Text style={styles.barX}>{d.label}</Text>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
