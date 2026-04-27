// three large KPI tiles – quick numbers for the selected period

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type InsightStatCardsProps = {
  inPeriod: number;
  totalSaved: number;
  avgMetricInPeriod: number | null;
  cards: readonly [string, string, string];
  accessibilitySummary: string;
};

export function InsightStatCards({
  inPeriod,
  totalSaved,
  avgMetricInPeriod,
  cards,
  accessibilitySummary,
}: InsightStatCardsProps) {
  const avgLabel = avgMetricInPeriod == null ? 'not set' : String(avgMetricInPeriod);

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={accessibilitySummary}
      style={styles.row}>
      <View style={[styles.card, { backgroundColor: cards[0] }]}>
        <ThemedText style={styles.big}>{inPeriod}</ThemedText>
        <ThemedText style={styles.sub}>In this view</ThemedText>
      </View>
      <View style={[styles.card, { backgroundColor: cards[1] }]}>
        <ThemedText style={styles.big}>{totalSaved}</ThemedText>
        <ThemedText style={styles.sub}>All saved apps</ThemedText>
      </View>
      <View style={[styles.card, { backgroundColor: cards[2] }]}>
        <ThemedText style={styles.big}>{avgLabel}</ThemedText>
        <ThemedText style={styles.sub}>Avg metric (view)</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flex: 1,
    minWidth: '28%',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  big: { fontSize: 26, fontWeight: '900', color: '#fff' },
  sub: { marginTop: 4, fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.92)', textAlign: 'center' },
});
