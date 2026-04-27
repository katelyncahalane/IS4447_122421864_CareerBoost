// empty state – centred card for lists (accessibility + blue/white brand)

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { cardShadowStyle } from '@/lib/card-shadow';

type EmptyStateCardProps = {
  /** Ionicons glyph name */
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  tint: string;
  surface: string;
  border: string;
  textColor: string;
  mutedColor: string;
};

export function EmptyStateCard({
  icon,
  title,
  message,
  tint,
  surface,
  border,
  textColor,
  mutedColor,
}: EmptyStateCardProps) {
  return (
    <View
      style={[styles.wrap, cardShadowStyle, { backgroundColor: surface, borderColor: border }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${message}`}>
      <View style={[styles.iconCircle, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={32} color={tint} accessibilityElementsHidden importantForAccessibility="no" />
      </View>
      <ThemedText type="defaultSemiBold" style={[styles.title, { color: textColor }]}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.msg, { color: mutedColor }]}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, textAlign: 'center' },
  msg: { fontSize: 15, lineHeight: 22, textAlign: 'center', fontWeight: '500' },
});
