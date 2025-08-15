// screens/Settings.screen.tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, TextInput, Button, SegmentedButtons, Chip, DataTable } from 'react-native-paper';
import { getSettings, saveSettings, upsertMonthlyTarget, type Settings } from '@/features/settings/storage';
import type { TrainingType } from '@/shared/lib/training';
import { TYPE_ICON } from '@/shared/lib/training';
import { requestHealthPermissions } from '@/features/health/permissions';
import { syncHealth } from '@/features/health/sync';

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { backgroundColor: '#fff', marginTop: 8 },
});

const TRAINING_TYPES: TrainingType[] = [
  'Silový','Beh','Bicykel','Chôdza','Plávanie','Veslo','Eliptický','Švihadlo','AirBike','SkiErg','Turistika','Korčule','Bežky','Mobilita','Učebná',
];

export default function SettingsScreen() {
  const [busy, setBusy] = React.useState(false);
  const [settings, setSettings] = React.useState<Settings>({ monthlyTargets: {} });
  const [selected, setSelected] = React.useState<TrainingType>('Silový');
  const [target, setTarget] = React.useState<string>('');

  const load = React.useCallback(async () => {
    setSettings(await getSettings());
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const addOrUpdate = async () => {
    const v = Number(target);
    await upsertMonthlyTarget(selected, Number.isFinite(v) && v > 0 ? v : null);
    setTarget('');
    await load();
  };

  const removeTarget = async (t: TrainingType) => {
    await upsertMonthlyTarget(t, null);
    await load();
  };
const connect = async () => {
    const ok = await requestHealthPermissions();
    alert(ok ? 'Health pripojené ✅' : 'Nepodarilo sa získať povolenia.');
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      const n = await syncHealth({ days: 14 });
      alert(`Import hotový. Nových tréningov: ${n}`);
    } catch (e) {
      console.error(e);
      alert('Synchronizácia zlyhala.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Mesačné kvóty</Title>
          <Paragraph>Nastav si, koľko tréningov z každého typu chceš mesačne splniť.</Paragraph>

          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TRAINING_TYPES.map(tt => (
                <Chip key={tt} selected={selected === tt} onPress={() => setSelected(tt)}>
                  {TYPE_ICON[tt]} {tt}
                </Chip>
              ))}
            </View>

            <TextInput
              label="Cieľ (počet tréningov za mesiac)"
              value={target}
              onChangeText={setTarget}
              keyboardType="numeric"
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
              <Button onPress={() => setTarget('')}>Zrušiť</Button>
              <Button mode="contained" onPress={addOrUpdate}>Uložiť cieľ</Button>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Aktívne ciele</Title>
          {Object.keys(settings.monthlyTargets ?? {}).length === 0 ? (
            <Paragraph>Žiadne ciele.</Paragraph>
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Typ</DataTable.Title>
                <DataTable.Title numeric>Cieľ</DataTable.Title>
              </DataTable.Header>
              {Object.entries(settings.monthlyTargets).map(([tt, v]) => (
                <DataTable.Row key={tt}>
                  <DataTable.Cell>{TYPE_ICON[tt as TrainingType]} {tt}</DataTable.Cell>
                  <DataTable.Cell numeric>{v as number}</DataTable.Cell>
                  <DataTable.Cell>
                    <Button onPress={() => removeTarget(tt as TrainingType)} textColor="crimson">Zmazať</Button>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          )}
        </Card.Content>
      </Card>
            <Card><Card.Content>
        <Title>Health integrácia</Title>
        <Paragraph>Pripoj Apple Health (iOS) alebo Health Connect (Android) a importuj svoje aktivity zo hodiniek.</Paragraph>
        <Button mode="contained" onPress={connect} disabled={busy} style={{ marginTop:8 }}>
          Povoliť prístup
        </Button>
        <Button onPress={syncNow} loading={busy} disabled={busy} style={{ marginTop:8 }}>
          Synchronizovať teraz
        </Button>
      </Card.Content></Card>
    </ScrollView>
  );
}
