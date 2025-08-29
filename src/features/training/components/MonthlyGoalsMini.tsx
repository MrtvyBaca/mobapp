import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Card, Text, IconButton, Icon, ProgressBar, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import type { TrainingRecord } from '@/shared/lib/training';
import { getAll } from '@/features/training/storage';
import { getSettings } from '@/features/settings/storage';
import { GOAL_KEYS, type GoalKey, goalKeyFromRecord, goalIcon } from '@/shared/lib/goals';

type GoalsMap = Partial<Record<GoalKey, number>>;

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`; // 'YYYY-MM'
}

export default function MonthlyGoalsMini({ style }: { style?: ViewStyle }) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [targets, setTargets] = React.useState<GoalsMap>({});
  const [counts, setCounts]   = React.useState<GoalsMap>({});
  const [busy, setBusy]       = React.useState(false);

  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const s = await getSettings();
      const raw = (s.monthlyTargets ?? {}) as Record<string, number>;

      // necháme iba povolené ciele (Led:Individuál/Tímový, Kondice:Silovy/Kardio/Mobilita)
      const tgs: GoalsMap = {};
      for (const k of GOAL_KEYS) if (raw[k] != null) tgs[k] = raw[k]!;
      setTargets(tgs);

      const mk = monthKey();
      const all: TrainingRecord[] = await getAll();

      // init na 0 len pre definované ciele
      const cnt: GoalsMap = {};
      for (const k of Object.keys(tgs) as GoalKey[]) cnt[k] = 0;

      for (const r of all) {
        if (!r.date?.startsWith(mk)) continue;
        const key = goalKeyFromRecord(r);
        if (key && tgs[key] != null) cnt[key] = (cnt[key] ?? 0) + 1;
      }
      setCounts(cnt);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(React.useCallback(() => { void load(); }, [load]));

  const entries = (Object.entries(targets) as [GoalKey, number][])
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .slice(0, 5); // aj tak máš max 4 ciele

  return (
    <Card style={[styles.card, style]}>
      <Card.Content style={{ gap: 8 }}>
        <View style={styles.headerRow}>
            <Text variant="titleMedium">
    {t('screens.trainingsFeed.goals.header', { defaultValue: 'Mesačné ciele' })}
  </Text>
          <Button compact onPress={() => navigation.navigate('MonthlyGoalsEdit')}>
            {t('screens.trainingsFeed.goals.edit', { defaultValue: 'Upraviť' })}
          </Button>
        </View>

        {entries.length === 0 ? (
          <Text variant="bodySmall" style={{ opacity: 0.8 }}>
            {t('screens.trainingsFeed.goals.none', { defaultValue: 'Žiadne aktívne ciele.' })}
          </Text>
        ) : (
          entries.map(([key, target]) => {
            const current = counts[key] ?? 0;
            const ratio = target > 0 ? Math.min(1, current / target) : 0;

            return (
              <View key={key} style={{ gap: 5 }}>
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Icon source={goalIcon(key)} size={16} />
                    {/* len čísla: aktuálne / cieľ */}
                    <Text variant="labelMedium">
                      {current} / {target}
                    </Text>
                  </View>
                  <Text variant="labelSmall" style={{ opacity: 0.7 }}>
                    {Math.round(ratio * 100)}%
                  </Text>
                </View>
                {/* úzky progress bar */}
                <ProgressBar progress={ratio} style={styles.pb} />
              </View>
            );
          })
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  // default na polovicu šírky; dá sa prebiť `style` propom
    card: {
    flex: 1,
    minWidth: 0,          // ⚠️ dôležité pre správne delenie priestoru
    alignSelf: 'stretch',
    borderRadius: 12,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pb: { height: 6, borderRadius: 5 },
});
