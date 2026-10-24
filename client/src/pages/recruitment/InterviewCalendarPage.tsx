import { InterviewRescheduleHistory } from "./InterviewRescheduleHistory";
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recruitmentApi } from "@/api/recruitment";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Calendar } from "@/components/ui/Calendar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ScheduleInterviewModal } from "@/pages/dashboard/components/ScheduleInterviewModal";
import { usePermissions } from "@/hooks/usePermissions";
import { interviewCsv } from "./interviewExport";
import { calendarCandidates, hiringHistoryLabel, isHiringHistory } from "./calendarCandidates";
import { stageLabel } from "./pipelineModel";
import { InterviewAppointmentPanel } from "./InterviewAppointmentPanel";
import { candidateDetailsUrl } from "./recruitmentNavigation";
import toast from "react-hot-toast";
import { CalendarDays, ChevronDown, MapPin, UserRound } from "lucide-react";
const zone = "Asia/Kolkata";
const dayKey = (date: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
const time = (date: string) =>
  new Date(date).toLocaleTimeString("en-IN", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
  });
const label = (value?: string) =>
  (value || "").replace(/_/g, " ").toLowerCase();
const readable = (value?: string) =>
  label(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
const colors: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  COMPLETED:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELLED:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  NO_SHOW: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
};
export default function InterviewCalendarPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const reqId = params.get("reqId") || "";
  const { canEdit, canExport, canAdd } = usePermissions();
  const cache = useQueryClient();
  const [view, setView] = useState<"agenda" | "month">(() => {
    const saved = localStorage.getItem("recruitment-calendar-view");
    return saved === "agenda" || saved === "month"
      ? saved
      : "agenda";
  });
  const [date, setDate] = useState(() => new Date());
  const [bucket, setBucket] = useState(params.get("history") === "true" ? "history" : "active");
  const [search, setSearch] = useState(params.get("search") || "");
  const [round, setRound] = useState(params.get("round") || "");
  const [status, setStatus] = useState(params.get("status") || "");
  const [panel, setPanel] = useState(params.get("panel") || "");
  const [schedule, setSchedule] = useState<{ candidate?: any } | null>(null);
  const [decision, setDecision] = useState<{
    interview: any;
    status: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [task, setTask] = useState(params.get("task") || "all");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["interviews", reqId],
    queryFn: () =>
      reqId
        ? recruitmentApi.getCandidates(reqId).then((r) => r.data)
        : recruitmentApi.getInterviews().then((r) => r.data),
  });
  const { data: requisitions } = useQuery({
    queryKey: ["requisitions"],
    queryFn: recruitmentApi.getRequisitions,
  });
  const refresh = () =>
    [
      "interviews",
      "candidates",
      "candidate-register", "candidate-pipeline",
      "requisitions",
      "dashboard-stats",
    ].forEach((key) => cache.invalidateQueries({ queryKey: [key] }));
  const appointmentMutation = useMutation({
    mutationFn: ({ id, payload }: any) =>
      recruitmentApi.updateInterviewStatus(id, payload),
    onSuccess: () => {
      refresh();
      setDecision(null);
      setReason("");
      toast.success("Interview updated");
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message || "Could not update interview",
      ),
  });
  const stageMutation = useMutation({
    mutationFn: ({ id, stage, expectedStage }: { id: string; stage: string; expectedStage: string }) =>
      recruitmentApi.moveCandidateStage(id, { stage, expectedStage }),
    onSuccess: () => {
      refresh();
      setDetailsId(null);
      toast.success("Candidate moved to the next stage");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Could not move candidate to the next stage"),
  });
  const outcomeMutation = useMutation({
    mutationFn: ({ id, selectionStatus }: any) =>
      recruitmentApi.interviewCandidate(id, {
        selectionStatus:
          selectionStatus === "IN_PROGRESS" ? null : selectionStatus,
      }),
    onSuccess: () => {
      refresh();
      toast.success("Candidate outcome updated");
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message || "Could not update candidate",
      ),
  });
  const candidateCards = useMemo(() => calendarCandidates(data || []), [data]);
  const detailAppointment = candidateCards.find((item: any) => item.interviewId === detailsId);
  const appointments = candidateCards.filter(candidate => bucket === "history" ? isHiringHistory(candidate) : !isHiringHistory(candidate));
  const interviewers = useMemo(
    () =>
      Array.from(
        new Map(
          appointments
            .filter((a: any) => a.interviewerId)
            .map((a: any) => [a.interviewerId, a.interviewer]),
        ).entries(),
      ) as [string, any][],
    [appointments],
  );
  const filtered = appointments.filter(
    (a: any) =>
      (!search ||
        `${a.candidateName} ${a.email || ""} ${a.requisition?.positionTitle || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (task !== "feedback" || (a.status === "COMPLETED" && !a.feedbackSubmittedAt && a.currentStage === a.interviewRound)) &&
      (task !== "scheduled" || a.status === "SCHEDULED") &&
      (!round || a.interviewRound === round) &&
      (!status || a.status === status) &&
      (!panel || a.interviewerId === panel),
  );
  const visible = bucket === "history" || view === "agenda" ? filtered
    : filtered.filter((appointment: any) => dayKey(appointment.interviewDate) === dayKey(date));
  React.useEffect(() => {
    const next = new URLSearchParams();
    Object.entries({
      reqId,
      search,
      round,
      status,
      panel,
      history: bucket === "history" ? "true" : "",
      task: task === "all" ? "" : task,
    }).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    if (next.toString() !== params.toString())
      setParams(next, { replace: true });
  }, [reqId, search, round, status, panel, bucket, task, params, setParams]);
  const card = (a: any) => (
    <article
      key={a.id}
      className="min-w-0 overflow-hidden rounded-xl border border-slate-border bg-surface shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <button
              className="text-left text-base font-semibold text-text-heading hover:text-primary-700 hover:underline dark:hover:text-primary-300"
              onClick={() =>
                navigate(
                  `${candidateDetailsUrl(a.requisitionId, a.id)}&returnTo=${encodeURIComponent("/recruitment/interviews?" + params.toString())}`,
                )
              }
            >
              {a.candidateName}
            </button>
            <p className="mt-1 text-sm text-text-muted">
              {a.requisition?.positionTitle || "Opening"}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${colors[a.status] || colors.SCHEDULED}`}>
            {isHiringHistory(a) ? hiringHistoryLabel(a) : a.selectionStatus === "SELECTED" ? "Selected" : a.currentStage && a.currentStage !== a.interviewRound ? "Awaiting next round" : readable(a.status)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-tint px-2 py-1 text-xs font-semibold capitalize text-text-heading">
            {stageLabel(a.interviewRound)}{a.interviewRound === "TELEPHONIC" ? " interview" : ""}
          </span>
          <span className="text-xs text-text-muted">Stage: <span className="font-medium text-text-heading">{stageLabel(a.currentStage || a.interviewRound)}</span>{a.selectionStatus === "SELECTED" && !isHiringHistory(a) && <span> · {a.offerStatus === "OFFER_ACCEPTED" ? "Offer accepted · joining pending" : "Offer and joining pending"}</span>}</span>
          {a.status === "COMPLETED" && a.feedbackSubmittedAt && (
            <span className="text-xs text-text-muted">Feedback submitted{a.interviewScore != null ? ` · Score ${a.interviewScore}/10` : ""}</span>
          )}
          {a.status === "COMPLETED" && !a.feedbackSubmittedAt && !isHiringHistory(a) && (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Feedback needed</span>
          )}
        </div>

        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-xs text-text-muted">Date and time · Asia/Kolkata</dt>
              <dd className="mt-0.5 font-medium text-text-heading">
                {new Date(a.interviewDate).toLocaleDateString("en-IN", { timeZone: zone, weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {time(a.interviewDate)}{a.endsAt ? `–${time(a.endsAt)}` : ""}
              </dd>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-2.5">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-xs text-text-muted">Interviewer</dt>
              <dd className="mt-0.5 break-words font-medium text-text-heading">{a.interviewer ? `${a.interviewer.firstName} ${a.interviewer.lastName}` : "Not assigned"}</dd>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-xs text-text-muted">Format and location</dt>
              <dd className="mt-0.5 break-words font-medium capitalize text-text-heading">{label(a.mode || "IN_PERSON")}{a.interviewLocation ? ` · ${a.interviewLocation}` : " · Location not provided"}</dd>
            </div>
          </div>
        </dl>

        <InterviewRescheduleHistory events={a.activity || []} round={a.interviewRound} />

        {canAdd("recruitment") && !isHiringHistory(a) && !["SELECTED", "SELECTION_ON_HOLD"].includes(a.selectionStatus) && a.currentStage !== a.interviewRound && ["HR_INTERVIEW", "TECHNICAL", "MANAGEMENT"].includes(a.currentStage) && <Button type="button" onClick={() => setSchedule({ candidate: { ...a, interviewId: undefined, interviewDate: undefined, endsAt: undefined, interviewRound: a.currentStage, interviewLocation: undefined } })}>Schedule next round</Button>}
        {a.interviewId && <Button type="button" variant={a.status === "COMPLETED" && !a.feedbackSubmittedAt && a.currentStage === a.interviewRound && canEdit("recruitment") ? "primary" : "outline"} onClick={() => setDetailsId(a.interviewId)}>{a.status === "COMPLETED" && !a.feedbackSubmittedAt && a.currentStage === a.interviewRound && canEdit("recruitment") ? a.draftFeedback ? "Continue feedback draft" : "Submit feedback" : "Interview details & feedback"}</Button>}
      {canEdit("recruitment") && !isHiringHistory(a) ? (
        <>
          {a.status === "SCHEDULED" && a.interviewId && (!a.currentStage || a.currentStage === a.interviewRound) && (
            <div className="flex flex-wrap gap-2 border-t border-slate-border pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSchedule({ candidate: a })}
              >
                Reschedule
              </Button>
              <Button
                size="sm"
                disabled={appointmentMutation.isPending}
                onClick={() =>
                  appointmentMutation.mutate({
                    id: a.interviewId,
                    payload: { status: "COMPLETED" },
                  })
                }
              >
                Complete
              </Button>
              {["CANCELLED", "NO_SHOW"].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReason("");
                    setDecision({ interview: a, status: value });
                  }}
                >
                  {value === "CANCELLED" ? "Cancel" : "No-show"}
                </Button>
              ))}
            </div>
          )}
          <details className="group rounded-xl border border-slate-border p-2.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium"><span>Candidate hiring decision</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary><div className="mt-2"><Select
            label="Candidate hiring decision"
            value={a.selectionStatus || "IN_PROGRESS"}
            disabled={outcomeMutation.isPending}
            onChange={(e) =>
              outcomeMutation.mutate({
                id: a.id,
                selectionStatus: e.target.value,
              })
            }
          >
            <option value="IN_PROGRESS">In progress</option>
            <option value="SELECTION_ON_HOLD">On hold</option>
            <option value="SELECTED">Selected</option>
            <option value="SELECTION_REJECTED">Rejected</option>
          </Select></div></details>
        </>
      ) : (
        <p className="text-sm text-text-muted">Candidate decision: <span className="font-medium text-text-heading">{isHiringHistory(a) ? hiringHistoryLabel(a) : readable(a.selectionStatus || "IN_PROGRESS")}</span></p>
      )}
      </div>
    </article>
  );
  return (
    <div className="space-y-5">
      <PageHeader
        title={
          requisitions?.data?.find((r: any) => r.id === reqId)?.positionTitle ||
          "Interview calendar"
        }
        description="Schedule interviews, track appointment status and submit round feedback."
        actions={
          <div className="flex flex-wrap gap-2">
            {reqId && (
              <Button
                variant="outline"
                onClick={() => navigate("/recruitment")}
              >
                All openings
              </Button>
            )}
            {canExport("recruitment") && (
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(
                    new Blob([interviewCsv(visible)], {
                      type: "text/csv;charset=utf-8",
                    }),
                  );
                  link.download = "Interview_Calendar.csv";
                  link.click();
                  URL.revokeObjectURL(link.href);
                }}
              >
                Export CSV
              </Button>
            )}
          </div>
        }
      />
      <div role="tablist" aria-label="Candidate hiring status" className="flex gap-2">
        <Button role="tab" aria-selected={bucket === "active"} variant={bucket === "active" ? "primary" : "outline"} onClick={() => setBucket("active")}>Active ({candidateCards.filter(candidate => !isHiringHistory(candidate)).length})</Button>
        <Button role="tab" aria-selected={bucket === "history"} variant={bucket === "history" ? "primary" : "outline"} onClick={() => setBucket("history")}>History ({candidateCards.filter(isHiringHistory).length})</Button>
      </div>
      {bucket === "active" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-border bg-surface p-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Interview view">
          {(["agenda", "month"] as const).map((value) => (
            <Button key={value} variant={view === value ? "primary" : "outline"} aria-pressed={view === value} onClick={() => {
              setView(value);
              localStorage.setItem("recruitment-calendar-view", value);
            }}>{value === "agenda" ? "List" : value[0].toUpperCase() + value.slice(1)}</Button>
          ))}
        </div>
        <p className="text-sm text-text-muted">{view === "agenda" ? "All interview dates"
          : date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · Asia/Kolkata</p>
      </div>
      }
      <section aria-label="Interview filters" className="space-y-3 rounded-xl border border-slate-border bg-surface p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Interview tasks">{[["all", "All interviews"], ["scheduled", "Scheduled"], ["feedback", "Feedback due"]].map(([value, label]) => <Button key={value} size="sm" variant={task === value ? "primary" : "outline"} aria-pressed={task === value} onClick={() => setTask(value)}>{label}</Button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          label="Search"
          placeholder="Candidate or opening"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Opening"
          value={reqId}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            e.target.value
              ? next.set("reqId", e.target.value)
              : next.delete("reqId");
            setParams(next);
          }}
        >
          <option value="">All openings</option>
          {requisitions?.data?.map((r: any) => (
            <option key={r.id} value={r.id}>
              {r.positionTitle}
            </option>
          ))}
        </Select>
        <Select
          label="Round"
          value={round}
          onChange={(e) => setRound(e.target.value)}
        >
          <option value="">All rounds</option>
          {["TELEPHONIC", "HR_INTERVIEW", "TECHNICAL", "MANAGEMENT"].map(
            (r) => (
              <option key={r} value={r}>
                {label(r)}
              </option>
            ),
          )}
        </Select>
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((r) => (
            <option key={r} value={r}>
              {label(r)}
            </option>
          ))}
        </Select>
        <Select
          label="Interviewer"
          value={panel}
          onChange={(e) => setPanel(e.target.value)}
        >
          <option value="">All interviewers</option>
          {interviewers.map(([id, person]) => (
            <option key={id} value={id}>
              {person?.firstName} {person?.lastName}
            </option>
          ))}
        </Select>
      </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-muted">
        <p>
          {visible.length} {visible.length === 1 ? "candidate" : "candidates"}{bucket === "active" && <> /{" "}
          {
            appointments.filter(
              (a: any) =>
                a.status === "SCHEDULED" &&
                dayKey(a.interviewDate) === dayKey(new Date()),
            ).length
          }{" "}
          scheduled today /{" "}
          {
            appointments.filter(
              (a: any) => a.status === "COMPLETED" && !a.interviewFeedback,
            ).length
          }{" "}
          awaiting feedback</>}
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setTask("all");
            setSearch("");
            setRound("");
            setStatus("");
            setPanel("");
          }}
        >
          Clear filters
        </Button>
      </div>
      {isError ? (
        <div role="alert">
          Could not load interviews.{" "}
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className={bucket === "active" && view === "month" ? "grid gap-5 md:grid-cols-[20rem_1fr]" : ""}>
          {bucket === "active" && view === "month" && <Calendar value={date} onChange={setDate} getDayCount={(day) => filtered.filter((appointment: any) => dayKey(appointment.interviewDate) === dayKey(day)).length} />}
        <div className="grid gap-3">
          {visible.map(card)}
          {!visible.length && (
            <p className="rounded-xl border border-dashed border-slate-border p-8 text-text-muted">
              No candidates match these filters.
            </p>
          )}
        </div>
        </div>
      )}
      <Modal isOpen={!!detailAppointment} onClose={() => setDetailsId(null)} title="Interview details & feedback">
        {detailAppointment && <div className="space-y-4">
          <div><p className="font-semibold">{detailAppointment.candidateName}</p><p className="text-sm text-text-muted">{detailAppointment.requisition?.positionTitle}</p></div>
          {(() => {
            const currentStage = detailAppointment.currentStage === "SCREENING" ? "TELEPHONIC" : detailAppointment.currentStage;
            const nextStage = currentStage === "HR_INTERVIEW" ? "TECHNICAL" : currentStage === "TECHNICAL" ? "MANAGEMENT" : undefined;
            const canAdvanceFromFeedback = canEdit("recruitment") && !isHiringHistory(detailAppointment)
              && detailAppointment.status === "COMPLETED" && !!detailAppointment.feedbackSubmittedAt
              && detailAppointment.interviewRound === currentStage
              && !["SELECTION_ON_HOLD", "SELECTION_REJECTED"].includes(detailAppointment.selectionStatus);
            return <InterviewAppointmentPanel key={detailAppointment.interviewId}
              interview={{ ...detailAppointment, id: detailAppointment.interviewId, startsAt: detailAppointment.interviewDate, round: detailAppointment.interviewRound, location: detailAppointment.interviewLocation, feedback: detailAppointment.interviewFeedback, score: detailAppointment.interviewScore }}
              editable={canEdit("recruitment") && !isHiringHistory(detailAppointment) && detailAppointment.currentStage === detailAppointment.interviewRound}
              rescheduleHistory={detailAppointment.activity || []}
              showAppointmentDetails={false}
              nextStage={canAdvanceFromFeedback ? nextStage : undefined}
              movingToNextStage={stageMutation.isPending}
              onMoveToNextStage={canAdvanceFromFeedback && nextStage ? () => stageMutation.mutate({ id: detailAppointment.id, stage: nextStage, expectedStage: currentStage }) : undefined}
              onReschedule={() => { setDetailsId(null); setSchedule({ candidate: detailAppointment }); }} />;
          })()}
        </div>}
      </Modal>
      <ScheduleInterviewModal
        isOpen={!!schedule}
        onClose={() => setSchedule(null)}
        initialRequisitionId={reqId || undefined}
        existingCandidate={schedule?.candidate}
      />
      <Modal
        isOpen={!!decision}
        onClose={() => setDecision(null)}
        title={
          decision?.status === "NO_SHOW"
            ? "Mark interview as no-show"
            : "Cancel interview"
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (decision)
              appointmentMutation.mutate({
                id: decision.interview.interviewId,
                payload: { status: decision.status, reason },
              });
          }}
        >
          <p>
            {decision?.interview.candidateName} / This updates the appointment
            status.
          </p>
          <Input
            label="Reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            type="submit"
            disabled={appointmentMutation.isPending || !reason.trim()}
          >
            Save status
          </Button>
        </form>
      </Modal>
    </div>
  );
}
