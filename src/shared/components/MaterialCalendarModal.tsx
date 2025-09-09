import React from 'react';
import { View } from 'react-native';
import { Portal, Dialog, Button, Text, useTheme } from 'react-native-paper';
import DatePicker, { DateType } from 'react-native-ui-datepicker';
import dayjs from 'dayjs';
import 'dayjs/locale/cs';
import 'dayjs/locale/sk';
import 'dayjs/locale/en';

type Props = {
  visible: boolean;
  date: DateType;                  // Date | string | dayjs
  locale?: 'cs' | 'sk' | 'en';
  onDismiss: () => void;
  onConfirm: (picked: Date) => void;
};
// 1) Lokálny konštruktor (bez UTC)
export function fromYmdLocal(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d); // lokálny čas, žiadny posun
}

// 2) Normalizácia na poludnie (vyhneš sa DST „dieram“)
export function toNoon(d: Date) {
  const out = new Date(d);
  out.setHours(12, 0, 0, 0);
  return out;
}
function ensureLocalDate(v: DateType | undefined): Date {
  if (!v) return new Date();
  if (typeof v === 'string') {
    // "YYYY-MM-DD" → lokálne (nie new Date(str), to je UTC!)
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0); // na poludnie
  }
  // dayjs → Date, inak nechaj
  const base = (typeof (v as any).toDate === 'function') ? (v as any).toDate() : (v as Date);
  const out = new Date(base);
  out.setHours(12, 0, 0, 0);
  return out;
}

function atNoon(d: Date) {
  const out = new Date(d);
  out.setHours(12, 0, 0, 0);
  return out;
}
export default function MaterialCalendarModal({
  visible,
  date,
  locale = 'en',
  onDismiss,
  onConfirm,
}: Props) {
  const theme = useTheme();

  // default na dnes, ak by prišlo null/undefined
const safeInitial = ensureLocalDate(date);
const [picked, setPicked] = React.useState<DateType>(safeInitial);

React.useEffect(() => {
  setPicked(ensureLocalDate(date));
}, [date]);

const d = dayjs(ensureLocalDate(picked as Date)).locale(locale);
const largeTitle = d.format('ddd, MMM D');

  // typovo čisté onChange (niekedy je typ p.date: DateType | undefined)
  const handleChange = (p: { date: DateType | undefined }) => {
    if (p.date) setPicked(p.date);
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ borderRadius: 12 }}>
        {/* HEADER */}
        <View
          style={{
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 18,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <Text variant="labelSmall" style={{ color: 'white', opacity: 0.9, letterSpacing: 1.3 }}>
            SELECT DATE
          </Text>
          <Text variant="headlineMedium" style={{ color: 'white', marginTop: 4, opacity: 0.9 }}>
            {largeTitle}
          </Text>
        </View>

        {/* BODY: kalendár */}
<Dialog.Content style={{ paddingTop: 16 }}>
  <DatePicker
    mode="single"
    date={picked}
    onChange={(p) => p?.date && setPicked(p.date)}
    locale={locale as any}
    // ⬇️ vlastný renderer dňa – bublina pre vybraný deň
components={{
  Day: (day: any) => {
    const isSelected = day.isSelected;
    const isDisabled = day.isDisabled;
    const isToday    = day.isToday;
    const isWithinMonth = day.isWithinMonth ?? true;

    // ✅ správne číslo dňa
    const label = day?.date ? day.date.date() : (day.day ?? day.dayOfMonth ?? 0);

    const ring = isToday && !isSelected;

    return (
      <View
        style={{
          width: 36, height: 36, borderRadius: 18,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: isSelected ? theme.colors.primary : 'transparent',
          opacity: isDisabled ? 0.35 : (isWithinMonth ? 1 : 0.5), // mimo mesiaca jemne stmav
          borderWidth: ring ? 1.5 : 0,
          borderColor: ring ? theme.colors.primary : 'transparent',
        }}
      >
        <Text
          style={{
            color: isSelected ? '#fff' : 'rgba(0,0,0,0.85)',
            fontWeight: isSelected ? '700' : (ring ? '600' : '400'),
          }}
        >
          {label}
        </Text>
      </View>
    );
  },
}}

  />
</Dialog.Content>

        {/* ACTIONS */}
        <Dialog.Actions>
          <Button onPress={onDismiss}>CANCEL</Button>
          <Button onPress={() => onConfirm(atNoon(ensureLocalDate(picked)))}>OK</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
