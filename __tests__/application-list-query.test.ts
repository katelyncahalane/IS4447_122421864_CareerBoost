// unit tests – applications list WHERE helper (rubric: search + category filter)

// imports
import {
  applicationsListWhere,
  stripLikeWildcards,
} from '@/lib/application-list-query';

// tests
describe('stripLikeWildcards', () => {
  it('removes percent and underscore characters', () => {
    expect(stripLikeWildcards('a%b_c')).toBe('abc');
  });
});

describe('applicationsListWhere', () => {
  it('returns undefined when no search text and no category', () => {
    expect(applicationsListWhere('', null)).toBeUndefined();
    expect(applicationsListWhere('   ', null)).toBeUndefined();
  });

  it('returns a clause when search text is non-empty', () => {
    expect(applicationsListWhere('bank', null)).toBeDefined();
  });

  it('returns a clause when category id is set', () => {
    expect(applicationsListWhere('', 2)).toBeDefined();
  });

  it('returns a clause when both search and category are set', () => {
    expect(applicationsListWhere('eng', 1)).toBeDefined();
  });
});
