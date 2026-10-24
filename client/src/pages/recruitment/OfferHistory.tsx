import { ChevronDown } from "lucide-react";

const fields = [
  ["offeredSalary", "Offered salary"], ["offerStatus", "Offer status"],
  ["offerDate", "Offer date"], ["joiningDate", "Expected joining date"],
  ["joiningStatus", "Joining outcome"], ["actualJoiningDate", "Actual joining date"],
];
const parse = (value?: string) => {
  try { const data = value ? JSON.parse(value) : {}; return data && typeof data === "object" ? data : {}; }
  catch { return {}; }
};
function display(key: string, value: any) {
  if (value === undefined) return "Not recorded";
  if (value === null || value === "") return "Not provided";
  if (key === "offeredSalary") return `₹${Number(value).toLocaleString("en-IN")}`;
  if (key.endsWith("Date")) return new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  return String(value).replace(/^OFFER_/, "").replace(/_/g, " ").toLowerCase();
}

export function OfferHistory({ events = [], showSalary }: { events?: any[]; showSalary: boolean }) {
  const changes = events.filter(event => event.actionPerformed === "OFFER_CANDIDATE")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return <details className="group rounded-xl border border-slate-border bg-surface">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold"><span>Offer change history</span><span className="flex items-center gap-2"><span className="text-xs font-normal text-text-muted">{changes.length} {changes.length === 1 ? "entry" : "entries"}</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></span></summary>
    <div className="space-y-3 border-t border-slate-border p-4">
      {!changes.length && <p className="text-sm text-text-muted">No offer changes recorded yet. Saved offer revisions will appear here.</p>}
      {changes.map(event => {
        const before = parse(event.oldValue), after = parse(event.newValue);
        const changedFields = fields.filter(([key]) => (key !== "offeredSalary" || showSalary) && String(before[key] ?? "") !== String(after[key] ?? ""));
        const actor = event.user?.employee ? `${event.user.employee.firstName} ${event.user.employee.lastName}` : event.user?.email || "Recruitment team";
        return <article key={event.id} className="space-y-3 rounded-lg border border-slate-border bg-tint p-3">
          <p className="text-sm font-medium">{actor}</p>
          <p className="text-xs text-text-muted">{new Date(event.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · Asia/Kolkata</p>
          {changedFields.length ? <dl className="space-y-3">{changedFields.map(([key, label]) => <div key={key}>
            <dt className="text-xs font-semibold text-text-muted">{label}</dt>
            <dd className="mt-1 grid gap-1 text-sm sm:grid-cols-2"><span><span className="text-xs text-text-muted">Previous: </span>{display(key, before[key])}</span><span><span className="text-xs text-text-muted">Updated: </span>{display(key, after[key])}</span></dd>
          </div>)}</dl> : <p className="text-sm text-text-muted">Offer saved; no visible field changes recorded.</p>}
        </article>;
      })}
      {changes.length > 0 && <p className="text-xs text-text-muted">Most recent first. Amounts were not recorded in older history entries.</p>}
    </div>
  </details>;
}
