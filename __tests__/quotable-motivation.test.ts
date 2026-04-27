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

  it('throws a friendly message when every source fails', async () => {
    global.fetch = jest.fn(async () => new Response('', { status: 502 })) as unknown as typeof fetch;
    await expect(fetchMotivationQuote()).rejects.toThrow(/Could not load a quote right now/);
  });

  it('uses a later source when earlier URLs return non-OK', async () => {
    let n = 0;
    global.fetch = jest.fn(async () => {
      n += 1;
      if (n < 3) return new Response('', { status: 503 });
      return new Response(JSON.stringify([{ q: 'Zen line.', a: 'Zen Author' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const q = await fetchMotivationQuote();
    expect(q.quote).toBe('Zen line.');
    expect(q.author).toBe('Zen Author');
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
