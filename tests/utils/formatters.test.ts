import { formatDuration, progressBar } from '../../src/utils/formatters';

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats exactly one minute', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('pads seconds with leading zero', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('formats hours correctly', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats long playlists', () => {
    expect(formatDuration(7384)).toBe('2:03:04');
  });
});

describe('progressBar', () => {
  it('returns a string of the correct total length', () => {
    const bar = progressBar(30, 120, 10);
    // Format: [progress chars]●[remaining chars] = length + 1 (for the ●)
    expect(bar.length).toBe(11);
  });

  it('shows full progress at the end', () => {
    const bar = progressBar(120, 120, 10);
    expect(bar.startsWith('━'.repeat(10))).toBe(true);
    expect(bar).toContain('●');
  });

  it('shows no progress at the start', () => {
    const bar = progressBar(0, 120, 10);
    expect(bar.startsWith('●')).toBe(true);
  });

  it('handles zero total duration gracefully', () => {
    const bar = progressBar(0, 0, 10);
    expect(bar.startsWith('●')).toBe(true);
  });
});
