// Micro vertical bars: average primary metric per time bucket (same buckets as main charts).

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { MeanMetricBucket } from '@/lib/insights-aggregates';

type Props = {
  buckets: readonly MeanMetricBucket[];
  tint: string;
  trackColor: string;
  textColor: string;
  mutedColor: string;
  bucketUnitPhrase: string;
};

export function MeanMetricMicroChart({
  buckets,
  tint,
  trackColor,
  textColor,
  mutedColor,
  bucketUnitPhrase,
}: Props) {
  const withApps = buckets.filter((b) => b.count > 0);
  const maxMean = withApps.length ? Math.max(...withApps.map((b) => b.mean), 0.01) : 1;
  const maxH = 52;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Average primary metric by ${bucketUnitPhrase}. ${buckets
        .filter((b) => b.count > 0)
        .map((b) => `${b.label} average ${b.mean}`)
        .join(', ')}`}>
      <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
        Metric shape (average per {bucketUnitPhrase})
      </ThemedText>
      <ThemedText style={[styles.caption, { color: mutedColor }]}>
        Tiny bars show how your recorded primary metric tends to differ across the timeline, only from stored values.
      </ThemedText>
      <View style={[styles.row, { borderColor: trackColor }]}>
        {buckets.map((b) => {
          const h = b.count > 0 ? Math.max(6, (b.mean / maxMean) * maxH) : 4;
          return (
            <View key={b.sortKey} style={styles.col} accessibilityLabel={`${b.label} mean metric ${b.mean}`}>
              <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
                <View style={[styles.barFill, { height: h, backgroundColor: tint }]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 3,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
    minHeight: 72,
  },
  col: { flex: 1, alignItems: 'center', minWidth: 0 },
  barTrack: {
    width: '100%',
    maxWidth: 14,
    height: 56,
    borderRadius: 6,
    justifyContent: 'flex-end',
    alignItems: 'center',
    alignSelf: 'center',
  },
  barFill: { width: '100%', borderRadius: 6, minHeight: 4 },
});
