/**
 * Formats a duration in seconds to m:ss or h:mm:ss.
 * Example: 3661 → "1:01:01"
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Builds a text progress bar.
 * Example: progressBar(30, 120, 15) → "━━━●────────────"
 */
export function progressBar(current: number, total: number, length = 15): string {
  const filled = total > 0 ? Math.floor((current / total) * length) : 0;
  return '━'.repeat(filled) + '●' + '─'.repeat(length - filled);
}
