// Human-readable “time ago” for API “last updated” footers (short strings for UI + a11y).

export function formatRelativeTimeMs(whenMs: number, nowMs: number = Date.now()): string {
  const diff = Math.max(0, nowMs - whenMs);
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return 'Just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
