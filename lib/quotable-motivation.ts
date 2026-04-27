// Motivational quote — tries Quotable first, then ZenQuotes (Quotable’s public host is often unreliable).

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

const QUOTABLE_PRIMARY =
  'https://api.quotable.io/random?tags=motivational&maxLength=280';
const QUOTABLE_FALLBACK = 'https://api.quotable.io/random?maxLength=280';
const ZEN_QUOTES = 'https://zenquotes.io/api/random';

const FETCH_TIMEOUT_MS = 14_000;

export type MotivationQuote = {
  quote: string;
  author: string;
  fetchedAtMs: number;
};

function parseQuotableBody(data: unknown): { quote: string; author: string } | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const quote =
    typeof o.content === 'string'
      ? o.content.trim()
      : typeof o.text === 'string'
        ? o.text.trim()
        : '';
  const author = typeof o.author === 'string' ? o.author.trim() : '';
  if (!quote) return null;
  return { quote, author: author || 'Unknown' };
}

function parseQuotableArray(data: unknown): { quote: string; author: string } | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  return parseQuotableBody(data[0]);
}

function parseZenQuotes(data: unknown): { quote: string; author: string } | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as Record<string, unknown>;
  const quote = typeof row.q === 'string' ? row.q.trim() : '';
  const author = typeof row.a === 'string' ? row.a.trim() : '';
  if (!quote) return null;
  return { quote, author: author || 'Unknown' };
}

async function tryUrl(url: string): Promise<MotivationQuote | null> {
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, FETCH_TIMEOUT_MS);
  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (url.includes('zenquotes.io')) {
    const z = parseZenQuotes(data);
    return z ? { ...z, fetchedAtMs: Date.now() } : null;
  }
  const single = parseQuotableBody(data);
  if (single) return { ...single, fetchedAtMs: Date.now() };
  const fromArray = parseQuotableArray(data);
  return fromArray ? { ...fromArray, fetchedAtMs: Date.now() } : null;
}

export async function fetchMotivationQuote(): Promise<MotivationQuote> {
  for (const url of [QUOTABLE_PRIMARY, QUOTABLE_FALLBACK, ZEN_QUOTES]) {
    try {
      const got = await tryUrl(url);
      if (got) return got;
    } catch {
      /* try next source */
    }
  }
  throw new Error('Could not load a quote right now. Try again shortly.');
}
