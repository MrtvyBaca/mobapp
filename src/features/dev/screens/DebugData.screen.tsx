// src/features/dev/screens/DebugData.screen.tsx
import React from 'react';
import { ScrollView, Text, StyleSheet, Platform } from 'react-native';
import { Card, Title, Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getAll as getTrainings } from '@/features/training/storage';
import { getAll as getReadiness } from '@/features/readiness/storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const s = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
  },
});

export default function DebugDataScreen() {
  const [trainings, setTrainings] = React.useState<any[]>([]);
  const [readiness, setReadiness] = React.useState<any[]>([]);

  const reload = React.useCallback(async () => {
    setTrainings(await getTrainings());
    setReadiness(await getReadiness());
  }, []);

  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  const exportData = React.useCallback(async () => {
    const trainingsData = await getTrainings();
    const readinessData = await getReadiness();
    const blob = JSON.stringify({ trainings: trainingsData, readiness: readinessData }, null, 2);
    const uri = `${FileSystem.documentDirectory}export-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(uri, blob, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri);
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Card>
        <Card.Content>
          <Title>Trainings</Title>
          <Text selectable style={s.mono}>{JSON.stringify(trainings, null, 2)}</Text>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content>
          <Title>Readiness</Title>
          <Text selectable style={s.mono}>{JSON.stringify(readiness, null, 2)}</Text>
        </Card.Content>
      </Card>

      <Button onPress={reload} style={{ marginTop: 8 }}>Obnoviť</Button>
      <Button mode="contained" onPress={exportData} style={{ marginTop: 8 }}>
        Export JSON
      </Button>
    </ScrollView>
  );
}
