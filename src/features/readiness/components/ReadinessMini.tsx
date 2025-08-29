import React from 'react';
import { StyleSheet, View, ViewStyle, LayoutChangeEvent } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient, Stop, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { Card, Text, ActivityIndicator, Button } from 'react-native-paper';
import { getAll as getAllReadiness } from '@/features/readiness/storage';
import { useTranslation } from 'react-i18next';
type ReadinessRecord = { date: string; score: number }; // 0..10

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// smoothing
function smooth(values: (number | null)[], window = 3) {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] == null) { out.push(null); continue; }
    let sum = 0, cnt = 0;
    for (let k = -Math.floor(window/2); k <= Math.floor(window/2); k++) {
      const j = i + k;
      if (j >= 0 && j < values.length && values[j] != null) { sum += values[j] as number; cnt++; }
    }
    out.push(cnt ? sum / cnt : values[i]);
  }
  return out;
}

// Catmull-Rom smoothing
function toSmoothPath(xs: number[], ys: (number | null)[]) {
  let d = '';
  let segX: number[] = [], segY: number[] = [];
  const flush = () => {
    if (segX.length < 2) { segX = []; segY = []; return; }
    d += `M ${segX[0]} ${segY[0]} `;
    for (let i = 0; i < segX.length - 1; i++) {
      const x0 = i === 0 ? segX[i] : segX[i - 1];
      const y0 = i === 0 ? segY[i] : segY[i - 1];
      const x1 = segX[i],   y1 = segY[i];
      const x2 = segX[i+1], y2 = segY[i+1];
      const x3 = i + 2 < segX.length ? segX[i+2] : x2;
      const y3 = i + 2 < segY.length ? segY[i+2] : y2;

      const c1x = x1 + (x2 - x0) / 6;
      const c1y = y1 + (y2 - y0) / 6;
      const c2x = x2 - (x3 - x1) / 6;
      const c2y = y2 - (y3 - y1) / 6;

      d += `C ${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2} `;
    }
    segX = []; segY = [];
  };

  for (let i = 0; i < xs.length; i++) {
    if (ys[i] == null) { flush(); continue; }
    segX.push(xs[i]); segY.push(ys[i] as number);
  }
  flush();
  return d.trim();
}

export default function ReadinessMini({ style }: { style?: ViewStyle }) {
  const navigation = useNavigation<any>();
const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const [points, setPoints] = React.useState<{ y: number | null; d: Date }[]>([]);

  const [cardWidth, setCardWidth] = React.useState<number>(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - cardWidth) > 1) setCardWidth(w);
  };

  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const raw: ReadinessRecord[] = await getAllReadiness();
      const map = new Map<string, number>();
      for (const r of raw) {
        if (typeof r.score === 'number' && r.date) map.set(r.date.slice(0, 10), r.score);
      }
      const arr: { y: number | null; d: Date }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = daysAgo(i);
        const key = ymd(d);
        arr.push({ y: map.has(key) ? (map.get(key) as number) : null, d });
      }
      setPoints(arr);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(React.useCallback(() => { void load(); }, [load]));

  const H = Math.max(160, Math.min(240, cardWidth * 0.42));
  const PAD_L = 28, PAD_R = 12, PAD_T = 6, PAD_B = 20;
  const innerW = Math.max(1, cardWidth - PAD_L - PAD_R);
  const innerH = Math.max(1, H - PAD_T - PAD_B);

  const yScale = (v: number) => PAD_T + innerH * (1 - v / 10);

  const xs = points.map((_, i) => PAD_L + (innerW * i) / Math.max(1, points.length - 1));
  const vals = points.map(p => (p.y == null ? null : Math.max(0, Math.min(10, p.y))));
  const smoothVals = smooth(vals, 3);
  const ys = smoothVals.map(v => (v == null ? null : yScale(v)));

  const pathLine = toSmoothPath(xs, ys);

  // area pod čiarou
  function toAreaPath() {
    let d = '';
    let segStart = -1;
    for (let i = 0; i < xs.length; i++) {
      if (ys[i] != null && segStart === -1) segStart = i;
      const isEnd = (segStart !== -1) && (i === xs.length - 1 || ys[i + 1] == null);
      if (isEnd) {
        const startX = xs[segStart], endX = xs[i];
        const segPath = toSmoothPath(xs.slice(segStart, i + 1), ys.slice(segStart, i + 1));
        d += `${segPath} L ${endX} ${yScale(0)} L ${startX} ${yScale(0)} Z `;
        segStart = -1;
      }
    }
    return d.trim();
  }
  const pathArea = toAreaPath();

  return (
    
    <Card style={[styles.card, style]} onLayout={onLayout}>
      <Card.Content style={styles.content}>
        <View style={styles.headerRow}>
            <Text variant="titleMedium">{t('screens.trainingsFeed.readinnessTitle')}</Text>
          <Button compact onPress={() => navigation.navigate('ReadinessLog')}>
            {t('screens.trainingsFeed.readinnessAdd', { defaultValue: 'Add' })}
          </Button>
        </View>

        {busy ? (
          <ActivityIndicator />
        ) : (
          <Svg width="100%" height={H}>
            <Defs>
              <LinearGradient id="readinessFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#3b82f6" stopOpacity="0.35" />
                <Stop offset="1" stopColor="#3b82f6" stopOpacity="0.05" />
              </LinearGradient>
            </Defs>

            {/* Y axis + labels (0, 10) */}
            {[0, 10].map(v => {
              const y = yScale(v);
              return (
                <React.Fragment key={v}>
                  <SvgLine
                    x1={PAD_L} x2={cardWidth - PAD_R}
                    y1={y} y2={y}
                    stroke="rgba(0,0,0,0.15)" strokeWidth={1}
                  />
                  <SvgText
                    x={PAD_L - 6} y={y + 4}
                    fontSize="10" fill="rgba(0,0,0,0.7)"
                    textAnchor="end"
                  >
                    {v}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* vyplnená plocha */}
            <Path d={pathArea} fill="url(#readinessFill)" />

            {/* krivka */}
            <Path d={pathLine} stroke="#1f3a93" strokeWidth={2.5} fill="none" />
          </Svg>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, alignSelf: 'stretch', borderRadius: 12, elevation: 2 },
  content: { gap: 8, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
