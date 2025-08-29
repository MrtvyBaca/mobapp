// screens/StatistikyScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Title, Paragraph, DataTable, Chip, Icon, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { StatsStackParamList } from '@/navigation/types';

import { getAll } from '@/features/training/storage';
import type { TrainingRecord } from '@/shared/lib/training';
import { inferType } from '@/shared/lib/training';
import { toMonthKey } from '@/shared/lib/date';

type Nav = StackNavigationProp<StatsStackParamList>;

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  sectionTitle: { marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

export default function StatistikyScreen() {
  const navigation = useNavigation<Nav>();
  const [records, setRecords] = React.useState<TrainingRecord[]>([]);

  const load = React.useCallback(async () => {
    const list = await getAll();
    setRecords(list);
  }, []);
  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const now = new Date();
  const currentYear = String(now.getFullYear());

  // dostupné roky/mesiace
  const years = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of records) s.add(String(new Date(r.date).getFullYear()));
    const arr = Array.from(s).sort().reverse();
    if (arr.length === 0) arr.push(currentYear);
    return arr;
  }, [records, currentYear]);

  const months = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of records) s.add(toMonthKey(r.date)); // YYYY-MM
    return Array.from(s).sort().reverse();
  }, [records]);

  // dáta za aktuálny rok
  const inYear = React.useMemo(
    () => records.filter(r => String(new Date(r.date).getFullYear()) === currentYear),
    [records, currentYear]
  );

  // Celkový súhrn podľa typu (bez priemeru)
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

  const totalSessions = inYear.length;
  const totalMinutes = inYear.reduce((s, r) => s + Number(r.duration || 0), 0);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {/* Celkový súhrn – aktuálny rok + preklik na YearStats */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Title style={styles.sectionTitle}>Celkový súhrn — {currentYear}</Title>
            </View>

            {/* „Zobraziť rok“ – ikonka/link na YearStats */}
            <View style={styles.linkRow}>
              <Text variant="labelLarge" onPress={() => navigation.navigate('YearStats', { year: currentYear })}>
                Detail roka
              </Text>
              <Icon
                source="chevron-right"
                size={20}
                color="#9aa4b2"
                // klikateľná oblasť – stačí aj na texte vyššie
              />
            </View>
          </View>

          {totalSessions ? (
            <>
              <Paragraph>Tréningov spolu: {totalSessions}</Paragraph>
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
            <Paragraph>Žiadne dáta v roku {currentYear}.</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Prehľad posledných rokov (klik na YearStats) */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Prehľad posledných rokov</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Rok</DataTable.Title>
              <DataTable.Title numeric>Tréningov</DataTable.Title>
              <DataTable.Title numeric>Minút</DataTable.Title>
            </DataTable.Header>

            {years.map((y) => {
              const subset = records.filter(r => String(new Date(r.date).getFullYear()) === y);
              const sessions = subset.length;
              const minutes = subset.reduce((s, r) => s + Number(r.duration || 0), 0);

              return (
                <DataTable.Row
                  key={y}
                  onPress={() => navigation.navigate('YearStats', { year: y })}
                >
                  <DataTable.Cell>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text>{y}</Text>
                      <View style={{ marginLeft: 6 }}>
                        <Icon source="chevron-right" size={18} color="#9aa4b2" />
                      </View>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>{sessions}</DataTable.Cell>
                  <DataTable.Cell numeric>{minutes}</DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable>
        </Card.Content>
      </Card>

      {/* Prehľad posledných mesiacov (klik na MonthStats) */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Prehľad posledných mesiacov</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Mesiac</DataTable.Title>
              <DataTable.Title numeric>Tréningov</DataTable.Title>
              <DataTable.Title numeric>Minút</DataTable.Title>
            </DataTable.Header>

            {months.map((m) => {
              const subset = records.filter(r => toMonthKey(r.date) === m);
              const sessions = subset.length;
              const minutes = subset.reduce((s, r) => s + Number(r.duration || 0), 0);

              return (
                <DataTable.Row
                  key={m}
                  onPress={() => navigation.navigate('MonthStats', { month: m })}
                >
                  <DataTable.Cell>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text>{m}</Text>
                      <View style={{ marginLeft: 6 }}>
                        <Icon source="chevron-right" size={18} color="#9aa4b2" />
                      </View>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>{sessions}</DataTable.Cell>
                  <DataTable.Cell numeric>{minutes}</DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
