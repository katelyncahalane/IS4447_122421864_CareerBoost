// horizontal bars – average primary metric per status in the current window

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { AvgMetricRow } from '@/lib/insights-aggregates';

type AvgMetricByStatusProps = {
  rows: AvgMetricRow[];
  trackColor: string;
  textColor: string;
  mutedColor: string;
  accessibilitySummary: string;
};

export function AvgMetricByStatus({
  rows,
  trackColor,
  textColor,
  mutedColor,
  accessibilitySummary,
}: AvgMetricByStatusProps) {
  const maxAvg = rows.reduce((m, r) => Math.max(m, r.avg), 0);
  const safeMax = Math.max(maxAvg, 1);

  if (rows.length === 0) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel="Average metric by status. No data.">
        <ThemedText style={{ color: mutedColor }}>No status breakdown in this period.</ThemedText>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilitySummary}
      style={styles.wrap}>
      {rows.map((r) => {
        const wPct = Math.round((r.avg / safeMax) * 100);
        return (
          <View key={r.label} style={styles.row}>
            <ThemedText numberOfLines={1} style={[styles.lab, { color: textColor }]}>
              {r.label}
            </ThemedText>
            <View style={[styles.track, { backgroundColor: trackColor }]}>
              <View style={[styles.fill, { width: `${wPct}%`, backgroundColor: r.color }]} />
            </View>
            <ThemedText style={[styles.val, { color: textColor }]}>{r.avg}</ThemedText>
          </View>
        );
      })}
      <ThemedText style={[styles.foot, { color: mutedColor }]}>
        Average of your saved “metric” value (e.g. hours or stages) per application, grouped by current status.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 12 },
  row: { gap: 6 },
  lab: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  track: { height: 14, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8, minWidth: 6 },
  val: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  foot: { fontSize: 12, lineHeight: 17, marginTop: 4 },
});
