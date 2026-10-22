import { useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Pencil, ArrowRight, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface Props {
  requisitions: any[];
  editable: boolean;
  history: boolean;
  onEdit: (opening: any) => void;
  onClose: (opening: any) => void;
  deleteAllowed?: boolean;
  onDelete?: (opening: any) => void;
}

export function JobPositions({ requisitions, editable, history, onEdit, onClose, deleteAllowed = false, onDelete = () => undefined }: Props) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const departments = Array.from(new Map(requisitions.filter((opening) => opening.department).map((opening) => [opening.department.id, opening.department])).values());
  const filtered = requisitions.filter((opening) =>
    (!department || opening.departmentId === department) &&
    `${opening.positionTitle} ${opening.location || ""} ${opening.department?.name || ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return <section aria-label="Job positions" className="space-y-4">
    <div className="grid gap-3 rounded-xl border border-slate-border bg-surface p-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(11rem,15rem)]">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" />
        <Input aria-label="Search job positions" className="pl-10" placeholder="Search job positions…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <Select aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)}>
        <option value="">All departments</option>
        {departments.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
      <p>{filtered.length} {filtered.length === 1 ? "position" : "positions"}{!history && ` · ${filtered.reduce((sum, opening) => sum + Number(opening.remainingCount ?? opening.numberOfVacancies ?? 0), 0)} remaining vacancies`}</p>
      <p>Open a position to view its applicants.</p>
    </div>
    {!filtered.length ? <div className="rounded-xl border border-dashed border-slate-border p-10 text-center text-sm text-text-muted">{search || department ? "No positions match these filters." : history ? "No closed positions yet." : "No open positions yet. Create a new position to start recruiting."}</div> :
      <div className="overflow-hidden rounded-xl border border-slate-border bg-surface">
        <div className="hidden grid-cols-[minmax(14rem,2fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_minmax(10rem,1fr)_auto] items-center gap-4 border-b border-slate-border bg-tint px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted md:grid">
          <span>Job position</span><span>Department</span><span>Location</span><span>Openings</span><span className="text-right">Vacancies</span>
        </div>
        <ul className="divide-y divide-slate-border">
        {filtered.map((opening) => {
          const raisedBy = opening.raisedBy ? `${opening.raisedBy.firstName} ${opening.raisedBy.lastName}` : "Not assigned";
          return <li key={opening.id} className="group relative grid min-w-0 grid-cols-2 items-center gap-x-3 gap-y-3 px-4 py-4 transition hover:bg-tint/60 md:grid-cols-[minmax(14rem,2fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_minmax(10rem,1fr)_auto] md:gap-4 md:px-5">
              <div className="col-span-2 min-w-0 md:col-span-1">
                <h2 className="truncate font-semibold text-text-heading">
                  <Link to={`/recruitment?tab=pipeline&opening=${encodeURIComponent(opening.id)}`} aria-label={`View applicants for ${opening.positionTitle}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-primary-500">{opening.positionTitle}</Link>
              </h2>
                <p className="mt-1 truncate text-xs text-text-muted"><span>Raised by {raisedBy}</span> · <span>{opening.newApplicationCount ?? 0} new</span> · <span>{opening._count?.candidates ?? 0} total applicants</span></p>
              </div>
              <div className="min-w-0"><span className="mb-1 block text-[11px] font-medium uppercase text-text-muted md:hidden">Department</span><span className="truncate text-sm text-text-body">{opening.department?.name || "—"}</span></div>
              <div className="min-w-0"><span className="mb-1 block text-[11px] font-medium uppercase text-text-muted md:hidden">Location</span><span className="truncate text-sm text-text-body">{opening.location || "—"}</span></div>
              <div className="min-w-0">
                <span className="mb-1 block text-[11px] font-medium uppercase text-text-muted md:hidden">Openings</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-heading"><Briefcase aria-hidden="true" className="h-4 w-4 shrink-0 text-primary-600" />{opening.numberOfVacancies ?? "Unavailable"}</span>
              </div>
              <div className="min-w-0 md:text-right">
                <span className="mb-1 block text-[11px] font-medium uppercase text-text-muted md:hidden">Vacancies</span>
                <span className="text-sm font-medium text-text-body">{opening.filledCount ?? 0} / {opening.remainingCount ?? opening.numberOfVacancies} remaining</span>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2 border-t border-slate-border pt-2 md:col-span-1 md:justify-end md:border-0 md:pt-0">
                <span className="relative z-10 text-xs text-text-muted md:hidden">View applicants</span>
                <div className="relative z-10 flex gap-1">
                {editable && <>
                  <Button size="sm" variant="ghost" className="relative z-10" aria-label={`Edit ${opening.positionTitle}`} onClick={() => onEdit(opening)}><Pencil aria-hidden="true" className="mr-1 h-3.5 w-3.5" />Edit</Button>
                  <Button size="sm" variant="ghost" className="relative z-10" onClick={() => onClose(opening)}>{history ? "Reopen" : "Close"}</Button>
                </>}
                {deleteAllowed && <Button size="sm" variant="ghost" className="relative z-10 text-status-danger hover:text-status-danger" aria-label={`Delete ${opening.positionTitle}`} onClick={() => onDelete(opening)}><Trash2 aria-hidden="true" className="mr-1 h-3.5 w-3.5" />Delete</Button>}
                </div>
                <span className="hidden items-center gap-1 text-xs font-semibold text-text-body md:inline-flex">Open <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></span>
              </div>
          </li>;
        })}
        </ul>
      </div>}
  </section>;
}
