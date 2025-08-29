import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button, TextInput, SegmentedButtons, HelperText } from 'react-native-paper';
import type { StackScreenProps } from '@react-navigation/stack';
import type { TrainingRecord } from '@/shared/lib/training';
import { getById, update as updateById, remove as removeById } from '@/features/training/storage';
import type { TrainingStackParamList } from '@/navigation/types';
import { formatDate } from '@/shared/lib/datetime';
type Props = StackScreenProps<TrainingStackParamList, 'RecordDetail'>;

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f3f6fa' },
  card: { marginBottom: 16, borderRadius: 12, elevation: 3 },
  input: { marginTop: 8, backgroundColor: '#fff' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});
const CAT_VALUES = ['Led', 'Kondice', 'Ucebna', 'Jine'] as const;
type Category = typeof CAT_VALUES[number]; // "Led" | "Kondice" | "Ucebna" | "Jine"
const CATEGORIES: { value: Category; label: string }[] = CAT_VALUES.map(v => ({ value: v, label: v }));


export default function RecordDetailScreen({ route, navigation }: Props) {
  const { id, edit } = route.params;
  const [record, setRecord] = React.useState<TrainingRecord | null>(null);

  // 🔧 inicializácia editing z parametra
  const [editing, setEditing] = React.useState(!!edit);

const [draft, setDraft] = React.useState<{
  date: string;
  duration: string;
  description: string;
  category: Category | '';   // ← prázdny string keď nič
}>({
  date: '',
  duration: '',
  description: '',
  category: '',
});


  React.useEffect(() => {
    (async () => {
      const r = await getById(id);
      if (r) {
        setRecord(r);
setDraft({
  date: r.date,
  duration: String(r.duration ?? ''),
  description: r.description ?? '',
  category: (r.category ?? '') as Category | '',
});
      }
    })();
  }, [id]);

  const save = async () => {
    if (!record) return;
    const dur = Number(draft.duration);

    if (!draft.date || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
      alert('Dátum musí byť vo formáte YYYY-MM-DD');
      return;
    }
    if (!Number.isFinite(dur) || dur < 0) {
      alert('Trvanie musí byť číslo (min)');
      return;
    }
    if (!draft.category) {
      alert('Vyber kategóriu');
      return;
    }

    // patch doplníme aj o category
const patch: Partial<TrainingRecord> = {
  date: draft.date,
  duration: Number(draft.duration),
  description: draft.description,
  category: draft.category || undefined, // '' → undefined
};
await updateById(record.id, patch);
    setRecord({ ...record, ...patch });
    setEditing(false);
  };

  const remove = async () => {
    if (!record) return;
    await removeById(record.id);
    navigation.goBack();
  };

  if (!record) return <Paragraph>Načítavam...</Paragraph>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{formatDate(new Date(record.date))}</Title>
          <Paragraph>{record.duration} min</Paragraph>
          {(record as any).category ? <Paragraph>Kategória: {(record as any).category}</Paragraph> : null}
          {record.description ? <Paragraph>{record.description}</Paragraph> : null}
        </Card.Content>
      </Card>

      {editing ? (
        <Card style={styles.card}>
          <Card.Content>
            {/* Kategória */}
<SegmentedButtons
  value={draft.category} // typ: string (OK)
  onValueChange={(val) => setDraft(d => ({ ...d, category: val as Category | '' }))}
  buttons={CATEGORIES}   // value v buttons je vždy string (Category), nikdy undefined
  style={{ marginTop: 8 }}
/>
            {!draft.category ? <HelperText type="error">Vyber kategóriu</HelperText> : null}

            <TextInput
              label="Dátum (YYYY-MM-DD)"
              value={draft.date}
              onChangeText={(t) => setDraft((d) => ({ ...d, date: t }))}
              style={styles.input}
            />
            <TextInput
              label="Trvanie (min)"
              keyboardType="numeric"
              value={draft.duration}
              onChangeText={(t) => setDraft((d) => ({ ...d, duration: t }))}
              style={styles.input}
            />
            <TextInput
              label="Popis"
              value={draft.description}
              onChangeText={(t) => setDraft((d) => ({ ...d, description: t }))}
              style={styles.input}
              multiline
            />

            <View style={styles.actions}>
              <Button onPress={() => setEditing(false)}>Zrušiť</Button>
              <Button mode="contained" onPress={save}>Uložiť</Button>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <View style={styles.actions}>
          <Button onPress={() => setEditing(true)}>Edit</Button>
          <Button textColor="crimson" onPress={remove}>Remove</Button>
        </View>
      )}
    </ScrollView>
  );
}
