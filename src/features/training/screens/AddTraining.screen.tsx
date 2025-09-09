// src/features/training/screens/AddTraining.screen.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Title, Paragraph, TextInput, Button, SegmentedButtons, Portal, Modal
} from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LED_SUBTYPES, deriveNormalizedType, type TrainingDraft } from '@/shared/lib/training';
import { add } from '@/features/training/storage';
import { useNavigation } from '@react-navigation/native';
import { WheelPicker } from 'react-native-infinite-wheel-picker';
// hore v súbore
import { ScrollView, View, StyleSheet, Platform, Pressable, ToastAndroid } from 'react-native';
import { DatePickerModal } from 'react-native-paper-dates';
import { formatDate, toDateKey } from '@/shared/lib/datetime';
import MaterialCalendarModal from '@/shared/components/MaterialCalendarModal';
type LEDSubtype = (typeof LED_SUBTYPES)[number];
type Category = 'Led' | 'Kondice' | 'Ucebna' | 'Jine';
type Group = 'Led' | 'Silovy' | 'Kardio' | 'Mobilita';

const HOURS  = Array.from({ length: 24 }, (_, i) => i);
const MINSEC = Array.from({ length: 60 }, (_, i) => i);

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  input: { backgroundColor: '#fff', marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});
const modalStyles = StyleSheet.create({
  container: { backgroundColor: 'white', marginHorizontal: 16, padding: 16, borderRadius: 12 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  selectedLayoutStyle: { backgroundColor: '#00000026', borderRadius: 2 },
  containerStyle: { backgroundColor: '#0000001a', width: '100%' },
  elementTextStyle: { fontSize: 18 },
});

export default function AddTrainingScreen() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const [date, setDate] = React.useState<string>(toDateKey(new Date()));
  const [category, setCategory] = React.useState<Category>('Kondice');
  const [group, setGroup] = React.useState<Group>('Silovy');
  const [subtype, setSubtype] = React.useState<LEDSubtype | ''>('');
  const [hours, setHours] = React.useState<number>(0);
  const [minutes, setMinutes] = React.useState<number>(0);
  const [seconds, setSeconds] = React.useState<number>(0);
  const [description, setDescription] = React.useState<string>('');
  const [showPicker, setShowPicker] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [dpOpen, setDpOpen] = React.useState(false);
  // modal (podľa tvojho príkladu: držíme rovno indexy)
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [tmpH, setTmpH] = React.useState(0);
  const [tmpM, setTmpM] = React.useState(0);
  const [tmpS, setTmpS] = React.useState(0);

  const fmt2 = (n: number) => String(n).padStart(2, '0');
  const displayHMS = `${hours} h ${fmt2(minutes)} m ${fmt2(seconds)} s`;

  React.useEffect(() => {
    if (category === 'Led') { setGroup('Led'); setSubtype(LED_SUBTYPES[0]); return; }
    if (category === 'Kondice') { if (group === 'Led') setGroup('Silovy'); setSubtype(''); return; }
    setSubtype('');
  }, [category, group]);

  const resetForm = () => {
    setDate(toDateKey(new Date()));
    setCategory('Kondice');
    setGroup('Silovy');
    setSubtype('');
    setHours(0); setMinutes(0); setSeconds(0);
    setDescription('');
  };

  const validate = () => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return t('errors.dateFormat');;
    if (['Led', 'Kondice', 'Jine'].includes(category)) {
      const totalSec = hours * 3600 + minutes * 60 + seconds;
      if (totalSec <= 0) return t('screens.addTraining.traininglenerror');
    }
    if (category === 'Jine' && !description.trim()) return  t('screens.addTraining.otherinfoerror');
    return null;
  };

  
const save = async () => {
  const err = validate();
  if (err) { alert(err); return; }
  setSaving(true);
  try {
    let normType: TrainingDraft['type'];
    if (category === 'Led') normType = 'Led';
    else if (category === 'Kondice') normType = deriveNormalizedType(group);
    else if (category === 'Ucebna') normType = 'Učebná';
    else normType = 'Iné';

    const totalSec = hours * 3600 + minutes * 60 + seconds;
    const durationMinutes = Math.round(totalSec / 60);

    const draft: TrainingDraft = {
      date,
      duration: (['Led', 'Kondice', 'Jine'].includes(category)) ? durationMinutes : 0,
      description,
      category,
      group: category === 'Kondice' ? group : category === 'Led' ? 'Led' : undefined,
      subtype: category === 'Led' ? subtype : undefined,
      type: normType,
      schemaVersion: 1 as const,
    };

    await add(draft);

    // 👇 krátke potvrdenie na Androide
    if (Platform.OS === 'android') {
      ToastAndroid.show(t('common.saved'), ToastAndroid.SHORT);
    }

    resetForm();
    navigation.goBack(); // návrat na feed
  } catch (e) {
    console.error(e);
    alert('Nepodarilo sa uložiť tréning.');
  } finally {
    setSaving(false);
  }
};

  const onChangeDate = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDate(toDateKey(selected));
  };

