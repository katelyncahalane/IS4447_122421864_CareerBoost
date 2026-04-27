// Canonical application pipeline statuses (stored on `applications.status` and `application_status_logs.status`)

export const APPLICATION_STATUSES = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Ordered timeline ending in `finalStatus` (for seeds and tests). */
export function statusTimelineForLatest(finalStatus: string): readonly string[] {
  switch (finalStatus) {
    case 'Rejected':
      return ['Applied', 'Screening', 'Interview', 'Rejected'];
    case 'Offer':
      return ['Applied', 'Screening', 'Interview', 'Offer'];
    case 'Withdrawn':
      return ['Applied', 'Withdrawn'];
    case 'Interview':
      return ['Applied', 'Screening', 'Interview'];
    case 'Screening':
      return ['Applied', 'Screening'];
    case 'Applied':
    default:
      return ['Applied'];
  }
}
