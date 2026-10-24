export interface InterviewCalendarEntry {
  id?: string;
  interviewId?: string | null;
  status?: string;
  interviewDate?: string | Date | null;
}

export function getUpcomingInterviews<T extends InterviewCalendarEntry>(
  interviews: T[],
): T[] {
  return interviews
    .filter((interview) => {
      if (interview.status !== 'SCHEDULED' || !interview.interviewDate) {
        return false;
      }

      const startsAt = new Date(interview.interviewDate).getTime();
      // A scheduled appointment still needs action after its start time passes.
      // Only an explicit status change should remove it from the dashboard.
      return Number.isFinite(startsAt);
    })
    .sort(
      (a, b) =>
        new Date(a.interviewDate!).getTime() -
        new Date(b.interviewDate!).getTime(),
    )
    .slice(0, 5);
}
