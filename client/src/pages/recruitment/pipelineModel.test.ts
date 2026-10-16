import { describe, expect, it } from "vitest";
import { CANDIDATE_STAGES, candidateNextAction, stageAge } from "./pipelineModel";

describe("pipeline next actions", () => {
  it("starts candidate tracking at the first interview stage", () => {
    expect(CANDIDATE_STAGES[0]).toEqual({ value: "TELEPHONIC", label: "Telephonic" });
    expect(CANDIDATE_STAGES.some((stage) => stage.label.toLowerCase() === "screening")).toBe(false);
  });
  it("keeps rejection and joining outcomes ahead of appointments", () => {
    const interviews = [{ status: "SCHEDULED", startsAt: "2026-10-10T00:00:00Z" }];
    expect(candidateNextAction({ selectionStatus: "SELECTION_REJECTED", interviews })).toBe("Rejected");
    expect(candidateNextAction({ joiningStatus: "JOINED", interviews })).toBe("Hiring completed");
  });
  it("never treats draft feedback as submitted and sends unadvanced candidates to their first interview", () => {
    expect(candidateNextAction({ screeningStatus: "SHORTLISTED", currentStage: "TECHNICAL", interviews: [{ round: "TECHNICAL", status: "COMPLETED", feedback: "Draft" }] })).toBe("Submit interview feedback");
    expect(candidateNextAction({ currentStage: "TELEPHONIC" })).toBe("Review telephonic assessment");
    expect(candidateNextAction({ currentStage: "SCREENING" })).toBe("Review telephonic assessment");
  });
  it("flags overdue appointments and distinguishes submitted feedback", () => {
    expect(candidateNextAction({ screeningStatus: "SHORTLISTED", interviews: [{ status: "SCHEDULED", startsAt: "2026-10-10T00:00:00Z" }] }, Date.parse("2026-10-11T00:00:00Z"))).toContain("overdue");
    expect(candidateNextAction({ screeningStatus: "SHORTLISTED", currentStage: "TECHNICAL", interviews: [{ round: "TECHNICAL", status: "COMPLETED", feedbackSubmittedAt: "2026-10-10" }] })).toBe("Review feedback and advance");
  });
  it("does not invent age for unknown dates", () => {
    expect(stageAge(undefined)).toBeNull();
    expect(stageAge("invalid")).toBeNull();
    expect(stageAge("2026-10-10T00:00:00Z", Date.parse("2026-10-12T00:00:00Z"))).toBe(2);
  });
});

it("ignores old-round drafts when the current round is scheduled", () => {
  expect(candidateNextAction({currentStage:"TECHNICAL",interviews:[{round:"HR_INTERVIEW",status:"COMPLETED"},{round:"TECHNICAL",status:"SCHEDULED",startsAt:"2030-01-01T10:00:00Z"}]},Date.parse("2026-10-15"))).toBe("Interview scheduled");
});
