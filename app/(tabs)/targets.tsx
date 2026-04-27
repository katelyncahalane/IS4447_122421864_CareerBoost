// targets tab – show weekly/monthly goals and progress from real `applications` rows (rubric: targets + progress)

// imports
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeekMonthMiniBars } from '@/components/targets/week-month-mini-bars';
import { EmptyStateCard } from '@/components/ui/empty-state-card';
import { HeroBanner } from '@/components/ui/hero-banner';
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { applications, categories, targets } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cardShadowStyle } from '@/lib/card-shadow';
import { countApplicationsForTarget } from '@/lib/target-progress';
import { desc } from 'drizzle-orm';
import { useFocusEffect } from '@react-navigation/native';

// types – one row for the list with computed count + labels
type TargetListRow = {
  id: number;
  title: string;
  periodLabel: string;
  goalCount: number;
  currentCount: number;
  statusLabel: string;
  barFraction: number;
  barColour: string;
  isCurrentPeriod: boolean;
};

/** yyyy-mm-dd from local calendar parts */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function currentWeekStartIso(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

function currentMonthStartIso(now: Date = new Date()): string {
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

// screen
export default function TargetsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TargetListRow[]>([]);
  const [weekMonthBars, setWeekMonthBars] = useState<
    | null
    | {
        week: { current: number; goal: number; color: string };
        month: { current: number; goal: number; color: string };
      }
  >(null);

  // data – load targets + applications, then compute counts in memory (small dataset)
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [tRows, appRows, catRows] = await Promise.all([
        db.select().from(targets).orderBy(desc(targets.periodStart)),
        db
          .select({ appliedDate: applications.appliedDate, categoryId: applications.categoryId })
          .from(applications),
        db.select({ id: categories.id, name: categories.name }).from(categories),
      ]);

      const wk = currentWeekStartIso();
      const mo = currentMonthStartIso();
      const catName = Object.fromEntries(catRows.map((c) => [c.id, c.name])) as Record<number, string>;

      // Section: mini visual (global current week + current month)
      const weekTarget = tRows.find(
        (t) => t.scope === 'global' && t.periodType === 'week' && t.periodStart === wk,
      );
      const monthTarget = tRows.find(
        (t) => t.scope === 'global' && t.periodType === 'month' && t.periodStart === mo,
      );
      if (weekTarget && monthTarget) {
        const wCur = countApplicationsForTarget(appRows, {
          scope: weekTarget.scope,
          categoryId: weekTarget.categoryId,
          periodType: weekTarget.periodType,
          periodStart: weekTarget.periodStart,
          goalCount: weekTarget.goalCount,
        });
        const mCur = countApplicationsForTarget(appRows, {
          scope: monthTarget.scope,
          categoryId: monthTarget.categoryId,
          periodType: monthTarget.periodType,
          periodStart: monthTarget.periodStart,
          goalCount: monthTarget.goalCount,
        });
        const statusColor = (cur: number, goal: number) =>
          cur > goal ? '#ea580c' : cur === goal ? '#16a34a' : palette.tint;
        setWeekMonthBars({
          week: {
            current: wCur,
            goal: weekTarget.goalCount,
            color: statusColor(wCur, weekTarget.goalCount),
          },
          month: {
            current: mCur,
            goal: monthTarget.goalCount,
            color: statusColor(mCur, monthTarget.goalCount),
          },
        });
      } else {
        setWeekMonthBars(null);
      }

      const next: TargetListRow[] = tRows.map((t) => {
        const current = countApplicationsForTarget(appRows, {
          scope: t.scope,
          categoryId: t.categoryId,
          periodType: t.periodType,
          periodStart: t.periodStart,
          goalCount: t.goalCount,
        });

        const scopeBit =
          t.scope === 'global'
            ? 'All categories'
            : `Category: ${t.categoryId != null ? catName[t.categoryId] ?? 'Unknown' : '—'}`;
        const periodBit = t.periodType === 'week' ? 'Week' : 'Month';
        const title = `${periodBit} target · ${scopeBit}`;

        const periodLabel = `Starting ${t.periodStart} · goal ${t.goalCount} application(s)`;

        let statusLabel: string;
        let barColour = palette.tint;
        if (current >= t.goalCount) {
          statusLabel =
            current === t.goalCount ? 'Target met.' : `Exceeded by ${current - t.goalCount} (goal was ${t.goalCount}).`;
          barColour = current === t.goalCount ? '#16a34a' : '#ea580c';
        } else {
          statusLabel = `${current} of ${t.goalCount} · ${t.goalCount - current} remaining.`;
        }

        const barFraction = t.goalCount > 0 ? Math.min(1, current / t.goalCount) : 0;
        const isCurrentPeriod =
          (t.periodType === 'week' && t.periodStart === wk) ||
          (t.periodType === 'month' && t.periodStart === mo);

        return {
          id: t.id,
          title,
          periodLabel,
          goalCount: t.goalCount,
          currentCount: current,
          statusLabel,
          barFraction,
          barColour,
          isCurrentPeriod,
        };
      });

      // show current period goals first (simple but feels “smart”)
      const sorted = [...next].sort((a, b) =>
        a.isCurrentPeriod === b.isCurrentPeriod ? 0 : a.isCurrentPeriod ? -1 : 1,
      );
      setRows(sorted);
    } finally {
      setLoading(false);
    }
  }, [palette.tint]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const headerNote = useMemo(
    () =>
      `This week starts ${currentWeekStartIso()} · this month starts ${currentMonthStartIso()}. Progress is counted from saved application dates in the matching week or month.`,
    [],
  );

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const current = rows.filter((r) => r.isCurrentPeriod);
    const met = current.filter((r) => r.currentCount >= r.goalCount).length;
    return { currentCount: current.length, met };
  }, [rows]);

  // render
  if (loading) {
    return (
      <ThemedView
        style={styles.centered}
        accessibilityLabel="Loading targets"
        accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={palette.tint} accessibilityElementsHidden />
        <ThemedText style={styles.muted}>Loading targets…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <HeroBanner
        colorScheme={colorScheme}
        eyebrow="CareerBoost · weekly & monthly"
        title="Targets"
      />
      <ThemedText style={[styles.note, { color: palette.icon }]}>{headerNote}</ThemedText>

      {summary ? (
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: palette.surfaceMuted, borderColor: palette.borderSubtle },
          ]}
          accessible
          accessibilityLabel={`Current period targets. ${summary.met} met out of ${summary.currentCount}.`}>
          <ThemedText type="defaultSemiBold">Current period</ThemedText>
          <ThemedText style={styles.summaryText}>
            {summary.met} met / {summary.currentCount} total (week + month)
          </ThemedText>
        </View>
      ) : null}

      {weekMonthBars ? (
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: palette.surfaceMuted, borderColor: palette.borderSubtle },
          ]}>
          {/* Section: simple visual for targets (week vs month) */}
          <WeekMonthMiniBars
            title="Week vs Month (global)"
            bars={[
              {
                label: 'This week',
                current: weekMonthBars.week.current,
                goal: weekMonthBars.week.goal,
                color: weekMonthBars.week.color,
              },
              {
                label: 'This month',
                current: weekMonthBars.month.current,
                goal: weekMonthBars.month.goal,
                color: weekMonthBars.month.color,
              },
            ]}
            trackColor={palette.barTrack}
            textColor={palette.text}
            mutedColor={palette.icon}
            accessibilitySummary={`Week vs month progress. Week ${weekMonthBars.week.current} of ${weekMonthBars.week.goal}. Month ${weekMonthBars.month.current} of ${weekMonthBars.month.goal}.`}
          />
        </View>
      ) : null}

      <FlatList
        style={styles.listFlex}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, rows.length === 0 ? styles.listEmptyGrow : null]}
        ListEmptyComponent={
          <EmptyStateCard
            icon="flag-outline"
            title="No targets yet"
            message="When you add weekly or monthly goals, they appear here with bars driven by your saved applications."
            tint={palette.tint}
            surface={palette.surfaceCard}
            border={palette.borderSubtle}
            textColor={palette.text}
            mutedColor={palette.icon}
          />
        }
        refreshing={loading}
        onRefresh={() => void refresh()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              cardShadowStyle,
              { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceCard },
            ]}
            accessible
            accessibilityLabel={`${item.title}. ${item.periodLabel}. ${item.statusLabel}`}>
            <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
            <ThemedText style={styles.meta}>{item.periodLabel}</ThemedText>
            <ThemedText style={styles.status}>{item.statusLabel}</ThemedText>
            <View
              style={[styles.barTrack, { backgroundColor: palette.barTrack }]}
              accessibilityRole="progressbar"
              accessibilityLabel={`Progress ${item.currentCount} of ${item.goalCount}`}
              accessibilityValue={{ now: item.currentCount, min: 0, max: item.goalCount }}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.round(item.barFraction * 100)}%`, backgroundColor: item.barColour },
                ]}
              />
            </View>
          </View>
        )}
      />
    </ThemedView>
  );
}

// styles
const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  muted: { opacity: 0.85 },
  note: { paddingHorizontal: 16, marginBottom: 8, marginTop: 4, fontSize: 14, fontWeight: '500' },
  listFlex: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  listEmptyGrow: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  summaryText: { opacity: 0.85, fontSize: 14, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  meta: { opacity: 0.8, fontSize: 14 },
  status: { fontSize: 15, fontWeight: '600' },
  barTrack: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: { height: '100%', borderRadius: 999 },
});
