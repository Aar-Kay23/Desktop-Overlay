import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatMegabytes,
  formatPercent,
  formatDuration,
  getStatusColor,
} from '../lib/utils';

describe('Formatters & Utility Functions', () => {
  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('formats megabytes into GB when over 1024', () => {
    expect(formatMegabytes(512)).toBe('512 MB');
    expect(formatMegabytes(2048)).toBe('2.0 GB');
    expect(formatMegabytes(16384)).toBe('16.0 GB');
  });

  it('clamps and formats percentages properly', () => {
    expect(formatPercent(45.6)).toBe('46%');
    expect(formatPercent(120)).toBe('100%');
    expect(formatPercent(-10)).toBe('0%');
  });

  it('formats durations into MM:SS format', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(284)).toBe('4:44');
    expect(formatDuration(NaN)).toBe('0:00');
  });

  it('returns appropriate status color classes based on thresholds', () => {
    const normal = getStatusColor(45, { warn: 70, crit: 85 });
    expect(normal.text).toContain('emerald');

    const warning = getStatusColor(75, { warn: 70, crit: 85 });
    expect(warning.text).toContain('amber');

    const critical = getStatusColor(92, { warn: 70, crit: 85 });
    expect(critical.text).toContain('rose');
  });
});
