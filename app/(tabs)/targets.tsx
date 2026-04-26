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
import { Colors } from '@/constants/theme';
import { db } from '@/db/client';
import { applications, categories, targets } from '@/db/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
};

// screen
export default function TargetsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TargetListRow[]>([]);

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

      const catName = Object.fromEntries(catRows.map((c) => [c.id, c.name])) as Record<number, string>;

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

        return {
          id: t.id,
          title,
          periodLabel,
          goalCount: t.goalCount,
          currentCount: current,
          statusLabel,
          barFraction,
          barColour,
        };
      });

      setRows(next);
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
    () => 'Progress is counted from saved application dates in the matching week or month.',
    [],
  );

  // render
  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.tint} />
        <ThemedText style={styles.muted}>Loading targets…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <View style={styles.header}>
        <ThemedText type="title">Targets</ThemedText>
      </View>
      <ThemedText style={styles.note}>{headerNote}</ThemedText>

      {rows.length === 0 ? (
        <ThemedText style={styles.empty}>No targets yet. Seed adds demo targets for charts and progress.</ThemedText>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={() => void refresh()}
        renderItem={({ item }) => (
          <View
            style={[styles.card, { borderColor: palette.icon }]}
            accessible
            accessibilityLabel={`${item.title}. ${item.periodLabel}. ${item.statusLabel}`}>
            <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
            <ThemedText style={styles.meta}>{item.periodLabel}</ThemedText>
            <ThemedText style={styles.status}>{item.statusLabel}</ThemedText>
            <View
              style={styles.barTrack}
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
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  note: { paddingHorizontal: 16, opacity: 0.85, marginBottom: 8, fontSize: 14 },
  empty: { paddingHorizontal: 16, opacity: 0.85, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  meta: { opacity: 0.8, fontSize: 14 },
  status: { fontSize: 15, fontWeight: '600' },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: { height: '100%', borderRadius: 999 },
});
