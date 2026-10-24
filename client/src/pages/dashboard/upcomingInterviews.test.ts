import { describe, expect, it } from 'vitest';
import { getUpcomingInterviews } from './upcomingInterviews';

describe('getUpcomingInterviews', () => {
  const now = Date.parse('2026-10-14T00:00:00Z');

  it('keeps unfinished scheduled interviews visible after their start time and ignores completed records', () => {
    const entries = [
      { id: 'later', status: 'SCHEDULED', interviewDate: '2026-10-16T10:00:00Z' },
      { id: 'completed', status: 'COMPLETED', interviewDate: '2026-10-15T10:00:00Z' },
      { id: 'past', status: 'SCHEDULED', interviewDate: '2026-10-13T10:00:00Z' },
      { id: 'soon', status: 'SCHEDULED', interviewDate: '2026-10-15T05:52:00Z' },
    ];

    expect(getUpcomingInterviews(entries).map(({ id }) => id)).toEqual([
      'past',
      'soon',
      'later',
    ]);
  });

  it('shows at most the next five scheduled interviews', () => {
    const entries = Array.from({ length: 7 }, (_, index) => ({
      id: String(index),
      status: 'SCHEDULED',
      interviewDate: new Date(now + (index + 1) * 60_000),
    }));

    expect(getUpcomingInterviews(entries).map(({ id }) => id)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
    ]);
  });
});