const openTimeModal = () => {
  setTmpH(hours); setTmpM(minutes); setTmpS(seconds);
  setShowTimePicker(true);
};
const confirmTimeModal = () => {
  setHours(tmpH); setMinutes(tmpM); setSeconds(tmpS);
  setShowTimePicker(false);
};
const parsed = date ? new Date(date) : null;
const shiftDate = (dKey: string, days: number) => {
  const d = new Date(dKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};
  return (
    
    <>
      <ScrollView contentContainerStyle={styles.screen} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Card.Content>
            <Title style={{ marginBottom: 8 }}>{t('screens.addTraining.subtitle')}</Title>

            {/* Dátum */}
<TextInput
  label={t('screens.addTraining.date')}
  value={parsed ? formatDate(parsed) : ''}   // 👈 zobrazi dd/mm/yyyy
  editable={false}
  right={<TextInput.Icon icon="calendar" onPress={() => setDpOpen(true)} />}
  style={styles.input}
/>
<MaterialCalendarModal
  visible={dpOpen}
  date={parsed ?? new Date()}
  locale={i18n?.language?.startsWith('cs') ? 'cs' : i18n?.language?.startsWith('sk') ? 'sk' : 'en'}
  onDismiss={() => setDpOpen(false)}
  onConfirm={(picked: Date) => {
    setDate(toDateKey(picked));
    setDpOpen(false);
  }}
/>

            {/* Kategória */}
            <Paragraph style={{ marginTop: 12, marginBottom: 4 }}>{t('screens.addTraining.type')}</Paragraph>
            <SegmentedButtons
              value={category}
              onValueChange={(v) => setCategory(v as Category)}
              buttons={[
                { value: 'Led',     label: t('screens.addTraining.ice')  },
                { value: 'Kondice', label: t('screens.addTraining.condition') },
                { value: 'Ucebna',  label: t('screens.addTraining.classroom') },
                { value: 'Jine',    label: t('screens.addTraining.other') },
              ]}
            />

            {/* Led – podtypy */}
            {category === 'Led' && (
              <>
                <Paragraph style={{ marginTop: 12, marginBottom: 4 }}>{t('screens.addTraining.typeOnIce')}</Paragraph>
                <SegmentedButtons
                  value={subtype || LED_SUBTYPES[0]}
                  onValueChange={(v) => setSubtype(v as LEDSubtype)}
                  buttons={[
                    { value: 'Individuál', label: t('screens.addTraining.individual') },
                    { value: 'Tímový',     label: t('screens.addTraining.team') },
                    { value: 'Zápas',      label: t('screens.addTraining.match') },
                  ]}
                />
              </>
            )}

            {/* Kondice – zameranie */}
            {category === 'Kondice' && (
              <>
                <Paragraph style={{ marginTop: 12, marginBottom: 4 }}>{t('screens.addTraining.category')}</Paragraph>
                <SegmentedButtons
                  value={group}
                  onValueChange={(v) => setGroup(v as Group)}
                  buttons={[
                    { value: 'Silovy',   label: t('screens.addTraining.weight') },
                    { value: 'Kardio',   label: t('screens.addTraining.cardio') },
                    { value: 'Mobilita', label: t('screens.addTraining.mobility') },
                  ]}
                />
              </>
            )}

            {/* Trvanie – otvorí modal */}
            {(['Led', 'Kondice', 'Jine'].includes(category)) && (
<View style={{ position: 'relative' }}>
  <TextInput
    label= {t('screens.addTraining.duration')}
    value={displayHMS}
    editable={false}
    showSoftInputOnFocus={false} // Android: neotváraj klávesnicu
    right={<TextInput.Icon icon="clock-outline" />} // onPress už netreba, overlay to chytí
    style={styles.input}
    pointerEvents="none" // voliteľné: všetky dotyky nech chytí overlay
  />

  {/* overlay cez celé pole – zachytí klik kdekoľvek v inpute */}
  <Pressable
    onPress={openTimeModal}
    accessibilityRole="button"
    accessibilityLabel={t('screens.addTraining.setDurationA11y')}
    style={StyleSheet.absoluteFillObject}
  />
</View>

            )}

            {/* Popis */}
            <TextInput
              label={
                category === 'Ucebna' ? t('screens.addTraining.studyinfo')
                : category === 'Jine' ? t('screens.addTraining.otherinfo')
                : t('screens.addTraining.info')
              }
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              multiline
            />

            <View style={styles.actions}>
              <Button onPress={() => { setHours(0); setMinutes(0); setSeconds(0); setDescription(''); }}>
                {t('screens.addTraining.clear')}
              </Button>
              <Button mode="contained" onPress={save} loading={saving} disabled={saving}>
                 {t('screens.addTraining.save')}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* MODÁL – 3× WheelPicker podľa tvojho príkladu */}
      <Portal>
        <Modal visible={showTimePicker} onDismiss={() => setShowTimePicker(false)} contentContainerStyle={modalStyles.container}>
          <Title style={{ marginBottom: 8 }}>{t('screens.addTraining.setDurationTitle')}</Title>

<View style={modalStyles.row}>
  <View style={modalStyles.col}>
    <WheelPicker
      data={HOURS}
      selectedIndex={tmpH}                  // 👈 len controlled
      restElements={2}
      elementHeight={40}
      loopCount={31}
      decelerationRate="fast"
      onChangeValue={(index) => setTmpH(Number(index))}
      containerStyle={modalStyles.containerStyle}
      selectedLayoutStyle={modalStyles.selectedLayoutStyle}
      elementTextStyle={modalStyles.elementTextStyle}
      flatListProps={{
        windowSize: 3,
        maxToRenderPerBatch: 6,
        initialNumToRender: 9,
        updateCellsBatchingPeriod: 16,
        removeClippedSubviews: true,
        showsVerticalScrollIndicator: false,
      }}
    />
    <Paragraph style={{ textAlign: 'center', marginTop: 4, opacity: 0.7 }}>{t('units.hourShort')}</Paragraph>
  </View>

  <View style={modalStyles.col}>
    <WheelPicker
      data={MINSEC}
      selectedIndex={tmpM}                  // 👈 len controlled
      restElements={2}
      elementHeight={40}
      loopCount={31}
      decelerationRate="fast"
      onChangeValue={(index) => setTmpM(Number(index))}
      containerStyle={modalStyles.containerStyle}
      selectedLayoutStyle={modalStyles.selectedLayoutStyle}
      elementTextStyle={modalStyles.elementTextStyle}
      flatListProps={{
        windowSize: 3,
        maxToRenderPerBatch: 6,
        initialNumToRender: 9,
        updateCellsBatchingPeriod: 16,
        removeClippedSubviews: true,
        showsVerticalScrollIndicator: false,
      }}
    />
    <Paragraph style={{ textAlign: 'center', marginTop: 4, opacity: 0.7 }}>{t('units.minShort')}</Paragraph>
  </View>

  <View style={modalStyles.col}>
    <WheelPicker
      data={MINSEC}
      selectedIndex={tmpS}                  // 👈 len controlled
      restElements={2}
      elementHeight={40}
      loopCount={31}
      decelerationRate="fast"
      onChangeValue={(index) => setTmpS(Number(index))}
      containerStyle={modalStyles.containerStyle}
      selectedLayoutStyle={modalStyles.selectedLayoutStyle}
      elementTextStyle={modalStyles.elementTextStyle}
      flatListProps={{
        windowSize: 3,
        maxToRenderPerBatch: 6,
        initialNumToRender: 9,
        updateCellsBatchingPeriod: 16,
        removeClippedSubviews: true,
        showsVerticalScrollIndicator: false,
      }}
    />
    <Paragraph style={{ textAlign: 'center', marginTop: 4, opacity: 0.7 }}>{t('units.secShort')}</Paragraph>
  </View>
</View>

          <Button mode="contained" onPress={confirmTimeModal} style={{ marginTop: 16, alignSelf: 'stretch' }}>
            OK
          </Button>
        </Modal>
      </Portal>
    </>
  );
}
