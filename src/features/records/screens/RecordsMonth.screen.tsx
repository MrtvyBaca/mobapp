// screens/MesacneTreninkyScreen.tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Button, TextInput, Title, Paragraph } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';

import type { RecordsStackParamList } from '@/navigation/types';
import { getAll, update as updateById, remove as removeById } from '@/features/training/storage';
import type { TrainingRecord } from '@/shared/lib/training';
import { toMonthKey } from '@/shared/lib/date';

type Props = StackScreenProps<RecordsStackParamList, 'RecordsMonth'>;

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f3f6fa' },
  card: { marginBottom: 16, borderRadius: 12, elevation: 3 },
  input: { marginTop: 8, backgroundColor: '#fff' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});

export default function ZaznamyMesiac({ route }: Props) {
  const { month } = route.params; // "YYYY-MM"

  const [records, setRecords] = React.useState<TrainingRecord[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{
    date: string;
    duration: string;
    description: string;
  } | null>(null);

  const load = React.useCallback(async () => {
    const list = await getAll(); // načítaj všetky (storage sa postará o migráciu)
    setRecords(list);
    setEditingId(null);
    setDraft(null);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  // Záznamy v danom mesiaci (novšie navrchu)
  const monthEntries = React.useMemo(
    () =>
      records
        .filter((r) => toMonthKey(r.date) === month)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records, month],
  );

  const startEdit = (rec: TrainingRecord) => {
    setEditingId(rec.id);
    setDraft({
      date: rec.date,
      duration: String(rec.duration ?? ''),
      description: rec.description ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (!editingId || !draft) return;
    if (!draft.date || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date))
      return alert('Dátum musí byť vo formáte YYYY-MM-DD');
    const dur = Number(draft.duration);
    if (!Number.isFinite(dur) || dur < 0) return alert('Trvanie musí byť číslo (min)');

    const patch = {
      date: draft.date,
      duration: dur,
      description: draft.description,
    };

    await updateById(editingId, patch);

    // optimisticky aktualizuj lokálny stav
    setRecords((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...patch } : r)));
    cancelEdit();
  };

  const deleteRec = async (id: string) => {
    await removeById(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) cancelEdit();
  };

  // súčet minút v mesiaci (na info)
  const totalMinutes = React.useMemo(
    () => monthEntries.reduce((s, r) => s + Number(r.duration || 0), 0),
    [monthEntries],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={{ marginBottom: 16 }}>
        Tréningy za {month} • {monthEntries.length} záznamov • {totalMinutes} min
      </Title>

      {monthEntries.length === 0 ? (
        <Paragraph>Žiadne záznamy pre tento mesiac.</Paragraph>
      ) : (
        monthEntries.map((rec) => (
          <Card key={rec.id} style={styles.card}>
            <Card.Content>
              <Title>{new Date(rec.date).toLocaleDateString()}</Title>
              <Paragraph>{String(rec.duration)} min</Paragraph>
              {rec.description ? <Paragraph>{rec.description}</Paragraph> : null}

              {editingId === rec.id ? (
                <>
                  <TextInput
                    label="Dátum (YYYY-MM-DD)"
                    value={draft?.date ?? ''}
                    onChangeText={(t) => setDraft((d) => ({ ...(d as any), date: t }))}
                    style={styles.input}
                  />
                  <TextInput
                    label="Trvanie (min)"
                    keyboardType="numeric"
                    value={draft?.duration ?? ''}
                    onChangeText={(t) => setDraft((d) => ({ ...(d as any), duration: t }))}
                    style={styles.input}
                  />
                  <TextInput
                    label="Popis"
                    value={draft?.description ?? ''}
                    onChangeText={(t) => setDraft((d) => ({ ...(d as any), description: t }))}
                    style={styles.input}
                    multiline
                  />
                  <View style={styles.actions}>
                    <Button onPress={cancelEdit}>Zrušiť</Button>
                    <Button mode="contained" onPress={saveEdit}>
                      Uložiť
                    </Button>
                  </View>
                </>
              ) : (
                <View style={styles.actions}>
                  <Button onPress={() => startEdit(rec)}>Upraviť</Button>
                  <Button onPress={() => deleteRec(rec.id)} textColor="crimson">
                    Zmazať
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
