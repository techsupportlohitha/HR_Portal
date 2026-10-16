import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import InterviewCalendarPage from "./InterviewCalendarPage";

vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ canEdit: () => true, canAdd: () => true, canExport: () => false }) }));
vi.mock("@/api/recruitment", () => ({ recruitmentApi: {
  getInterviews: vi.fn(async () => ({ data: [
    { id: "candidate", requisitionId: "opening", candidateName: "Calendar Test", currentStage: "TECHNICAL", interviewId: "technical", interviewRound: "TECHNICAL", interviewDate: "2030-01-02T09:00:00Z", status: "SCHEDULED", previousRoundFeedback: { state: "available", round: "HR_INTERVIEW", feedback: "Ready for technical assessment", reviewerName: "Test Reviewer", submittedAt: "2026-10-15T10:00:00Z" } },
    { id: "advance-candidate", requisitionId: "opening", candidateName: "Advance Test", currentStage: "HR_INTERVIEW", interviewId: "hr-interview", interviewRound: "HR_INTERVIEW", interviewDate: "2030-01-03T09:00:00Z", status: "COMPLETED", feedbackSubmittedAt: "2030-01-03T10:00:00Z", interviewFeedback: "Strong communication" },
  ] })),
  moveCandidateStage: vi.fn(async () => ({ data: {} })),
  getRequisitions: vi.fn(async () => ({ data: [{ id: "opening", positionTitle: "Test opening" }] })),
} }));

describe("calendar appointment entry points", () => {
  it("shows previous-round feedback in the details panel only", async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><InterviewCalendarPage /></MemoryRouter></QueryClientProvider>);
    const card = (await screen.findByText("Calendar Test")).closest("article");
    expect(card).not.toBeNull();
    const detailsButton = within(card as HTMLElement).getByRole("button", { name: "Interview details & feedback" });
    expect(screen.queryByText("Ready for technical assessment")).not.toBeInTheDocument();
    fireEvent.click(detailsButton);
    const dialog = screen.getByRole("dialog", { name: "Interview details & feedback" });
    expect(within(dialog).getByText("Ready for technical assessment")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Complete interview" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox", { name: "Feedback" })).toBeNull();
  });

  it("offers the next stage from submitted feedback through the management round", async () => {
    const { recruitmentApi } = await import("@/api/recruitment");
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><InterviewCalendarPage /></MemoryRouter></QueryClientProvider>);
    const card = (await screen.findByText("Advance Test")).closest("article");
    expect(card).not.toBeNull();
    fireEvent.click(within(card as HTMLElement).getByRole("button", { name: "Interview details & feedback" }));
    const dialog = screen.getByRole("dialog", { name: "Interview details & feedback" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Move to Technical interview" }));
    await waitFor(() => expect(recruitmentApi.moveCandidateStage).toHaveBeenCalledWith("advance-candidate", { stage: "TECHNICAL", expectedStage: "HR_INTERVIEW" }));
  });
});
