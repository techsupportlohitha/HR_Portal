export function isHiringHistory(candidate: any): boolean {
  return candidate.joiningStatus === "JOINED"
    || candidate.joiningStatus === "NOT_JOINED"
    || candidate.selectionStatus === "SELECTION_REJECTED"
    || candidate.screeningStatus === "SCREENING_REJECTED"
    || candidate.offerStatus === "OFFER_DECLINED";
}

export function hiringHistoryLabel(candidate: any): string {
  if (candidate.joiningStatus === "JOINED") return "Joined";
  if (candidate.joiningStatus === "NOT_JOINED") return "Did not join";
  if (candidate.offerStatus === "OFFER_DECLINED") return "Offer declined";
  return "Rejected";
}

// Both APIs are supported: candidate records with nested interviews and
// the all-openings endpoint's flattened appointment records.
export function calendarCandidates(records: any[]): any[] {
  const grouped = new Map<string, any[]>();
  for (const candidate of records) {
    const appointments = Array.isArray(candidate.interviews)
      ? candidate.interviews.filter((interview: any) => interview.round !== "OFFER").map((interview: any) => ({
          ...candidate,
          interviewId: interview.id,
          interviewDate: interview.startsAt,
          startsAt: interview.startsAt,
          endsAt: interview.endsAt,
          interviewRound: interview.round,
          interviewLocation: interview.location,
          mode: interview.mode,
          timezone: interview.timezone,
          status: interview.status,
          interviewFeedback: interview.feedback,
          interviewScore: interview.score,
          feedbackSubmittedAt: interview.feedbackSubmittedAt,
          draftFeedback: interview.draftFeedback,
          draftScore: interview.draftScore,
          draftRecommendation: interview.draftRecommendation,
          recommendation: interview.recommendation,
          reviewerName: interview.reviewerName,
          previousRoundFeedback: interview.previousRoundFeedback,
          interviewerId: interview.interviewerId,
          interviewer: interview.interviewer,
          appointmentCreatedAt: interview.createdAt,
        }))
      : candidate.interviewDate && candidate.interviewRound !== "OFFER"
        ? [{ ...candidate, appointmentCreatedAt: candidate.createdAt,
            status: candidate.status || (candidate.interviewFeedback === "Finished" ? "COMPLETED" : "SCHEDULED") }]
        : [];
    for (const appointment of appointments) {
      const id = candidate.candidateId || candidate.id;
      grouped.set(id, [...(grouped.get(id) || []), { ...appointment, id }]);
    }
  }
  return [...grouped.values()].map((appointments) => {
    const currentRound = appointments.filter(appointment => appointment.interviewRound === appointment.currentStage);
    const pool = currentRound.length ? currentRound : appointments;
    return [...pool].sort((a, b) =>
      new Date(b.appointmentCreatedAt || b.interviewDate).getTime() - new Date(a.appointmentCreatedAt || a.interviewDate).getTime()
      || new Date(b.interviewDate).getTime() - new Date(a.interviewDate).getTime()
      || String(b.interviewId || "").localeCompare(String(a.interviewId || "")))[0];
  }).sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime());
}
