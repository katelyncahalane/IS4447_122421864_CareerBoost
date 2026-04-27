// Quotable — random motivational quote for job-search mindset (no API key; public GET only).
//
// API: https://github.com/lukePeavy/quotable — https://api.quotable.io

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// Single tag keeps the URL simple and reliable; still skews toward encouragement for job seekers.
const QUOTE_URL = 'https://api.quotable.io/random?tags=motivational&maxLength=280';

const FETCH_TIMEOUT_MS = 14_000;

export type MotivationQuote = {
  quote: string;
  author: string;
  fetchedAtMs: number;
};

export async function fetchMotivationQuote(): Promise<MotivationQuote> {
  const res = await fetchWithTimeout(QUOTE_URL, { headers: { Accept: 'application/json' } }, FETCH_TIMEOUT_MS);
  if (!res.ok) {
    throw new Error(`Quote request failed (${res.status}). Try again shortly.`);
  }
  const data = (await res.json()) as { content?: unknown; author?: unknown };
  const quote = typeof data.content === 'string' ? data.content.trim() : '';
  const author = typeof data.author === 'string' ? data.author.trim() : 'Unknown';
  if (!quote) {
    throw new Error('Quote response was empty.');
  }
  return { quote, author, fetchedAtMs: Date.now() };
}
