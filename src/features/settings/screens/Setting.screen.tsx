// screens/Settings.screen.tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  Chip,
  DataTable,
  Icon,
} from 'react-native-paper';
import {
  getSettings,
  upsertMonthlyTarget,
  type Settings,
} from '@/features/settings/storage';
import { requestHealthPermissions } from '@/features/health/permissions';
import { syncHealth } from '@/features/health/sync';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/features/settings/components/LanguageSwticher';

// ⬇️ nové: špecifikácia povolených cieľov
import { GOAL_KEYS, goalIcon, goalLabel, type GoalKey } from '@/shared/lib/goals';

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { backgroundColor: '#fff', marginTop: 8 },
});

// imports bežia ako v tvojej poslednej verzii (GOAL_KEYS, goalIcon, goalLabel, GoalKey, ...)

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);           // Health sync
  const [savingGoal, setSavingGoal] = React.useState(false); // 👈 nový guard na ukladanie cieľa
  const [settings, setSettings] = React.useState<Settings>({ monthlyTargets: {} });
  const [selected, setSelected] = React.useState<GoalKey>('Kondice:Silovy');
  const [target, setTarget] = React.useState<string>('');

  const load = React.useCallback(async () => {
    setSettings(await getSettings());
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const addOrUpdate = async () => {
    if (savingGoal) return;                  // 👈 dvojklik guard
    const v = Number((target ?? '').trim().replace(',', '.'));
    const clean = Number.isFinite(v) && v > 0 ? v : null;

    // rátaj iba ciele z GOAL_KEYS
    const activeCount = Object.entries(settings.monthlyTargets ?? {})
      .filter(([k, val]) => GOAL_KEYS.includes(k as GoalKey) && typeof val === 'number' && (val as number) > 0).length;

    const exists = (settings.monthlyTargets ?? {}).hasOwnProperty(selected);
    if (!exists && clean && activeCount >= 5) {
      alert(t('goals.max5', { defaultValue: 'Maximálne 4 aktívne ciele.' }));
      return;
    }

    setSavingGoal(true);
    try {
      // 1) zapíš do storage
      await upsertMonthlyTarget(selected, clean);

      // 2) optimisticky uprav lokálny stav (bez ďalšieho getSettings)
      setSettings(prev => {
        const next = { ...(prev?.monthlyTargets ?? {}) };
        if (clean == null) delete next[selected];
        else next[selected] = clean;
        return { ...prev, monthlyTargets: next };
      });

      setTarget('');
    } catch (e) {
      console.error(e);
      alert(t('common.error', { defaultValue: 'Ukladanie zlyhalo.' }));
    } finally {
      setSavingGoal(false);
    }
  };

  const removeTarget = async (k: GoalKey) => {
    if (savingGoal) return;
    setSavingGoal(true);
    try {
      await upsertMonthlyTarget(k, null);
      // optimisticky odstraň lokálne
      setSettings(prev => {
        const next = { ...(prev?.monthlyTargets ?? {}) };
        delete next[k];
        return { ...prev, monthlyTargets: next };
      });
    } catch (e) {
      console.error(e);
      alert(t('common.error', { defaultValue: 'Mazanie zlyhalo.' }));
    } finally {
      setSavingGoal(false);
    }
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
          <Title>{t('goals.header', { defaultValue: 'Mesačné ciele' })}</Title>
          <Paragraph style={{ opacity: 0.7 }}>
            {t('goals.limitNote', { defaultValue: 'Max. 5 aktívne ciele' })}
          </Paragraph>

          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GOAL_KEYS.map((key) => (
                <Chip
                  key={key}
                  selected={selected === key}
                  onPress={() => !savingGoal && setSelected(key)}
                  disabled={savingGoal}                         // 👈 blokni počas save
                >
                  <Icon source={goalIcon(key)} size={16} /> {goalLabel(key, t)}
                </Chip>
              ))}
            </View>

            <TextInput
              label={t('goals.monthlyTarget', { defaultValue: 'Cieľ (počet tréningov za mesiac)' })}
              value={target}
              onChangeText={setTarget}
              keyboardType="numeric"
              style={styles.input}
              editable={!savingGoal}                            // 👈
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
              <Button onPress={() => setTarget('')} disabled={savingGoal}>
                {t('common.cancel', { defaultValue: 'Zrušiť' })}
              </Button>
              <Button mode="contained" onPress={addOrUpdate} loading={savingGoal} disabled={savingGoal}>
                {t('common.save', { defaultValue: 'Uložiť' })}
              </Button>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>{t('goals.active', { defaultValue: 'Aktívne ciele' })}</Title>
          {Object.keys(settings.monthlyTargets ?? {})
            .filter((k) => GOAL_KEYS.includes(k as any)).length === 0 ? (
            <Paragraph>{t('goals.none', { defaultValue: 'Žiadne ciele.' })}</Paragraph>
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>{t('common.type', { defaultValue: 'Typ' })}</DataTable.Title>
                <DataTable.Title numeric>{t('goals.target', { defaultValue: 'Cieľ' })}</DataTable.Title>
              </DataTable.Header>
              {Object.entries(settings.monthlyTargets)
                .filter(([k]) => GOAL_KEYS.includes(k as any))
                .map(([k, v]) => (
                  <DataTable.Row key={k}>
                    <DataTable.Cell>
                      <Icon source={goalIcon(k as any)} size={16} /> {goalLabel(k as any, t)}
                    </DataTable.Cell>
                    <DataTable.Cell numeric>{v as number}</DataTable.Cell>
                    <DataTable.Cell>
                      <Button onPress={() => removeTarget(k as any)} textColor="crimson" disabled={savingGoal}>
                        {t('common.delete', { defaultValue: 'Zmazať' })}
                      </Button>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
            </DataTable>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Content>
          <Title>Health integrácia</Title>
          <Paragraph>
            Pripoj Apple Health (iOS) alebo Health Connect (Android) a importuj svoje aktivity zo hodiniek.
          </Paragraph>
          <Button mode="contained" onPress={connect} disabled={busy} style={{ marginTop: 8 }}>
            Povoliť prístup
          </Button>
          <Button onPress={syncNow} loading={busy} disabled={busy} style={{ marginTop: 8 }}>
            Synchronizovať teraz
          </Button>
        </Card.Content>
      </Card>

      <LanguageSwitcher />
    </ScrollView>
  );
}
