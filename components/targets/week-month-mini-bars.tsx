// week/month mini bars – simple visual for Targets tab (no chart libs)

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type MiniBar = {
  label: string;
  current: number;
  goal: number;
  color: string;
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
        Quick comparison of progress toward your current week and month goals.
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
              <View
                style={[styles.track, { backgroundColor: trackColor }]}
                accessibilityRole="progressbar"
                accessibilityLabel={`${b.label} progress ${b.current} of ${b.goal}`}
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
  track: { height: 12, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, minWidth: 6 },
});

