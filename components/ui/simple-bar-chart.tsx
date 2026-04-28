// simple bar chart – Views only (rubric chart without extra native chart deps)

// imports
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// types
export type BarDatum = { label: string; count: number };

type SimpleBarChartProps = {
  data: BarDatum[];
  maxCount: number;
  tint: string;
  track: string;
  textColor: string;
  /** Optional axis titles for clearer marking demos */
  xAxisTitle?: string;
  yAxisTitle?: string;
  /** When set, each bar uses these colours (cycles if shorter than data). */
  barColors?: string[];
  /** Announced to screen readers for the whole chart */
  accessibilitySummary: string;
};

// component
export function SimpleBarChart({
  data,
  maxCount,
  tint,
  track,
  textColor,
  xAxisTitle,
  yAxisTitle,
  barColors,
  accessibilitySummary,
}: SimpleBarChartProps) {
  const maxH = 120;
  const safeMax = Math.max(maxCount, 1);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilitySummary}
      style={styles.wrap}>
      {yAxisTitle ? (
        <View style={styles.axisTitleRow} accessibilityElementsHidden>
          <ThemedText style={[styles.axisTitle, { color: textColor }]}>{yAxisTitle}</ThemedText>
          <ThemedText style={[styles.axisTick, { color: textColor }]}>{maxCount}</ThemedText>
        </View>
      ) : null}

      <View style={styles.row}>
        {data.map((b, i) => {
          const h = maxCount === 0 ? 0 : Math.round((b.count / safeMax) * maxH);
          const fill =
            barColors && barColors.length > 0 ? barColors[i % barColors.length]! : tint;
          return (
            <View key={b.label} style={styles.col}>
              <ThemedText style={[styles.count, { color: textColor }]}>{b.count}</ThemedText>
              <View style={[styles.track, { backgroundColor: track }]}>
                <View
                  style={[
                    styles.fill,
                    { height: Math.max(h, b.count > 0 ? 4 : 0), backgroundColor: fill },
                  ]}
                  accessibilityElementsHidden
                />
              </View>
              <ThemedText
                numberOfLines={2}
                style={[styles.lab, { color: textColor }]}
                accessibilityLabel={`${b.label}, ${b.count} applications`}>
                {b.label}
              </ThemedText>
            </View>
          );
        })}
      </View>

      {xAxisTitle ? (
        <View style={styles.xAxisRow} accessibilityElementsHidden>
          <ThemedText style={[styles.axisTitle, { color: textColor }]}>{xAxisTitle}</ThemedText>
          <ThemedText style={[styles.axisTick, { color: textColor }]}>0</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

// styles
const styles = StyleSheet.create({
  wrap: { width: '100%' },
  axisTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 },
  col: { flex: 1, alignItems: 'center', minWidth: 0 },
  count: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  track: {
    width: '100%',
    maxWidth: 36,
    height: 120,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: { width: '100%', borderRadius: 4, minHeight: 0 },
  lab: { fontSize: 10, marginTop: 6, textAlign: 'center' },
  xAxisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  axisTitle: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  axisTick: { fontSize: 12, fontWeight: '700', opacity: 0.75 },
});
