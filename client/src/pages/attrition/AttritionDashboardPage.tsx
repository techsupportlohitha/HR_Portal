import { Select } from '@/components/ui/Select';
import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Filter,
  MapPin,
  TrendingUp,
  UserMinus,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

type AttritionFilters = {
  periodMonths: number;
  department: string;
  location: string;
  employmentType: string;
};

const initialFilters: AttritionFilters = {
  periodMonths: 12,
  department: '',
  location: '',
  employmentType: '',
};

const chartCardClass = 'rounded-2xl border border-slate-border bg-surface p-5 shadow-sm sm:p-6';

function formatPeriodDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatRate(value: number | null | undefined) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function InsightCard({
  icon,
  iconClass,
  label,
  value,
  detail,
  footer,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: ReactNode;
  detail: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-border bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
          <div className="mt-1 text-2xl font-bold tracking-tight text-text-heading">{value}</div>
          <div className="mt-1 text-xs text-text-muted">{detail}</div>
          {footer && <div className="mt-3 border-t border-slate-border pt-3 text-xs">{footer}</div>}
        </div>
      </div>
    </article>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-border px-6 text-center text-sm text-text-muted">
      {message}
    </div>
  );
}

export default function AttritionDashboardPage() {
  const [filters, setFilters] = useState<AttritionFilters>(initialFilters);
  const hasFilters = Boolean(filters.department || filters.location || filters.employmentType || filters.periodMonths !== 12);

  const { data: statsData, isLoading, isFetching, error } = useQuery({
    queryKey: ['attrition-stats', filters],
    queryFn: () => dashboardApi.getAttrition({
      periodMonths: filters.periodMonths,
      department: filters.department || undefined,
      location: filters.location || undefined,
      employmentType: filters.employmentType || undefined,
    }).then((res: any) => res.data),
  });

  const stats = statsData || {};
  const filterOptions = stats.filterOptions || { departments: [], locations: [], employmentTypes: [] };
  const joinExitTrend = stats.joinExitTrend || [];
  const departmentBreakdown = stats.departmentBreakdown || [];
  const exitReasonBreakdown = stats.exitReasonBreakdown || [];
  const tenureBreakdown = stats.tenureBreakdown || [];

  const periodLabel = `${filters.periodMonths}-Month`;
  const totalExits = Number(stats.voluntaryExits || 0) + Number(stats.involuntaryExits || 0);
  const voluntaryShare = totalExits > 0
    ? Math.round((Number(stats.voluntaryExits || 0) / totalExits) * 100)
    : null;
  const totalJoiners = Number(stats.joinersInPeriod || joinExitTrend.reduce((total: number, item: any) => total + Number(item.joins || 0), 0));
  const totalDepartures = Number(stats.attritionCount || joinExitTrend.reduce((total: number, item: any) => total + Number(item.exits || 0), 0));
  const netChange = totalJoiners - totalDepartures;
  const priorityDepartment = departmentBreakdown[0];
  const periodRange = stats.reportingPeriod
    ? `${formatPeriodDate(stats.reportingPeriod.start)} – ${formatPeriodDate(stats.reportingPeriod.end)}`
    : 'Selected reporting period';

  const sortedLocations = useMemo(() => [...(stats.locationBreakdown || [])].sort((a: any, b: any) => b.count - a.count), [stats.locationBreakdown]);
  const sortedDesignations = useMemo(() => [...(stats.designationBreakdown || [])].sort((a: any, b: any) => b.count - a.count), [stats.designationBreakdown]);

  const updateFilter = (key: keyof AttritionFilters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: key === 'periodMonths' ? Number(value) : value,
    }));
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-6 text-red-500">Failed to load attrition stats.</div>;

  const rateChange = stats.attritionRateChange;
  const changeIsPositive = typeof rateChange === 'number' && rateChange > 0;
  const changeIsNegative = typeof rateChange === 'number' && rateChange < 0;
  const separationLabel = Number(stats.attritionCount || 0) === 1 ? 'separation' : 'separations';
  const classifiedExitLabel = totalExits === 1 ? 'exit' : 'exits';

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">People analytics</p>
          <h1 className="text-2xl font-bold tracking-tight text-text-heading sm:text-3xl">Employee Attrition Dashboard</h1>
          <p className="mt-2 text-sm text-text-muted">Retention and workforce movement · {periodRange}</p>
        </div>
        <div className="w-full rounded-2xl border border-accent-200 bg-accent-50 px-5 py-3 dark:border-accent-800 dark:bg-accent-950/30 sm:w-auto">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-accent-700 dark:text-accent-300">{filters.periodMonths}-mo avg headcount</span>
          <span className="mt-1 block text-2xl font-black text-accent-700 dark:text-accent-300">{Number(stats.averageStrength || 0).toFixed(1)}</span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-border bg-surface p-4 shadow-sm sm:p-5" aria-label="Attrition filters">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300">
              <Filter className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-heading">Review scope</h2>
              <p className="text-xs text-text-muted">Slice the workforce data before taking action.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-medium text-text-muted">
              Reporting period
              <Select
                aria-label="Filter by reporting period"
                value={filters.periodMonths}
                onChange={(event) => updateFilter('periodMonths', event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-border bg-background px-3 text-sm text-text-heading outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
              >
                <option value={12}>Last 12 months</option>
                <option value={6}>Last 6 months</option>
                <option value={3}>Last 3 months</option>
              </Select>
            </label>
            <label className="text-xs font-medium text-text-muted">
              Department
              <Select
                aria-label="Filter by department"
                value={filters.department}
                onChange={(event) => updateFilter('department', event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-border bg-background px-3 text-sm text-text-heading outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
              >
                <option value="">All departments</option>
                {filterOptions.departments.map((option: string) => <option key={option} value={option}>{option}</option>)}
              </Select>
            </label>
            <label className="text-xs font-medium text-text-muted">
              Location
              <Select
                aria-label="Filter by location"
                value={filters.location}
                onChange={(event) => updateFilter('location', event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-border bg-background px-3 text-sm text-text-heading outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
              >
                <option value="">All locations</option>
                {filterOptions.locations.map((option: string) => <option key={option} value={option}>{option}</option>)}
              </Select>
            </label>
            <label className="text-xs font-medium text-text-muted">
              Employment type
              <Select
                aria-label="Filter by employment type"
                value={filters.employmentType}
                onChange={(event) => updateFilter('employmentType', event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-border bg-background px-3 text-sm text-text-heading outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
              >
                <option value="">All employment types</option>
                {filterOptions.employmentTypes.map((option: string) => <option key={option} value={option}>{option}</option>)}
              </Select>
            </label>
          </div>
        </div>
        {hasFilters && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-border pt-3">
            <span className="text-xs text-text-muted">{isFetching ? 'Updating insights…' : 'Filters applied to all insights'}</span>
            <button type="button" onClick={() => setFilters(initialFilters)} className="text-xs font-semibold text-accent-700 hover:underline dark:text-accent-300">Reset filters</button>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4" aria-label="Attrition insights">
        <InsightCard
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
          iconClass="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
          label={`${periodLabel} Attrition Rate`}
          value={formatRate(stats.attritionRate)}
          detail={`${stats.attritionCount || 0} ${separationLabel} · avg ${Number(stats.averageStrength || 0).toFixed(1)} employees`}
          footer={typeof rateChange === 'number' ? (
            <span className={`inline-flex items-center gap-1 font-medium ${changeIsPositive ? 'text-red-600' : changeIsNegative ? 'text-emerald-600' : 'text-text-muted'}`}>
              {changeIsPositive ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : changeIsNegative ? <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {Math.abs(rateChange).toFixed(1)} pts vs prior {filters.periodMonths} months
            </span>
          ) : <span className="text-text-muted">No prior-period baseline</span>}
        />
        <InsightCard
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          label="Net Workforce Change"
          value={<span className={netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}>{netChange >= 0 ? '+' : ''}{netChange}</span>}
          detail={`${totalJoiners} joined · ${totalDepartures} exited`}
          footer="Movement within the selected period"
        />
        <InsightCard
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          iconClass="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          label="Priority Department"
          value={<span className="block truncate" title={priorityDepartment?.name}>{priorityDepartment?.name || 'No recorded exits'}</span>}
          detail={priorityDepartment ? `${formatRate(priorityDepartment.attritionRate)} rate · ${priorityDepartment.count} exit${priorityDepartment.count === 1 ? '' : 's'} / avg ${Number(priorityDepartment.averageHeadcount || 0).toFixed(1)}` : 'No recorded exits in this scope.'}
          footer="Ranked by attrition rate and exit volume"
        />
        <InsightCard
          icon={<UserMinus className="h-5 w-5" aria-hidden="true" />}
          iconClass="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
          label="Voluntary Exit Share"
          value={voluntaryShare === null ? '—' : `${voluntaryShare}%`}
          detail={voluntaryShare === null ? 'No classified exits in this scope' : `${stats.voluntaryExits || 0} of ${totalExits} classified ${classifiedExitLabel} voluntary`}
          footer={voluntaryShare === null ? 'Add exit type data to improve the signal' : 'A leading indicator for retention action'}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className={chartCardClass}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">New joiners vs exits ({filters.periodMonths} Mos)</h2>
              <p className="mt-1 text-xs text-text-muted">See whether workforce growth is offsetting departures.</p>
            </div>
            <TrendingUp className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="h-72 w-full">
            {joinExitTrend.length ? <ResponsiveContainer>
              <BarChart data={joinExitTrend} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.25} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Legend iconType="circle" />
                <Bar dataKey="joins" name="New joiners" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="exits" name="Exits" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer> : <EmptyChartState message="No workforce movement recorded in this scope." />}
          </div>
        </div>

        <div className={chartCardClass}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Where exits happened</h2>
              <p className="mt-1 text-xs text-text-muted">Rate normalised by average department headcount.</p>
            </div>
            <Building2 className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          </div>
          <div className="h-72 w-full">
            {departmentBreakdown.length ? <ResponsiveContainer>
              <BarChart layout="vertical" data={departmentBreakdown} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.25} />
                <XAxis type="number" unit="%" hide />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={110} />
                <RechartsTooltip formatter={(value: any) => [`${value}%`, 'Attrition rate']} />
                <Bar dataKey="attritionRate" name="Attrition rate" fill="#f59e0b" radius={[0, 5, 5, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer> : <EmptyChartState message="No recorded exits in this scope." />}
          </div>
        </div>

        <div className={chartCardClass}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Why employees left</h2>
              <p className="mt-1 text-xs text-text-muted">Use coded exit reasons to target retention actions.</p>
            </div>
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          </div>
          <div className="h-72 w-full">
            {exitReasonBreakdown.length ? <ResponsiveContainer>
              <BarChart layout="vertical" data={exitReasonBreakdown} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.25} />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={120} />
                <RechartsTooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="count" name="Exits" fill="#ef4444" radius={[0, 5, 5, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer> : <EmptyChartState message="No recorded exit reasons in this scope." />}
          </div>
        </div>

        <div className={chartCardClass}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Exits by tenure</h2>
              <p className="mt-1 text-xs text-text-muted">Spot early-tenure churn and long-term retention risk.</p>
            </div>
            <Users className="h-5 w-5 shrink-0 text-violet-600" aria-hidden="true" />
          </div>
          <div className="h-72 w-full">
            {tenureBreakdown.some((item: any) => item.count > 0) ? <ResponsiveContainer>
              <BarChart data={tenureBreakdown} margin={{ top: 5, right: 0, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.25} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="count" name="Exits" fill="#8b5cf6" radius={[5, 5, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer> : <EmptyChartState message="No recorded exits in this scope." />}
          </div>
        </div>

        <div className={chartCardClass}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Exit locations</h2>
              <p className="mt-1 text-xs text-text-muted">Compare concentration across offices and sites.</p>
            </div>
            <MapPin className="h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
          </div>
          <div className="h-72 w-full">
            {sortedLocations.length ? <ResponsiveContainer>
              <BarChart data={sortedLocations} margin={{ top: 5, right: 0, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.25} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="count" name="Exits" fill="#0ea5e9" radius={[5, 5, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer> : <EmptyChartState message="No recorded exits in this scope." />}
          </div>
        </div>

        <div className={chartCardClass}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Exit roles</h2>
              <p className="mt-1 text-xs text-text-muted">Identify roles where knowledge loss may need coverage.</p>
            </div>
            <UserMinus className="h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
          </div>
          <div className="h-72 w-full">
            {sortedDesignations.length ? <ResponsiveContainer>
              <BarChart layout="vertical" data={sortedDesignations} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.25} />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={120} />
                <RechartsTooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="count" name="Exits" fill="#f97316" radius={[0, 5, 5, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer> : <EmptyChartState message="No recorded exits in this scope." />}
          </div>
        </div>
      </section>
    </div>
  );
}
