// Career tip card – small external API feature (loading/error/offline states)

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { CareerTip } from '@/lib/career-tip';
import { getCareerTipWithFallback } from '@/lib/career-tip';

type CareerTipCardProps = {
  tint: string;
  textColor: string;
  mutedColor: string;
  surfaceMuted: string;
  borderColor: string;
};

export function CareerTipCard({
  tint,
  textColor,
  mutedColor,
  surfaceMuted,
  borderColor,
}: CareerTipCardProps) {
  // Section: state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<CareerTip | null>(null);

  // Section: load helper (uses cache fallback when offline)
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await getCareerTipWithFallback();
      setTip(t);
    } catch (e) {
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
    return tip.source === 'cache' ? 'Offline (cached)' : 'Live (API)';
  }, [tip]);

  return (
    <View
      style={[styles.card, { backgroundColor: surfaceMuted, borderColor }]}
      accessible
      accessibilityLabel={
        loading
          ? 'Career tip. Loading.'
          : error
            ? `Career tip. Error: ${error}`
            : `Career tip. ${tip?.text ?? ''}`
      }>
      <View style={styles.headRow}>
        <ThemedText type="defaultSemiBold">Career tip (API)</ThemedText>
        <Pressable
          onPress={() => void load()}
          accessibilityRole="button"
          accessibilityLabel="Refresh tip"
          style={({ pressed }) => [styles.refreshBtn, { opacity: pressed ? 0.75 : 1 }]}>
          <ThemedText style={[styles.refreshText, { color: tint }]}>Refresh</ThemedText>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={tint} />
          <ThemedText style={{ color: mutedColor }}>Loading tip…</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errWrap}>
          <ThemedText style={styles.errText}>{error}</ThemedText>
          <ThemedText style={{ color: mutedColor }}>
            Tip loads from a public API. If you’re offline, it will show the last cached tip.
          </ThemedText>
        </View>
      ) : (
        <>
          {subtitle ? (
            <ThemedText style={[styles.sub, { color: mutedColor }]}>{subtitle}</ThemedText>
          ) : null}
          <ThemedText style={[styles.tip, { color: textColor }]}>{tip?.text}</ThemedText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refreshBtn: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  refreshText: { fontSize: 14, fontWeight: '800' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  sub: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  tip: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  errWrap: { gap: 6 },
  errText: { color: '#b91c1c', fontWeight: '700' },
});

