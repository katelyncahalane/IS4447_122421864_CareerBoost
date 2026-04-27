// targets tab – weekly/monthly goals (global or per-category); progress, remaining, and met / exceeded / unmet from DB counts only

// imports
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeekMonthMiniBars } from '@/components/targets/week-month-mini-bars';
import { EmptyStateCard } from '@/components/ui/empty-state-card';
import { HeroBanner } from '@/components/ui/hero-banner';
import { db } from '@/db/client';
import { applications, categories, targets } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePalette } from '@/hooks/use-theme-palette';
import { cardShadowStyle } from '@/lib/card-shadow';
import { syncLocalRemindersFromPrefs } from '@/lib/local-reminders';
import { getReminderPrefs, setReminderPrefs, type ReminderPrefs } from '@/lib/notification-preferences';
import {
  classifyTargetOutcome,
  targetOverBy,
  targetProgressFraction,
  targetRemaining,
  type TargetOutcome,
} from '@/lib/target-outcome';
import { countApplicationsForTarget } from '@/lib/target-progress';
import { desc } from 'drizzle-orm';
import { useFocusEffect } from '@react-navigation/native';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';

// types – one row for the list with computed count + labels
type TargetListRow = {
  id: number;
  title: string;
  periodLabel: string;
  goalCount: number;
  currentCount: number;
  /** Long-form progress line (counts, remaining, or over-goal). */
  statusDetail: string;
  outcome: TargetOutcome;
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

function outcomeBadgePalette(outcome: TargetOutcome, scheme: 'light' | 'dark') {
  if (scheme === 'dark') {
    if (outcome === 'unmet') {
      return { bg: 'rgba(239,68,68,0.18)', border: '#f87171', text: '#fca5a5', label: 'Below goal' };
    }
    if (outcome === 'met') {
      return { bg: 'rgba(34,197,94,0.15)', border: '#4ade80', text: '#86efac', label: 'Goal met' };
    }
    return { bg: 'rgba(234,88,12,0.18)', border: '#fb923c', text: '#fdba74', label: 'Exceeded goal' };
  }
  if (outcome === 'unmet') {
    return { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', label: 'Below goal' };
  }
  if (outcome === 'met') {
    return { bg: '#ecfdf5', border: '#bbf7d0', text: '#166534', label: 'Goal met' };
  }
  return { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', label: 'Exceeded goal' };
}

// screen
export default function TargetsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = useThemePalette();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TargetListRow[]>([]);
  const [weekMonthBars, setWeekMonthBars] = useState<
    | null
    | {
        week: { current: number; goal: number; color: string; detail: string };
        month: { current: number; goal: number; color: string; detail: string };
      }
  >(null);
  const [reminderPrefs, setReminderPrefsState] = useState<ReminderPrefs | null>(null);

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
        const statusColor = (cur: number, goal: number) => {
          const o = classifyTargetOutcome(cur, goal);
          if (o === 'unmet') return '#ef4444';
          if (o === 'met') return '#16a34a';
          return '#ea580c';
        };
        const miniDetail = (cur: number, goal: number) => {
          const o = classifyTargetOutcome(cur, goal);
          if (o === 'unmet') return `${targetRemaining(cur, goal)} application(s) still needed`;
          if (o === 'met') return 'Goal met for this period';
          return `${targetOverBy(cur, goal)} above goal`;
        };
        setWeekMonthBars({
          week: {
            current: wCur,
            goal: weekTarget.goalCount,
            color: statusColor(wCur, weekTarget.goalCount),
            detail: miniDetail(wCur, weekTarget.goalCount),
          },
          month: {
            current: mCur,
            goal: monthTarget.goalCount,
            color: statusColor(mCur, monthTarget.goalCount),
            detail: miniDetail(mCur, monthTarget.goalCount),
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
            : `Category: ${t.categoryId != null ? catName[t.categoryId] ?? 'Unknown' : 'not set'}`;
        const periodBitLong = t.periodType === 'week' ? 'Week (Mon–Sun)' : 'Calendar month';
        const shortPeriod = t.periodType === 'week' ? 'Weekly' : 'Monthly';
        const fallbackTitle = `${shortPeriod} target, ${scopeBit}`;
        const title = t.title?.trim() ? t.title.trim() : fallbackTitle;

        const periodLabel = `${periodBitLong} from ${t.periodStart}, goal ${t.goalCount} application(s) in period`;

        const outcome = classifyTargetOutcome(current, t.goalCount);
        const remaining = targetRemaining(current, t.goalCount);
        const overBy = targetOverBy(current, t.goalCount);

        let statusDetail: string;
        let barColour = '#64748b';
        if (outcome === 'unmet') {
          statusDetail = `Progress: ${current} of ${t.goalCount} applications in this window, ${remaining} more needed to meet the goal.`;
          barColour = '#ef4444';
        } else if (outcome === 'met') {
          statusDetail = `Progress: ${current} of ${t.goalCount}, goal met for this period.`;
          barColour = '#16a34a';
        } else {
          statusDetail = `Progress: ${current} applications counted, goal was ${t.goalCount}, you are ${overBy} ahead of the goal.`;
          barColour = '#ea580c';
        }

        const barFraction = targetProgressFraction(current, t.goalCount);
        const isCurrentPeriod =
          (t.periodType === 'week' && t.periodStart === wk) ||
          (t.periodType === 'month' && t.periodStart === mo);

        return {
          id: t.id,
          title,
          periodLabel,
          goalCount: t.goalCount,
          currentCount: current,
          statusDetail,
          outcome,
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

  useEffect(() => {
    void getReminderPrefs().then(setReminderPrefsState);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void getReminderPrefs().then(setReminderPrefsState);
    }, [refresh]),
  );

  const headerNote = useMemo(
    () =>
      `This calendar week starts ${currentWeekStartIso()} (Mon–Sun); this month starts ${currentMonthStartIso()}. Progress and “remaining” use only stored application dates in each goal’s window. Goals can be global (all categories) or scoped to one category.`,
    [],
  );

  const weeklyDayLabel = useMemo(() => {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const idx = Math.max(0, Math.min(6, (reminderPrefs?.weeklyWeekday ?? 2) - 1));
    return names[idx] ?? 'Monday';
  }, [reminderPrefs?.weeklyWeekday]);

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const current = rows.filter((r) => r.isCurrentPeriod);
    let met = 0;
    let exceeded = 0;
    let unmet = 0;
    for (const r of current) {
      if (r.outcome === 'met') met += 1;
      else if (r.outcome === 'exceeded') exceeded += 1;
      else unmet += 1;
    }
    return { currentCount: current.length, met, exceeded, unmet };
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
        eyebrow="CareerBoost, weekly and monthly"
        title="Targets"
        tagline="Weekly and monthly application count goals, global or per category, with progress, remaining, and clear met, exceeded, or unmet states."
      />
      <ThemedText style={[styles.note, { color: palette.icon }]}>{headerNote}</ThemedText>

      <View style={styles.targetCtaRow}>
        <ThemedText style={[styles.targetCtaText, { color: palette.text }]}>
          Add goals for this week, this month, past, or future windows, all categories or one track. Each card shows
          counts, what is left to hit the goal, or how far you have exceeded it.
        </ThemedText>
        <Pressable
          onPress={() => router.push('/add-target' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Add a new target"
          style={({ pressed }) => [
            styles.addTargetBtn,
            { borderColor: palette.tint, backgroundColor: `${palette.tint}18`, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText style={[styles.addTargetBtnText, { color: palette.tint }]}>Add target</ThemedText>
        </Pressable>
      </View>

      {reminderPrefs ? (
        <View
          style={[
            styles.reminderCard,
            { backgroundColor: palette.surfaceCard, borderColor: palette.borderSubtle },
          ]}
          accessible
          accessibilityLabel="Local notification reminders for logging and targets">
          <ThemedText type="defaultSemiBold">Local reminders</ThemedText>
          <ThemedText style={[styles.reminderCaption, { color: palette.icon }]}>
            Scheduled on this device only. {Platform.OS === 'web' ? 'Web preview cannot deliver native alerts.' : 'Allow notifications when prompted.'}
          </ThemedText>

          <View style={styles.reminderRow}>
            <View style={styles.reminderTextCol}>
              <ThemedText style={[styles.reminderTitle, { color: palette.text }]}>Daily logging nudge</ThemedText>
              <ThemedText style={[styles.reminderSub, { color: palette.icon }]}>
                Same time each day ({String(reminderPrefs.dailyHour).padStart(2, '0')}:
                {String(reminderPrefs.dailyMinute).padStart(2, '0')} local)
              </ThemedText>
            </View>
            <Switch
              value={reminderPrefs.dailyLogEnabled}
              onValueChange={(v) => {
                void (async () => {
                  const next = { ...reminderPrefs, dailyLogEnabled: v };
                  setReminderPrefsState(next);
                  try {
                    await setReminderPrefs(next);
                    await syncLocalRemindersFromPrefs(next);
                  } catch (e) {
                    const rolled = await getReminderPrefs();
                    setReminderPrefsState(rolled);
                    Alert.alert(
                      'Reminders',
                      e instanceof Error ? e.message : 'Could not update notification schedule.',
                    );
                  }
                })();
              }}
              accessibilityLabel="Daily logging reminder"
              accessibilityHint="Toggles a repeating local notification to log applications."
            />
          </View>

          <View style={styles.reminderRow}>
            <View style={styles.reminderTextCol}>
              <ThemedText style={[styles.reminderTitle, { color: palette.text }]}>Weekly target check</ThemedText>
              <ThemedText style={[styles.reminderSub, { color: palette.icon }]}>
                Every {weeklyDayLabel} at {String(reminderPrefs.weeklyHour).padStart(2, '0')}:
                {String(reminderPrefs.weeklyMinute).padStart(2, '0')} (local)
              </ThemedText>
            </View>
            <Switch
              value={reminderPrefs.weeklyTargetsEnabled}
              onValueChange={(v) => {
                void (async () => {
                  const next = { ...reminderPrefs, weeklyTargetsEnabled: v };
                  setReminderPrefsState(next);
                  try {
                    await setReminderPrefs(next);
                    await syncLocalRemindersFromPrefs(next);
                  } catch (e) {
                    const rolled = await getReminderPrefs();
                    setReminderPrefsState(rolled);
                    Alert.alert(
                      'Reminders',
                      e instanceof Error ? e.message : 'Could not update notification schedule.',
                    );
                  }
                })();
              }}
              accessibilityLabel="Weekly target reminder"
              accessibilityHint="Toggles a repeating local notification about weekly targets."
            />
          </View>

          <View style={styles.reminderRow}>
            <View style={styles.reminderTextCol}>
              <ThemedText style={[styles.reminderTitle, { color: palette.text }]}>Monthly target review</ThemedText>
              <ThemedText style={[styles.reminderSub, { color: palette.icon }]}>
                Day {reminderPrefs.monthlyDay} of each month at {String(reminderPrefs.monthlyHour).padStart(2, '0')}:
                {String(reminderPrefs.monthlyMinute).padStart(2, '0')} (local; day capped at 28 for every month)
              </ThemedText>
            </View>
            <Switch
              value={reminderPrefs.monthlyTargetsEnabled}
              onValueChange={(v) => {
                void (async () => {
                  const next = { ...reminderPrefs, monthlyTargetsEnabled: v };
                  setReminderPrefsState(next);
                  try {
                    await setReminderPrefs(next);
                    await syncLocalRemindersFromPrefs(next);
                  } catch (e) {
                    const rolled = await getReminderPrefs();
                    setReminderPrefsState(rolled);
                    Alert.alert(
                      'Reminders',
                      e instanceof Error ? e.message : 'Could not update notification schedule.',
                    );
                  }
                })();
              }}
              accessibilityLabel="Monthly target reminder"
              accessibilityHint="Toggles a repeating local notification to review monthly goals."
            />
          </View>
        </View>
      ) : null}

      {summary ? (
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: palette.surfaceMuted, borderColor: palette.borderSubtle },
          ]}
          accessible
          accessibilityLabel={`Current week or month targets on this list: ${summary.met} met exactly, ${summary.exceeded} above goal, ${summary.unmet} below goal, out of ${summary.currentCount} total.`}>
          <ThemedText type="defaultSemiBold">Current week and month (this list)</ThemedText>
          <ThemedText style={styles.summaryText}>
            {summary.currentCount === 0
              ? 'No targets use the current calendar week or month, scroll for other periods or add one with “This week” or “This month”.'
              : `${summary.met} met, ${summary.exceeded} exceeded, ${summary.unmet} below goal (${summary.currentCount} current-period target${summary.currentCount === 1 ? '' : 's'})`}
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
                detail: weekMonthBars.week.detail,
              },
              {
                label: 'This month',
                current: weekMonthBars.month.current,
                goal: weekMonthBars.month.goal,
                color: weekMonthBars.month.color,
                detail: weekMonthBars.month.detail,
              },
            ]}
            trackColor={palette.barTrack}
            textColor={palette.text}
            mutedColor={palette.icon}
            accessibilitySummary={`Week and month global targets. Week: ${weekMonthBars.week.current} of ${weekMonthBars.week.goal}. ${weekMonthBars.week.detail}. Month: ${weekMonthBars.month.current} of ${weekMonthBars.month.goal}. ${weekMonthBars.month.detail}.`}
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
            message="Add a weekly or monthly goal (all categories or one). You will see progress, how many applications remain to hit the goal, and clear labels when you meet or exceed it."
            tint={palette.tint}
            surface={palette.surfaceCard}
            border={palette.borderSubtle}
            textColor={palette.text}
            mutedColor={palette.icon}
          />
        }
        refreshing={loading}
        onRefresh={() => void refresh()}
        renderItem={({ item }) => {
          const badge = outcomeBadgePalette(item.outcome, colorScheme);
          return (
            <View
              style={[
                styles.card,
                cardShadowStyle,
                { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceCard },
              ]}
              accessible
              accessibilityLabel={`${item.title}. ${item.periodLabel}. ${badge.label}. ${item.statusDetail}`}>
              <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
              <ThemedText style={styles.meta}>{item.periodLabel}</ThemedText>
              <View
                style={[
                  styles.outcomePill,
                  { backgroundColor: badge.bg, borderColor: badge.border },
                ]}
                accessibilityElementsHidden>
                <ThemedText style={[styles.outcomePillText, { color: badge.text }]}>{badge.label}</ThemedText>
              </View>
              <ThemedText style={styles.status}>{item.statusDetail}</ThemedText>
              <View
                style={[styles.barTrack, { backgroundColor: palette.barTrack }]}
                accessibilityRole="progressbar"
                accessibilityLabel={`Progress bar ${item.currentCount} of ${item.goalCount} applications`}
                accessibilityValue={{ now: item.currentCount, min: 0, max: item.goalCount }}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.round(item.barFraction * 100)}%`, backgroundColor: item.barColour },
                  ]}
                />
              </View>
            </View>
          );
        }}
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
  targetCtaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  targetCtaText: { flex: 1, flexBasis: 200, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  addTargetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  addTargetBtnText: { fontWeight: '800', fontSize: 15 },
  reminderCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  reminderCaption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  reminderRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reminderTextCol: { flexDirection: 'column', flexGrow: 1, flexShrink: 1, gap: 4, minWidth: 0 },
  reminderTitle: { fontSize: 15, fontWeight: '700' },
  reminderSub: { fontSize: 13, fontWeight: '600' },
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
  status: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  outcomePill: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  outcomePillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  barTrack: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: { height: '100%', borderRadius: 999 },
});
