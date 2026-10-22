import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { recruitmentApi } from "@/api/recruitment";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { CANDIDATE_STAGES, candidateNextAction, stageAge } from "./pipelineModel";
import { Trash2 } from "lucide-react";

export function CandidatePipeline({ requisitions, deleteAllowed = false, onDeleteCandidate }: { requisitions: any[]; deleteAllowed?: boolean; onDeleteCandidate?: (candidate: any) => void }) {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"pipeline" | "shortlist">("pipeline");
  const [shortlistPage, setShortlistPage] = useState(1);
  const [pages, setPages] = useState<Record<string, number>>({});
  const pageSize = 25;
  const mobileStage = params.get("viewStage") || "TELEPHONIC";
  const search = params.get("q") || "";
  const requisitionId = params.get("opening") || "";
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
    setPages({});
    setShortlistPage(1);
  };
  const query = useQuery({
    queryKey: ["candidate-pipeline", search, requisitionId, pages, pageSize],
    queryFn: () => recruitmentApi.getPipeline({ search, requisitionId, pages: JSON.stringify(pages), pageSize }),
  });
  const shortlistQuery = useQuery({
    queryKey: ["candidate-shortlist", search, requisitionId, shortlistPage],
    queryFn: () => recruitmentApi.getCandidateRegister({ search, requisitionId, screeningStatus: "SHORTLISTED", page: shortlistPage, pageSize }),
    enabled: view === "shortlist",
  });
  return (
    <section aria-label="Candidate pipeline" className="space-y-4">
      <div className="flex w-fit rounded-full border border-slate-border bg-surface p-1" aria-label="Recruitment candidate view">
        <Button size="sm" variant={view === "pipeline" ? "primary" : "ghost"} aria-pressed={view === "pipeline"} onClick={() => setView("pipeline")}>Pipeline</Button>
        <Button size="sm" variant={view === "shortlist" ? "primary" : "ghost"} aria-pressed={view === "shortlist"} onClick={() => setView("shortlist")}>Shortlist</Button>
      </div>
      <div className="flex items-end gap-2 sm:hidden">
        <div className="min-w-0 flex-1"><Select label="Candidate stage" value={mobileStage} onChange={event => updateFilter("viewStage", event.target.value)}>{CANDIDATE_STAGES.map(stage => <option key={stage.value} value={stage.value}>{stage.label} ({query.data?.data?.columns?.find((item: any) => item.stage === stage.value)?.total ?? 0})</option>)}</Select></div>
        <Button variant="outline" aria-expanded={filtersOpen} aria-controls="pipeline-filters" onClick={() => setFiltersOpen(open => !open)}>Filters{search ? " (1)" : ""}</Button>
      </div>
      <div id="pipeline-filters" className={`${filtersOpen ? "grid" : "hidden"} gap-3 sm:grid sm:grid-cols-[1fr_1fr_auto]`}>
        <Input label="Search candidates" placeholder="Name or email" value={search} onChange={(event) => updateFilter("q", event.target.value)} />
        <Select label="Opening" value={requisitionId} onChange={(event) => updateFilter("opening", event.target.value)}>
          <option value="">All openings</option>
          {requisitions.map((opening) => <option key={opening.id} value={opening.id}>{opening.positionTitle}</option>)}
        </Select>
        <Button variant="outline" className="self-end" onClick={() => { const next = new URLSearchParams(params); next.delete("q");  setParams(next, { replace: true }); setPages({}); }}>Clear filters</Button>
      </div>
      {view === "shortlist" ? shortlistQuery.isLoading ? <LoadingSpinner /> : shortlistQuery.isError ? (
        <div role="alert" className="rounded-xl border border-slate-border p-4">Could not load the shortlist. <Button variant="outline" onClick={() => shortlistQuery.refetch()}>Retry</Button></div>
      ) : (
        <section aria-label="Shortlisted candidates" className="space-y-3">
          <p className="text-sm text-text-muted">{shortlistQuery.data?.data?.total ?? 0} candidates selected to proceed to interviews.</p>
          {(shortlistQuery.data?.data?.items || []).length ? <div className="overflow-x-auto rounded-xl border border-slate-border bg-surface">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-tint text-xs uppercase text-text-muted"><tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Opening</th><th className="px-4 py-3">Qualification</th><th className="px-4 py-3">Experience</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Shortlist status</th></tr></thead>
              <tbody className="divide-y divide-slate-border">{(shortlistQuery.data?.data?.items || []).map((candidate: any) => <tr key={candidate.id} className="hover:bg-tint/60">
                <td className="px-4 py-3"><Link className="font-medium text-text-heading hover:underline" to={`/recruitment?tab=pipeline&q=${encodeURIComponent(search)}&opening=${encodeURIComponent(requisitionId || candidate.requisitionId)}&reqId=${encodeURIComponent(candidate.requisitionId)}&candidateId=${encodeURIComponent(candidate.id)}&viewStage=${encodeURIComponent(candidate.currentStage || "TELEPHONIC")}`}>{candidate.candidateName}</Link><p className="mt-0.5 text-xs text-text-muted">{candidate.email || candidate.mobile || "Contact not provided"}</p></td>
                <td className="px-4 py-3">{candidate.requisition?.positionTitle || "—"}</td><td className="px-4 py-3">{candidate.qualification || "—"}</td><td className="px-4 py-3">{candidate.totalExperience == null ? "—" : `${Number(candidate.totalExperience)} yrs`}</td><td className="px-4 py-3">{String(candidate.currentStage || "TELEPHONIC").replace(/_/g, " ")}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Shortlisted</span></td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="rounded-xl border border-dashed border-slate-border p-10 text-center text-sm text-text-muted">No candidates are shortlisted for interviews yet.</div>}
          <PaginationControls page={shortlistPage} pageSize={pageSize} total={shortlistQuery.data?.data?.total ?? 0} onPageChange={setShortlistPage} itemLabel="shortlisted candidates" />
        </section>
      ) : query.isLoading ? <LoadingSpinner /> : query.isError ? (
        <div role="alert" className="rounded-xl border border-slate-border p-4">Could not load the pipeline. <Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div>
      ) : (
        <div aria-label="Candidate stages" className="flex items-start gap-3 overflow-x-auto pb-3">
          {CANDIDATE_STAGES.map((stage) => {
            const column = query.data?.data?.columns?.find((item: any) => item.stage === stage.value);
            return (
              <section key={stage.value} aria-label={`${stage.label} candidates`} className={`${mobileStage === stage.value ? "block" : "hidden"} w-full shrink-0 overflow-hidden rounded-lg border border-slate-border bg-tint sm:block sm:w-72`}>
                <h2 className="flex items-center justify-between border-b border-slate-border px-4 py-3 font-semibold text-text-heading">{stage.label}<span className="rounded-full bg-surface px-2 py-0.5 text-sm">{column?.total ?? 0}</span></h2>
                <div className="min-h-40 space-y-2 p-2">
                  {(column?.items || []).map((candidate: any) => {
                    const age = stageAge(candidate.stageEnteredAt);
                    const next = candidate.interviews?.find((item: any) => item.status === "SCHEDULED" && item.round === candidate.currentStage);
                    return (
                      <article key={candidate.id} className="rounded-md border border-slate-border bg-surface p-3 shadow-sm transition hover:border-primary-500">
                      <Link to={`/recruitment?tab=pipeline&q=${encodeURIComponent(search)}&opening=${encodeURIComponent(requisitionId)}&reqId=${encodeURIComponent(candidate.requisitionId)}&candidateId=${encodeURIComponent(candidate.id)}&viewStage=${encodeURIComponent(candidate.currentStage || mobileStage)}`} className="block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="break-words font-medium text-text-heading">{candidate.candidateName}</h3>
                        </div>
                        <p className="mt-1 break-words text-xs text-text-muted">{candidate.requisition?.positionTitle}</p>
                        <p className="mt-2 rounded bg-tint px-2 py-1.5 text-xs font-medium text-text-heading">{candidateNextAction(candidate)}</p>
                        {next && <p className="mt-2 text-xs text-text-muted">{new Date(next.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · Asia/Kolkata<br />{next.interviewer ? `${next.interviewer.firstName} ${next.interviewer.lastName}` : "Interviewer unassigned"}</p>}
                        <p className="mt-2 text-[11px] text-text-muted">{age === null ? "Stage age unavailable" : `${age} ${age === 1 ? "day" : "days"} in stage`}</p>
                      </Link>
                      {deleteAllowed && <div className="mt-2 flex justify-end border-t border-slate-border pt-2"><Button size="sm" variant="ghost" className="text-status-danger hover:text-status-danger" aria-label={`Delete ${candidate.candidateName}`} onClick={() => onDeleteCandidate?.(candidate)}><Trash2 aria-hidden="true" className="mr-1 h-3.5 w-3.5" />Delete candidate</Button></div>}
                      </article>
                    );
                  })}
                  {!column?.items?.length && <p className="py-8 text-center text-sm text-text-muted">No candidates</p>}
                  <PaginationControls page={pages[stage.value] || 1} pageSize={pageSize} total={column?.total ?? 0} onPageChange={(nextPage) => setPages((current) => ({ ...current, [stage.value]: nextPage }))} itemLabel="candidates" />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
