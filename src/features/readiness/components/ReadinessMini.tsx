import React from 'react';
import { StyleSheet, View, ViewStyle, LayoutChangeEvent } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Card, Text, ActivityIndicator, Button } from 'react-native-paper';
import { getAll as getAllReadiness } from '@/features/readiness/storage';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Defs, LinearGradient, Stop, Line as SvgLine, Text as SvgText, Circle as SvgCircle } from 'react-native-svg';

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
    if (segX.length === 1) { d += `M ${segX[0]} ${segY[0]} `; segX = []; segY = []; return; }
    if (segX.length < 2) { segX = []; segY = []; return; }
    d += `M ${segX[0]} ${segY[0]} `;
    for (let i = 0; i < segX.length - 1; i++) {
      const x0 = i === 0 ? segX[i] : segX[i - 1];
      const y0 = i === 0 ? segY[i] : segY[i - 1];
      const x1 = segX[i],   y1 = segY[i];
      const x2 = segX[i+1], y2 = segY[i+1];
      const x3 = i + 2 < segX.length ? segX[i+2] : x2;
      const y3 = i + 2 < segY.length ? segY[i+2] : y2;
      const c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6;
      const c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6;
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
const DAYS = 21;
const load = React.useCallback(async () => {
  setBusy(true);
  try {
    const raw: ReadinessRecord[] = await getAllReadiness();
    const map = new Map<string, number>();
    for (const r of raw) {
      if (typeof r.score === 'number' && r.date) map.set(r.date.slice(0, 10), r.score);
    }
    const arr: { y: number | null; d: Date }[] = [];
    // 2) posledných 21 dní (DAYS - 1 ... 0)
    for (let i = DAYS - 1; i >= 0; i--) {
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
  const PAD_L = 36, PAD_R = 12, PAD_T = 6, PAD_B = 28; // ⬅️ väčší ľavý + spodný
  const innerW = Math.max(1, cardWidth - PAD_L - PAD_R);
  const innerH = Math.max(1, H - PAD_T - PAD_B);

  const yScale = (v: number) => PAD_T + innerH * (1 - v / 10);

  const xs = points.map((_, i) => PAD_L + (innerW * i) / Math.max(1, points.length - 1));
  const vals = points.map(p => (p.y == null ? null : Math.max(0, Math.min(10, p.y))));
  const smoothVals = smooth(vals, 3);
  const ys = smoothVals.map(v => (v == null ? null : yScale(v)));
const xTickIdxs = points.length
  ? Array.from({ length: points.length }, (_, i) => i)
      .filter(i => i % 7 === 0 || i === points.length - 1)
  : [];
  const pathLine = toSmoothPath(xs, ys);
const fmtDM = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}`;
  // area pod čiarou
function toAreaPath() {
  let d = '';
  let segStart = -1;
  const baseY = yScale(0);

  const addSegment = (startIdx: number, endIdx: number) => {
    const segXs = xs.slice(startIdx, endIdx + 1);
    const segYs = ys.slice(startIdx, endIdx + 1);
    if (segXs.length === 0) return;

    const segPath = toSmoothPath(segXs, segYs); // môže byť "M x y" alebo "M...C..."
    const startX = segXs[0];
    const endX   = segXs[segXs.length - 1];

    if (!segPath) return;
    // vždy začína na M → doplníme uzatvorenie k základni
    d += `${segPath} L ${endX} ${baseY} L ${startX} ${baseY} Z `;
  };

  for (let i = 0; i < xs.length; i++) {
    if (ys[i] != null && segStart === -1) segStart = i;
    const isEnd = segStart !== -1 && (i === xs.length - 1 || ys[i + 1] == null);
    if (isEnd) { addSegment(segStart, i); segStart = -1; }
  }
  return d.trim();
}



  const pathArea = toAreaPath();
const hasAnyPoint = ys.some(v => v != null);
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
) : cardWidth > 0 ? (
  <Svg width="100%" height={H}>
    <Defs>
    </Defs>

    {/* ▼ Y-os (vertikálna čiara) */}
    <SvgLine
      x1={PAD_L} x2={PAD_L}
      y1={PAD_T} y2={PAD_T + innerH}
      stroke="rgba(0,0,0,0.35)" strokeWidth={1}
    />

    {/* ▼ Y-ticky a popisky: 0, 5, 10 */}
    {[0, 5, 10].map(v => {
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

    {/* ▼ X-ticky: každý 7. deň + posledný, zobrazíme deň v mesiaci */}
    {xTickIdxs.map(i => (
      <React.Fragment key={`xtick-${i}`}>
        <SvgLine
          x1={xs[i]} x2={xs[i]}
          y1={PAD_T} y2={PAD_T + innerH}
          stroke="rgba(0,0,0,0.08)" strokeWidth={1}
        />
        <SvgText
          x={xs[i]} y={PAD_T + innerH + 14}
          fontSize="10" fill="rgba(0,0,0,0.7)"
          textAnchor="middle"
        >
          {fmtDM(points[i].d)}
        </SvgText>
      </React.Fragment>
    ))}

    {/* ▼ popisky osí */}
    {/* Y label (otočený) */}
    <SvgText
      x={12} y={PAD_T + innerH / 2}
      fontSize="11" fill="rgba(0,0,0,0.8)"
      transform={`rotate(-90 12 ${PAD_T + innerH / 2})`}
      textAnchor="middle"
    >
      {t('recovery.score', { defaultValue: 'Score' })}
    </SvgText>

    {/* X label */}
    <SvgText
      x={PAD_L + innerW / 2} y={PAD_T + innerH + 24}
      fontSize="11" fill="rgba(0,0,0,0.8)"
      textAnchor="middle"
    >
      {t('stats.axis.x', { defaultValue: 'Day' })}
    </SvgText>

    {/* plocha + krivka + bodky */}

  {pathLine && pathLine.startsWith('M') ? (
    <Path d={pathLine} stroke="#1f3a93" strokeWidth={5} fill="none" />
  ) : null}
    {hasAnyPoint && points.map((p, i) =>
      p.y == null ? null : (
        <SvgCircle key={i} cx={xs[i]} cy={ys[i] as number} r={2.5} fill="#1f3a93" />
      )
    )}
  </Svg>
) : (
  <ActivityIndicator />
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
