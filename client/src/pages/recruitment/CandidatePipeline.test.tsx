import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CandidatePipeline } from "./CandidatePipeline";
import { CandidateStageControls } from "./CandidateStageControls";

vi.mock("@/api/recruitment", () => ({ recruitmentApi: {
  getPipeline: vi.fn(async () => ({ data: { columns: [{ stage: "TELEPHONIC", total: 104, items: [{ id: "qa", candidateName: "QA Candidate", requisitionId: "opening", currentStage: "TELEPHONIC", requisition: { positionTitle: "Developer" } }] }] } })),
  moveCandidateStage: vi.fn(),
} }));

function wrapper(children: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={["/recruitment?tab=pipeline&q=QA"]}>{children}</MemoryRouter></QueryClientProvider>;
}

describe("pipeline access and complete counts", () => {
  it("shows server total rather than loaded card count and preserves filters in detail links", async () => {
    render(wrapper(<CandidatePipeline requisitions={[]} />));
    const link = await screen.findByRole("link", { name: /QA Candidate/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("q=QA"));
    expect(link).toHaveAttribute("href", expect.stringContaining("candidateId=qa"));
    expect(screen.getByText("104")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–25 of 104 candidates")).toBeInTheDocument();
  });
  it("does not expose stage mutation controls to a read-only manager", () => {
    render(wrapper(<CandidateStageControls editable={false} candidate={{ id: "qa", currentStage: "TELEPHONIC", stageHistory: [{ id: "event", fromStage: "SCREENING", toStage: "TELEPHONIC", reason: "Shortlist reviewed", createdAt: "2026-10-12T09:00:00Z" }] }} />));
    expect(screen.queryByRole("button", { name: "Move stage" })).toBeNull();
    expect(screen.getByText("Shortlist reviewed")).toBeInTheDocument();
  });
});

it("does not offer progression while the current appointment is still pending", () => {
  render(wrapper(<CandidateStageControls editable candidate={{id:"qa",currentStage:"HR_INTERVIEW",interviews:[{round:"HR_INTERVIEW",status:"COMPLETED",feedbackSubmittedAt:"2026-10-14"},{round:"HR_INTERVIEW",status:"SCHEDULED"}]}} />));
  expect(screen.getByRole("button",{name:"Move to Technical interview"})).toBeDisabled();
  expect(screen.getByText("Complete this round and submit feedback before moving forward.")).toBeInTheDocument();
});
