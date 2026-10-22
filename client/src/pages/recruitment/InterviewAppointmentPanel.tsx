import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recruitmentApi } from "@/api/recruitment";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import toast from "react-hot-toast";
import { stageLabel } from "./pipelineModel";
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
  const parseSchedule = (value?: string) => { try { return value ? JSON.parse(value) : {}; } catch { return {}; } };
  const reschedules = rescheduleHistory.filter((event: any) => {
    if (event.actionPerformed !== "RESCHEDULE_INTERVIEW") return false;
    const oldSchedule = parseSchedule(event.oldValue);
    const newSchedule = parseSchedule(event.newValue);
    return oldSchedule.round === interview.round || newSchedule.round === interview.round;
  });
  return <article className="space-y-4 rounded-xl border border-slate-border bg-surface p-4" aria-label={`${stageLabel(interview.round)} appointment`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{stageLabel(interview.round)}</h4><span className="rounded-md bg-tint px-2 py-1 text-xs font-medium capitalize">{readable(interview.status)}</span></div>
    {reschedules.length > 0 && <details className="group rounded-lg border border-slate-border bg-tint/50 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium"><span>Rescheduled {reschedules.length} {reschedules.length === 1 ? "time" : "times"}</span><span aria-hidden="true" className="text-text-muted transition-transform group-open:rotate-180">⌄</span></summary>
      <ol className="mt-3 space-y-2 border-l border-slate-border pl-3">{reschedules.map((event: any) => { const oldSchedule = parseSchedule(event.oldValue); const newSchedule = parseSchedule(event.newValue); const actor = event.user?.employee ? `${event.user.employee.firstName} ${event.user.employee.lastName}` : event.user?.email || "Recruitment team"; return <li key={event.id} className="text-xs text-text-muted"><p className="font-medium text-text-heading">{oldSchedule.startsAt ? new Date(oldSchedule.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Previous time unavailable"} → {newSchedule.startsAt ? new Date(newSchedule.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Updated time unavailable"}</p><p className="mt-0.5">Changed by {actor} · {new Date(event.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · Asia/Kolkata{newSchedule.reason ? ` · ${newSchedule.reason}` : ""}</p></li>; })}</ol>
    </details>}
    {showAppointmentDetails && <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-text-muted">Date and time · Asia/Kolkata</dt><dd className="mt-1">{new Date(interview.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd></div>
      <div><dt className="text-xs text-text-muted">Interviewer for this round</dt><dd className="mt-1">{interview.interviewer ? `${interview.interviewer.firstName} ${interview.interviewer.lastName}` : "Not assigned"}</dd></div>
      <div className="sm:col-span-2"><dt className="text-xs text-text-muted">Format and location</dt><dd className="mt-1 break-words capitalize">{readable(interview.mode || "IN_PERSON")} · {interview.location || "Not provided"}</dd></div>
    </dl>}
    <PreviousRoundFeedback value={interview.previousRoundFeedback} />
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
    {interview.status === "COMPLETED" && <section className="space-y-3 border-t border-slate-border pt-4" aria-label="Interview feedback">
      <h4 className="font-semibold">{submitted ? "Submitted feedback" : interview.draftFeedback ? "Continue feedback draft" : "Submit interview feedback"}</h4>
      {submitted && <><p className="whitespace-pre-wrap break-words text-sm">{interview.feedback}</p><p className="text-xs text-text-muted">{interview.reviewerName || "Reviewer unavailable"} · {new Date(interview.feedbackSubmittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · Asia/Kolkata{interview.score != null ? ` · Score ${interview.score}/10` : ""}{interview.recommendation ? ` · ${readable(interview.recommendation)}` : ""}</p></>}
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
    </section>}
  </article>;
}
