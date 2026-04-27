import { fetchMotivationQuote } from '@/lib/quotable-motivation';

describe('fetchMotivationQuote', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns quote and author from Quotable-shaped JSON', async () => {
    global.fetch = jest.fn(async () => {
      return new Response(
        JSON.stringify({
          content: 'Persistence beats resistance.',
          author: 'CareerBoost fixture',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    const q = await fetchMotivationQuote();
    expect(q.quote).toBe('Persistence beats resistance.');
    expect(q.author).toBe('CareerBoost fixture');
    expect(typeof q.fetchedAtMs).toBe('number');
  });

  it('throws on non-OK response', async () => {
    global.fetch = jest.fn(async () => new Response('', { status: 502 })) as unknown as typeof fetch;
    await expect(fetchMotivationQuote()).rejects.toThrow(/502/);
  });
});
