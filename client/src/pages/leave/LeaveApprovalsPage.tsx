import { formatDate, formatDateTime } from '@/utils/dateFormat';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { leavesApi } from '@/api/leaves';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { CalendarDays, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Select } from '@/components/ui/Select';

export default function LeaveApprovalsPage() {
 const { user } = useAuth();
 const { canApprove, canExport } = usePermissions();
 const queryClient = useQueryClient();
 const [selectedLeave, setSelectedLeave] = useState<any>(null);
 const [detailsModalOpen, setDetailsModalOpen] = useState(false);
 const [remarks, setRemarks] = useState('');
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [action, setAction] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'>('APPROVED');
 const [statusFilter, setStatusFilter] = useState('ALL');

 const { data: leavesData, isLoading } = useQuery({
 queryKey: ['leaves', 'all'],
 queryFn: leavesApi.getAll,
 });

 const filteredData = (leavesData?.data || []).filter((leave: any) => {
   if (statusFilter === 'ALL') return true;
   return leave.status === statusFilter;
 });

 const statusMutation = useMutation({
 mutationFn: leavesApi.updateStatus,
 onSuccess: () => {
 toast.success(`Leave request status changed to ${action.toLowerCase()}`);
 queryClient.invalidateQueries({ queryKey: ['leaves', 'all'] });
 setIsModalOpen(false);
 setSelectedLeave(null);
 setRemarks('');
 },
 onError: (err: any) => toast.error(err.response?.data?.message || 'Action failed'),
 });

 const handleAction = (leave: any, newAction: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
 setSelectedLeave(leave);
 setAction(newAction);
 setRemarks('');
 setIsModalOpen(true);
 };

 const openDetails = (leave: any) => {
 setSelectedLeave(leave);
 setDetailsModalOpen(true);
 };

 const submitAction = () => {
 if (selectedLeave) {
 statusMutation.mutate({ id: selectedLeave.id, status: action, remarks });
 }
 };

 const exportToCSV = () => {
 const leaves = filteredData;
 if (!leaves || leaves.length === 0) {
 toast.error('No leave records to export');
 return;
 }

 const headers = ['Employee', 'Employee Code', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Approved By', 'Applied On'];
 const rows = leaves.map((leave: any) => [
 `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`,
 leave.employee?.employeeCode || '',
 leave.employee?.department?.name || '',
 leave.leaveType,
 formatDate(leave.startDate),
 formatDate(leave.endDate),
 leave.totalDays,
 `"${(leave.reason || '').replace(/"/g, '""')}"`,
 leave.status,
 `${leave.approver?.firstName || ''} ${leave.approver?.lastName || ''}`.trim(),
 formatDate(leave.createdAt),
 ]);

 const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `leave_register_${new Date().toISOString().slice(0, 10)}.csv`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
 toast.success('Leave register exported successfully');
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'APPROVED': return <Badge variant="success">Approved</Badge>;
 case 'REJECTED': return <Badge variant="danger">Rejected</Badge>;
 case 'CANCELLED': return <Badge variant="default">Cancelled</Badge>;
 default: return <Badge variant="warning">Pending</Badge>;
 }
 };

 const baseColumns = [
 {
 header: 'Employee',
 accessor: (row: any) => `${row.employee?.firstName} ${row.employee?.lastName}`
 },
 { header: 'Type', accessor: 'leaveType' as const },
 {
 header: 'Dates',
 accessor: (row: any) => `${formatDate(row.startDate)} - ${formatDate(row.endDate)}`
 },
 { header: 'Days', accessor: 'totalDays' as const },
 {
 header: 'Reason',
 accessor: (row: any) => <span className="truncate max-w-[200px] block" title={row.reason}>{row.reason}</span>
 },
 {
 header: 'Status',
 accessor: (row: any) => canApprove('leave')
 ? <div onClick={(event) => event.stopPropagation()}><Select aria-label={`Change leave status for ${row.employee?.firstName || 'employee'}`} value={row.status} onChange={(event) => event.target.value !== row.status && handleAction(row, event.target.value as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED')} className="min-w-36 rounded-xl border border-slate-border bg-surface px-3 py-2 text-sm"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="CANCELLED">Cancelled</option></Select></div>
 : getStatusBadge(row.status)
 },
 {
 header: 'Approved By',
 accessor: (row: any) => row.approver
 ? `${row.approver.firstName || ''} ${row.approver.lastName || ''}`.trim() || 'Not recorded'
 : row.status === 'PENDING' ? 'Pending' : 'Not recorded'
 },
 ];
 const columns = baseColumns;

 return (
 <div className="space-y-6">
 <PageHeader
 title={user?.role === 'EMPLOYEE' ? 'Leave Approval History' : 'Leave Approvals'}
 description={user?.role === 'EMPLOYEE' ? 'View your past and present leave applications.' : 'Review and action pending leave requests from your team.'}
 actions={canExport('leave') && <Button variant="outline" onClick={exportToCSV}>
 <Download className="w-4 h-4 mr-2" />
 Export Register
 </Button>}
 />

 {isLoading ? (
 <LoadingSpinner />
 ) : (
 <div className="space-y-4">
 <div className="flex justify-end">
 <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface p-1.5 shadow-sm">
 <span className="pl-3 pr-2 text-sm font-medium text-slate-500 dark:text-slate-400">Status:</span>
 {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((status) => (
 <button
 key={status}
 onClick={() => setStatusFilter(status)}
 className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
 statusFilter === status
 ? 'bg-brand-primary text-white shadow-sm dark:bg-brand-primary dark:text-white'
 : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
 }`}
 >
 {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
 </button>
 ))}
 </div>
 </div>
 <DataTable columns={columns} data={filteredData} keyField="id" onRowClick={openDetails} caption="Leave approval history" />
 </div>
 )}

 <Modal
 isOpen={detailsModalOpen}
 onClose={() => setDetailsModalOpen(false)}
 title="Leave Request Details"
 className="max-w-2xl"
 >
 {selectedLeave && (() => {
 const employeeName = [selectedLeave.employee?.firstName, selectedLeave.employee?.lastName].filter(Boolean).join(' ') || 'Employee';
 const leaveType = String(selectedLeave.leaveType || 'Leave').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter: string) => letter.toUpperCase());
 const durationLabel = selectedLeave.isHourly
 ? `${selectedLeave.hourlyDuration ? `${selectedLeave.hourlyDuration} minutes` : 'Hourly leave'}${selectedLeave.hourlyStartTime ? ` · from ${selectedLeave.hourlyStartTime}` : ''}`
 : selectedLeave.isHalfDay ? `Half day${selectedLeave.halfDayPeriod ? ` · ${selectedLeave.halfDayPeriod === 'MORNING' ? 'Morning' : 'Afternoon'}` : ''}` : Number(selectedLeave.totalDays) === 1 ? '1 day' : `${selectedLeave.totalDays} days`;
 const approverName = [selectedLeave.approver?.firstName, selectedLeave.approver?.lastName].filter(Boolean).join(' ') || '—';
 const statusVariant = selectedLeave.status === 'APPROVED' ? 'success' : selectedLeave.status === 'REJECTED' ? 'danger' : selectedLeave.status === 'PENDING' ? 'warning' : 'default';

 return <div className="space-y-4 text-sm">
 <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5">
 <div className="flex items-start gap-3">
 <div className="rounded-xl bg-indigo-100 dark:bg-indigo-900/40 p-2.5 text-indigo-600 dark:text-indigo-300"><CalendarDays className="h-5 w-5" /></div>
 <div className="min-w-0 flex-1">
 <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{leaveType} leave</p>
 <h3 className="mt-0.5 text-xl font-semibold text-text-heading">{employeeName}</h3>
 <p className="mt-1 text-text-muted">{formatDate(selectedLeave.startDate)}{selectedLeave.endDate && selectedLeave.endDate !== selectedLeave.startDate ? ` – ${formatDate(selectedLeave.endDate)}` : ''} · {durationLabel}</p>
 </div>
 </div>
 <div className="mt-4"><Badge variant={statusVariant}>{String(selectedLeave.status || 'PENDING').replace(/_/g, ' ')}</Badge></div>
 </div>

 <section className="rounded-2xl border border-slate-border p-4 sm:p-5">
 <h3 className="mb-4 font-semibold text-text-heading">Leave information</h3>
 <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
 <div><dt className="text-xs text-text-muted">Employee</dt><dd className="mt-1 font-medium text-text-heading">{employeeName}</dd></div>
 <div><dt className="text-xs text-text-muted">Employee code</dt><dd className="mt-1 font-medium text-text-heading">{selectedLeave.employee?.employeeCode || '—'}</dd></div>
 <div><dt className="text-xs text-text-muted">Department</dt><dd className="mt-1 font-medium text-text-heading">{selectedLeave.employee?.department?.name || '—'}</dd></div>
 <div><dt className="text-xs text-text-muted">Leave dates</dt><dd className="mt-1 font-medium text-text-heading">{formatDate(selectedLeave.startDate)}{selectedLeave.endDate && selectedLeave.endDate !== selectedLeave.startDate ? ` – ${formatDate(selectedLeave.endDate)}` : ''}</dd></div>
 <div><dt className="text-xs text-text-muted">Duration</dt><dd className="mt-1 font-medium text-text-heading">{durationLabel}</dd></div>
 <div className="sm:col-span-2"><dt className="text-xs text-text-muted">Reason</dt><dd className="mt-1 whitespace-pre-wrap font-medium text-text-heading">{selectedLeave.reason || '—'}</dd></div>
 </dl>
 </section>

 <section className="rounded-2xl border border-slate-border p-4 sm:p-5">
 <h3 className="mb-4 font-semibold text-text-heading">Approval & history</h3>
 <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
 <div><dt className="text-xs text-text-muted">Current status</dt><dd className="mt-1 font-medium text-text-heading">{String(selectedLeave.status || 'PENDING').replace(/_/g, ' ')}</dd></div>
 <div><dt className="text-xs text-text-muted">Approved by</dt><dd className="mt-1 font-medium text-text-heading">{approverName}</dd></div>
 <div><dt className="text-xs text-text-muted">Applied on</dt><dd className="mt-1 font-medium text-text-heading">{selectedLeave.createdAt ? formatDateTime(selectedLeave.createdAt) : '—'}</dd></div>
 <div><dt className="text-xs text-text-muted">Decision remarks</dt><dd className="mt-1 whitespace-pre-wrap font-medium text-text-heading">{selectedLeave.remarks || '—'}</dd></div>
 </dl>
 </section>

 <div className="flex justify-end border-t border-slate-border pt-4">
 <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Close</Button>
 </div>
 </div>;
 })()}
 </Modal>

 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title="Update Leave Status"
 >
 <div className="space-y-4">
 <p className="text-sm text-slate-600">
 Are you sure you want to change this leave request from {String(selectedLeave?.status || 'PENDING').toLowerCase()} to {action.toLowerCase()} for
 <strong> {selectedLeave?.employee?.firstName} {selectedLeave?.employee?.lastName}</strong>?
 </p>

 <div className="flex flex-col space-y-1">
 <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1  text-slate-700 dark:text-slate-300">Remarks (Optional)</label>
 <textarea
 value={remarks}
 onChange={(e) => setRemarks(e.target.value)}
 className="flex min-h-[100px] w-full rounded-[1.25rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface px-4 py-3 text-[13px] focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] bg-surface text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
 placeholder="Add any remarks here..."
 />
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
 <Button
 variant={action === 'REJECTED' || action === 'CANCELLED' ? 'danger' : 'primary'}
 onClick={submitAction}
 isLoading={statusMutation.isPending}
 >
 Save status
 </Button>
 </div>
 </div>
 </Modal>
 </div>
 );
}

