import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import type { TrainingRecord } from '@/shared/lib/training';
import { inferType } from '@/shared/lib/training';
import { getSettings } from '@/features/settings/storage';
import { getAll } from '@/features/training/storage';
import { GOAL_KEYS, type GoalKey, goalKeyFromRecord, goalLabel, goalIcon } from '@/shared/lib/goals';

// hore k súboru: nastav menšie rozmery
const CHART_H = 96;   // výška stĺpcov (z 120 → 96)
const SLOT_W  = 44;   // šírka "slotu" pre jeden stĺpec
const BAR_W   = 20;   // reálna šírka vyplnenej tyče
const GAP     = 10;   // medzera medzi stĺpcami


type GoalsMap = Partial<Record<GoalKey, number>>;

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`; // 'YYYY-MM'
}

// kratší popis pod ikonou (nech sa nezalieva)
function shortLabel(key: GoalKey, t: (k: string, o?: any) => string) {
  switch (key) {
    case 'Led:Individuál':
      return t('screens.addTraining.individual', { defaultValue: 'Individuál' });
    case 'Led:Tímový':
      return t('screens.addTraining.team', { defaultValue: 'Tímový' });
    case 'Kondice:Silovy':
      return t('screens.addTraining.weight', { defaultValue: 'Silový' });
    case 'Kondice:Kardio':
      return t('screens.addTraining.cardio', { defaultValue: 'Kardio' });
    case 'Kondice:Mobilita':
      return t('screens.addTraining.mobility', { defaultValue: 'Mobilita' });
  }
}

export default function MonthlyGoalsSummary() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [targets, setTargets] = React.useState<GoalsMap>({});
  const [counts, setCounts]   = React.useState<GoalsMap>({});
  const [busy, setBusy]       = React.useState(false);

  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const s = await getSettings();
      const allTargets = (s.monthlyTargets ?? {}) as Record<string, number>;

      // drž len povolené kľúče
      const tgs: GoalsMap = {};
      for (const k of GOAL_KEYS) {
        if (allTargets[k] != null) tgs[k] = allTargets[k]!;
      }
      setTargets(tgs);

      // spočítaj za aktuálny mesiac
      const mk = monthKey();
      const all: TrainingRecord[] = await getAll();

      const cnt: GoalsMap = {};
      for (const k of Object.keys(tgs) as GoalKey[]) cnt[k] = 0;

      for (const r of all) {
        if (!r.date?.startsWith(mk)) continue;
        // ak by niektoré staršie nemali type, doinferuj (kvôli Kardiou apod.)
        r.type = r.type ?? inferType({
          category: r.category,
          group: r.group,
          subtype: r.subtype,
          type: r.type,
          description: r.description,
        });
        const key = goalKeyFromRecord(r);
        if (key && tgs[key] != null) {
          cnt[key] = (cnt[key] ?? 0) + 1;
        }
      }
      setCounts(cnt);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(React.useCallback(() => { void load(); }, [load]));

  const entries = (Object.entries(targets) as [GoalKey, number][])
    .filter(([, v]) => typeof v === 'number' && v > 0);

  // nič nastavené -> kompaktná výzva
  if (entries.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content style={{ gap: 8 }}>
          <View style={styles.headerRow}>
            <Text variant="titleMedium">{t('goals.header', { defaultValue: 'Mesačné ciele' })}</Text>
            <Button compact onPress={() => navigation.navigate('Settings')}>
              {t('goals.edit', { defaultValue: 'Upraviť' })}
            </Button>
          </View>
          <Text variant="bodyMedium" style={{ opacity: 0.8 }}>
            {t('goals.none', { defaultValue: 'Zatiaľ nemáš nastavené žiadne ciele.' })}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  // priprava dát pre stĺpce
  const bars = entries.map(([key, target]) => {
    const current = counts[key] ?? 0;
    const ratio = target > 0 ? Math.min(1, current / target) : 0;
    return { key, target, current, ratio };
  });
  const rowWidth = bars.length * SLOT_W + (bars.length - 1) * GAP;
  return (
<Card style={styles.card}>
    <Card.Content style={{ gap: 12 }}>
      <View style={styles.headerRow}>
        <Text variant="titleMedium">{t('goals.header', { defaultValue: 'Mesačné ciele' })}</Text>
        <Button compact onPress={() => navigation.navigate('Settings')}>
          {t('goals.edit', { defaultValue: 'Upraviť' })}
        </Button>
      </View>

      {/* Graf – už BEZ pevnej výšky, len fixná šírka a centrovanie */}
      <View style={[styles.chartRow, { width: rowWidth }]}>
        {bars.map(({ key, ratio, current, target }) => (
          <View key={key} style={styles.barSlot}>
            {/* Oblasť stĺpcov má pevnú výšku → nič nepretečie hore/dole */}
            <View style={styles.barArea}>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { height: Math.max(4, Math.round(ratio * CHART_H)) },
                  ]}
                />
              </View>
            </View>

            {/* popisky sú mimo barArea → nezaliezajú do hlavičky */}
            <Text variant="labelSmall" style={styles.percent}>{Math.round(ratio * 100)}%</Text>

            <View style={styles.iconRow}>
              <Icon source={goalIcon(key)} size={16} />
              <Text variant="labelSmall" numberOfLines={1} style={styles.iconLabel}>
                {shortLabel(key, t)}
              </Text>
            </View>

            <Text variant="labelSmall" style={styles.cta}>{current} / {target}</Text>
          </View>
        ))}
      </View>
    </Card.Content>
  </Card>
  );
}

// štýly – upravené
const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginTop: 12, borderRadius: 12, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // rad grafu má len šírku a vertikálne paddingy; výška sa dopočíta podľa obsahu
  chartRow: {
    alignSelf: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: GAP,
    paddingVertical: 6,
    // žiadny height tu!
  },

  // slot pre jeden stĺpec – pevná šírka, žiadny flex:1
  barSlot: {
    width: SLOT_W,
    alignItems: 'center',
  },

  // oblasť pre samotný stĺpec má pevnú výšku
  barArea: {
    height: CHART_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  // pozadie a výplň stĺpca
  barBg: {
    width: BAR_W,
    height: CHART_H,
    borderRadius: 8,
    backgroundColor: '#e9eef5',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },

  percent: { marginTop: 4, opacity: 0.8 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, maxWidth: '100%' },
  iconLabel: { flexShrink: 1, opacity: 0.9 },
  cta: { marginTop: 2, opacity: 0.7 },
});