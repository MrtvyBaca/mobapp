// src/features/dev/screens/DebugData.screen.tsx
import React from 'react';
import { ScrollView, Text, StyleSheet, Platform, Alert } from 'react-native';
import { Card, Title, Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getAll as getTrainings } from '@/features/training/storage';
import { getAll as getReadiness } from '@/features/readiness/storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ⬇️ nové importy:
import {
  requestPermission,
  insertRecords,
  getGrantedPermissions,
  ExerciseType, // ⬅️ enum s číselnými hodnotami
  type Permission,
} from 'react-native-health-connect';

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
  const [busy, setBusy] = React.useState(false); // ⬅️ disable tlačidlá počas akcií

  const reload = React.useCallback(async () => {
    setTrainings(await getTrainings());
    setReadiness(await getReadiness());
  }, []);

  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));
  React.useEffect(() => { reload(); }, [reload]);

  const exportData = React.useCallback(async () => {
    const trainingsData = await getTrainings();
    const readinessData = await getReadiness();
    const blob = JSON.stringify({ trainings: trainingsData, readiness: readinessData }, null, 2);
    const uri = `${FileSystem.documentDirectory}export-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(uri, blob, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri);
  }, []);

  // ⬇️ helper: požiada len o potrebné WRITE povolenia
  const ensureWritePerms = React.useCallback(async () => {
    if (Platform.OS !== 'android') return false;

    const required: Permission[] = [
      { accessType: 'write', recordType: 'ExerciseSession' },
      { accessType: 'write', recordType: 'Steps' },
    ];
    const granted = await getGrantedPermissions();
    const isGranted = (p: Permission) =>
      granted.some(g => g.accessType === p.accessType && g.recordType === p.recordType);

    const missing = required.filter(p => !isGranted(p));
    if (missing.length === 0) return true;

    await requestPermission(missing);
    return true;
  }, []);

  // ⬇️ vloží 30-min “beh” + ~1000 krokov do HC
const insertDummyHCData = React.useCallback(async () => {
  if (Platform.OS !== 'android') {
    Alert.alert('Debug', 'Health Connect je len na Androide.');
    return;
  }
  setBusy(true);
  try {
    const ok = await ensureWritePerms();
    if (!ok) throw new Error('Chýbajú povolenia pre zápis do Health Connect.');

    const end = new Date(); // teraz
    const start = new Date(end.getTime() - 30 * 60 * 1000); // 30 min dozadu
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const RUNNING =
      (ExerciseType as any)?.running ??
      (ExerciseType as any)?.RUNNING ??
      8;

    // ⬇️ tu si definuj stepsCount
    const stepsCount = 1000;

    // 1) ExerciseSession
    await insertRecords([
      {
        recordType: 'ExerciseSession',
        startTime: startISO,
        endTime: endISO,
        exerciseType: RUNNING,
        title: 'Test run',
      },
    ]);

    // 2) Steps
    await insertRecords([
      {
        recordType: 'Steps',
        startTime: startISO,
        endTime: endISO,
        count: stepsCount,
      },
    ]);

    Alert.alert(
      'Debug',
      `Vložené demo dáta do Health Connect:\n- ExerciseSession (running)\n- Steps: ${stepsCount}`
    );
  } catch (e: any) {
    console.log('[Debug] insertDummyHCData error:', e);
    Alert.alert('Debug', e?.message ?? 'Zápis demo dát zlyhal.');
  } finally {
    setBusy(false);
  }
}, [ensureWritePerms]);

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

      <Button onPress={reload} style={{ marginTop: 8 }} disabled={busy}>Obnoviť</Button>
      <Button mode="contained" onPress={exportData} style={{ marginTop: 8 }} disabled={busy}>
        Export JSON
      </Button>

      {/* ⬇️ nové tlačidlo */}
      <Button mode="contained" onPress={insertDummyHCData} style={{ marginTop: 8 }} disabled={busy}>
        Vložiť demo dáta do Health Connect
      </Button>
    </ScrollView>
  );
}
