// src/features/training/components/TrainingListItem.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Icon, Button } from 'react-native-paper';
import type { TrainingRecord } from '@/shared/lib/training';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/lib/datetime';
function parseYmdToLocalDate(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const [_, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

function iconFor(item: TrainingRecord): string {
  if (item.category === 'Led') return 'curling';
  switch (item.group) {
    case 'Silovy':   return 'dumbbell';
    case 'Kardio':   return 'run';
    case 'Mobilita': return 'meditation';
    default:         return 'dots-horizontal';
  }
}

type Props = {
  item: TrainingRecord;
  expanded?: boolean;      // 👈 nový prop
  onPress?: () => void;    // toggle expand
  onEdit?: () => void;
  onRemove?: () => void;
};

export default function TrainingListItem({ item, expanded, onPress, onEdit, onRemove }: Props) {
  const { t, i18n } = useTranslation();

  const title =
    (item.category &&
      t(`enums.category.${item.category}`, { defaultValue: String(item.category) })) ||
    t('screens.trainingsFeed.title');

  const subline =
    item.category === 'Led'
      ? (item.subtype &&
          t(`enums.subtype.${item.subtype}`, { defaultValue: String(item.subtype) })) ||
        t('enums.group.Led', { defaultValue: 'Ice' })
      : item.group
      ? t(`enums.group.${item.group}`, { defaultValue: String(item.group) })
      : null;

  const minutes = Number(item.duration || 0);
  const durationLabel = minutes > 0 ? t('units.minutes', { count: minutes }) : null;

  const dateObj =
    parseYmdToLocalDate(item.date) ??
    (isNaN(new Date(item.date).getTime()) ? null : new Date(item.date));

  const dateLabel = dateObj ? formatDate(dateObj) : item.date;

  const secondary = [subline, durationLabel ? `⏱ ${durationLabel}` : null]
    .filter(Boolean)
    .join(' • ');

  return (
    <Card
      style={styles.card}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${secondary || ''}, ${dateLabel}`}
    >
      <Card.Content>
        <View style={styles.row}>
          <View style={styles.left}>
            <View style={styles.iconWrap}>
              {item.category === 'Led'
                ? <Text style={{ fontSize: 18 }}>🥌</Text>
                : <Icon source={iconFor(item)} size={20} />
              }
            </View>
            <View style={styles.titles}>
              <Text variant="titleMedium" numberOfLines={1}>{title}</Text>
              {secondary ? (
                <Text variant="bodySmall" style={styles.secondary} numberOfLines={1}>
                  {secondary}
                </Text>
              ) : null}
            </View>
          </View>

          <Text variant="labelMedium" style={styles.date} numberOfLines={1}>
            {dateLabel}
          </Text>
        </View>

        {item.description ? (
          <Text variant="bodyMedium" numberOfLines={3} style={styles.desc}>
            {item.description}
          </Text>
        ) : null}

        {/* 👇 akčná lišta sa ukáže len keď je item „expanded“ */}
        {expanded ? (
          <View style={styles.actions}>
            <Button mode="outlined" onPress={onEdit}>
              {t('common.edit', { defaultValue: 'Edit' })}
            </Button>
            <Button mode="text" onPress={onRemove} textColor="crimson">
              {t('common.delete', { defaultValue: 'Delete' })}
            </Button>
          </View>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginTop: 12, borderRadius: 12, elevation: 2 },
  row:  { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  iconWrap: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e8eef7',
  },
  titles:   { flex: 1, minWidth: 0 },
  secondary:{ opacity: 0.8, marginTop: 2 },
  date:     { opacity: 0.7, marginLeft: 8, maxWidth: 110 },
  desc:     { marginTop: 8 },
  actions:  {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
