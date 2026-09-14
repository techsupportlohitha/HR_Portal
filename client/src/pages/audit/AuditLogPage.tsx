import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { usePermissions } from '@/hooks/usePermissions';
import { Search, Download, Eye, Shield, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';

const MODULES = [
  'employees', 'travel', 'assets', 'recruitment', 'performance',
  'training', 'requests', 'policies', 'auth', 'departments', 'expenses'
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  FAILED_LOGIN: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

function getActionColor(action: string) {
  for (const key of Object.keys(ACTION_COLORS)) {
    if (action.includes(key)) return ACTION_COLORS[key];
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function DiffViewer({ oldVal, newVal }: { oldVal?: string | null; newVal?: string | null }) {
  const parseJson = (val?: string | null) => {
    if (!val) return null;
    try { return JSON.parse(val); } catch { return val; }
  };

  const old = parseJson(oldVal);
  const next = parseJson(newVal);

  if (!old && !next) {
    return <p className="text-gray-500 text-sm italic">No field-level diff recorded for this action.</p>;
  }

  const keys = Array.from(new Set([
    ...Object.keys(old || {}),
    ...Object.keys(next || {}),
  ]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 pr-4 font-medium text-gray-500 w-1/3">Field</th>
            <th className="text-left py-2 pr-4 font-medium text-red-500">Old Value</th>
            <th className="text-left py-2 font-medium text-green-500">New Value</th>
          </tr>
        </thead>
        <tbody>
          {keys.map(k => (
            <tr key={k} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{k}</td>
              <td className="py-2 pr-4 text-red-600 dark:text-red-400 font-mono text-xs break-all">
                {old?.[k] !== undefined ? String(old[k]) : <span className="italic text-gray-400">—</span>}
              </td>
              <td className="py-2 text-green-600 dark:text-green-400 font-mono text-xs break-all">
                {next?.[k] !== undefined ? String(next[k]) : <span className="italic text-gray-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditLogPage() {
  const { canExport } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const params = new URLSearchParams({
    page: String(page),
    limit: '50',
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(module && { module }),
    ...(action && { action }),
    ...(from && { from }),
    ...(to && { to }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/audit/stats');
      return data.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, debouncedSearch, module, action, from, to],
    queryFn: async () => {
      const { data } = await apiClient.get(`/audit?${params}`);
      return data.data;
    },
  });

  const logs: any[] = data?.data || [];
  const pagination = data?.pagination;

  const handleExport = () => {
    if (!logs.length) return;
    const csv = 'data:text/csv;charset=utf-8,'
      + 'Timestamp,User,Action,Module,Record ID,IP Address,Old Value,New Value\n'
      + logs.map((l: any) =>
          `"${formatDateTime(l.createdAt)}","${l.user?.email || ''}","${l.actionPerformed}","${l.moduleAffected}","${l.recordIdAffected || ''}","${l.ipAddress || ''}","${(l.oldValue || '').replace(/"/g, '""')}","${(l.newValue || '').replace(/"/g, '""')}"`
        ).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Audit Trail"
        description="Investigate changes, access, and operational events."
        actions={canExport('audit') && (
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        )}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Actions Today</p>
            <p className="text-xl font-bold text-text-heading">{statsData?.totalToday ?? '—'}</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">This Month</p>
            <p className="text-xl font-bold text-text-heading">{statsData?.totalMonth ?? '—'}</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Failed Logins</p>
            <p className="text-xl font-bold text-text-heading">{statsData?.failedLogins ?? '—'}</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Top Module</p>
            <p className="text-sm font-bold text-text-heading capitalize">
              {statsData?.moduleBreakdown?.[0]?.moduleAffected ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              aria-label="Search audit actions and records"
              placeholder="Search actions, records..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-lg text-sm focus:outline-none"
            />
          </div>
          <select
            aria-label="Filter audit logs by module"
            value={module}
            onChange={e => { setModule(e.target.value); setPage(1); }}
            className="py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Modules</option>
            {MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
          <input
            type="date"
            aria-label="Audit logs from date"
            value={from}
            onChange={e => { setFrom(e.target.value); setPage(1); }}
            className="py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="From date"
          />
          <input
            type="date"
            aria-label="Audit logs to date"
            value={to}
            onChange={e => { setTo(e.target.value); setPage(1); }}
            className="py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="To date"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No audit records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Timestamp', 'User', 'Action', 'Module', 'Record ID', 'IP Address', 'Changes', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {log.user?.email || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.actionPerformed)}`}>
                        {formatAction(log.actionPerformed)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 capitalize whitespace-nowrap">
                      {log.moduleAffected}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 max-w-[120px] truncate">
                      {log.recordIdAffected || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {log.oldValue || log.newValue ? (
                        <span className="text-blue-500 font-medium">Has diff</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 text-gray-400 hover:text-primary-500 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, pagination.total)} of {pagination.total} records</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="flex items-center px-3 text-sm">Page {page} of {pagination.totalPages}</span>
            <Button variant="outline" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Detail — ${formatAction(selectedLog.actionPerformed)}`}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-text-muted mb-1 font-medium">Timestamp</p>
                <p className="font-medium">{formatDateTime(selectedLog.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1 font-medium">User</p>
                <p className="font-medium">{selectedLog.user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1 font-medium">Module</p>
                <p className="font-medium capitalize">{selectedLog.moduleAffected}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1 font-medium">IP Address</p>
                <p className="font-medium">{selectedLog.ipAddress || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-text-muted mb-1 font-medium">Record ID</p>
                <p className="font-mono text-xs break-all">{selectedLog.recordIdAffected || '—'}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Field Changes</p>
              <DiffViewer oldVal={selectedLog.oldValue} newVal={selectedLog.newValue} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
