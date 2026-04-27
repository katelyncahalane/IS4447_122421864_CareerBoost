// stacked strip – share of applications per category (uses category colours from DB)

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { SliceDatum } from '@/lib/insights-aggregates';

type CategoryMixStripProps = {
  slices: SliceDatum[];
  textColor: string;
  mutedColor: string;
  trackColor: string;
  accessibilitySummary: string;
};

export function CategoryMixStrip({
  slices,
  textColor,
  mutedColor,
  trackColor,
  accessibilitySummary,
}: CategoryMixStripProps) {
  const total = slices.reduce((s, x) => s + x.count, 0);
  if (total <= 0) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel="Category mix. No data.">
        <ThemedText style={{ color: mutedColor }}>No categories in this period.</ThemedText>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilitySummary}
      style={styles.wrap}>
      <View style={[styles.strip, { backgroundColor: trackColor }]}>
        {slices.map((s) => (
          <View
            key={s.label}
            style={{
              flex: s.count,
              minWidth: s.count > 0 ? 4 : 0,
              backgroundColor: s.color,
            }}
            accessibilityElementsHidden
          />
        ))}
      </View>
      <View style={styles.legend}>
        {slices.map((s) => (
          <View key={`leg-${s.label}`} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <ThemedText numberOfLines={1} style={[styles.lab, { color: textColor }]}>
              {s.label}: {s.count} ({Math.round((s.count / total) * 100)}%)
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 10 },
  strip: { height: 22, borderRadius: 10, flexDirection: 'row', overflow: 'hidden' },
  legend: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  lab: { flex: 1, fontSize: 13, fontWeight: '600' },
});
