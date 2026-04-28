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

type OpenMeteoGeo = {
  results?: { name?: string; latitude?: number; longitude?: number }[];
};

type OpenMeteoForecast = {
  current?: { temperature_2m?: number; weather_code?: number };
};

function openMeteoWeatherLabel(code: number | undefined): string {
  // Minimal mapping, good enough for UI.
  if (code == null) return 'conditions';
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'showers';
  if (code >= 95) return 'thunderstorm';
  return 'conditions';
}

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

async function fetchOpenWeather(city: string): Promise<WeatherSnapshot> {
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

async function fetchOpenMeteo(city: string): Promise<WeatherSnapshot> {
  const q = city.trim().length > 0 ? city.trim() : FALLBACK_CITY;
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
  const geoRes = await fetchWithTimeout(geoUrl, { headers: { Accept: 'application/json' } }, FETCH_TIMEOUT_MS);
  if (!geoRes.ok) throw new Error('Could not find that city.');
  const geo = (await geoRes.json()) as OpenMeteoGeo;
  const hit = geo.results?.[0];
  const lat = typeof hit?.latitude === 'number' ? hit.latitude : NaN;
  const lon = typeof hit?.longitude === 'number' ? hit.longitude : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Could not find that city.');

  const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lon))}&current=temperature_2m,weather_code`;
  const wxRes = await fetchWithTimeout(wxUrl, { headers: { Accept: 'application/json' } }, FETCH_TIMEOUT_MS);
  if (!wxRes.ok) throw new Error('Forecast could not be loaded. Try again in a moment.');
  const wx = (await wxRes.json()) as OpenMeteoForecast;
  const tempC = typeof wx.current?.temperature_2m === 'number' ? wx.current.temperature_2m : NaN;
  if (!Number.isFinite(tempC)) throw new Error('Forecast data was incomplete.');

  return {
    city: typeof hit?.name === 'string' && hit.name.trim() ? hit.name.trim() : q,
    description: openMeteoWeatherLabel(wx.current?.weather_code),
    tempC,
    fetchedAtMs: Date.now(),
  };
}

export async function fetchCurrentWeather(city: string = defaultCity()): Promise<WeatherSnapshot> {
  const q = city.trim().length > 0 ? city.trim() : FALLBACK_CITY;
  // Prefer key-based OpenWeather (matches the coursework "env key" expectation).
  // Fall back to Open-Meteo so Weather still works on Android devices where the key was not bundled into the app runtime.
  if (hasWeatherKey()) {
    try {
      return await fetchOpenWeather(q);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const lower = msg.toLowerCase();
      if (lower.includes('unauthorized') || lower.includes('invalid') || lower.includes('401')) {
        return await fetchOpenMeteo(q);
      }
      throw e;
    }
  }
  return await fetchOpenMeteo(q);
}
