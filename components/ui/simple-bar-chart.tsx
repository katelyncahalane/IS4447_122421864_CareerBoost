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
      <View style={styles.row}>
        {data.map((b) => {
          const h = maxCount === 0 ? 0 : Math.round((b.count / safeMax) * maxH);
          return (
            <View key={b.label} style={styles.col}>
              <ThemedText style={[styles.count, { color: textColor }]}>{b.count}</ThemedText>
              <View style={[styles.track, { backgroundColor: track }]}>
                <View
                  style={[
                    styles.fill,
                    { height: Math.max(h, b.count > 0 ? 4 : 0), backgroundColor: tint },
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
    </View>
  );
}

// styles
const styles = StyleSheet.create({
  wrap: { width: '100%' },
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
});
