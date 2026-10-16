import { stageLabel } from "./pipelineModel";
import { ChevronDown } from "lucide-react";

export function PreviousRoundFeedback({ value }: { value?: any }) {
  if (!value) return null;
  const date = (value: string) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const recommendation = value.recommendation?.replaceAll("_", " ").toLowerCase();
  return <section aria-label="Previous round feedback" className="overflow-hidden rounded-xl border border-slate-border bg-tint text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-border px-4 py-3">
      <div>
        <h4 className="font-semibold text-text-heading">Previous round feedback</h4>
        {value.round && <p className="mt-0.5 text-xs text-text-muted">{stageLabel(value.round)}</p>}
      </div>
      {value.state === "available" && (value.score != null || recommendation) && <div className="flex flex-wrap gap-1.5">
        {value.score != null && <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">{value.score}/10</span>}
        {recommendation && <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium capitalize">{recommendation}</span>}
      </div>}
    </div>
    <div className="space-y-2.5 p-4">
      {value.state === "first-round" ? <p className="text-text-muted">No previous round.</p> : value.state !== "available" ?
        <p className="text-text-muted">Previous round feedback not available yet.</p> : <>
        <p className="text-xs text-text-muted">{value.reviewerName || "Reviewer unavailable"} · Submitted {date(value.submittedAt)} · Asia/Kolkata</p>
        {value.feedback.length > 320 ? <details className="group rounded-lg border border-slate-border bg-surface p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium"><span>Read interviewer feedback</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-text-heading">{value.feedback}</p>
        </details> : <p className="whitespace-pre-wrap break-words rounded-lg border border-slate-border bg-surface p-3 text-text-heading">{value.feedback}</p>}
      </>}
    </div>
  </section>;
}
