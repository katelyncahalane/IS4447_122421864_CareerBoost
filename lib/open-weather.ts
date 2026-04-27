// OpenWeatherMap current weather — key from local `.env` via `app.config.js` → `expo.extra` (never commit `.env`).
// Note: `EXPO_PUBLIC_*` values are still bundled for client calls; restrict keys in the OpenWeather dashboard.

import Constants from 'expo-constants';

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

const FALLBACK_CITY = 'London';
const FETCH_TIMEOUT_MS = 16_000;

export type WeatherSnapshot = {
  city: string;
  description: string;
  tempC: number;
  fetchedAtMs: number;
};

function apiKey(): string {
  const fromExtra = Constants.expoConfig?.extra?.openWeatherApiKey;
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_OPENWEATHER_API_KEY) {
    return String(process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY).trim();
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

export function hasOpenWeatherApiKey(): boolean {
  return apiKey().length > 0;
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
  return `Weather request failed (${res.status}).`;
}

export async function fetchCurrentWeather(city: string = defaultCity()): Promise<WeatherSnapshot> {
  const key = apiKey();
  if (!key) {
    throw new Error(
      'Missing API key. Add EXPO_PUBLIC_OPENWEATHER_API_KEY to a local .env file (see .env.example) and restart Expo.',
    );
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
    throw new Error(detail);
  }
  const data = (await res.json()) as {
    name?: string;
    weather?: { description?: string }[];
    main?: { temp?: number };
  };
  const description = data.weather?.[0]?.description?.trim() ?? 'conditions';
  const tempC = typeof data.main?.temp === 'number' ? data.main.temp : NaN;
  if (!Number.isFinite(tempC)) {
    throw new Error('Weather response was missing temperature.');
  }
  return {
    city: data.name ?? q,
    description,
    tempC,
    fetchedAtMs: Date.now(),
  };
}
