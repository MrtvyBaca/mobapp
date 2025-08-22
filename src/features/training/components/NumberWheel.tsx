// src/features/training/components/NumberWheel.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Text } from 'react-native-paper';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number; // default 0
  max?: number; // default 59
  step?: number; // default 1
  visibleCount?: number; // nepárne, default 5
  itemHeight?: number; // px, default 44
  pad2?: boolean; // 01, 02..., default true
};

export default function NumberWheel({
  value,
  onChange,
  min = 0,
  max = 59,
  step = 1,
  visibleCount = 5,
  itemHeight = 44,
  pad2 = true,
}: Props) {
  const data = useMemo(() => {
    const a: number[] = [];
    for (let v = min; v <= max; v += step) a.push(v);
    return a;
  }, [min, max, step]);

  const scrollRef = useRef<ScrollView>(null);
  const pad = Math.floor(visibleCount / 2);
  const h = itemHeight;
  const fmt = (n: number) => (pad2 ? String(n).padStart(2, '0') : String(n));

  useEffect(() => {
    const idx = Math.max(0, data.indexOf(value));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: idx * h, animated: false });
    });
  }, [value, data, h]);

  const snapTo = (y: number) => {
    const raw = Math.round(y / h);
    const idx = Math.max(0, Math.min(data.length - 1, raw));
    const newY = idx * h;
    if (Math.abs(newY - y) > 0.5) scrollRef.current?.scrollTo({ y: newY, animated: true });
    const v = data[idx];
    if (v !== value) onChange(v);
  };

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    snapTo(e.nativeEvent.contentOffset.y);
  };

  return (
    <View
      style={{ height: h * visibleCount, width: '100%' }}
      // ⬇️ zachytíme gestá, aby parent ScrollView neprevzal scroll
      onStartShouldSetResponderCapture={() => true}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={h}
        decelerationRate="fast"
        overScrollMode="never"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onMomentumScrollEnd={onEnd}
        onScrollEndDrag={onEnd}
        contentContainerStyle={{ paddingVertical: pad * h }}
      >
        {data.map((item, i) => (
          <View key={`${item}-${i}`} style={[styles.item, { height: h }]}>
            <Text
              variant={item === value ? 'titleMedium' : 'bodyLarge'}
              style={{ opacity: item === value ? 1 : 0.6 }}
            >
              {fmt(item)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* stredový zvýrazňovač */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: pad * h,
          height: h,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: '#cbd5e1',
          backgroundColor: 'rgba(0,0,0,0.03)',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'center', justifyContent: 'center' },
});
