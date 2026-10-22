// Regression: closed openings must not be schedulable from the calendar.
// Found by /qa on 2026-10-10.
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScheduleInterviewModal } from "./ScheduleInterviewModal";
import { recruitmentApi } from "@/api/recruitment";
vi.mock("@/api/recruitment", () => ({
  recruitmentApi: {
    getRequisitions: vi.fn(async () => ({
      data: [
        { id: "open", positionTitle: "Open QA", status: "REQUIREMENT" },
        { id: "closed", positionTitle: "Closed QA", status: "CLOSED" },
        {
          id: "archived",
          positionTitle: "Archived QA",
          status: "JOINED_REJECTED",
        },
      ],
    })),
    createCandidate: vi.fn(),
    interviewCandidate: vi.fn(),
    createInterview: vi.fn(),
    rescheduleInterview: vi.fn(),
  },
}));
vi.mock("@/api/employees", () => ({
  employeesApi: { getAll: vi.fn(async () => ({ data: [] })), getAllForAssignments: vi.fn(async () => ({ data: [
    { id: "manager-account", firstName: "Interview", lastName: "Manager", user: { role: "MANAGER", isActive: true } },
    { id: "hr-account", firstName: "Interview", lastName: "HR", user: { role: "HR", isActive: true } },
  ] })) },
}));
describe("Interview scheduling requisition choices", () => {
  test("offers only open requisitions for new candidates", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ScheduleInterviewModal isOpen onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText(/Position/)).toBeEnabled(),
    );
    fireEvent.click(screen.getByLabelText(/Position/));
    expect(
      await screen.findByRole("option", { name: "Open QA" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Closed QA" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Archived QA" })).toBeNull();
  });
  test("offers active accounts created in role management as interviewers", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ScheduleInterviewModal isOpen onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Interviewer" }));
    const managerOption = await screen.findByRole("option", { name: "Manager · Interview Manager" });
    expect(screen.getByRole("option", { name: "HR · Interview HR" })).toBeInTheDocument();
    fireEvent.click(managerOption);
    fireEvent.click(screen.getByRole("button", { name: "Interviewer" }));
    expect(screen.getByRole("option", { name: "Manager · Interview Manager" })).toHaveAttribute("aria-selected", "true");
  });
  test("reschedules the existing candidate and refreshes dashboard and candidate queries", async () => {
    vi.mocked(recruitmentApi.rescheduleInterview).mockResolvedValue({
      data: {},
    } as any);
    const client = new QueryClient();
    const invalidation = vi.spyOn(client, "invalidateQueries");
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={client}>
        <ScheduleInterviewModal
          isOpen
          onClose={onClose}
          existingCandidate={{
            id: "candidate",
            interviewId: "appointment",
            candidateName: "QA Candidate",
            email: "qa@recruitment.test",
            requisitionId: "open",
            interviewDate: "2026-11-01T09:00:00Z",
            interviewRound: "HR_INTERVIEW",
            interviewerId: "panel",
            interviewLocation: "Original QA",
          }}
        />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText(/Place of Interview/), {
      target: { value: "Updated QA" },
    });
    fireEvent.change(screen.getByLabelText(/Reason for rescheduling/), {
      target: { value: "Panel availability" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Save Changes" }).closest("form")!,
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(recruitmentApi.rescheduleInterview).toHaveBeenCalledWith(
      "appointment",
      expect.objectContaining({
        location: "Updated QA",
        round: "HR_INTERVIEW",
        reason: "Panel availability",
        startsAt: "2026-11-01T09:00:00.000Z",
      }),
    );
    expect(recruitmentApi.createCandidate).not.toHaveBeenCalled();
    for (const key of [
      "dashboard-stats",
      "candidates",
      "requisitions",
      "interviews",
    ])
      expect(invalidation).toHaveBeenCalledWith({ queryKey: [key] });
  });
});
