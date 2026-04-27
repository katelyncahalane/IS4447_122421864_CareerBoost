// 14-day activity strip — one dot per calendar day; intensity from stored counts only (daily view).

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { InsightBucket } from '@/lib/insights-aggregates';

type Props = {
  buckets: readonly InsightBucket[];
  maxCount: number;
  tint: string;
  trackColor: string;
  textColor: string;
  mutedColor: string;
};

export function DayHeatmapRow({ buckets, maxCount, tint, trackColor, textColor, mutedColor }: Props) {
  const safeMax = Math.max(maxCount, 1);

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel="Daily activity heatmap for last 14 days">
      <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
        Daily rhythm
      </ThemedText>
      <ThemedText style={[styles.caption, { color: mutedColor }]}>
        Each dot is one calendar day; stronger colour means more applications that day (saved dates only).
      </ThemedText>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        {buckets.map((b) => {
          const intensity = b.count / safeMax;
          const alpha = 0.12 + intensity * 0.88;
          return (
            <View
              key={b.sortKey}
              style={styles.cell}
              accessibilityLabel={`${b.label} ${b.count} applications`}
              accessibilityRole="text">
              <View style={[styles.dot, { backgroundColor: tint, opacity: Math.max(0.15, alpha) }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <ThemedText style={[styles.legend, { color: mutedColor }]}>quieter</ThemedText>
        <View style={[styles.legendBar, { backgroundColor: trackColor }]}>
          <View style={[styles.legendFill, { width: '100%', backgroundColor: tint, opacity: 0.35 }]} />
        </View>
        <ThemedText style={[styles.legend, { color: mutedColor }]}>busier</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
  },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legend: { fontSize: 11, fontWeight: '700' },
  legendBar: { flex: 1, height: 6, borderRadius: 999, overflow: 'hidden' },
  legendFill: { height: '100%', borderRadius: 999 },
});
