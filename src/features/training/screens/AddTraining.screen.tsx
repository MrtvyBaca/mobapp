// src/features/training/screens/AddTraining.screen.tsx
import React from 'react';
import { ScrollView, View, StyleSheet, Platform } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  SegmentedButtons,
  Chip,
} from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { toDateKey } from '@/shared/lib/date';
import {
  LED_SUBTYPES,
  deriveNormalizedType,
  type TrainingDraft,
} from '@/shared/lib/training';
import { add } from '@/features/training/storage';

type LEDSubtype = (typeof LED_SUBTYPES)[number];
// --- Form uniony ---
type Category = 'Led' | 'Kondice' | 'Ucebna' | 'Jine';
type Group = 'Led' | 'Silovy' | 'Kardio' | 'Mobilita';

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { backgroundColor: '#fff', marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});

export default function AddTrainingScreen() {
  // form state
  const [date, setDate] = React.useState<string>(toDateKey(new Date()));
  const [category, setCategory] = React.useState<Category>('Kondice');
  const [group, setGroup] = React.useState<Group>('Silovy');
  const [subtype, setSubtype] = React.useState<LEDSubtype | ''>('');
  const [duration, setDuration] = React.useState<string>(''); // minúty
  const [description, setDescription] = React.useState<string>(''); // popis
  const [showPicker, setShowPicker] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // držíme group/subtype konzistentné s kategóriou
  React.useEffect(() => {
    if (category === 'Led') {
      setGroup('Led');
      setSubtype(LED_SUBTYPES[0]); // 'Individuál'
      return;
    }
    if (category === 'Kondice') {
      // pri Kondice nepoužívame subtype vôbec
      if (group === 'Led') setGroup('Silovy');
      setSubtype('');
      return;
    }
    // Ucebna/Jine
    setSubtype('');
  }, [category, group]);

  const resetForm = () => {
    setDate(toDateKey(new Date()));
    setCategory('Kondice');
    setGroup('Silovy');
    setSubtype('');
    setDuration('');
    setDescription('');
  };

  const validate = () => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Zadaj dátum v tvare YYYY-MM-DD';

    if (category === 'Kondice' || category === 'Led') {
      const d = Number(duration);
      if (!Number.isFinite(d) || d <= 0) return 'Zadaj trvanie v minútach (> 0)';
    }

    if (category === 'Jine') {
      if (!description || !description.trim()) return 'Pri kategórii „Iné“ je popis povinný.';
    }

    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    setSaving(true);
    try {
      let normType: TrainingDraft['type'];
      if (category === 'Led') normType = 'Led';
      else if (category === 'Kondice') normType = deriveNormalizedType(group); // bez subtype
      else if (category === 'Ucebna') normType = 'Učebná';
      else normType = 'Iné';

      const draft: TrainingDraft = {
        date,
        duration: category === 'Kondice' || category === 'Led' ? Number(duration) : 0,
        description,
        category,
        group: category === 'Kondice' ? group : category === 'Led' ? 'Led' : undefined,
        subtype: category === 'Led' ? subtype : undefined, // len pre Led
        type: normType,
        schemaVersion: 1 as const,
      };

      await add(draft);
      resetForm();
      alert('Tréning uložený ✅');
    } catch (e) {
      console.error(e);
      alert('Nepodarilo sa uložiť tréning.');
    } finally {
      setSaving(false);
    }
  };

    const renderLedChips = () => {
    if (category !== 'Led') return null;
    const items = Array.isArray(LED_SUBTYPES) ? LED_SUBTYPES : []; // ✅ poistka
    return (
        <View style={styles.chips}>
        {items.map((it) => (
            <Chip key={it} selected={subtype === it} onPress={() => setSubtype(it)}>
            {it}
            </Chip>
        ))}
        </View>
    );
    };


  const onChangeDate = (e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDate(toDateKey(selected));
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={{ marginBottom: 8 }}>Nový tréning</Title>

          {/* Dátum */}
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

          {/* Kategória */}
          <Paragraph style={{ marginTop: 12, marginBottom: 4 }}>Kategória</Paragraph>
            <SegmentedButtons
            value={category}
            onValueChange={(v) => setCategory(v as Category)}
            buttons={[
                { value: 'Led',     label: 'Led' },
                { value: 'Kondice', label: 'Kondice' },
                { value: 'Ucebna',  label: 'Učebná' },
                { value: 'Jine',    label: 'Iné' },
            ]}
            />


          {/* Led – podtypy */}
            {category === 'Led' && (
            <>
                <Paragraph style={{ marginTop: 12, marginBottom: 4 }}>Typ na ľade</Paragraph>
                <SegmentedButtons
                value={subtype || LED_SUBTYPES[0]}
                onValueChange={(v) => setSubtype(v as LEDSubtype)}
                buttons={[
                    { value: 'Individuál', label: 'Individuál' },
                    { value: 'Tímový',     label: 'Tímový' },
                    { value: 'Zápas',      label: 'Zápas' },
                ]}
                />
            </>
            )}


          {/* Kondice – len zameranie (žiadne typy) */}
            {category === 'Kondice' && (
                <>
                <Paragraph style={{ marginTop: 12, marginBottom: 4 }}>Zameranie</Paragraph>
            <SegmentedButtons
                value={group}
                onValueChange={(v) => setGroup(v as Group)}
                buttons={[
                { value: 'Silovy',   label: 'Silový' },
                { value: 'Kardio',   label: 'Kardio' },
                { value: 'Mobilita', label: 'Mobilita' },
                ]}
            />
            </>
            )}


          {/* Trvanie len pre Led + Kondice */}
          {(category === 'Led' || category === 'Kondice') && (
            <TextInput
              label="Trvanie (min)"
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
              style={styles.input}
            />
          )}

          {/* Popis */}
          <TextInput
            label={
              category === 'Ucebna'
                ? 'Poznámka (čo si študoval?)'
                : category === 'Jine'
                ? 'Popis (povinné pri „Iné“) '
                : 'Popis'
            }
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            multiline
          />

          <View style={styles.actions}>
            <Button onPress={resetForm} disabled={saving}>Vymazať</Button>
            <Button mode="contained" onPress={save} loading={saving} disabled={saving}>
              Uložiť tréning
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
