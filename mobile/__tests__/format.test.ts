import { formatDayLabel, formatRelativeTimestamp, getInitials } from '@/src/utils/format';

describe('getInitials', () => {
  it('combines the first letter of each name in uppercase', () => {
    expect(getInitials('ana', 'garcía')).toBe('AG');
  });

  it('falls back to "?" when both names are empty', () => {
    expect(getInitials('', '')).toBe('?');
  });
});

describe('formatRelativeTimestamp', () => {
  const now = new Date('2026-09-25T18:30:00');

  it('shows just the time for a timestamp from today', () => {
    const today = new Date('2026-09-25T09:05:00').toISOString();
    const result = formatRelativeTimestamp(today, now);
    expect(result).not.toMatch(/2026|09\/25/);
  });

  it('shows a short date for a timestamp from a previous day', () => {
    const yesterday = new Date('2026-09-24T09:05:00').toISOString();
    const result = formatRelativeTimestamp(yesterday, now);
    expect(result).toMatch(/24/);
  });
});

describe('formatDayLabel', () => {
  const now = new Date('2026-09-25T18:30:00');

  it('labels a timestamp from today as "Hoy"', () => {
    const today = new Date('2026-09-25T09:05:00').toISOString();
    expect(formatDayLabel(today, now)).toBe('Hoy');
  });

  it('labels a timestamp from just before midnight the previous day as "Ayer", not "Hoy"', () => {
    const justBeforeMidnight = new Date('2026-09-24T23:55:00').toISOString();
    expect(formatDayLabel(justBeforeMidnight, now)).toBe('Ayer');
  });

  it('shows a full date for anything older than yesterday', () => {
    const lastWeek = new Date('2026-09-18T09:05:00').toISOString();
    const result = formatDayLabel(lastWeek, now);
    expect(result).not.toBe('Hoy');
    expect(result).not.toBe('Ayer');
    expect(result).toMatch(/18/);
  });
});
