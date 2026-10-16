import { previousRoundFeedback } from "../src/modules/recruitment/previous-round-feedback";

const completed = (id: string, round = "HR_INTERVIEW", submitted = "2026-10-14T10:00:00Z") => ({
  id, candidateId: "app-a", round, status: "COMPLETED", startsAt: "2026-10-14T09:00:00Z",
  feedback: `Evidence ${id}`, score: 8, recommendation: "YES", reviewerName: "Test Reviewer",
  feedbackSubmittedAt: submitted, draftFeedback: "Private draft", currentSalary: 12345,
});

describe("previous round feedback projection", () => {
  it("returns only the latest submitted completed evidence from the same application", () => {
    const result = previousRoundFeedback("app-a", "TECHNICAL", [completed("old"), completed("latest", "HR_INTERVIEW", "2026-10-15T10:00:00Z"), { ...completed("other", "HR_INTERVIEW", "2026-10-16T10:00:00Z"), candidateId: "app-b" }]);
    expect(result).toMatchObject({ state: "available", interviewId: "latest", round: "HR_INTERVIEW", reviewerName: "Test Reviewer" });
    expect(result).not.toHaveProperty("draftFeedback");
    expect(result).not.toHaveProperty("currentSalary");
    expect(result).not.toHaveProperty("candidateId");
  });
  it("never substitutes earlier feedback when the most recent completed round has only a draft", () => {
    expect(previousRoundFeedback("app-a", "MANAGEMENT", [completed("hr"), { ...completed("technical", "TECHNICAL"), feedbackSubmittedAt: null }])).toEqual({ state: "unavailable", round: "TECHNICAL" });
  });
  it("ignores future rounds, cancelled appointments and unsubmitted feedback", () => {
    expect(previousRoundFeedback("app-a", "TECHNICAL", [{ ...completed("cancelled"), status: "CANCELLED" }, completed("future", "MANAGEMENT"), { ...completed("draft"), feedbackSubmittedAt: null }])).toEqual({ state: "unavailable", round: "HR_INTERVIEW" });
  });
  it("supports first rounds and a genuinely skipped intermediate round", () => {
    expect(previousRoundFeedback("app-a", "TELEPHONIC", [])).toEqual({ state: "first-round", round: null });
    expect(previousRoundFeedback("app-a", "MANAGEMENT", [completed("hr")])).toMatchObject({ state: "available", round: "HR_INTERVIEW" });
  });
});
