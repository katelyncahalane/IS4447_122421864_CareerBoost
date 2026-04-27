// compact stat tiles – quick visual summary row (numbers + icons)

// imports
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ThemePalette } from '@/constants/theme';

// types
type Palette = ThemePalette;

export type StatItem = {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
};

type StatStripProps = {
  palette: Palette;
  items: StatItem[];
};

// component
export function StatStrip({ palette, items }: StatStripProps) {
  return (
    <View style={styles.row}>
      {items.map((it) => (
        <View
          key={it.label}
          accessible
          accessibilityLabel={it.accessibilityLabel}
          style={[
            styles.tile,
            {
              backgroundColor: palette.surfaceMuted,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <View style={[styles.iconBubble, { backgroundColor: `${palette.tint}18` }]}>
            <Ionicons name={it.icon} size={18} color={palette.tint} />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.value}>
            {it.value}
          </ThemedText>
          <ThemedText style={[styles.label, { opacity: 0.75 }]}>{it.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

// styles
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  value: { fontSize: 20, lineHeight: 26 },
  label: { fontSize: 12, textAlign: 'center', fontWeight: '500' },
});
