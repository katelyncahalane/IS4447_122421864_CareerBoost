// OpenWeather snapshot — env key via `app.config.js` / `.env`; loading, no-key, error, and success states.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatRelativeTimeMs } from '@/lib/format-relative-time';
import {
  fetchCurrentWeather,
  hasWeatherKey,
  sanitizeWeatherErrorForUi,
  type WeatherSnapshot,
} from '@/lib/open-weather';

type WeatherCardProps = {
  tint: string;
  textColor: string;
  mutedColor: string;
  surfaceMuted: string;
  borderColor: string;
  errorTextColor: string;
  errorSurfaceColor: string;
  errorBorderColor: string;
};

export function WeatherCard({
  tint,
  textColor,
  mutedColor,
  surfaceMuted,
  borderColor,
  errorTextColor,
  errorSurfaceColor,
  errorBorderColor,
}: WeatherCardProps) {
  const [loading, setLoading] = useState(() => hasWeatherKey());
  const [error, setError] = useState<string | null>(null);
  const [snap, setSnap] = useState<WeatherSnapshot | null>(null);

  const load = useCallback(async () => {
    if (!hasWeatherKey()) {
      setError(null);
      setSnap(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const w = await fetchCurrentWeather();
      setSnap(w);
    } catch (e) {
      setSnap(null);
      setError(
        sanitizeWeatherErrorForUi(
          e instanceof Error ? e.message : 'Could not load weather.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasKey = hasWeatherKey();
  const refreshLabel = error ? 'Retry' : 'Refresh';

  return (
    <View style={[styles.card, { backgroundColor: surfaceMuted, borderColor }]} accessible={false}>
      <View style={styles.headRow} accessible accessibilityRole="header">
        <ThemedText type="defaultSemiBold" accessibilityRole="text">
          Local weather
        </ThemedText>
        <Pressable
          onPress={() => void load()}
          disabled={!hasKey || loading}
          accessibilityRole="button"
          accessibilityLabel={!hasKey ? 'Forecast unavailable' : error ? 'Retry loading forecast' : 'Refresh forecast'}
          accessibilityHint={!hasKey ? undefined : 'Updates temperature and conditions'}
          accessibilityState={{ disabled: !hasKey || loading }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.refreshBtn,
            { opacity: pressed ? 0.75 : !hasKey ? 0.45 : 1, minHeight: 44, justifyContent: 'center' },
          ]}>
          <ThemedText style={[styles.refreshText, { color: tint }]}>{refreshLabel}</ThemedText>
        </Pressable>
      </View>

      <View accessibilityLiveRegion="polite" accessible={false}>
        {!hasKey ? (
          <View
            style={styles.col}
            accessible
            accessibilityRole="text"
            accessibilityLabel="No forecast available. This section may appear after a full restart of the app.">
            <ThemedText style={[styles.body, { color: textColor }]}>
              No forecast to show here yet. If you recently turned this on, fully close the app and open it again.
            </ThemedText>
          </View>
        ) : loading ? (
          <View style={styles.loadingRow} accessible accessibilityRole="progressbar" accessibilityLabel="Loading forecast">
            <ActivityIndicator size="small" color={tint} accessibilityElementsHidden />
            <ThemedText style={{ color: mutedColor }}>Fetching current conditions…</ThemedText>
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
            accessibilityLabel={`Forecast could not load. ${error}`}>
            <ThemedText style={[styles.errTitle, { color: errorTextColor }]}>Could not load forecast</ThemedText>
            <ThemedText style={[styles.errBody, { color: textColor }]}>{error}</ThemedText>
            <ThemedText style={[styles.hint, { color: mutedColor }]}>
              Check your connection, then tap Retry.
            </ThemedText>
          </View>
        ) : snap ? (
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Forecast for ${snap.city}. ${Math.round(snap.tempC)} degrees Celsius. ${snap.description}.`}>
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <ThemedText style={[styles.big, { color: textColor }]}>{Math.round(snap.tempC)}°C</ThemedText>
                <ThemedText style={[styles.sub, { color: mutedColor }]}>{snap.city}</ThemedText>
              </View>
              <View style={[styles.metric, styles.metricGrow]}>
                <ThemedText style={[styles.desc, { color: textColor }]}>{snap.description}</ThemedText>
                <ThemedText style={[styles.sub, { color: mutedColor }]}>Current conditions</ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.updated, { color: mutedColor }]}>
              Updated {formatRelativeTimeMs(snap.fetchedAtMs)}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  headRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  refreshBtn: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  refreshText: { fontSize: 14, fontWeight: '800' },
  col: { flexDirection: 'column', gap: 8 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  hint: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  errPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  errTitle: { fontWeight: '800', fontSize: 15 },
  errBody: { fontWeight: '600', fontSize: 14, lineHeight: 20 },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 12,
  },
  metric: { flexDirection: 'column', gap: 4, minWidth: 88 },
  metricGrow: { flexGrow: 1, flexShrink: 1, flexBasis: 160 },
  big: { fontSize: 28, fontWeight: '900' },
  desc: { fontSize: 15, lineHeight: 21, fontWeight: '700', textTransform: 'capitalize' },
  sub: { fontSize: 12, fontWeight: '600' },
  updated: { fontSize: 12, fontWeight: '600', marginTop: 4 },
});
