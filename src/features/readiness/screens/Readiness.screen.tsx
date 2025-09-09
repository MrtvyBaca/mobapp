import React from 'react';
import { ScrollView, View, StyleSheet, PanResponder } from 'react-native';
import { Card, Paragraph, Text, Button, TextInput } from 'react-native-paper';
import {
  defaultAnswers,
  computeReadinessScore,
  type ReadinessAnswers,
} from '@/shared/lib/readiness';
import { getByDate, upsertForDate } from '@/features/readiness/storage';
import { SegmentedButtons } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { formatDate, toDateKey } from '@/shared/lib/datetime';
import MaterialCalendarModal from '@/shared/components/MaterialCalendarModal';
import { Slider } from '@miblanchard/react-native-slider';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { fromYmdLocal } from '@/shared/components/MaterialCalendarModal';
import { toNoon } from '@/shared/components/MaterialCalendarModal';
import { Platform, ToastAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// ── štýly: zmenšíme z 8 -> 6
const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  row: { marginVertical: 0 }, // ⬅️ bolo 8
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { flexShrink: 1, flexGrow: 1, paddingRight: 8 },
  valueBox: { width: 32, alignItems: 'flex-end' },
});

/* -------------------- STABILNÝ PODKOMPONENT MIMO PARENTU -------------------- */

type RowProps = {
  label: string;
  value: number;
  commitKey: keyof ReadinessAnswers;
  onCommit: (k: keyof ReadinessAnswers, v: number) => void; // stabilný callback z parentu
  onStartSlide: () => void; // stabilný callback z parentu
  onEndSlide: () => void;   // stabilný callback z parentu
};

const ReadinessRow = React.memo(function ReadinessRow({
  label,
  value,
  commitKey,
  onCommit,
  onStartSlide,
  onEndSlide,
}: RowProps) {
  const [v, setV] = React.useState<number>(value);
  React.useEffect(() => { setV(value); }, [value]);

  const clampRound = (x: number) => Math.max(0, Math.min(10, Math.round(x)));

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Paragraph style={styles.label}>{label}</Paragraph>
        <View style={styles.valueBox}>
          <Text>{v.toFixed(0)}</Text>
        </View>
      </View>

      <PanGestureHandler
        activeOffsetX={[-8, 8]}
        failOffsetY={[-6, 6]}
        onActivated={onStartSlide}
        onEnded={onEndSlide}
        onCancelled={onEndSlide}
        onFailed={onEndSlide}
      >
        {/* padding z 10 -> 6 */}
        <View style={{ paddingVertical: 6 }}>
          <Slider
            value={v}
            onValueChange={([nv]) => setV(nv)}
            minimumValue={0}
            maximumValue={10}
            step={1}
            // menšie interakčné a vizuálne prvky
            thumbTouchSize={{ width: 16, height: 16 }}     // ⬅️ bolo 44
            containerStyle={{ paddingVertical: 0 }}
            trackStyle={{ height: 4 }}                     // ⬅️ nižší track
            thumbStyle={{ width: 18, height: 18, borderRadius: 9 }} // ⬅️ menší thumb
            {...({ trackClickable: false } as any)}
            minimumTrackTintColor="#2563eb"
            maximumTrackTintColor="rgba(0,0,0,0.15)"
            thumbTintColor="#2563eb"
            onSlidingComplete={([nv]) => {
              const vv = clampRound(nv);
              setV(vv);
              requestAnimationFrame(() => {
                onCommit(commitKey, vv);
                onEndSlide();
              });
            }}
          />
        </View>
      </PanGestureHandler>
    </View>
  );
}, (prev, next) => (
  prev.label === next.label &&
  prev.value === next.value &&
  prev.commitKey === next.commitKey
));

/* ------------------------------ PARENT KOMPONENT ------------------------------ */

type Q = { key: keyof ReadinessAnswers; tkey: string; negative?: boolean };

const QUESTIONS: Q[] = [
  { key: 'trainingLoadYesterday', tkey: 'recovery.q.load',      negative: true },
  { key: 'muscleSoreness',        tkey: 'recovery.q.soreness',  negative: true },
  { key: 'muscleFatigue',         tkey: 'recovery.q.fatigue',   negative: true },
  { key: 'mentalStress',          tkey: 'recovery.q.stress',    negative: true },
  { key: 'injury',                tkey: 'recovery.q.injury',    negative: true },
  { key: 'illness',               tkey: 'recovery.q.illness',   negative: true },
  { key: 'sleepLastNight',        tkey: 'recovery.q.sleep'                        },
  { key: 'nutritionQuality',      tkey: 'recovery.q.nutrition'                    },
  { key: 'mood24h',               tkey: 'recovery.q.mood'                         },
  { key: 'recoveryEnergyToday',   tkey: 'recovery.q.energy'                       },
  { key: 'menstrual',             tkey: 'recovery.q.menstrual', negative: true   },
];

