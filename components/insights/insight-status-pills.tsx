// Horizontal pills: top statuses in the current insight window with share of total.

import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { SliceDatum } from '@/lib/insights-aggregates';

type Props = {
  slices: readonly SliceDatum[];
  totalInWindow: number;
  textColor: string;
  mutedColor: string;
  trackColor: string;
};

export function InsightStatusPills({ slices, totalInWindow, textColor, mutedColor, trackColor }: Props) {
  const top = slices.slice(0, 5);
  if (top.length === 0 || totalInWindow < 1) return null;

  return (
    <View style={styles.wrap}>
      <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
        Status mix (quick read)
      </ThemedText>
      <ThemedText style={[styles.caption, { color: mutedColor }]}>
        Same data as the donut below — top statuses as scrollable chips with counts and share of this view.
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {top.map((s) => {
          const pct = Math.round((s.count / totalInWindow) * 100);
          return (
            <View
              key={s.label}
              style={[styles.pill, { borderColor: s.color, backgroundColor: trackColor }]}
              accessibilityRole="text"
              accessibilityLabel={`${s.label} ${s.count} applications ${pct} percent`}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <ThemedText style={[styles.pillText, { color: textColor }]}>
                {s.label} · {s.count} ({pct}%)
              </ThemedText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  scroll: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 13, fontWeight: '700' },
});
