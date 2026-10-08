import { useState } from 'react';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/api/audit';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { PaginationControls } from '@/components/ui/PaginationControls';

export default function LoginHistoryPage() {
 const [page, setPage] = useState(1);
 const { data, isLoading } = useQuery({
 queryKey: ['login-history', page],
 queryFn: () => auditApi.getAll(page, 10),
 });

 if (isLoading) return <LoadingSpinner />;

 const responseData = data?.data as unknown;
 const logs = Array.isArray(responseData)
 ? responseData
 : Array.isArray((responseData as { data?: unknown } | undefined)?.data)
 ? (responseData as { data: unknown[] }).data
 : [];
 const pagination = (responseData as { pagination?: { total: number } } | undefined)?.pagination;

 return (
 <div className="space-y-6">
 <PageHeader
 title="Activity & Login History"
 description="Review account access and system activity."
 />
 <div className="overflow-hidden rounded-xl border border-slate-border bg-surface shadow-sm">
 <p className="border-b border-slate-border px-4 py-2 text-xs text-text-muted sm:hidden">Scroll horizontally to see all columns.</p>
 <div className="overflow-x-auto" role="region" tabIndex={0} aria-label="Activity and login history table. Scroll horizontally for more columns.">
 <table className="min-w-[48rem] divide-y divide-gray-200 dark:divide-gray-700">
 <thead className="bg-surface">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Module</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
 </tr>
 </thead>
 <tbody className="bg-surface divide-y divide-gray-200 dark:divide-gray-700">
 {logs.map((log: any) => (
 <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
 {formatDateTime(log.createdAt)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
 {log.user?.email || 'System'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
 {log.actionPerformed}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
 {log.moduleAffected}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
 {log.ipAddress || 'N/A'}
 </td>
 </tr>
 ))}
 {logs.length === 0 && (
 <tr>
 <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
 No activity logs found.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 <PaginationControls page={page} pageSize={10} total={pagination?.total ?? logs.length} onPageChange={setPage} />
 </div>
 );
}




