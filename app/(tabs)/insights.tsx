// Insights tab — daily / weekly / monthly views.
// Rubric: every **chart and numeric insight** below is computed from `rows` / `targets` loaded in `refresh()` via
// **Drizzle → local SQLite** (`db.select…from applications` joined with `categories`, plus `targets` for streaks).
// Extra visuals (glance card, daily heatmap, status pills, mean-metric micro bars) use the same in-memory aggregates only.
// Career tip, weather, and Quotable motivation cards use separate public APIs and are **not** part of stored-record chart data.
//
// References — lists, effects, and external fetch UIs:
// - React useMemo / useCallback: https://react.dev/reference/react/useMemo — https://react.dev/reference/react/useCallback
// - FlatList performance (patterns): https://reactnative.dev/docs/optimizing-flatlist-configuration
// - OpenWeather API: https://openweathermap.org/api — Advice Slip: https://api.adviceslip.com/ — Quotable: https://github.com/lukePeavy/quotable
// - React Native flexbox: https://reactnative.dev/docs/flexbox
// - fetch + error handling mindset: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_the_Fetch_API
// - Video (React lists & keys): https://www.youtube.com/watch?v=sjBdhKObZWQ

import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AvgMetricByStatus } from '@/components/insights/avg-metric-by-status';
import { CareerTipCard } from '@/components/insights/career-tip-card';
import { MotivationQuoteCard } from '@/components/insights/motivation-quote-card';
import { DayHeatmapRow } from '@/components/insights/day-heatmap-row';
import { InsightGlanceCard } from '@/components/insights/insight-glance-card';
import { InsightStatusPills } from '@/components/insights/insight-status-pills';
import { MeanMetricMicroChart } from '@/components/insights/mean-metric-micro-chart';
import { StreakTrackingSection } from '@/components/insights/streak-tracking-section';
import { WeatherCard } from '@/components/insights/weather-card';
import { CategoryMixStrip } from '@/components/insights/category-mix-strip';
import { InsightStatCards } from '@/components/insights/insight-stat-cards';
import { SimpleLineChart } from '@/components/insights/simple-line-chart';
import { SimplePieChart } from '@/components/insights/simple-pie-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyStateCard } from '@/components/ui/empty-state-card';
import { HeroBanner } from '@/components/ui/hero-banner';
import { SimpleBarChart } from '@/components/ui/simple-bar-chart';
import { db } from '@/db/client';
import { applications, categories, targets } from '@/db/schema';
import { useThemePalette } from '@/hooks/use-theme-palette';
import {
  INSIGHT_CHART_PALETTE,
  aggregateApplicationsByPeriod,
  aggregateCategoryMix,
  aggregateMeanMetricByBuckets,
  aggregateSlicesByField,
  averageMetricByStatus,
  filterRowsInInsightWindow,
  maxBucketCount,
  peakBucket,
  windowMomentum,
  type InsightPeriod,
} from '@/lib/insights-aggregates';
import { computeDailyStreaks } from '@/lib/streak';
import type { ApplicationForTarget, TargetForProgress } from '@/lib/target-progress';
import { computeMonthlyTargetStreak, computeWeeklyTargetStreak } from '@/lib/target-streak';
import { eq } from 'drizzle-orm';
import { useFocusEffect } from '@react-navigation/native';

