// screens/StatistikyScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Card, Title, Paragraph, DataTable, Text, TouchableRipple,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { StatsStackParamList } from '@/navigation/types';
import { inferType, TYPE_ICON } from '@/shared/lib/training';
import { getAll } from '@/features/training/storage';
import type { TrainingRecord } from '@/shared/lib/training';
import { toMonthKey } from '@/shared/lib/date';
import { useTranslation } from 'react-i18next';    

type Nav = StackNavigationProp<StatsStackParamList>;

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  sectionTitle: { marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moreLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

// --- Helpers: lokálne (nie UTC) parsovanie YYYY-MM-DD a získanie roku ---
function fromYmdLocal(key: string) {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0); // poludnie (DST-safe)
}
function getYearLocal(key: string) {
  return fromYmdLocal(key).getFullYear();
}

export default function StatistikyScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();  
  const [records, setRecords] = React.useState<TrainingRecord[]>([]);

  const load = React.useCallback(async () => {
    const list = await getAll();
    setRecords(list);
  }, []);
  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const now = new Date();
  const currentYear = String(now.getFullYear());

  // Jednorazová agregácia: byYear, byMonth
  const agg = React.useMemo(() => {
    const byYear = new Map<string, { sessions: number; minutes: number }>();
    const byMonth = new Map<string, { sessions: number; minutes: number }>();

    for (const r of records) {
      const y = String(getYearLocal(r.date as unknown as string));
      const m = toMonthKey(r.date as unknown as string);
      const dur = Number(r.duration || 0);

      const Y = byYear.get(y) ?? { sessions: 0, minutes: 0 };
      Y.sessions += 1; Y.minutes += dur; byYear.set(y, Y);

      const M = byMonth.get(m) ?? { sessions: 0, minutes: 0 };
      M.sessions += 1; M.minutes += dur; byMonth.set(m, M);
    }
    return { byYear, byMonth };
  }, [records]);

  // dostupné roky/mesiace (zoradené desc)
  const years = React.useMemo(() => {
    const arr = Array.from(agg.byYear.keys()).sort().reverse();
    if (arr.length === 0) arr.push(currentYear);
    return arr;
  }, [agg.byYear, currentYear]);

  const months = React.useMemo(() => {
    return Array.from(agg.byMonth.keys()).sort().reverse();
  }, [agg.byMonth]);

  // dáta za aktuálny rok
  const currentYearTotals = agg.byYear.get(currentYear) ?? { sessions: 0, minutes: 0 };
  const inYear = React.useMemo(
    () => records.filter(r => String(getYearLocal(r.date as unknown as string)) === currentYear),
    [records, currentYear]
  );

  // rozpad podľa typu v rámci aktuálneho roku
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

  const nf = React.useMemo(() => new Intl.NumberFormat(), []);

return (
    <ScrollView contentContainerStyle={styles.screen}>
      {/* Celkový súhrn – aktuálny rok */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Title style={styles.sectionTitle}>
              {t('stats.home.yearSummaryTitle', { year: currentYear })}
            </Title>

            <TouchableRipple
              onPress={() => navigation.navigate('YearStats', { year: currentYear })}
              borderless
              style={{ borderRadius: 8, padding: 4 }}
            >
              <Text style={{ color: '#007AFF' }}>{t('common.detail', { defaultValue: 'Detail' })}</Text>
            </TouchableRipple>
          </View>

          {currentYearTotals.sessions ? (
            <>
              <Paragraph>
                {t('stats.summary.trainings')}: {nf.format(currentYearTotals.sessions)}
              </Paragraph>
              <Paragraph>
                {t('stats.summary.minutesTotal')}: {nf.format(currentYearTotals.minutes)}
              </Paragraph>

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
            <Paragraph>{t('stats.home.noDataYear', { year: currentYear })}</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Prehľad posledných rokov */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>{t('stats.home.yearsOverview')}</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>{t('stats.table.year')}</DataTable.Title>
              <DataTable.Title numeric>{t('stats.table.sessions')}</DataTable.Title>
              <DataTable.Title numeric>{t('stats.table.minutes')}</DataTable.Title>
              <DataTable.Title numeric> </DataTable.Title>
            </DataTable.Header>

            {years.map((y) => {
              const yAgg = agg.byYear.get(y) ?? { sessions: 0, minutes: 0 };
              return (
                <DataTable.Row
                  key={y}
                  onPress={() => navigation.navigate('YearStats', { year: y })}
                >
                  <DataTable.Cell><Text>{y}</Text></DataTable.Cell>
                  <DataTable.Cell numeric>{nf.format(yAgg.sessions)}</DataTable.Cell>
                  <DataTable.Cell numeric>{nf.format(yAgg.minutes)}</DataTable.Cell>
                  <DataTable.Cell style={{ justifyContent: 'flex-end' }}>
                    <Text style={{ color: '#007AFF' }}>{t('common.detail', { defaultValue: 'Detail' })}</Text>
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable>
        </Card.Content>
      </Card>

      {/* Prehľad posledných mesiacov */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>{t('stats.home.monthsOverview')}</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>{t('stats.table.month')}</DataTable.Title>
              <DataTable.Title numeric>{t('stats.table.sessions')}</DataTable.Title>
              <DataTable.Title numeric>{t('stats.table.minutes')}</DataTable.Title>
              <DataTable.Title numeric> </DataTable.Title>
            </DataTable.Header>

            {months.slice(0, 6).map((m) => {
              const mAgg = agg.byMonth.get(m) ?? { sessions: 0, minutes: 0 };
              return (
                <DataTable.Row
                  key={m}
                  onPress={() => navigation.navigate('MonthStats', { month: m })}
                >
                  <DataTable.Cell><Text>{m}</Text></DataTable.Cell>
                  <DataTable.Cell numeric>{nf.format(mAgg.sessions)}</DataTable.Cell>
                  <DataTable.Cell numeric>{nf.format(mAgg.minutes)}</DataTable.Cell>
                  <DataTable.Cell style={{ justifyContent: 'flex-end' }}>
                    <Text style={{ color: '#007AFF' }}>{t('common.detail', { defaultValue: 'Detail' })}</Text>
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
