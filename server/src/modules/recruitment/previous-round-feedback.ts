import { candidateStages } from "./recruitment.schema";

// Only submitted interview evidence is projected. Never spread the interview or candidate.
export function previousRoundFeedback(candidateId: string, round: string, interviews: any[]) {
  const stages: readonly string[] = candidateStages;
  const currentIndex = stages.indexOf(round === "SCREENING" ? "TELEPHONIC" : round);
  if (currentIndex === 0) return { state: "first-round", round: null };
  if (currentIndex < 0) return { state: "unavailable", round: null };
  const completed = interviews.filter((item) => item.candidateId === candidateId && item.status === "COMPLETED");
  const priorRound = stages.slice(0, currentIndex).reverse().find((stage) => completed.some((item) => item.round === stage)) || stages[currentIndex - 1];
  const previous = completed.filter((item) => item.round === priorRound && item.feedbackSubmittedAt && item.feedback?.trim())
    .sort((a, b) => new Date(b.feedbackSubmittedAt).getTime() - new Date(a.feedbackSubmittedAt).getTime() || String(b.id).localeCompare(String(a.id)))[0];
  if (!previous) return { state: "unavailable", round: priorRound };
  return {
    state: "available", round: priorRound, interviewId: previous.id,
    feedback: previous.feedback, score: previous.score ?? null,
    recommendation: previous.recommendation ?? null,
    reviewerName: previous.reviewerName || "Reviewer unavailable",
    submittedAt: previous.feedbackSubmittedAt, interviewDate: previous.startsAt,
  };
}
