// src/features/goals/screens/MonthlyGoalsEdit.screen.tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  Chip,
  DataTable,
  Icon,
  Text,
  ProgressBar,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import {
  getSettings,
  upsertMonthlyTarget,
  type Settings,
} from '@/features/settings/storage';

import {
  GOAL_KEYS,
  goalIcon,
  goalLabel,
  type GoalKey,
  goalKeyFromRecord,
} from '@/shared/lib/goals';

import type { TrainingRecord } from '@/shared/lib/training';
import { getAll } from '@/features/training/storage';

type GoalsMap = Partial<Record<GoalKey, number>>;

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  input: { backgroundColor: '#fff', marginTop: 8 },
  cellRightCol: { alignItems: 'flex-end' },
  targetTxt: { fontSize: 12, opacity: 0.7 },
  leftTxt: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  pb: { height: 6, borderRadius: 4, marginTop: 6, width: 'auto' }, // prípadne 100–140 podľa vkusu
});

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`; // 'YYYY-MM'
}

export default function MonthlyGoalsEditScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();

  const [settings, setSettings] = React.useState<Settings>({ monthlyTargets: {} });
  const [selected, setSelected] = React.useState<GoalKey>(GOAL_KEYS[0]);
  const [target, setTarget] = React.useState<string>('');
  const [savingGoal, setSavingGoal] = React.useState(false);

  // počty splnených za aktuálny mesiac
  const [counts, setCounts] = React.useState<GoalsMap>({});

  const load = React.useCallback(async () => {
    const s = await getSettings();
    setSettings(s);

    // spočítaj tréningy za aktuálny mesiac podľa goalKey
    const mk = monthKey();
    const all: TrainingRecord[] = await getAll();

    const cnt: GoalsMap = {};
    for (const k of GOAL_KEYS) cnt[k] = 0;

    for (const r of all) {
      if (!r.date?.startsWith(mk)) continue;
      const key = goalKeyFromRecord(r);
      if (key) cnt[key] = (cnt[key] ?? 0) + 1;
    }
    setCounts(cnt);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const activeCount = React.useMemo(() => {
    return Object.entries(settings.monthlyTargets ?? {})
      .filter(([k, val]) => GOAL_KEYS.includes(k as GoalKey) && typeof val === 'number' && (val as number) > 0)
      .length;
  }, [settings]);

  const addOrUpdate = async () => {
    if (savingGoal) return;
    const v = Number((target ?? '').trim().replace(',', '.'));
    const clean = Number.isFinite(v) && v > 0 ? Math.floor(v) : null;

    const exists = (settings.monthlyTargets ?? {}).hasOwnProperty(selected);
    if (!exists && clean && activeCount >= 5) {
      alert(t('goals.max5', { defaultValue: 'Maximálne 5 aktívnych cieľov.' }));
      return;
    }

    setSavingGoal(true);
    try {
      await upsertMonthlyTarget(selected, clean);
      // optimisticky aktualizuj
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

  return (
    <>

      <ScrollView contentContainerStyle={styles.screen}>
        {/* Výber cieľa + zadanie počtu */}
        <Card style={styles.card}>
          <Card.Content>

            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GOAL_KEYS.map((key) => (
                  <Chip
                    key={key}
                    selected={selected === key}
                    onPress={() => !savingGoal && setSelected(key)}
                    disabled={savingGoal}
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
                editable={!savingGoal}
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

        {/* Aktívne ciele (tabuľka) */}
        <Card style={styles.card}>
  <Card.Content>
    <Title>{t('goals.activeGoals', { defaultValue: 'Aktívne ciele' })}</Title>

    {Object.keys(settings.monthlyTargets ?? {}).filter(k => GOAL_KEYS.includes(k as GoalKey)).length === 0 ? (
      <Paragraph>{t('goals.none', { defaultValue: 'Žiadne ciele.' })}</Paragraph>
    ) : (
      <DataTable>
        {/* odstránil som header */}
        {Object.entries(settings.monthlyTargets)
          .filter(([k]) => GOAL_KEYS.includes(k as GoalKey))
          .map(([k, v]) => {
            const key = k as GoalKey;
            const targetVal = v as number;
            const done = counts[key] ?? 0;
            const left = Math.max(0, (targetVal ?? 0) - done);

            return (
              <DataTable.Row key={k}>
  {/* TYPE */}
  <DataTable.Cell style={{ flex: 2 , paddingLeft: 0 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -20 }}>
      <Icon source={goalIcon(key)} size={18} />
      <Text
        style={{ marginLeft: 2, flexShrink: 1 }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {goalLabel(key, t)}
      </Text>
    </View>
  </DataTable.Cell>

  {/* TARGET + LEFT */}
{/* TARGET + LEFT */}
<DataTable.Cell numeric style={{ flex: 1.4 }}>
  <View style={styles.cellRightCol}>
    <Text style={styles.targetTxt}>
      {t('goals.target', { defaultValue: 'Cieľ' })}: {targetVal}
    </Text>
    <Text style={styles.leftTxt}>
      {t('goals.left', { defaultValue: 'Zostáva' })}: {left}
    </Text>

    {/* 🟦 progress */}
    {targetVal > 0 ? (
      <ProgressBar
        progress={Math.min(1, (done ?? 0) / targetVal)}
        style={styles.pb}
      />
    ) : null}
  </View>
</DataTable.Cell>


  {/* DELETE */}
  <DataTable.Cell style={{ flex: 0.8 }}>
    <Button
      onPress={() => removeTarget(key)}
      textColor="crimson"
      disabled={savingGoal}
    >
      {t('common.delete', { defaultValue: 'Zmazať' })}
    </Button>
  </DataTable.Cell>
</DataTable.Row>

            );
          })}
      </DataTable>
    )}
  </Card.Content>
</Card>

      </ScrollView>
    </>
  );
}