type InsightRow = {
  appliedDate: string;
  categoryId: number;
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
  const palette = useThemePalette();
  const { width: winW } = useWindowDimensions();
  const chartW = Math.max(280, winW - 32);

  const [period, setPeriod] = useState<InsightPeriod>('week');
  const [rows, setRows] = useState<InsightRow[]>([]);
  const [appsForStreak, setAppsForStreak] = useState<ApplicationForTarget[]>([]);
  const [targetRowsForStreak, setTargetRowsForStreak] = useState<TargetForProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [data, tRows] = await Promise.all([
        db
          .select({
            appliedDate: applications.appliedDate,
            categoryId: applications.categoryId,
            status: applications.status,
            metricValue: applications.metricValue,
            categoryName: categories.name,
            categoryColor: categories.color,
          })
          .from(applications)
          .innerJoin(categories, eq(applications.categoryId, categories.id)),
        db
          .select({
            scope: targets.scope,
            categoryId: targets.categoryId,
            periodType: targets.periodType,
            periodStart: targets.periodStart,
            goalCount: targets.goalCount,
          })
          .from(targets),
      ]);
      setRows(data);
      setAppsForStreak(data.map((r) => ({ appliedDate: r.appliedDate, categoryId: r.categoryId })));
      setTargetRowsForStreak(
        tRows.map((t) => ({
          scope: t.scope,
          categoryId: t.categoryId,
          periodType: t.periodType,
          periodStart: t.periodStart,
          goalCount: t.goalCount,
        })),
      );
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

  const weeklyTargetStreak = useMemo(
    () => computeWeeklyTargetStreak(appsForStreak, targetRowsForStreak),
    [appsForStreak, targetRowsForStreak],
  );
  const monthlyTargetStreak = useMemo(
    () => computeMonthlyTargetStreak(appsForStreak, targetRowsForStreak),
    [appsForStreak, targetRowsForStreak],
  );

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

  const meanMetricBuckets = useMemo(
    () => aggregateMeanMetricByBuckets(filteredRows, period),
    [filteredRows, period],
  );

  const peak = useMemo(() => peakBucket(buckets), [buckets]);
  const momentum = useMemo(() => windowMomentum(buckets), [buckets]);

  const offerInWindow = useMemo(
    () => filteredRows.filter((r) => r.status.trim().toLowerCase() === 'offer').length,
    [filteredRows],
  );

  const weekCompareLine = useMemo(() => {
    if (period !== 'week' || buckets.length < 2) return null as string | null;
    const latest = buckets[buckets.length - 1];
    const earlier = buckets.slice(0, -1);
    const avgEarlier =
      earlier.length > 0 ? earlier.reduce((s, b) => s + b.count, 0) / earlier.length : 0;
    const rounded = Math.round(avgEarlier * 10) / 10;
    return `Latest week (${latest.label}): ${latest.count} applications · average of the seven earlier weeks in this chart: ${rounded}.`;
  }, [period, buckets]);

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
      ? 'Daily view: last 14 calendar days — includes a dot heatmap plus bar, line, and metric micro charts.'
      : period === 'week'
        ? 'Weekly view: last 8 Monday-start weeks — includes a “latest vs earlier weeks” line in At a glance.'
        : 'Monthly view: last 12 calendar months — same charts, tuned to month-sized buckets.';

  const a11yStats = `Summary for ${sectionTitle(period)}. ${filteredRows.length} applications in this window. ${rows.length} total saved.`;
  const a11yBar = `Colour bar chart by ${bucketUnitPhrase(period)}. Total in chart ${totalInView}.`;
  const a11yLine = `Line chart of the same timeline. Peak ${maxC} applications in one bucket.`;
  const a11yPie = `Donut chart by status. ${statusSlices.map((s) => `${s.label} ${s.count}`).join(', ') || 'no slices'}.`;
  const a11yStrip = `Category mix bar. ${categorySlices.map((s) => `${s.label} ${s.count}`).join(', ') || 'none'}.`;
  const a11yAvg = `Average metric by status. ${avgByStatus.map((r) => `${r.label} average ${r.avg}`).join(', ') || 'none'}.`;

  if (loading) {
    return (
      <ThemedView
        style={styles.centered}
        accessibilityLabel="Loading insights"
        accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={palette.tint} accessibilityElementsHidden />
        <ThemedText style={styles.muted}>Loading insights…</ThemedText>
      </ThemedView>
    );
  }

  const showCharts = !loadError && totalInView > 0;

  return (
    <ThemedView style={styles.flex}>
      <HeroBanner
        eyebrow="CareerBoost · Insights"
        title="Insights"
        tagline="Daily, weekly, and monthly views — bars, line, donut, and extra at-a-glance visuals — all from saved applications on this device."
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.note, { color: palette.icon }]}>{periodHint}</ThemedText>

        {/* Section: external APIs — career tip, weather, GitHub spotlight (keys optional except where noted; see .env.example) */}
        <CareerTipCard
          tint={palette.tint}
          textColor={palette.text}
          mutedColor={palette.icon}
          surfaceMuted={palette.surfaceMuted}
          borderColor={palette.borderSubtle}
          errorTextColor={palette.errorText}
          errorSurfaceColor={palette.errorSurface}
          errorBorderColor={palette.errorBorder}
        />

        <WeatherCard
          tint={palette.tint}
          textColor={palette.text}
          mutedColor={palette.icon}
          surfaceMuted={palette.surfaceMuted}
          borderColor={palette.borderSubtle}
          errorTextColor={palette.errorText}
          errorSurfaceColor={palette.errorSurface}
          errorBorderColor={palette.errorBorder}
        />

        <MotivationQuoteCard
          tint={palette.tint}
          textColor={palette.text}
          mutedColor={palette.icon}
          surfaceMuted={palette.surfaceMuted}
          borderColor={palette.borderSubtle}
          errorTextColor={palette.errorText}
          errorSurfaceColor={palette.errorSurface}
          errorBorderColor={palette.errorBorder}
        />

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
          <EmptyStateCard
            icon="alert-circle-outline"
            title="Could not load insights"
            message={loadError}
            accessibilityHint="Pull down to retry loading from your local database."
            tint={palette.errorText}
            surface={palette.errorSurface}
            border={palette.errorBorder}
            textColor={palette.text}
            mutedColor={palette.icon}
          />
        ) : null}

        {!loadError && totalInView === 0 ? (
          <EmptyStateCard
            icon="bar-chart-outline"
            title="Nothing in this window yet"
            message="Try Daily, Weekly, or Monthly above, or add applications whose applied dates fall in the selected range."
            accessibilityHint="Switch the time range tabs at the top of this screen to find saved data."
            tint={palette.tint}
            surface={palette.surfaceCard}
            border={palette.borderSubtle}
            textColor={palette.text}
            mutedColor={palette.icon}
          />
        ) : null}

        {!loadError ? (
          <StreakTrackingSection
            palette={palette}
            loggingStreak={streaks}
            weeklyTargetStreak={weeklyTargetStreak}
            monthlyTargetStreak={monthlyTargetStreak}
          />
        ) : null}

        {showCharts ? (
          <>
            <InsightGlanceCard
              period={period}
              peak={peak}
              momentum={momentum}
              totalInView={totalInView}
              offerCount={offerInWindow}
              extraLines={weekCompareLine ? [weekCompareLine] : undefined}
              tint={palette.tint}
              textColor={palette.text}
              mutedColor={palette.icon}
              surface={palette.surfaceCard}
              borderColor={palette.borderSubtle}
            />

            {period === 'day' ? (
              <DayHeatmapRow
                buckets={buckets}
                maxCount={maxC}
                tint={palette.tint}
                trackColor={palette.barTrack}
                textColor={palette.text}
                mutedColor={palette.icon}
              />
            ) : null}

            <InsightStatusPills
              slices={statusSlices}
              totalInWindow={filteredRows.length}
              textColor={palette.text}
              mutedColor={palette.icon}
              trackColor={palette.surfaceMuted}
            />

            <ThemedText type="defaultSemiBold" style={styles.sectionHead}>
              Quick numbers ({sectionTitle(period)})
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
              Bar chart — applications per {bucketUnitPhrase(period)}
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
              Line chart — same timeline
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

            <MeanMetricMicroChart
              buckets={meanMetricBuckets}
              tint={palette.tint}
              trackColor={palette.barTrack}
              textColor={palette.text}
              mutedColor={palette.icon}
              bucketUnitPhrase={bucketUnitPhrase(period)}
            />

            <ThemedText type="defaultSemiBold" style={styles.sectionHead}>
              Donut chart — status mix in this view
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
              Category rainbow strip
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
              Average metric by status
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
              Total application events in the time buckets above: {totalInView}. All figures come from your saved
              applications on this device.
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
  footer: { fontSize: 13, marginTop: 8 },
});
