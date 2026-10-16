export const CANDIDATE_STAGES = [
  { value: "TELEPHONIC", label: "Telephonic" },
  { value: "HR_INTERVIEW", label: "HR interview" },
  { value: "TECHNICAL", label: "Technical interview" },
  { value: "MANAGEMENT", label: "Management interview" },
  { value: "OFFER", label: "Offer" },
  { value: "JOINED", label: "Joined" },
];

export const stageLabel = (stage: string) =>
  stage === "SCREENING"
    ? "Telephonic"
    : CANDIDATE_STAGES.find((item) => item.value === stage)?.label || "Stage unavailable";

export function candidateNextAction(candidate: any, now = Date.now()): string {
  if (candidate.joiningStatus === "JOINED") return "Hiring completed";
  if (candidate.selectionStatus === "SELECTION_REJECTED") return "Rejected";
  if (candidate.selectionStatus === "SELECTION_ON_HOLD") return "On hold — review decision";
  if (candidate.offerStatus === "OFFER_DECLINED" || candidate.joiningStatus === "NOT_JOINED") return "Review hiring outcome";
  if (candidate.offerStatus === "OFFER_ACCEPTED") return "Confirm joining";
  if (candidate.offerStatus === "RELEASED") return "Await offer response";
  if (candidate.selectionStatus === "SELECTED" || candidate.currentStage === "OFFER") return "Manage offer";
  if (["TELEPHONIC", "SCREENING"].includes(candidate.currentStage)) return "Review telephonic assessment";
  const interviews = (candidate.interviews || []).filter((item: any) => !candidate.currentStage || item.round === candidate.currentStage);
  const next = interviews.filter((item: any) => item.status === "SCHEDULED").sort((a: any, b: any) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  if (next) return new Date(next.startsAt).getTime() < now ? "Interview overdue — update status" : "Interview scheduled";
  const completed = interviews.filter((item: any) => item.status === "COMPLETED").sort((a: any, b: any) => new Date(b.startsAt || 0).getTime() - new Date(a.startsAt || 0).getTime())[0];
  if (completed && !completed.feedbackSubmittedAt) return completed.draftFeedback ? "Continue interview feedback draft" : "Submit interview feedback";
  if (completed?.feedbackSubmittedAt) return "Review feedback and advance";
  return "Schedule interview";
}

export function stageAge(enteredAt?: string, now = Date.now()) {
  if (!enteredAt || !Number.isFinite(new Date(enteredAt).getTime())) return null;
  return Math.max(0, Math.floor((now - new Date(enteredAt).getTime()) / 86400000));
}
