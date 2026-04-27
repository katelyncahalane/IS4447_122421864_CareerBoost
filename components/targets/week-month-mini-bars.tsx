// week/month mini bars – simple visual for Targets tab (no chart libs)

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type MiniBar = {
  label: string;
  current: number;
  goal: number;
  color: string;
  /** Remaining vs over-goal, e.g. "3 more to meet goal" or "2 over goal". */
  detail?: string;
};

type WeekMonthMiniBarsProps = {
  title: string;
  bars: readonly MiniBar[];
  trackColor: string;
  textColor: string;
  mutedColor: string;
  accessibilitySummary: string;
};

export function WeekMonthMiniBars({
  title,
  bars,
  trackColor,
  textColor,
  mutedColor,
  accessibilitySummary,
}: WeekMonthMiniBarsProps) {
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilitySummary}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <ThemedText style={[styles.note, { color: mutedColor }]}>
        Global goals for this calendar week and month, numbers come only from saved application dates. Each row shows
        progress, remaining to the goal, or how far you are past it.
      </ThemedText>

      <View style={styles.rows}>
        {bars.map((b) => {
          const fraction = b.goal > 0 ? Math.min(1, b.current / b.goal) : 0;
          const pct = Math.round(fraction * 100);
          return (
            <View key={b.label} style={styles.row}>
              <View style={styles.rowTop}>
                <ThemedText style={[styles.lab, { color: textColor }]}>{b.label}</ThemedText>
                <ThemedText style={[styles.val, { color: textColor }]}>
                  {b.current}/{b.goal}
                </ThemedText>
              </View>
              {b.detail ? (
                <ThemedText style={[styles.detail, { color: mutedColor }]} accessibilityRole="text">
                  {b.detail}
                </ThemedText>
              ) : null}
              <View
                style={[styles.track, { backgroundColor: trackColor }]}
                accessibilityRole="progressbar"
                accessibilityLabel={`${b.label}. ${b.current} of ${b.goal} applications.${b.detail ? ` ${b.detail}` : ''}`}
                accessibilityValue={{ now: b.current, min: 0, max: b.goal }}>
                <View
                  style={[
                    styles.fill,
                    { width: `${pct}%`, backgroundColor: b.color },
                  ]}
                  accessibilityElementsHidden
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  note: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  rows: { gap: 12, marginTop: 4 },
  row: { gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lab: { fontSize: 13, fontWeight: '800' },
  val: { fontSize: 13, fontWeight: '800' },
  detail: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  track: { height: 12, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, minWidth: 6 },
});

