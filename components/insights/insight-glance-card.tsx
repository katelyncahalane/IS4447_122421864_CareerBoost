// At-a-glance copy from stored aggregates only (peak bucket, momentum, offer count).

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { InsightPeriod, PeakBucket, WindowMomentum } from '@/lib/insights-aggregates';

type Props = {
  period: InsightPeriod;
  peak: PeakBucket | null;
  momentum: WindowMomentum | null;
  totalInView: number;
  offerCount: number;
  /** Optional extra lines (e.g. latest week vs prior-week average), still from stored aggregates only. */
  extraLines?: string[];
  tint: string;
  textColor: string;
  mutedColor: string;
  surface: string;
  borderColor: string;
};

function bucketPhrase(period: InsightPeriod): string {
  if (period === 'day') return 'day';
  if (period === 'week') return 'week';
  return 'month';
}

export function InsightGlanceCard({
  period,
  peak,
  momentum,
  totalInView,
  offerCount,
  extraLines,
  tint,
  textColor,
  mutedColor,
  surface,
  borderColor,
}: Props) {
  const lines: string[] = [];

  if (peak && peak.count > 0) {
    lines.push(`Busiest ${bucketPhrase(period)} in view: ${peak.label}, ${peak.count} application${peak.count === 1 ? '' : 's'}.`);
  }

  if (momentum && totalInView > 0) {
    const { firstTotal, secondTotal } = momentum;
    const diff = secondTotal - firstTotal;
    if (diff > 0) {
      lines.push(
        `Momentum: the later half of this timeline has ${diff} more application${diff === 1 ? '' : 's'} than the earlier half, activity picked up toward the present.`,
      );
    } else if (diff < 0) {
      const back = -diff;
      lines.push(
        `Momentum: the earlier half had ${back} more application${back === 1 ? '' : 's'} than the later half, you front-loaded this window.`,
      );
    } else {
      lines.push('Momentum: applications are spread evenly across the first and second half of this timeline.');
    }
  }

  if (offerCount > 0 && totalInView > 0) {
    const pct = Math.round((offerCount / totalInView) * 100);
    lines.push(
      `Pipeline highlight: ${offerCount} at Offer in this view (${pct}% of applications here), nice signal if you are closing loops.`,
    );
  }

  for (const x of extraLines ?? []) {
    if (x.trim()) lines.push(x.trim());
  }

  if (lines.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.card, { backgroundColor: surface, borderColor }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={lines.join(' ')}>
      <View style={[styles.accent, { backgroundColor: tint }]} accessibilityElementsHidden />
      <View style={styles.textCol}>
        <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
          At a glance
        </ThemedText>
        {lines.map((line, i) => (
          <ThemedText key={i} style={[styles.line, { color: mutedColor }]}>
            {line}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  accent: { width: 5 },
  textCol: { flex: 1, padding: 12, gap: 8 },
  line: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
