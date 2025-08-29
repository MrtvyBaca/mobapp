import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Text, Button, TextInput } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import {
  defaultAnswers,
  computeReadinessScore,
  type ReadinessAnswers,
} from '@/shared/lib/readiness';
import { getByDate, upsertForDate } from '@/features/readiness/storage';
import { SegmentedButtons } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useTranslation } from 'react-i18next';
import { formatDate, toDateKey } from '@/shared/lib/datetime';
const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  row: { marginVertical: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#fff', marginTop: 8 },
  label: { flexShrink: 1, flexGrow: 1, paddingRight: 8 }, // label sa skráti, nepretláča číslo
  valueBox: { width: 32, alignItems: 'flex-end' }, 
});

type Q = { key: keyof ReadinessAnswers; tkey: string; negative?: boolean };

const QUESTIONS: Q[] = [
  { key: 'trainingLoadYesterday', tkey: 'readiness.q.load',      negative: true }, // Zátěž včera
  { key: 'muscleSoreness',        tkey: 'readiness.q.soreness',  negative: true }, // Svalovka
  { key: 'muscleFatigue',         tkey: 'readiness.q.fatigue',   negative: true }, // Únava svalů
  { key: 'mentalStress',          tkey: 'readiness.q.stress',    negative: true }, // Stres
  { key: 'injury',                tkey: 'readiness.q.injury',    negative: true }, // Zranění
  { key: 'illness',               tkey: 'readiness.q.illness',   negative: true }, // Nemoc
  { key: 'sleepLastNight',        tkey: 'readiness.q.sleep'                        }, // Spánek
  { key: 'nutritionQuality',      tkey: 'readiness.q.nutrition'                    }, // Strava včera
  { key: 'mood24h',               tkey: 'readiness.q.mood'                         }, // Nálada 24h
  { key: 'recoveryEnergyToday',   tkey: 'readiness.q.energy'                       }, // Energie dnes
  { key: 'menstrual',             tkey: 'readiness.q.menstrual', negative: true   }, // Menstruace
];


export default function ReadinessScreen() {
  const { t, i18n } = useTranslation();
  const [date, setDate] = React.useState<string>(toDateKey(new Date()));
  const [answers, setAnswers] = React.useState<ReadinessAnswers>(defaultAnswers());
  const [saving, setSaving] = React.useState(false);
  const [dpOpen, setDpOpen] = React.useState(false);
  const score = computeReadinessScore(answers);

  const loadForDate = React.useCallback(async (d: string) => {
    const existing = await getByDate(d);
    setAnswers(existing?.answers ?? defaultAnswers());
  }, []);

  React.useEffect(() => { loadForDate(date); }, [date, loadForDate]);

  const setVal = (key: keyof ReadinessAnswers, v: number) => {
    setAnswers(prev => ({ ...prev, [key]: Math.round(v) }));
  };


  const save = async () => {
    setSaving(true);
    try {
      await upsertForDate(date, answers);
      alert('Readiness uložený ✅');
    } catch (e) {
      console.error(e);
      alert('Nepodarilo sa uložiť readiness.');
    } finally {
      setSaving(false);
    }
  };
const parsed = date ? new Date(date) : null;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Card style={styles.card}>
        <Card.Content>
<TextInput
  label={t('screens.addTraining.date')}
  value={parsed ? formatDate(parsed) : ''}   // 👈 zobrazi dd/mm/yyyy
  editable={false}
  right={<TextInput.Icon icon="calendar" onPress={() => setDpOpen(true)} />}
  style={styles.input}
/>
          {(
<DatePickerModal
  locale={
    i18n.language.startsWith('cs') ? 'cs'
    : i18n.language.startsWith('sk') ? 'sk'
    : 'en' // fallback s dd/mm/yyyy
  }
  mode="single"
  visible={dpOpen}
  date={parsed ?? new Date()}
  onDismiss={() => setDpOpen(false)}
  onConfirm={({ date: picked }) => {
    if (picked) setDate(toDateKey(picked));  // 👈 uložíš v ISO "YYYY-MM-DD"
    setDpOpen(false);
  }}
/>
          )}

          <Paragraph style={{ marginTop: 12 }}>
            Celkové skóre: <Text style={{ fontWeight: 'bold' }}>{score.toFixed(1)}</Text> / 10
          </Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
{QUESTIONS.map(q => (
  q.key === 'menstrual' ? (
    <View key={q.key} style={styles.row}>
      <View style={styles.labelRow}>
        <Paragraph style={styles.label}>
          {t(q.tkey, { defaultValue: 'Menstruace' })}
        </Paragraph>
        <View style={styles.valueBox}>
          <Text>{(answers.menstrual ?? 0) >= 5 ? t('common.yes', { defaultValue: 'Ano' }) : t('common.no', { defaultValue: 'Ne' })}</Text>
        </View>
      </View>

      <SegmentedButtons
        value={(answers.menstrual ?? 0) >= 5 ? 'yes' : 'no'}
        onValueChange={(val) => setVal('menstrual', val === 'yes' ? 10 : 0)}
        buttons={[
          { value: 'no',  label: t('common.no',  { defaultValue: 'Ne'  }) },
          { value: 'yes', label: t('common.yes', { defaultValue: 'Ano' }) },
        ]}
        style={{ marginTop: 6 }}
      />
    </View>
  ) : (
    <View key={q.key} style={styles.row}>
      <View style={styles.labelRow}>
        <Paragraph style={styles.label}>
          {t(q.tkey, {
            defaultValue: ({
              trainingLoadYesterday: 'Zátěž včera (0–10)',
              muscleSoreness: 'Svalovka (0–10)',
              muscleFatigue: 'Únava svalů (0–10)',
              mentalStress: 'Stres (0–10)',
              injury: 'Zranění (0–10)',
              illness: 'Nemoc (0–10)',
              sleepLastNight: 'Spánek (0–10)',
              nutritionQuality: 'Strava včera (0–10)',   // kratšie než "Food & beverage yesterday"
              mood24h: 'Nálada 24h (0–10)',
              recoveryEnergyToday: 'Energie dnes (0–10)',// kratšie než "Recovery & energy today"
            } as any)[q.key] || 'Hodnota (0–10)'
          })}
        </Paragraph>
        <View style={styles.valueBox}>
          <Text>{(answers[q.key] ?? 0).toFixed(0)}</Text>
        </View>
      </View>

      <Slider
        value={answers[q.key] ?? 0}
        onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.key]: v }))}    // plynulo, bez round
        onSlidingComplete={(v) => setVal(q.key, Math.round(v))}                 // commit s round
        minimumValue={0}
        maximumValue={10}
        step={1}
      />
    </View>
  )
))}



          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button mode="contained" onPress={save} loading={saving} disabled={saving}>
              {t('common.save',  { defaultValue: 'Save'  })}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
