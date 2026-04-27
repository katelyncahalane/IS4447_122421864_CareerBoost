// career tip – external API integration (no key), with local cache for offline use

import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// Public API (no key): returns a short advice string
const TIP_URL = 'https://api.adviceslip.com/advice';
const TIP_CACHE_KEY = '@careerboost/career_tip_v1';
const FETCH_TIMEOUT_MS = 14_000;

export type CareerTip = {
  text: string;
  fetchedAtMs: number;
  source: 'api' | 'cache';
};

type CacheShape = { text: string; fetchedAtMs: number };

export async function getCachedTip(): Promise<CacheShape | null> {
  const raw = await AsyncStorage.getItem(TIP_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed?.text || typeof parsed.fetchedAtMs !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchCareerTip(): Promise<CareerTip> {
  const res = await fetchWithTimeout(
    TIP_URL,
    {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    },
    FETCH_TIMEOUT_MS,
  );
  if (!res.ok) {
    throw new Error(`Advice Slip request failed (${res.status}). Try again in a moment.`);
  }

  const data = (await res.json()) as { slip?: { advice?: string } };
  const text = data?.slip?.advice?.trim();
  if (!text) throw new Error('Tip response was empty or malformed.');

  const out: CacheShape = { text, fetchedAtMs: Date.now() };
  await AsyncStorage.setItem(TIP_CACHE_KEY, JSON.stringify(out));
  return { ...out, source: 'api' };
}

export async function getCareerTipWithFallback(): Promise<CareerTip> {
  try {
    return await fetchCareerTip();
  } catch (e) {
    const cached = await getCachedTip();
    if (cached) return { ...cached, source: 'cache' };
    throw e instanceof Error ? e : new Error('Could not load tip.');
  }
}

