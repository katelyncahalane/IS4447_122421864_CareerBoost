// simple pie chart – react-native-svg from SQLite-derived slice counts

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import type { SliceDatum } from '@/lib/insights-aggregates';

type SimplePieChartProps = {
  slices: SliceDatum[];
  size?: number;
  textColor: string;
  mutedColor: string;
  /** Centre “donut” fill so the hole matches the screen background */
  holeColor: string;
  accessibilitySummary: string;
};

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function slicePath(cx: number, cy: number, r: number, startRad: number, sweepRad: number): string {
  const endRad = startRad + sweepRad;
  const p0 = polar(cx, cy, r, startRad);
  const p1 = polar(cx, cy, r, endRad);
  const large = sweepRad > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
}

export function SimplePieChart({
  slices,
  size = 200,
  textColor,
  mutedColor,
  holeColor,
  accessibilitySummary,
}: SimplePieChartProps) {
  const model = useMemo(() => {
    const total = slices.reduce((s, x) => s + x.count, 0);
    if (total <= 0) return { kind: 'empty' as const };

    const positive = slices.filter((s) => s.count > 0);
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.36;

    if (positive.length === 1) {
      return { kind: 'single' as const, total, color: positive[0]!.color, cx, cy, r };
    }

    let cur = -Math.PI / 2;
    const arcs: { d: string; color: string }[] = [];
    for (const sl of positive) {
      const sweep = (sl.count / total) * Math.PI * 2;
      arcs.push({ d: slicePath(cx, cy, r, cur, sweep), color: sl.color });
      cur += sweep;
    }
    return { kind: 'multi' as const, total, arcs, cx, cy, r };
  }, [slices, size]);

  if (model.kind === 'empty') {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel="Pie chart. No data.">
        <ThemedText style={{ color: mutedColor }}>No data for pie chart.</ThemedText>
      </View>
    );
  }

  const { cx, cy, r } = model;

  return (
    <View style={styles.wrap}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilitySummary}
        style={styles.svgWrap}>
        <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no">
          <G>
            {model.kind === 'single' ? (
              <Circle cx={cx} cy={cy} r={r} fill={model.color} />
            ) : (
              model.arcs.map((a, i) => <Path key={i} d={a.d} fill={a.color} />)
            )}
            <Circle cx={cx} cy={cy} r={r * 0.48} fill={holeColor} />
          </G>
        </Svg>
      </View>
      <View style={styles.legend}>
        {slices
          .filter((s) => s.count > 0)
          .map((s) => (
            <View key={s.label} style={styles.legendRow} accessibilityLabel={`${s.label}, ${s.count}`}>
              <View style={[styles.swatch, { backgroundColor: s.color }]} />
              <ThemedText numberOfLines={1} style={[styles.legendText, { color: textColor }]}>
                {s.label} ({s.count})
              </ThemedText>
            </View>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 12 },
  svgWrap: { alignItems: 'center' },
  legend: { gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 14, height: 14, borderRadius: 4 },
  legendText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
