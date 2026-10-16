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

export function CandidatePipeline({ requisitions }: { requisitions: any[] }) {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  };
  const query = useQuery({
    queryKey: ["candidate-pipeline", search, requisitionId, pages, pageSize],
    queryFn: () => recruitmentApi.getPipeline({ search, requisitionId, pages: JSON.stringify(pages), pageSize }),
  });
  return (
    <section aria-label="Candidate pipeline" className="space-y-4">
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
      {query.isLoading ? <LoadingSpinner /> : query.isError ? (
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
                      <Link key={candidate.id} to={`/recruitment?tab=pipeline&q=${encodeURIComponent(search)}&opening=${encodeURIComponent(requisitionId)}&reqId=${encodeURIComponent(candidate.requisitionId)}&candidateId=${encodeURIComponent(candidate.id)}&viewStage=${encodeURIComponent(candidate.currentStage || mobileStage)}`} className="block rounded-md border border-slate-border bg-surface p-3 shadow-sm transition hover:border-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="break-words font-medium text-text-heading">{candidate.candidateName}</h3>
                        </div>
                        <p className="mt-1 break-words text-xs text-text-muted">{candidate.requisition?.positionTitle}</p>
                        <p className="mt-2 rounded bg-tint px-2 py-1.5 text-xs font-medium text-text-heading">{candidateNextAction(candidate)}</p>
                        {next && <p className="mt-2 text-xs text-text-muted">{new Date(next.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · Asia/Kolkata<br />{next.interviewer ? `${next.interviewer.firstName} ${next.interviewer.lastName}` : "Interviewer unassigned"}</p>}
                        <p className="mt-2 text-[11px] text-text-muted">{age === null ? "Stage age unavailable" : `${age} ${age === 1 ? "day" : "days"} in stage`}</p>
                      </Link>
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