export default function ReadinessScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [date, setDate] = React.useState<string>(toDateKey(new Date()));
  const [answers, setAnswers] = React.useState<ReadinessAnswers>(defaultAnswers());
  const [saving, setSaving] = React.useState(false);
  const [dpOpen, setDpOpen] = React.useState(false);
  const [scrollEnabled, setScrollEnabled] = React.useState(true);

  const score = computeReadinessScore(answers);

  const loadForDate = React.useCallback(async (d: string) => {
    const existing = await getByDate(d);
    setAnswers(existing?.answers ?? defaultAnswers());
  }, []);

  React.useEffect(() => { loadForDate(date); }, [date, loadForDate]);

  const setVal = React.useCallback((key: keyof ReadinessAnswers, v: number) => {
    setAnswers(prev => ({ ...prev, [key]: Math.round(v) }));
  }, []);

  const handleCommit = React.useCallback((k: keyof ReadinessAnswers, v: number) => {
    setAnswers(prev => ({ ...prev, [k]: v }));
  }, []);

  const handleStartSlide = React.useCallback(() => setScrollEnabled(false), []);
  const handleEndSlide   = React.useCallback(() => setScrollEnabled(true),  []);

  const save = async () => {
    setSaving(true);
    try {
      await upsertForDate(date, answers);

      // ⬇️ zobraz „Saved“ nenarušene a choď späť
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('common.saved'), ToastAndroid.SHORT);
      }
      // Ak chceš aj na iOS krátke potvrdenie bez blokujúceho alertu,
      // môžeš neskôr doplniť Snackbar na feede.
      navigation.goBack();
    } catch (e) {
      console.error(e);
      // chybovú hlášku necháme, aby užívateľ vedel, že sa neuložilo
      // (táto je OK aj na iOS, lebo ide o výnimku)
      alert(t('errors.readinessSaveFailed', { defaultValue: 'Failed to save readiness.' }));
    } finally {
      setSaving(false);
    }
  };


  const parsed = date ? new Date(date) : null;

 return (
    <ScrollView contentContainerStyle={styles.screen} scrollEnabled={scrollEnabled}>
      <Card style={styles.card}>
        <Card.Content>
          {/* Dátum */}
          <TextInput
            label={t('screens.addTraining.date')}
            value={parsed ? formatDate(parsed) : ''}
            editable={false}
            right={<TextInput.Icon icon="calendar" onPress={() => setDpOpen(true)} />}
            style={{ backgroundColor: '#fff', marginTop: 8 }}
          />

          <MaterialCalendarModal
            visible={dpOpen}
            date={toNoon(parsed ?? new Date())}
            locale={i18n.language.startsWith('cs') ? 'cs' : i18n.language.startsWith('sk') ? 'sk' : 'en'}
            onDismiss={() => setDpOpen(false)}
            onConfirm={(picked: Date) => {
              const pickedLocal = toNoon(picked);
              setDate(toDateKey(pickedLocal));
              setDpOpen(false);
            }}
          />

          <Paragraph style={{ marginTop: 12 }}>
            {t('recovery.score')}: <Text style={{ fontWeight: 'bold' }}>{score.toFixed(1)}</Text> / 10
          </Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          {QUESTIONS.map(q => (
            q.key === 'menstrual' ? (
              <View key={q.key} style={styles.row}>
                <View style={styles.labelRow}>
                  <Paragraph style={styles.label}>{t(q.tkey)}</Paragraph>
                  <View style={styles.valueBox}>
                    <Text>
                      {(answers.menstrual ?? 0) >= 5 ? t('common.yes') : t('common.no')}
                    </Text>
                  </View>
                </View>
                <SegmentedButtons
                  value={(answers.menstrual ?? 0) >= 5 ? 'yes' : 'no'}
                  onValueChange={(val) => setVal('menstrual', val === 'yes' ? 10 : 0)}
                  buttons={[
                    { value: 'no',  label: t('common.no') },
                    { value: 'yes', label: t('common.yes') },
                  ]}
                  style={{ marginTop: 6 }}
                />
              </View>
            ) : (
              <ReadinessRow
                key={q.key}
                label={t(q.tkey)}
                value={(answers[q.key] ?? 0)}
                commitKey={q.key}
                onCommit={handleCommit}
                onStartSlide={handleStartSlide}
                onEndSlide={handleEndSlide}
              />
            )
          ))}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button mode="contained" onPress={save} loading={saving} disabled={saving}>
              {t('common.save')}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
