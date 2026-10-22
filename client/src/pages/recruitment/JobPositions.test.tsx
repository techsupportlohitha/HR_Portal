import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { JobPositions } from "./JobPositions";

const openings = [
  { id: "sales", positionTitle: "Sales Manager", departmentId: "sales-dept", department: { id: "sales-dept", name: "Sales" }, raisedBy: { firstName: "QA", lastName: "Recruiter" }, newApplicationCount: 2, _count: { candidates: 6 }, numberOfVacancies: 2, filledCount: 1, remainingCount: 1 },
  { id: "developer", positionTitle: "Developer", departmentId: "it", department: { id: "it", name: "IT" }, newApplicationCount: 0, _count: { candidates: 3 }, numberOfVacancies: 1 },
];

describe("job position cards", () => {
  it("opens the matching applicant pipeline and keeps Edit independent", () => {
    const edit = vi.fn();
    render(<MemoryRouter><JobPositions requisitions={openings} editable history={false} onEdit={edit} onClose={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "View applicants for Sales Manager" })).toHaveAttribute("href", "/recruitment?tab=pipeline&opening=sales");
    expect(screen.getByText("2 new")).toBeInTheDocument();
    expect(screen.getByText(/6 total applicants/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Sales Manager" }));
    expect(edit).toHaveBeenCalledWith(openings[0]);
  });
  it("supports department filtering and read-only access", () => {
    render(<MemoryRouter><JobPositions requisitions={openings} editable={false} history={false} onEdit={vi.fn()} onClose={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: /Edit Sales Manager/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Department" }));
    fireEvent.click(screen.getByRole("option", { name: "IT" }));
    expect(screen.queryByRole("link", { name: "View applicants for Sales Manager" })).toBeNull();
    expect(screen.getByRole("link", { name: "View applicants for Developer" })).toBeInTheDocument();
  });
  it("exposes opening deletion when allowed", () => {
    const remove = vi.fn();
    render(<MemoryRouter><JobPositions requisitions={openings} editable={false} history={false} onEdit={vi.fn()} onClose={vi.fn()} deleteAllowed onDelete={remove} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Delete Sales Manager" }));
    expect(remove).toHaveBeenCalledWith(openings[0]);
  });
});
