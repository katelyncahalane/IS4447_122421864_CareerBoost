import { statusTimelineForLatest } from '@/lib/application-statuses';

describe('statusTimelineForLatest', () => {
  it('ends on Rejected with a realistic interview path', () => {
    expect(statusTimelineForLatest('Rejected')).toEqual([
      'Applied',
      'Screening',
      'Interview',
      'Rejected',
    ]);
  });

  it('supports Offer and Withdrawn', () => {
    expect(statusTimelineForLatest('Offer').at(-1)).toBe('Offer');
    expect(statusTimelineForLatest('Withdrawn')).toEqual(['Applied', 'Withdrawn']);
  });
});
