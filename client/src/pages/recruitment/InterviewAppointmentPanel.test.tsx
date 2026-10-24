import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InterviewAppointmentPanel } from "./InterviewAppointmentPanel";
import { PreviousRoundFeedback } from "./PreviousRoundFeedback";
import { recruitmentApi } from "@/api/recruitment";

vi.mock("@/api/recruitment", () => ({ recruitmentApi: { submitInterviewFeedback: vi.fn(), updateInterviewStatus: vi.fn() } }));
const interview = { id: "interview", round: "TECHNICAL", status: "COMPLETED", startsAt: "2026-10-15T09:00:00Z", draftFeedback: "Saved evidence", mode: "VIDEO" };
function show(props: any) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><InterviewAppointmentPanel {...props} /></QueryClientProvider>); }

describe("appointment feedback flow", () => {
  it("restores a draft, keeps it on server failure and distinguishes draft from submission", async () => {
    vi.mocked(recruitmentApi.submitInterviewFeedback).mockRejectedValueOnce({ response: { data: { message: "Please retry" } } }).mockResolvedValue({ data: {} } as any);
    show({ interview, editable: true });
    expect(screen.getByRole("textbox", { name: /Feedback/ })).toHaveValue("Saved evidence");
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("textbox", { name: /Feedback/ })).toHaveValue("Saved evidence");
    expect(recruitmentApi.submitInterviewFeedback).toHaveBeenLastCalledWith("interview", expect.objectContaining({ draft: true, feedback: "Saved evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    await waitFor(() => expect(recruitmentApi.submitInterviewFeedback).toHaveBeenLastCalledWith("interview", expect.objectContaining({ draft: false })));
  });
  it("shows previous submitted feedback read only to a viewer", () => {
    show({ interview: { ...interview, status: "SCHEDULED", previousRoundFeedback: { state: "available", round: "HR_INTERVIEW", feedback: "Ready for the next round", reviewerName: "Test Reviewer", submittedAt: "2026-10-14T10:00:00Z" } }, editable: false });
    expect(screen.getByText("Ready for the next round")).toBeInTheDocument();
    expect(screen.getByText(/Test Reviewer/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Complete interview" })).toBeNull();
  });
  it("shows the reschedule count and dated change log for this interview round", () => {
    show({ interview: { ...interview, status: "SCHEDULED" }, editable: false, rescheduleHistory: [{
      id: "reschedule-1", actionPerformed: "RESCHEDULE_INTERVIEW", oldValue: JSON.stringify({ round: "TECHNICAL", startsAt: "2026-10-15T09:00:00Z" }), newValue: JSON.stringify({ round: "TECHNICAL", startsAt: "2026-10-16T09:00:00Z", reason: "Interviewer unavailable" }), createdAt: "2026-10-14T10:00:00Z", user: { employee: { firstName: "Test", lastName: "Interviewer" } },
    }] });
    fireEvent.click(screen.getByText("Rescheduled 1 time"));
    expect(screen.getByText(/Changed by Test Interviewer/)).toBeInTheDocument();
    expect(screen.getByText(/Interviewer unavailable/)).toBeInTheDocument();
  });
  it("retains older reschedule records and excludes changes for other rounds", () => {
    show({ interview, editable: false, rescheduleHistory: [
      { id: "older", actionPerformed: "RESCHEDULE_INTERVIEW", oldValue: JSON.stringify({ startsAt: "2026-10-15T09:00:00Z", reason: "Candidate requested another day" }), createdAt: "2026-10-14T10:00:00Z", user: { email: "scheduler@example.com" } },
      { id: "other-round", actionPerformed: "RESCHEDULE_INTERVIEW", oldValue: JSON.stringify({ round: "HR_INTERVIEW", reason: "Other round reason" }), createdAt: "2026-10-15T10:00:00Z" },
    ] });
    fireEvent.click(screen.getByText("Rescheduled 1 time"));
    expect(screen.getByText("Round not recorded in this older entry.")).toBeInTheDocument();
    expect(screen.getByText(/Candidate requested another day/)).toBeInTheDocument();
    expect(screen.getByText(/Changed by scheduler@example.com/)).toBeInTheDocument();
    expect(screen.queryByText(/Other round reason/)).toBeNull();
  });
  it("uses honest first-round and missing-feedback states", () => {
    const { rerender } = render(<PreviousRoundFeedback value={{ state: "first-round" }} />);
    expect(screen.getByText("No previous round.")).toBeInTheDocument();
    rerender(<PreviousRoundFeedback value={{ state: "unavailable", round: "HR_INTERVIEW" }} />);
    expect(screen.getByText(/Previous round feedback not available/)).toBeInTheDocument();
  });
});
