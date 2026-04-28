// Streak tracking – flexbox tiles: logging days + target weeks + target months (accessibility per tile)

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { TargetStreakPair } from '@/lib/target-streak';
import type { StreakResult } from '@/lib/streak';

type Palette = {
  text: string;
  icon: string;
  tint: string;
  surfaceMuted: string;
  borderSubtle: string;
  surfaceCard: string;
};

type Props = {
  palette: Palette;
  loggingStreak: StreakResult;
  weeklyTargetStreak: TargetStreakPair;
  monthlyTargetStreak: TargetStreakPair;
};

export function StreakTrackingSection({
  palette,
  loggingStreak,
  weeklyTargetStreak,
  monthlyTargetStreak,
}: Props) {
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Streak tracking
      </ThemedText>
      <ThemedText style={[styles.caption, { color: palette.icon }]}>
        Logging streaks count days with at least one saved application. Target streaks count full calendar weeks or
        months where every defined goal for that period is met (from your stored targets and application dates).
      </ThemedText>

      <View style={styles.tileRow}>
        <View
          style={[
            styles.tile,
            { backgroundColor: palette.surfaceCard, borderColor: palette.borderSubtle },
          ]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Logging streak. Current ${loggingStreak.current} consecutive days with at least one application. Best streak ${loggingStreak.best} days.`}>
          <ThemedText style={[styles.tileEyebrow, { color: palette.tint }]}>Applications logged</ThemedText>
          <View style={styles.tileMetrics}>
            <View style={styles.metricCol}>
              <ThemedText style={[styles.bigNum, { color: palette.text }]}>{loggingStreak.current}</ThemedText>
              <ThemedText style={[styles.metricLab, { color: palette.icon }]}>Current streak, days</ThemedText>
            </View>
            <View style={styles.metricCol}>
              <ThemedText style={[styles.bigNum, { color: palette.text }]}>{loggingStreak.best}</ThemedText>
              <ThemedText style={[styles.metricLab, { color: palette.icon }]}>Best streak, days</ThemedText>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.tile,
            { backgroundColor: palette.surfaceCard, borderColor: palette.borderSubtle },
          ]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Weekly targets streak. Current ${weeklyTargetStreak.current} consecutive weeks where every weekly target was met. Best ${weeklyTargetStreak.best} weeks.`}>
          <ThemedText style={[styles.tileEyebrow, { color: palette.tint }]}>Weekly targets met</ThemedText>
          <View style={styles.tileMetrics}>
            <View style={styles.metricCol}>
              <ThemedText style={[styles.bigNum, { color: palette.text }]}>
                {weeklyTargetStreak.current}
              </ThemedText>
              <ThemedText style={[styles.metricLab, { color: palette.icon }]}>Current streak, weeks</ThemedText>
            </View>
            <View style={styles.metricCol}>
              <ThemedText style={[styles.bigNum, { color: palette.text }]}>{weeklyTargetStreak.best}</ThemedText>
              <ThemedText style={[styles.metricLab, { color: palette.icon }]}>Best streak, weeks</ThemedText>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.tile,
            { backgroundColor: palette.surfaceCard, borderColor: palette.borderSubtle },
          ]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Monthly targets streak. Current ${monthlyTargetStreak.current} consecutive months where every monthly target was met. Best ${monthlyTargetStreak.best} months.`}>
          <ThemedText style={[styles.tileEyebrow, { color: palette.tint }]}>Monthly targets met</ThemedText>
          <View style={styles.tileMetrics}>
            <View style={styles.metricCol}>
              <ThemedText style={[styles.bigNum, { color: palette.text }]}>
                {monthlyTargetStreak.current}
              </ThemedText>
              <ThemedText style={[styles.metricLab, { color: palette.icon }]}>Current streak, months</ThemedText>
            </View>
            <View style={styles.metricCol}>
              <ThemedText style={[styles.bigNum, { color: palette.text }]}>{monthlyTargetStreak.best}</ThemedText>
              <ThemedText style={[styles.metricLab, { color: palette.icon }]}>Best streak, months</ThemedText>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: { marginTop: 4, fontSize: 16 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  tileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  tile: {
    flexGrow: 1,
    flexBasis: 160,
    minWidth: 148,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  tileEyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.35, textTransform: 'uppercase' },
  tileMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  metricCol: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    gap: 4,
    minWidth: 0,
  },
  bigNum: { fontSize: 26, fontWeight: '900' },
  metricLab: { fontSize: 12, fontWeight: '700' },
});
