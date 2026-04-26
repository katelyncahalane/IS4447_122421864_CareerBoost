// gradient hero – branding strip at top of main tabs (visual polish + coursework UX)

// imports
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, heroGradientStops } from '@/constants/theme';

// types
type Scheme = 'light' | 'dark';

type HeroBannerProps = {
  colorScheme: Scheme;
  /** Small line above the title (e.g. app name). */
  eyebrow: string;
  /** Main heading for this screen. */
  title: string;
};

// component – soft diagonal gradient + accent pill (no images required for marks)
export function HeroBanner({ colorScheme, eyebrow, title }: HeroBannerProps) {
  const insets = useSafeAreaInsets();
  const palette = Colors[colorScheme];
  const stops = heroGradientStops(colorScheme);

  return (
    <LinearGradient
      colors={[...stops]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
      <View style={styles.topLine}>
        <View style={[styles.accentPill, { backgroundColor: palette.textOnHero }]} />
        <Text style={[styles.eyebrow, { color: palette.heroMuted }]}>{eyebrow}</Text>
      </View>
      <Text style={[styles.title, { color: palette.textOnHero }]}>{title}</Text>
    </LinearGradient>
  );
}

// styles
const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  accentPill: { width: 4, height: 22, borderRadius: 4, opacity: 0.95 },
  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
});
