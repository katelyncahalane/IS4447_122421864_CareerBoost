// unit tests – applications list WHERE helper (rubric: search, category, date range)

// imports
import {
  applicationsListWhere,
  normaliseIsoDateInput,
  parseMetricBound,
  stripLikeWildcards,
} from '@/lib/application-list-query';

const emptyFilters = {
  searchRaw: '',
  categoryId: null as number | null,
  dateFrom: null as string | null,
  dateTo: null as string | null,
  statuses: [] as readonly string[],
  metricMin: null as number | null,
  metricMax: null as number | null,
  hasNotesOnly: false,
};

// tests
describe('stripLikeWildcards', () => {
  it('removes percent and underscore characters', () => {
    expect(stripLikeWildcards('a%b_c')).toBe('abc');
  });
});

describe('normaliseIsoDateInput', () => {
  it('accepts a valid yyyy-mm-dd', () => {
    expect(normaliseIsoDateInput('  2026-04-26  ')).toBe('2026-04-26');
  });

  it('rejects invalid calendar dates', () => {
    expect(normaliseIsoDateInput('2026-02-30')).toBeNull();
  });

  it('rejects malformed strings', () => {
    expect(normaliseIsoDateInput('26-04-2026')).toBeNull();
    expect(normaliseIsoDateInput('')).toBeNull();
  });
});

describe('parseMetricBound', () => {
  it('accepts positive integers', () => {
    expect(parseMetricBound('  12 ')).toBe(12);
  });

  it('rejects zero and non-numeric', () => {
    expect(parseMetricBound('0')).toBeNull();
    expect(parseMetricBound('x')).toBeNull();
    expect(parseMetricBound('')).toBeNull();
  });
});

describe('applicationsListWhere', () => {
  it('returns undefined when no filters', () => {
    expect(applicationsListWhere(emptyFilters)).toBeUndefined();
    expect(
      applicationsListWhere({ ...emptyFilters, searchRaw: '   ' }),
    ).toBeUndefined();
  });

  it('returns a clause when search text is non-empty', () => {
    expect(applicationsListWhere({ ...emptyFilters, searchRaw: 'bank' })).toBeDefined();
  });

  it('returns a clause when category id is set', () => {
    expect(applicationsListWhere({ ...emptyFilters, categoryId: 2 })).toBeDefined();
  });

  it('returns a clause when both search and category are set', () => {
    expect(
      applicationsListWhere({ ...emptyFilters, searchRaw: 'eng', categoryId: 1 }),
    ).toBeDefined();
  });

  it('returns a clause when date from is set', () => {
    expect(
      applicationsListWhere({ ...emptyFilters, dateFrom: '2026-01-01' }),
    ).toBeDefined();
  });

  it('returns a clause when date to is set', () => {
    expect(
      applicationsListWhere({ ...emptyFilters, dateTo: '2026-12-31' }),
    ).toBeDefined();
  });

  it('returns a clause when statuses are set', () => {
    expect(
      applicationsListWhere({ ...emptyFilters, statuses: ['Applied', 'Offer'] }),
    ).toBeDefined();
  });

  it('returns a clause when metric bounds are set', () => {
    expect(
      applicationsListWhere({ ...emptyFilters, metricMin: 2, metricMax: 10 }),
    ).toBeDefined();
  });

  it('returns a clause when hasNotesOnly is true', () => {
    expect(applicationsListWhere({ ...emptyFilters, hasNotesOnly: true })).toBeDefined();
  });
});
