// insights tab – daily / weekly / monthly views + six simple visuals from SQLite applications

import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AvgMetricByStatus } from '@/components/insights/avg-metric-by-status';
import { CategoryMixStrip } from '@/components/insights/category-mix-strip';
import { InsightStatCards } from '@/components/insights/insight-stat-cards';
import { SimpleLineChart } from '@/components/insights/simple-line-chart';
import { SimplePieChart } from '@/components/insights/simple-pie-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HeroBanner } from '@/components/ui/hero-banner';
import { SimpleBarChart } from '@/components/ui/simple-bar-chart';
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { applications, categories } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  INSIGHT_CHART_PALETTE,
  aggregateApplicationsByPeriod,
  aggregateCategoryMix,
  aggregateSlicesByField,
  averageMetricByStatus,
  filterRowsInInsightWindow,
  maxBucketCount,
  type InsightPeriod,
} from '@/lib/insights-aggregates';
import { computeDailyStreaks } from '@/lib/streak';
import { eq } from 'drizzle-orm';
import { useFocusEffect } from '@react-navigation/native';

type InsightRow = {
  appliedDate: string;
  status: string;
  metricValue: number;
  categoryName: string;
  categoryColor: string;
};

function sectionTitle(period: InsightPeriod): string {
  if (period === 'day') return 'Last 14 days';
  if (period === 'week') return 'Last 8 weeks';
  return 'Last 12 months';
}

function bucketUnitPhrase(period: InsightPeriod): string {
  if (period === 'day') return 'calendar day';
  if (period === 'week') return 'week';
  return 'calendar month';
}

