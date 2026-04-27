import { formatRelativeTimeMs } from '@/lib/format-relative-time';

describe('formatRelativeTimeMs', () => {
  it('returns short labels for recent timestamps', () => {
    const now = 1_700_000_000_000;
    expect(formatRelativeTimeMs(now - 2000, now)).toBe('Just now');
    expect(formatRelativeTimeMs(now - 45_000, now)).toBe('45s ago');
    expect(formatRelativeTimeMs(now - 5 * 60_000, now)).toBe('5m ago');
    expect(formatRelativeTimeMs(now - 3 * 60 * 60_000, now)).toBe('3h ago');
    expect(formatRelativeTimeMs(now - 50 * 60 * 60_000, now)).toBe('2d ago');
  });
});
