import { formatRelativeTimestamp, getInitials } from '@/src/utils/format';

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