export default function InsightsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { width: winW } = useWindowDimensions();
  const chartW = Math.max(280, winW - 32);

  const [period, setPeriod] = useState<InsightPeriod>('week');
  const [rows, setRows] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await db
        .select({
          appliedDate: applications.appliedDate,
          status: applications.status,
          metricValue: applications.metricValue,
          categoryName: categories.name,
          categoryColor: categories.color,
        })
        .from(applications)
        .innerJoin(categories, eq(applications.categoryId, categories.id));
      setRows(data);
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

  const appliedDates = useMemo(() => rows.map((r) => r.appliedDate), [rows]);

  // Section: streak tracking (advanced feature) – uses stored applied dates only
  const streaks = useMemo(() => computeDailyStreaks(appliedDates), [appliedDates]);

  const buckets = useMemo(
    () => aggregateApplicationsByPeriod(appliedDates, period),
    [appliedDates, period],
  );

  const maxC = useMemo(() => maxBucketCount(buckets), [buckets]);
  const totalInView = useMemo(() => buckets.reduce((s, b) => s + b.count, 0), [buckets]);

  const filteredRows = useMemo(() => filterRowsInInsightWindow(rows, period), [rows, period]);

  const statusSlices = useMemo(
    () =>
      aggregateSlicesByField(filteredRows, (r) => r.status, (i) => INSIGHT_CHART_PALETTE[i % INSIGHT_CHART_PALETTE.length]!),
    [filteredRows],
  );

  const categorySlices = useMemo(() => aggregateCategoryMix(filteredRows), [filteredRows]);

  const avgByStatus = useMemo(
    () =>
      averageMetricByStatus(filteredRows, (i) => INSIGHT_CHART_PALETTE[(i + 3) % INSIGHT_CHART_PALETTE.length]!),
    [filteredRows],
  );

  const avgMetricInPeriod = useMemo(() => {
    if (filteredRows.length === 0) return null;
    const sum = filteredRows.reduce((s, r) => s + r.metricValue, 0);
    return Math.round((sum / filteredRows.length) * 10) / 10;
  }, [filteredRows]);

  const chartData = useMemo(
    () => buckets.map((b) => ({ label: b.label, count: b.count })),
    [buckets],
  );

  const barColors = useMemo(
    () => chartData.map((_, i) => INSIGHT_CHART_PALETTE[i % INSIGHT_CHART_PALETTE.length]!),
    [chartData],
  );

  const statCardBg = ['#2563eb', '#16a34a', '#ea580c'] as const;

  const periodHint =
    period === 'day'
      ? 'Daily: last 14 calendar days.'
      : period === 'week'
        ? 'Weekly: last 8 Monday-start weeks.'
        : 'Monthly: last 12 calendar months.';

  const a11yStats = `Summary for ${sectionTitle(period)}. ${filteredRows.length} applications in this window. ${rows.length} total saved.`;
  const a11yBar = `Colour bar chart by ${bucketUnitPhrase(period)}. Total in chart ${totalInView}.`;
  const a11yLine = `Line chart of the same timeline. Peak ${maxC} applications in one bucket.`;
  const a11yPie = `Donut chart by status. ${statusSlices.map((s) => `${s.label} ${s.count}`).join(', ') || 'no slices'}.`;
  const a11yStrip = `Category mix bar. ${categorySlices.map((s) => `${s.label} ${s.count}`).join(', ') || 'none'}.`;
  const a11yAvg = `Average metric by status. ${avgByStatus.map((r) => `${r.label} average ${r.avg}`).join(', ') || 'none'}.`;

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.muted}>Loading insights…</ThemedText>
      </ThemedView>
    );
  }

  const showCharts = !loadError && totalInView > 0;

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
            No applications in this window. Add applications with applied dates in range, or run the seed script, to see
            charts and colours here.
          </ThemedText>
        ) : null}

        {!loadError ? (
          <>
            <ThemedText type="defaultSemiBold" style={styles.sectionHead}>
              Streaks (advanced feature)
            </ThemedText>
            <ThemedText style={[styles.caption, { color: palette.icon }]}>
              A streak day counts when you have at least one saved application on that calendar day.
            </ThemedText>
            <View
              style={[
                styles.streakCard,
                { backgroundColor: palette.surfaceMuted, borderColor: palette.borderSubtle },
              ]}
              accessible
              accessibilityLabel={`Streaks. Current streak ${streaks.current} days. Best streak ${streaks.best} days.`}>
              <View style={styles.streakRow}>
                <View style={styles.streakTile}>
                  <ThemedText style={[styles.streakNum, { color: palette.text }]}>
                    {streaks.current}
                  </ThemedText>
                  <ThemedText style={[styles.streakLab, { color: palette.icon }]}>
                    Current (days)
                  </ThemedText>
                </View>
                <View style={styles.streakTile}>
                  <ThemedText style={[styles.streakNum, { color: palette.text }]}>
                    {streaks.best}
                  </ThemedText>
                  <ThemedText style={[styles.streakLab, { color: palette.icon }]}>
                    Best (days)
                  </ThemedText>
                </View>
              </View>
            </View>
          </>
        ) : null}

        {showCharts ? (
          <>
            <ThemedText type="defaultSemiBold" style={styles.sectionHead}>
              1 · Quick numbers ({sectionTitle(period)})
            </ThemedText>
            <ThemedText style={[styles.caption, { color: palette.icon }]}>
              Three bright tiles: how many applications fall in this view, your full library size, and the average primary
              metric in the view.
            </ThemedText>
            <InsightStatCards
              inPeriod={filteredRows.length}
              totalSaved={rows.length}
              avgMetricInPeriod={avgMetricInPeriod}
              cards={statCardBg}
              accessibilitySummary={a11yStats}
            />

            <ThemedText type="defaultSemiBold" style={styles.sectionHead}>
              2 · Colour bar chart (applications per {bucketUnitPhrase(period)})
            </ThemedText>
            <ThemedText style={[styles.caption, { color: palette.icon }]}>
              Each bar is a time bucket; height is how many applications you logged with that applied date.
            </ThemedText>
            <SimpleBarChart
              data={chartData}
              maxCount={maxC}
              tint={palette.tint}
              track={palette.barTrack}
              textColor={palette.text}
              barColors={barColors}
              accessibilitySummary={a11yBar}
            />

            <ThemedText type="defaultSemiBold" style={styles.sectionHead}>
              3 · Line chart (same timeline)
            </ThemedText>
            <ThemedText style={[styles.caption, { color: palette.icon }]}>
              Connects the same counts as the bars so you can spot spikes at a glance.
            </ThemedText>
            <SimpleLineChart
              buckets={buckets}
              width={chartW}
              stroke={palette.tint}
              gridColor={palette.borderSubtle}
              dotFill={palette.tint}
              textColor={palette.text}
              mutedColor={palette.icon}
              bucketUnitPhrase={bucketUnitPhrase(period)}
              accessibilitySummary={a11yLine}
            />

            <ThemedText type="defaultSemiBold" style={styles.sectionHead}>
              4 · Donut chart (status mix in this view)
            </ThemedText>
            <ThemedText style={[styles.caption, { color: palette.icon }]}>
              Slice sizes follow how many in-window applications have each current status.
            </ThemedText>
            <SimplePieChart
              slices={statusSlices}
              textColor={palette.text}
              mutedColor={palette.icon}
              holeColor={palette.background}
              accessibilitySummary={a11yPie}
            />

            <ThemedText type="defaultSemiBold" style={styles.sectionHead}>
              5 · Category rainbow strip
            </ThemedText>
            <ThemedText style={[styles.caption, { color: palette.icon }]}>
              Width of each colour is the share of applications in each category (uses your saved category colours).
            </ThemedText>
            <CategoryMixStrip
              slices={categorySlices}
              textColor={palette.text}
              mutedColor={palette.icon}
              trackColor={palette.barTrack}
              accessibilitySummary={a11yStrip}
            />

            <ThemedText type="defaultSemiBold" style={styles.sectionHead}>
              6 · Average metric by status
            </ThemedText>
            <ThemedText style={[styles.caption, { color: palette.icon }]}>
              Horizontal bars compare typical metric size (hours, stages, etc.) for each status in this period.
            </ThemedText>
            <AvgMetricByStatus
              rows={avgByStatus}
              trackColor={palette.barTrack}
              textColor={palette.text}
              mutedColor={palette.icon}
              accessibilitySummary={a11yAvg}
            />

            <ThemedText style={[styles.footer, { color: palette.icon }]}>
              Total application events in the time buckets above: {totalInView}. All figures read from your local SQLite
              database only.
            </ThemedText>
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  muted: { opacity: 0.85 },
  body: { padding: 16, paddingBottom: 40, gap: 12 },
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
  sectionHead: { marginTop: 10, fontSize: 16 },
  caption: { fontSize: 13, lineHeight: 18 },
  empty: { opacity: 0.85, fontSize: 15, lineHeight: 22 },
  err: { color: '#b91c1c', fontSize: 15 },
  footer: { fontSize: 13, marginTop: 8 },
  streakCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  streakRow: { flexDirection: 'row', gap: 12 },
  streakTile: { flex: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10 },
  streakNum: { fontSize: 28, fontWeight: '900' },
  streakLab: { marginTop: 4, fontSize: 13, fontWeight: '700' },
});
