// insights tab – daily / weekly / monthly buckets + bar chart from sqlite `applications` only (rubric §4)

// imports
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HeroBanner } from '@/components/ui/hero-banner';
import { SimpleBarChart } from '@/components/ui/simple-bar-chart';
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { applications } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  aggregateApplicationsByPeriod,
  maxBucketCount,
  type InsightPeriod,
} from '@/lib/insights-aggregates';
import { useFocusEffect } from '@react-navigation/native';

// screen
export default function InsightsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const [period, setPeriod] = useState<InsightPeriod>('week');
  const [appliedDates, setAppliedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await db.select({ appliedDate: applications.appliedDate }).from(applications);
      setAppliedDates(rows.map((r) => r.appliedDate));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const buckets = useMemo(
    () => aggregateApplicationsByPeriod(appliedDates, period),
    [appliedDates, period],
  );

  const maxC = useMemo(() => maxBucketCount(buckets), [buckets]);
  const totalInView = useMemo(() => buckets.reduce((s, b) => s + b.count, 0), [buckets]);

  const chartData = useMemo(
    () => buckets.map((b) => ({ label: b.label, count: b.count })),
    [buckets],
  );

  const periodHint =
    period === 'day'
      ? 'Last 14 days by calendar day.'
      : period === 'week'
        ? 'Last 8 weeks (Monday-start weeks).'
        : 'Last 12 calendar months.';

  const summary = `Bar chart. ${totalInView} applications in this view.`;

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.muted}>Loading insights…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <HeroBanner colorScheme={colorScheme} eyebrow="CareerBoost · local data" title="Insights" />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.note, { color: palette.icon }]}>{periodHint}</ThemedText>

        <View style={styles.segment} accessibilityRole="tablist" accessibilityLabel="Time range">
          {(['day', 'week', 'month'] as const).map((p) => {
            const selected = period === p;
            const label = p === 'day' ? 'Daily' : p === 'week' ? 'Weekly' : 'Monthly';
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${label} view`}
                style={({ pressed }) => [
                  styles.segBtn,
                  {
                    borderColor: selected ? palette.tint : palette.borderSubtle,
                    backgroundColor: selected ? `${palette.tint}22` : palette.surfaceMuted,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <ThemedText style={[styles.segText, { fontWeight: selected ? '800' : '600' }]}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {loadError ? (
          <ThemedText style={styles.err}>Could not load: {loadError}</ThemedText>
        ) : null}

        {!loadError && totalInView === 0 ? (
          <ThemedText style={styles.empty}>
            No applications in this window. Add applications with applied dates, or widen your seed
            dates, to see bars here.
          </ThemedText>
        ) : null}

        {!loadError && totalInView > 0 ? (
          <>
            <ThemedText type="defaultSemiBold" style={styles.chartTitle}>
              Applications by {period === 'day' ? 'day' : period === 'week' ? 'week' : 'month'}
            </ThemedText>
            <SimpleBarChart
              data={chartData}
              maxCount={maxC}
              tint={palette.tint}
              track={palette.barTrack}
              textColor={palette.text}
              accessibilitySummary={summary}
            />
            <ThemedText style={[styles.footer, { color: palette.icon }]}>
              Total applications counted in this chart: {totalInView}
            </ThemedText>
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

// styles
const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  muted: { opacity: 0.85 },
  body: { padding: 16, paddingBottom: 32, gap: 14 },
  note: { fontSize: 14, fontWeight: '500' },
  segment: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  segText: { fontSize: 14 },
  chartTitle: { marginTop: 4 },
  empty: { opacity: 0.85, fontSize: 15, lineHeight: 22 },
  err: { color: '#b91c1c', fontSize: 15 },
  footer: { fontSize: 13, marginTop: 8 },
});
