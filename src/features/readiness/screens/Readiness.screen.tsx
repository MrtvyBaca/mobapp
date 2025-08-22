import React from 'react';
import { ScrollView, View, StyleSheet, Platform } from 'react-native';
import { Card, Title, Paragraph, Text, Button, TextInput } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { toDateKey } from '@/shared/lib/date';
import {
  defaultAnswers,
  computeReadinessScore,
  type ReadinessAnswers,
} from '@/shared/lib/readiness';
import { getByDate, upsertForDate } from '@/features/readiness/storage';

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  row: { marginVertical: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#fff', marginTop: 8 },
});

type Q = { key: keyof ReadinessAnswers; label: string; negative?: boolean };
const QUESTIONS: Q[] = [
  {
    key: 'trainingLoadYesterday',
    label: 'Training load yesterday (0=žiadny, 10=extrémny)',
    negative: true,
  },
  { key: 'muscleSoreness', label: 'Muscle soreness (0=žiadne, 10=veľké)', negative: true },
  { key: 'muscleFatigue', label: 'Muscle fatigue (0=žiadna, 10=veľká)', negative: true },
  { key: 'mentalStress', label: 'Mental stress (0=nízky, 10=vysoký)', negative: true },
  { key: 'injury', label: 'Aktuálne zranenie (0=nie, 10=výrazné)', negative: true },
  { key: 'illness', label: 'Aktuálne ochorenie (0=nie, 10=výrazné)', negative: true },
  { key: 'sleepLastNight', label: 'Sleep last night (0=zlé, 10=skvelé)' },
  { key: 'nutritionQuality', label: 'Food & beverage yesterday (0=zlé, 10=skvelé)' },
  { key: 'mood24h', label: 'Mood last 24h (0=zlé, 10=skvelé)' },
  { key: 'recoveryEnergyToday', label: 'Recovery & energy today (0=nízka, 10=vysoká)' },
  { key: 'menstrual', label: 'Menštruačné krvácanie (0=nie, 10=silné)', negative: true },
];

export default function ReadinessScreen() {
  const [date, setDate] = React.useState<string>(toDateKey(new Date()));
  const [answers, setAnswers] = React.useState<ReadinessAnswers>(defaultAnswers());
  const [saving, setSaving] = React.useState(false);
  const [showPicker, setShowPicker] = React.useState(false);

  const score = computeReadinessScore(answers);

  const loadForDate = React.useCallback(async (d: string) => {
    const existing = await getByDate(d);
    setAnswers(existing?.answers ?? defaultAnswers());
  }, []);

  React.useEffect(() => {
    loadForDate(date);
  }, [date, loadForDate]);

  const setVal = (key: keyof ReadinessAnswers, v: number) => {
    setAnswers((prev) => ({ ...prev, [key]: Math.round(v) }));
  };

  const onChangeDate = (e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDate(toDateKey(selected));
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

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={{ marginBottom: 8 }}>Denný Readiness</Title>

          <TextInput
            label="Dátum"
            value={date}
            editable={false}
            right={<TextInput.Icon icon="calendar" onPress={() => setShowPicker(true)} />}
            style={styles.input}
          />
          {showPicker && (
            <DateTimePicker
              value={date ? new Date(date) : new Date()}
              mode="date"
              display="default"
              onChange={onChangeDate}
            />
          )}

          <Paragraph style={{ marginTop: 12 }}>
            Celkové skóre: <Text style={{ fontWeight: 'bold' }}>{score.toFixed(1)}</Text> / 10
          </Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          {QUESTIONS.map((q) => (
            <View key={q.key} style={styles.row}>
              <View style={styles.labelRow}>
                <Paragraph>{q.label}</Paragraph>
                <Text>{(answers[q.key] ?? 0).toFixed(0)}</Text>
              </View>
              <Slider
                value={answers[q.key] ?? 0}
                onValueChange={(v) => setVal(q.key, Array.isArray(v) ? v[0] : v)}
                minimumValue={0}
                maximumValue={10}
                step={1}
              />
            </View>
          ))}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button mode="contained" onPress={save} loading={saving} disabled={saving}>
              Uložiť
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
