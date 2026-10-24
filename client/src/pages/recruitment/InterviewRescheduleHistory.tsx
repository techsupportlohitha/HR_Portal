import { ChevronDown } from "lucide-react";

function schedule(value?: string) {
  try {
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}

function time(value?: string) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "Not recorded";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

export function InterviewRescheduleHistory({ events = [], round }: { events?: any[]; round: string }) {
  const changes = events.filter(event => {
    if (event.actionPerformed !== "RESCHEDULE_INTERVIEW") return false;
    const before = schedule(event.oldValue), after = schedule(event.newValue);
    return before.round === round || after.round === round || (!before.round && !after.round);
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return <details className="group rounded-lg border border-slate-border bg-tint/50 p-3">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
      <span>Reschedule history <span className="block text-xs font-normal text-text-muted">Rescheduled {changes.length} {changes.length === 1 ? "time" : "times"}</span></span>
      <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    {changes.length === 0 ? <p className="mt-3 text-sm text-text-muted">No reschedules recorded for this round.</p> : <ol className="mt-3 space-y-3 border-l border-slate-border pl-3">
      {changes.map(event => {
        const before = schedule(event.oldValue), after = schedule(event.newValue);
        const actor = event.user?.employee ? `${event.user.employee.firstName} ${event.user.employee.lastName}` : event.user?.email || "Recruitment team";
        return <li key={event.id} className="space-y-2 rounded-lg bg-surface p-3 text-xs">
          <p className="font-medium text-text-heading">Changed by {actor} · {time(event.createdAt)}</p>
          {!before.round && !after.round && <p className="text-text-muted">Round not recorded in this older entry.</p>}
          <dl className="grid gap-2 sm:grid-cols-2">
            <div><dt className="text-text-muted">Previous schedule</dt><dd>{time(before.startsAt)}{before.endsAt ? ` – ${time(before.endsAt)}` : ""}</dd>{before.location && <dd className="break-words text-text-muted">{before.location}</dd>}</div>
            <div><dt className="text-text-muted">Updated schedule</dt><dd>{time(after.startsAt)}{after.endsAt ? ` – ${time(after.endsAt)}` : ""}</dd>{after.location && <dd className="break-words text-text-muted">{after.location}</dd>}</div>
          </dl>
          <p className="whitespace-pre-wrap break-words"><span className="font-medium">Reason: </span>{after.reason || before.reason || "Not recorded"}</p>
        </li>;
      })}
    </ol>}
    <p className="mt-2 text-[10px] text-text-muted">All times Asia/Kolkata · Most recent changes first</p>
  </details>;
}
