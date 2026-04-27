// gradient hero – branding strip at top of main tabs (visual polish + coursework UX)

// imports
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { heroGradientStops, resolveThemePalette } from '@/constants/theme';
import { useThemeControls } from '@/contexts/app-color-scheme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// asset – app branding logo (local file; no network)
const HERO_LOGO = require('../../assets/images/careerboost-logo.png');

// types
type HeroBannerProps = {
  /** Small line above the title (e.g. app name). */
  eyebrow: string;
  /** Main heading for this screen. */
  title: string;
  /** Optional supporting line under the title (branding + context). */
  tagline?: string;
};

// component – soft diagonal gradient + accent pill (no images required for marks)
export function HeroBanner({ eyebrow, title, tagline }: HeroBannerProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const { highContrast } = useThemeControls();
  const palette = resolveThemePalette(colorScheme, highContrast);
  const stops = heroGradientStops(colorScheme, highContrast);
  const headerLabel = [eyebrow, title, tagline].filter(Boolean).join('. ');

  return (
    <LinearGradient
      colors={[...stops]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
      {/* One header announcement (includes tagline) — children hidden from a11y tree to avoid duplication */}
      <View
        style={styles.inner}
        accessible
        accessibilityRole="header"
        accessibilityLabel={headerLabel}>
        <View style={styles.topLine}>
          <View style={styles.brandRow}>
            <Image
              source={HERO_LOGO}
              style={styles.logo}
              accessibilityIgnoresInvertColors
              importantForAccessibility="no"
            />
            <View style={[styles.accentPill, { backgroundColor: palette.textOnHero }]} importantForAccessibility="no" />
            <View style={styles.eyebrowWrap}>
              <Text
                style={[styles.eyebrow, { color: palette.heroMuted }]}
                numberOfLines={2}
                importantForAccessibility="no">
                {eyebrow}
              </Text>
            </View>
          </View>
        </View>
        <Text style={[styles.title, { color: palette.textOnHero }]} numberOfLines={3} importantForAccessibility="no">
          {title}
        </Text>
        {tagline ? (
          <Text style={[styles.tagline, { color: palette.heroMuted }]} numberOfLines={4} importantForAccessibility="no">
            {tagline}
          </Text>
        ) : null}
      </View>
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
    width: '100%',
  },
  inner: { width: '100%', flexGrow: 0 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, width: '100%' },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
    width: '100%',
  },
  eyebrowWrap: { flexShrink: 1, minWidth: 0, flexGrow: 1 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  accentPill: { width: 4, height: 22, borderRadius: 4, opacity: 0.95 },
  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: 15, fontWeight: '600', marginTop: 8, lineHeight: 21, maxWidth: '100%' },
});
