// OpenWeatherMap current weather — access key from local `.env` via `app.config.js` → `expo.extra` (never commit `.env`).
// `EXPO_PUBLIC_*` values ship in the client bundle; use account limits on openweathermap.org if you need caps.

import Constants from 'expo-constants';

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

type ExtraShape = { openWeatherApiKey?: unknown };

function readOpenWeatherKeyFromExtra(): string {
  const layers: unknown[] = [
    Constants.expoConfig?.extra as ExtraShape | undefined,
    (Constants as { manifest?: { extra?: ExtraShape } }).manifest?.extra,
    (Constants as { manifest2?: { extra?: ExtraShape } }).manifest2?.extra,
  ];
  for (const extra of layers) {
    const v = extra && typeof extra === 'object' ? (extra as ExtraShape).openWeatherApiKey : undefined;
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return '';
}

const FALLBACK_CITY = 'London';
const FETCH_TIMEOUT_MS = 16_000;

export type WeatherSnapshot = {
  city: string;
  description: string;
  tempC: number;
  fetchedAtMs: number;
};

function weatherAccessKey(): string {
  const fromExtra = readOpenWeatherKeyFromExtra();
  if (fromExtra.length > 0) return fromExtra;
  if (typeof process !== 'undefined') {
    const legacy = process.env?.EXPO_PUBLIC_OPENWEATHER_API_KEY;
    const key = process.env?.EXPO_PUBLIC_OPENWEATHER_KEY ?? legacy;
    if (key) return String(key).trim();
  }
  return '';
}

function defaultCity(): string {
  const fromExtra = Constants.expoConfig?.extra?.openWeatherCity;
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_OPENWEATHER_CITY) {
    return String(process.env.EXPO_PUBLIC_OPENWEATHER_CITY).trim();
  }
  return FALLBACK_CITY;
}

/** True when a weather access key is configured (new or legacy env name). */
export function hasWeatherKey(): boolean {
  return weatherAccessKey().length > 0;
}

async function readOpenWeatherErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: unknown; cod?: unknown };
    if (typeof data.message === 'string' && data.message.trim().length > 0) {
      return data.message.trim();
    }
  } catch {
    /* ignore non-JSON error bodies */
  }
  return `Forecast request failed (${res.status}).`;
}

/** Turn provider / network errors into short on-screen copy — no credential wording. */
export function sanitizeWeatherErrorForUi(raw: string): string {
  const t = raw.trim();
  const lower = t.toLowerCase();
  if (
    lower.includes('invalid api') ||
    lower.includes('api key') ||
    lower.includes('unauthorized') ||
    lower.includes('401')
  ) {
    return 'Forecast could not be loaded. Try again in a moment.';
  }
  if (lower.includes('not set up') || lower.includes('.env')) {
    return 'Forecast is not available right now.';
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('failed to fetch')) {
    return 'Check your connection and try again.';
  }
  return t.replace(/\bapi\b/gi, 'service').replace(/\s+/g, ' ').trim() || 'Could not load weather.';
}

export async function fetchCurrentWeather(city: string = defaultCity()): Promise<WeatherSnapshot> {
  const key = weatherAccessKey();
  if (!key) {
    throw new Error('Forecast is not available in this session.');
  }
  const q = city.trim().length > 0 ? city.trim() : FALLBACK_CITY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    q,
  )}&units=metric&appid=${encodeURIComponent(key)}`;
  const res = await fetchWithTimeout(
    url,
    { headers: { Accept: 'application/json' } },
    FETCH_TIMEOUT_MS,
  );
  if (!res.ok) {
    const detail = await readOpenWeatherErrorMessage(res);
    throw new Error(sanitizeWeatherErrorForUi(detail));
  }
  const data = (await res.json()) as {
    name?: string;
    weather?: { description?: string }[];
    main?: { temp?: number };
  };
  const description = data.weather?.[0]?.description?.trim() ?? 'conditions';
  const tempC = typeof data.main?.temp === 'number' ? data.main.temp : NaN;
  if (!Number.isFinite(tempC)) {
    throw new Error('Forecast data was incomplete.');
  }
  return {
    city: data.name ?? q,
    description,
    tempC,
    fetchedAtMs: Date.now(),
  };
}
