// Career tip card — online tip with AsyncStorage cache; loading, error, and success states.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { CareerTip } from '@/lib/career-tip';
import { formatRelativeTimeMs } from '@/lib/format-relative-time';
import { getCareerTipWithFallback } from '@/lib/career-tip';

type CareerTipCardProps = {
  tint: string;
  textColor: string;
  mutedColor: string;
  surfaceMuted: string;
  borderColor: string;
  errorTextColor: string;
  errorSurfaceColor: string;
  errorBorderColor: string;
};

export function CareerTipCard({
  tint,
  textColor,
  mutedColor,
  surfaceMuted,
  borderColor,
  errorTextColor,
  errorSurfaceColor,
  errorBorderColor,
}: CareerTipCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<CareerTip | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await getCareerTipWithFallback();
      setTip(t);
    } catch (e) {
      setTip(null);
      setError(e instanceof Error ? e.message : 'Could not load tip.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subtitle = useMemo(() => {
    if (!tip) return null;
    return tip.source === 'cache' ? 'Saved on this device' : 'Just updated';
  }, [tip]);

  const refreshLabel = error ? 'Retry' : 'Refresh';

  return (
    <View
      style={[styles.card, { backgroundColor: surfaceMuted, borderColor }]}
      accessible={false}
      accessibilityLabel="Career tip card">
      <View style={styles.headRow} accessible accessibilityRole="header">
        <ThemedText type="defaultSemiBold" style={styles.headTitle}>
          Daily career tip
        </ThemedText>
        <Pressable
          onPress={() => void load()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={error ? 'Retry loading career tip' : 'Refresh career tip'}
          accessibilityHint="Fetches another short career idea"
          accessibilityState={{ disabled: loading }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => [
            styles.refreshBtn,
            { opacity: pressed ? 0.75 : loading ? 0.5 : 1, minHeight: 44, justifyContent: 'center' },
          ]}>
          <ThemedText style={[styles.refreshText, { color: tint }]}>{refreshLabel}</ThemedText>
        </Pressable>
      </View>

      <View accessibilityLiveRegion="polite" accessible={false}>
        {loading ? (
          <View style={styles.loadingRow} accessible accessibilityRole="progressbar" accessibilityLabel="Loading career tip">
            <ActivityIndicator size="small" color={tint} accessibilityElementsHidden />
            <ThemedText style={{ color: mutedColor }}>Fetching a fresh tip…</ThemedText>
          </View>
        ) : error ? (
          <View
            style={[
              styles.errPanel,
              {
                backgroundColor: errorSurfaceColor,
                borderColor: errorBorderColor,
              },
            ]}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`Career tip could not load. ${error}`}>
            <ThemedText style={[styles.errTitle, { color: errorTextColor }]}>Could not load tip</ThemedText>
            <ThemedText style={[styles.errBody, { color: textColor }]}>{error}</ThemedText>
            <ThemedText style={[styles.hint, { color: mutedColor }]}>
              With no saved tip yet, you need a connection once. After that, the last tip is cached for offline use.
            </ThemedText>
          </View>
        ) : (
          <View accessible accessibilityRole="text" accessibilityLabel={`Career tip. ${tip?.text ?? ''}`}>
            {subtitle ? (
              <ThemedText style={[styles.sub, { color: mutedColor }]}>{subtitle}</ThemedText>
            ) : null}
            <ThemedText style={[styles.tip, { color: textColor }]}>{tip?.text}</ThemedText>
            {tip ? (
              <ThemedText style={[styles.updated, { color: mutedColor }]}>
                Updated {formatRelativeTimeMs(tip.fetchedAtMs)}
              </ThemedText>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  headRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headTitle: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  refreshBtn: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  refreshText: { fontSize: 14, fontWeight: '800' },
  loadingRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  sub: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  tip: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  updated: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  errPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  errTitle: { fontWeight: '800', fontSize: 15 },
  errBody: { fontWeight: '600', fontSize: 14, lineHeight: 20 },
  hint: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
});
