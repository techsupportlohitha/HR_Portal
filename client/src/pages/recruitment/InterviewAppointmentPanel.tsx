import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recruitmentApi } from "@/api/recruitment";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import toast from "react-hot-toast";
import { stageLabel } from "./pipelineModel";
import { InterviewRescheduleHistory } from "./InterviewRescheduleHistory";
import { PreviousRoundFeedback } from "./PreviousRoundFeedback";

export function InterviewAppointmentPanel({ interview, editable, onReschedule, showAppointmentDetails = true, nextStage, onMoveToNextStage, movingToNextStage = false, rescheduleHistory = [] }: { interview: any; editable: boolean; onReschedule?: () => void; showAppointmentDetails?: boolean; nextStage?: string; onMoveToNextStage?: () => void; movingToNextStage?: boolean; rescheduleHistory?: any[] }) {
  const cache = useQueryClient();
  const fieldId = useId();
  const [correction, setCorrection] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState("");
  const refresh = () => ["interviews", "candidates", "candidate-register", "candidate-pipeline", "requisitions", "dashboard-stats"].forEach(key => cache.invalidateQueries({ queryKey: [key] }));
  const mutation = useMutation({
    mutationFn: ({ kind, payload }: any) => kind === "feedback" ? recruitmentApi.submitInterviewFeedback(interview.id, payload) : recruitmentApi.updateInterviewStatus(interview.id, payload),
    onSuccess: (_data, variables) => {
      refresh(); setError(""); setOutcome("");
      if (!variables.payload.draft) setCorrection(false);
      toast.success(variables.kind === "feedback" ? variables.payload.draft ? "Feedback draft saved" : "Feedback submitted" : "Interview status updated");
    },
    onError: (error: any) => setError(error?.response?.data?.message || "Could not save. Your entries are still here; please try again."),
  });
  const submitted = !!interview.feedbackSubmittedAt;
  const readable = (value: string) => value.replace(/_/g, " ").toLowerCase();

  return <>
    {showAppointmentDetails && <details open={interview.status === "SCHEDULED"} className="group rounded-xl border border-slate-border bg-surface p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold"><span>{stageLabel(interview.round)} appointment</span><span className="flex items-center gap-2"><span className="text-xs capitalize text-text-muted">{readable(interview.status)}</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></span></summary>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-text-muted">Date and time · Asia/Kolkata</dt><dd className="mt-1">{new Date(interview.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd></div>
        <div><dt className="text-xs text-text-muted">Interviewer for this round</dt><dd className="mt-1">{interview.interviewer ? `${interview.interviewer.firstName} ${interview.interviewer.lastName}` : "Not assigned"}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-text-muted">Format and location</dt><dd className="mt-1 break-words capitalize">{readable(interview.mode || "IN_PERSON")} · {interview.location || "Not provided"}</dd></div>
      </dl>
    </details>}
    <InterviewRescheduleHistory events={rescheduleHistory} round={interview.round} />
    <details open className="group rounded-xl border border-slate-border bg-surface p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold"><span>Previous round feedback</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
      <div className="mt-3"><PreviousRoundFeedback value={interview.previousRoundFeedback} /></div>
    </details>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {editable && interview.status === "SCHEDULED" && <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ kind: "status", payload: { status: "COMPLETED" } })}>Complete interview</Button>
      {onReschedule && interview.round !== "TELEPHONIC" && <Button type="button" variant="outline" onClick={onReschedule}>Reschedule</Button>}
      <Button type="button" variant="ghost" onClick={() => setOutcome("CANCELLED")}>Cancel interview</Button>
      <Button type="button" variant="ghost" onClick={() => setOutcome("NO_SHOW")}>Mark no-show</Button>
    </div>}
    {outcome && <form className="space-y-3 rounded-xl border border-slate-border p-3" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); mutation.mutate({ kind: "status", payload: { status: outcome, reason: String(values.get("reason")).trim() } }); }}>
      <Input name="reason" label={outcome === "CANCELLED" ? "Reason for cancellation" : "Reason for no-show"} required maxLength={1000} />
      <div className="flex gap-2"><Button type="submit" disabled={mutation.isPending}>Confirm {outcome === "CANCELLED" ? "cancellation" : "no-show"}</Button><Button type="button" variant="ghost" onClick={() => setOutcome("")}>Back</Button></div>
    </form>}
    {interview.status === "COMPLETED" && <details open={!submitted || editable} className="group space-y-3 rounded-xl border border-slate-border bg-surface p-4" aria-label="Interview feedback">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold"><span>{submitted ? "Submitted feedback" : interview.draftFeedback ? "Continue feedback draft" : "Submit interview feedback"}</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
      {submitted && <PreviousRoundFeedback label="Submitted round feedback" value={{ state: "available", round: interview.round, feedback: interview.feedback || "", score: interview.score, recommendation: interview.recommendation, reviewerName: interview.reviewerName, submittedAt: interview.feedbackSubmittedAt }} />}
      {editable && submitted && !correction && <Button type="button" variant="outline" onClick={() => setCorrection(true)}>Correct feedback</Button>}
      {editable && submitted && nextStage && onMoveToNextStage && <Button type="button" disabled={movingToNextStage} onClick={onMoveToNextStage}>{movingToNextStage ? "Moving…" : `Move to ${stageLabel(nextStage)}`}</Button>}
      {editable && (!submitted || correction) && <form key={`${interview.id}:${correction}`} className="space-y-3" onSubmit={event => {
        event.preventDefault(); const values = new FormData(event.currentTarget);
        const draft = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "draft";
        mutation.mutate({ kind: "feedback", payload: { feedback: String(values.get("feedback")).trim(), score: values.get("score") ? Number(values.get("score")) : undefined, recommendation: values.get("recommendation") || undefined, revisionReason: values.get("revisionReason") || undefined, draft } });
      }}>
        <div><label htmlFor={fieldId} className="mb-1 block text-sm font-medium">Feedback <span aria-hidden="true">*</span></label><textarea id={fieldId} name="feedback" required rows={4} defaultValue={interview.draftFeedback ?? interview.feedback ?? ""} className="w-full rounded-xl border border-slate-border bg-surface p-3 text-sm" placeholder="Record observations and evidence from this interview" /></div>
        <div className="grid gap-3 sm:grid-cols-2"><Input name="score" label="Score (optional, 1–10)" type="number" min="1" max="10" step="1" defaultValue={interview.draftScore ?? interview.score ?? ""} /><Select name="recommendation" label="Recommendation (optional)" defaultValue={interview.draftRecommendation ?? interview.recommendation ?? ""}><option value="">Not provided</option><option value="STRONG_YES">Strong yes</option><option value="YES">Yes</option><option value="HOLD">Hold</option><option value="NO">No</option></Select></div>
        {submitted && <Input name="revisionReason" label="Reason for feedback correction" required />}
        <div className="flex flex-wrap gap-2"><Button type="submit" name="intent" value="submit" isLoading={mutation.isPending}>Submit feedback</Button><Button type="submit" name="intent" value="draft" variant="outline" disabled={mutation.isPending}>Save draft</Button>{correction && <Button type="button" variant="ghost" onClick={() => setCorrection(false)}>Cancel correction</Button>}</div>
        <p className="text-xs text-text-muted">A draft is not submitted feedback. The candidate&apos;s hiring decision is managed separately.</p>
      </form>}
    </details>}
  </>;
}
