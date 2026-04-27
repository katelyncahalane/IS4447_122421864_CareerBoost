// Motivational quote — online sources with fallbacks. Flexbox: column stack + header row + footer row.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatRelativeTimeMs } from '@/lib/format-relative-time';
import { fetchMotivationQuote, type MotivationQuote } from '@/lib/quotable-motivation';

type MotivationQuoteCardProps = {
  tint: string;
  textColor: string;
  mutedColor: string;
  surfaceMuted: string;
  borderColor: string;
  errorTextColor: string;
  errorSurfaceColor: string;
  errorBorderColor: string;
};

export function MotivationQuoteCard({
  tint,
  textColor,
  mutedColor,
  surfaceMuted,
  borderColor,
  errorTextColor,
  errorSurfaceColor,
  errorBorderColor,
}: MotivationQuoteCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MotivationQuote | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = await fetchMotivationQuote();
      setData(q);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Could not load quote.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshLabel = error ? 'Retry' : 'Refresh';

  return (
    <View style={[styles.card, { backgroundColor: surfaceMuted, borderColor }]} accessibilityLabel="Motivational quote card">
      {/* Header: title + action — horizontal flex row */}
      <View style={styles.headerRow}>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          Motivation for your search
        </ThemedText>
        <Pressable
          onPress={() => void load()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={error ? 'Retry motivational quote' : 'Refresh motivational quote'}
          accessibilityHint="Loads another short quote"
          accessibilityState={{ disabled: loading }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => [
            styles.refreshPressable,
            { opacity: pressed ? 0.75 : loading ? 0.55 : 1, minHeight: 44, justifyContent: 'center' },
          ]}>
          <ThemedText style={[styles.refreshLabel, { color: tint }]}>{refreshLabel}</ThemedText>
        </Pressable>
      </View>

      <ThemedText style={[styles.kicker, { color: mutedColor }]}>
        A short line when you want a lift. Tap Refresh for another.
      </ThemedText>

      <View style={styles.bodyColumn} accessibilityLiveRegion="polite">
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={tint} accessibilityElementsHidden />
            <ThemedText style={[styles.loadingText, { color: mutedColor }]}>Loading quote…</ThemedText>
          </View>
        ) : error ? (
          <View
            style={[styles.errorBox, { backgroundColor: errorSurfaceColor, borderColor: errorBorderColor }]}
            accessibilityRole="alert">
            <ThemedText style={[styles.errorTitle, { color: errorTextColor }]}>Could not load quote</ThemedText>
            <ThemedText style={[styles.errorBody, { color: textColor }]}>{error}</ThemedText>
          </View>
        ) : data ? (
          <View style={styles.quoteColumn}>
            <ThemedText style={[styles.quoteText, { color: textColor }]}>&ldquo;{data.quote}&rdquo;</ThemedText>
            {/* Footer: author + time — row, space-between, wraps on narrow screens */}
            <View style={styles.footerRow}>
              <ThemedText style={[styles.author, { color: tint }]} numberOfLines={2}>
                {data.author}
              </ThemedText>
              <ThemedText style={[styles.timeMeta, { color: mutedColor }]}>
                {formatRelativeTimeMs(data.fetchedAtMs)}
              </ThemedText>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'nowrap',
  },
  headerTitle: { flexShrink: 1, flexGrow: 1 },
  refreshPressable: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  refreshLabel: { fontSize: 14, fontWeight: '800' },
  kicker: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  bodyColumn: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'stretch',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  errorTitle: { fontWeight: '800', fontSize: 15 },
  errorBody: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  quoteColumn: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'stretch',
  },
  quoteText: { fontSize: 16, lineHeight: 24, fontWeight: '700', fontStyle: 'italic' },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  author: { fontSize: 14, fontWeight: '800', flexGrow: 1, flexShrink: 1, minWidth: 120 },
  timeMeta: { fontSize: 12, fontWeight: '700' },
});
