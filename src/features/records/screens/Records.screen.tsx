// src/features/records/screens/Records.screen.tsx
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import type { RecordsStackParamList } from '@/navigation/types';
import type { TrainingRecord, TrainingDraft } from '@/shared/lib/training';
import { toMonthKey } from '@/shared/lib/date';
import { getAll, add } from '@/features/training/storage';

type Nav = StackNavigationProp<RecordsStackParamList, 'Records'>;

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f3f6fa' },
  card: { marginBottom: 16, borderRadius: 12, elevation: 3 },
});

export default function ZaznamyScreen() {
  const navigation = useNavigation<Nav>();
  const [records, setRecords] = React.useState<TrainingRecord[]>([]);

  // načítanie cez storage (pripravené na neskorší backend)
  const load = React.useCallback(async () => {
    const list = await getAll();         // ✅ už je to pole objektov
    setRecords(list);
  }, []);

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  // zoskupenie podľa mesiaca + sort novšie → staršie
  const groups = React.useMemo(() => {
    const map = new Map<string, TrainingRecord[]>();
    for (const r of records) {
      const key = toMonthKey(r.date);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0])); // '2025-08' pred '2025-07'
  }, [records]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={{ marginBottom: 16 }}>Prehľad mesiacov</Title>

      {groups.length === 0 ? (
        <Paragraph>Žiadne záznamy.</Paragraph>
      ) : (
        groups.map(([month, list]) => {
          const minutes = list.reduce((s, r) => s + Number(r.duration || 0), 0);
          return (
            <Card
              key={month}
              style={styles.card}
              onPress={() => navigation.navigate('RecordsMonth', { month })}
            >
              <Card.Content>
                <Title>{month}</Title>
                <Paragraph>
                  {list.length} tréningov • {minutes} min
                </Paragraph>
              </Card.Content>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}
