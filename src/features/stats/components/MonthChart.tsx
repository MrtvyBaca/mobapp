// File: src/features/stats/components/MonthChart.tsx
import React from 'react';
import { View } from 'react-native';
import { Card, Title, Text, useTheme } from 'react-native-paper';
import Svg, { Path, Line as SvgLine, Text as SvgText, Circle as SvgCircle, Rect as SvgRect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

/* --------------------------------------------------------------------------
 * MonthChart – lightweight custom SVG chart for monthly stats (no libs)
 *
 * Modes:
 *  - layout="combined" (default): one plot area (left: readiness 0–10, right: counts)
 *  - layout="split": TWO vertically-stacked panels (top: readiness 0–10, bottom: trainings)
 *
 * Right axis modes (affect the BOTTOM panel in split, or the single panel in combined):
 *  - rightAxisMode="count" (default): scale by max(counts)
 *  - rightAxisMode="ratio": scale 0..1 (render ticks as 0%, 50%, 100%)
 *
 * i18n-aware axis titles (CS/SK/EN) via react-i18next.
 * SMA with prefix so the first days in a month look natural.
 * Catmull–Rom → Bézier smoothing (can be swapped for monotone if needed).
 * -------------------------------------------------------------------------- */

/* ------------------------------ Helpers ----------------------------------- */
/** SMA (centered window) with optional prefix; returns only the current-month part. */
function smaWithPrefix(curr: (number | null)[], window: number, prefix: (number | null)[] = []) {
  const half = Math.floor(window / 2);
  const joined = [...prefix, ...curr];
  const out: (number | null)[] = [];
  for (let i = 0; i < joined.length; i++) {
    if (joined[i] == null) { out.push(null); continue; }
    let sum = 0, cnt = 0;
    for (let k = i - half; k <= i + half; k++) {
      if (k >= 0 && k < joined.length && joined[k] != null) { sum += joined[k] as number; cnt++; }
    }
    out.push(cnt ? sum / cnt : (joined[i] as number));
  }
  return out.slice(prefix.length);
}

/** Catmull–Rom → Bézier path builder with null gaps. */
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
// 1) PRIDAJ helper nad komponent:
function forwardFillWithPrefix(curr: (number | null)[], prefix: (number | null)[] = []) {
  let last: number | null = null;

  const ffPrefix: (number | null)[] = [];
  for (const v of prefix) { if (v != null) last = v; ffPrefix.push(last); }

  const ffCurr: (number | null)[] = [];
  for (const v of curr) { if (v != null) last = v; ffCurr.push(last); }

  return { ffCurr, ffPrefix };
}

/* --------------------------- Component Props -------------------------------- */
export type MonthChartProps = {
  title: string;                      // Card title shown above the SVG
  counts: number[];                   // daily training counts (or ratio 0..1)
  countsPrefix?: (number | null)[];   // prefix for counts SMA(7)
  readiness: (number | null)[];       // readiness 0..10 (null = no data for the day)
  readinessPrefix?: (number | null)[];// prefix for readiness SMA(3)
  showBars?: boolean;                 // render bars for counts
  trainColor?: string;                // color for counts (bars + SMA line)
  readyColor?: string;                // color for readiness line/points
  showLeftAxis?: boolean;             // toggle left axes
  showRightAxis?: boolean;            // kept for backward compat (unused in split)
  height?: number;                    // SVG height
  monthDays?: number;                 // used to derive tick density on X
  rightAxisMode?: 'count' | 'ratio';  // count → 0..max, ratio → 0..1 (percent ticks)
  layout?: 'combined' | 'split';      // single panel vs. two stacked panels
};

export default function MonthChart({
  title,
  counts,
  countsPrefix,
  readiness,
  readinessPrefix,
  showBars = true,
  trainColor,
  readyColor,
  showLeftAxis = true,
  showRightAxis = true,
  height = 260,
  monthDays,
  rightAxisMode = 'count',
  layout = 'combined',
}: MonthChartProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  // i18n axis titles (no "right" wording, usable for split left-bottom label)

  // Layout paddings & typography.
  const PAD_L = 54, PAD_R = 44, PAD_T = 12; // viac vľavo, keďže máme 2 ľavé titulky v split
  const TICK_FS = 10;                 // font-size for X ticks
  const TITLE_FS = 11;                // font-size for axis titles
  const TICK_LABEL_OFFSET = 14;       // distance from plot baseline to X tick labels
  const TITLE_GAP = 6;                // gap between X tick labels and X axis title
  const PAD_B = Math.max(48, TICK_LABEL_OFFSET + TICK_FS + TITLE_GAP + TITLE_FS + 6);

  // Outer size and inner plot rect
  const [w, setW] = React.useState(0);
  const H = height;
  const innerW = Math.max(1, w - PAD_L - PAD_R);
  const innerH = Math.max(1, H - PAD_T - PAD_B);

  // Split geometry
  const isSplit = layout === 'split';
  const GAP_M = isSplit ? 10 : 0; // medzera medzi panelmi
  const topY0 = PAD_T;
  const topH = isSplit ? Math.floor((innerH - GAP_M) * 0.5) : innerH;
  const bottomY0 = isSplit ? topY0 + topH + GAP_M : PAD_T;
  const bottomH = isSplit ? innerH - topH - GAP_M : innerH;

  // Baselines for X elements (labels & title) below the plot area (always under bottom panel)
  const tickY = PAD_T + innerH + (TICK_LABEL_OFFSET - 2);
  const titleY = tickY + TICK_FS + TITLE_GAP;

  // X positions for each day
  const N = counts.length;
  const xs = React.useMemo(
    () => Array.from({ length: N }, (_, i) => PAD_L + (innerW * i) / Math.max(1, N - 1)),
    [N, innerW]
  );

  // Scales
  const isRatio = rightAxisMode === 'ratio';
  const maxCount = isRatio ? 1 : Math.max(1, ...counts);
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const yReady = (v: number) => topY0 + topH * (1 - v / 10); // horný panel (0..10)
  const yBar = (v: number) => {
    const val = isRatio ? clamp01(v) : v;
    return bottomY0 + bottomH * (1 - val / maxCount);        // spodný panel (0..1) alebo (0..max)
  };

  // Trends (with prefix-aware SMA)
  const trainSMA = React.useMemo(
    () => smaWithPrefix(counts.map(v => (v === 0 ? null : v)), 7, countsPrefix ?? []).map(v => v ?? 0),
    [counts, countsPrefix]
  );
  const trainYs  = trainSMA.map(v => yBar(v));

const { ffCurr: readyFF, ffPrefix: readyFFPrefix } = React.useMemo(
  () => forwardFillWithPrefix(readiness, readinessPrefix ?? []),
  [readiness, readinessPrefix]
);
const readySMA = React.useMemo(
  () => smaWithPrefix(readyFF, 3, readyFFPrefix),
  [readyFF, readyFFPrefix]
);
  const readyYs  = readySMA.map(v => (v == null ? null : yReady(v)));

  // Smooth paths for the lines
  const pathTrain = toSmoothPath(xs, trainYs);
  const pathReady = toSmoothPath(xs, readyYs);

  // Presence flags
  const anyCounts = counts.some(v => v > 0);
  const anyReady  = readiness.some(v => v != null);

  // Colors
  const leftColor  = readyColor ?? theme.colors.primary;   // readiness line
  const rightColor = trainColor ?? theme.colors.secondary; // trainings line/bars

  // X tick density: ~6 ticks across the month
  const tickEvery = Math.max(1, Math.round((monthDays ?? N) / 6));

  // Axis title anchors (both on LEFT side now)
  const LEFT_TITLE_X = 16;
  const LEFT_READY_Y = topY0 + topH / 2;        // stred horného panela
  const LEFT_TRAIN_Y = bottomY0 + bottomH / 2;  // stred spodného panela

  return (
    <Card style={{ borderRadius: 12, elevation: 3 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Card.Content>
        <Title
  style={{ marginBottom: 8, textAlign: 'center' }}
  numberOfLines={2}
  ellipsizeMode="tail"
>
  {title}
</Title>
        {!w ? (
           <Text>{t('common.loading')}</Text>   
        ) : (
          <>
            <Svg width="100%" height={H}>
              {/* TOP PANEL — Readiness 0–10 */}
              {showLeftAxis && [0, 5, 10].map(v => {
                const y = yReady(v);
                return (
                  <React.Fragment key={`top-${v}`}>
                    <SvgLine x1={PAD_L} x2={w - PAD_R} y1={y} y2={y} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
                    <SvgText x={PAD_L - 10} y={y + 3} fontSize="10" fill="rgba(0,0,0,0.6)" textAnchor="end">{v}</SvgText>
                  </React.Fragment>
                );
              })}

              {/* Left title for readiness */}
              {showLeftAxis && (
                <SvgText
                  x={LEFT_TITLE_X}
                  y={LEFT_READY_Y}
                  fontSize="11"
                  fill="rgba(0,0,0,0.7)"
                  transform={`rotate(-90, ${LEFT_TITLE_X}, ${LEFT_READY_Y})`}
                  textAnchor="middle"
                >
                  {t('stats.axis.leftReady')}
                </SvgText>
              )}

              {/* Draw readiness line & points in TOP panel */}
              {anyReady && pathReady ? (
                <Path d={pathReady} stroke={leftColor} strokeWidth={3} fill="none" />
              ) : null}
              {anyReady && readyYs.map((yy, i) => (yy == null ? null : <SvgCircle key={`pt-${i}`} cx={xs[i]} cy={yy} r={2} fill={leftColor} />))}

              {/* Optional divider between panels */}
              {isSplit && (
                <SvgLine x1={PAD_L} x2={w - PAD_R} y1={bottomY0 - GAP_M / 2} y2={bottomY0 - GAP_M / 2} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
              )}

              {/* BOTTOM PANEL — Trainings (count or ratio) */}
              {showLeftAxis && (
                isRatio ? (
                  [0, 0.5, 1].map(v => (
                    <>
                    <SvgText key={`bot-${v}`} x={PAD_L - 10} y={yBar(v) + 3} fontSize="10" fill="rgba(0,0,0,0.6)" textAnchor="end">
                      {Math.round(v * 100)}%
                    </SvgText>
                          <SvgLine
                    key={`bg-${v}`}
                    x1={PAD_L}
                    x2={w - PAD_R}
                    y1={yBar(v)}
                    y2={yBar(v)}
                    stroke="rgba(0,0,0,0.12)"
                    strokeWidth={1}
      />
                    </>
                  ))
                ) : (
                  <>
                    <SvgText x={PAD_L - 10} y={yBar(maxCount) + 3} fontSize="10" fill="rgba(0,0,0,0.6)" textAnchor="end">{maxCount}</SvgText>
                    <SvgText x={PAD_L - 10} y={yBar(0) + 3} fontSize="10" fill="rgba(0,0,0,0.6)" textAnchor="end">0</SvgText>
                  </>
                )
              )}

              {/* Left title for trainings (bottom panel) */}
              {showLeftAxis && (
                <SvgText
                  x={LEFT_TITLE_X}
                  y={LEFT_TRAIN_Y}
                  fontSize="11"
                  fill="rgba(0,0,0,0.7)"
                  transform={`rotate(-90, ${LEFT_TITLE_X}, ${LEFT_TRAIN_Y})`}
                  textAnchor="middle"
                >
                  {                    isRatio
                      ? t('stats.axis.leftRatio')
                      : (showBars ? t('stats.axis.leftCount') : t('stats.axis.leftTrend'))}
                </SvgText>
              )}

              {/* Bars (daily counts) – bottom panel */}
              {showBars && anyCounts && xs.map((x, i) => {
                const v = counts[i] ?? 0;
                if (!v) return null;
                const bw = Math.max(2, (innerW / Math.max(14, N)) * 0.7);
                const yTop = yBar(v);
                const h = (bottomY0 + bottomH) - yTop;
                return (
                  <SvgRect key={`bar-${i}`} x={x - bw / 2} y={yTop} width={bw} height={h} fill={rightColor} rx={bw * 0.25} ry={bw * 0.25} />
                );
              })}

              {/* Trainings trend line (SMA-7) — bottom panel */}
              {anyCounts && pathTrain ? (
                <Path d={pathTrain} stroke={rightColor} strokeWidth={2} fill="none" />
              ) : null}

              {/* X ticks under BOTTOM panel */}
              {xs.map((x, i) => {
                const show = i % tickEvery === 0 || i === xs.length - 1;
                if (!show) return null;
                return (
                  <SvgText key={`x-${i}`} x={x} y={titleY - (TITLE_GAP + TITLE_FS)} fontSize={TICK_FS} fill="rgba(0,0,0,0.7)" textAnchor="middle">
                    {String(i + 1).padStart(2, '0')}
                  </SvgText>
                );
              })}

              {/* X axis title (centered under ticks) */}
              <SvgText x={PAD_L + innerW / 2} y={titleY} fontSize={TITLE_FS} fill="rgba(0,0,0,0.7)" textAnchor="middle">
                {t('stats.axis.x')}
              </SvgText>
            </Svg>
          </>
        )}
      </Card.Content>
    </Card>
  );
}
