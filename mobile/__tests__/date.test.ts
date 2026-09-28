import { birthDateField, isValidDisplayDate, toApiDate, toDisplayDate } from '@/src/utils/date';

describe('toDisplayDate', () => {
  it('turns the ISO date from the API into DD-MM-YYYY', () => {
    expect(toDisplayDate('1995-03-20T00:00:00.000Z')).toBe('20-03-1995');
  });

  it('keeps the calendar day of the ISO string regardless of the local timezone', () => {
    // Medianoche UTC leída como hora local (UTC-3) caería el día anterior; el
    // corte del string evita ese corrimiento.
    expect(toDisplayDate('1995-03-01T00:00:00.000Z')).toBe('01-03-1995');
  });

  it('returns an empty string when the date is not a usable ISO value', () => {
    expect(toDisplayDate('')).toBe('');
  });
});

describe('toApiDate', () => {
  it('turns what the user typed into the ISO date the backend validates', () => {
    expect(toApiDate('20-03-1995')).toBe('1995-03-20');
  });

  it('ignores surrounding spaces', () => {
    expect(toApiDate('  20-03-1995 ')).toBe('1995-03-20');
  });
});

describe('isValidDisplayDate', () => {
  it('accepts a real date', () => {
    expect(isValidDisplayDate('29-02-2024')).toBe(true);
  });

  it('rejects a date that does not exist', () => {
    expect(isValidDisplayDate('31-02-1995')).toBe(false);
    expect(isValidDisplayDate('29-02-2025')).toBe(false);
  });

  it('rejects the old YYYY-MM-DD order', () => {
    expect(isValidDisplayDate('1995-03-20')).toBe(false);
  });
});

describe('birthDateField', () => {
  it('reports the expected format when the shape is wrong', () => {
    const result = birthDateField.safeParse('20/03/1995');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Formato DD-MM-YYYY');
  });

  it('accepts a well formed date', () => {
    expect(birthDateField.safeParse('20-03-1995').success).toBe(true);
  });
});
