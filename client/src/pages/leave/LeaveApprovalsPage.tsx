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
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeaveApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [action, setAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['leaves', 'all'],
    queryFn: leavesApi.getAll,
  });

  const statusMutation = useMutation({
    mutationFn: leavesApi.updateStatus,
    onSuccess: () => {
      toast.success(`Leave request ${action.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['leaves', 'all'] });
      setIsModalOpen(false);
      setSelectedLeave(null);
      setRemarks('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const handleAction = (leave: any, newAction: 'APPROVED' | 'REJECTED') => {
    setSelectedLeave(leave);
    setAction(newAction);
    setIsModalOpen(true);
  };

  const submitAction = () => {
    if (selectedLeave) {
      statusMutation.mutate({ id: selectedLeave.id, status: action, remarks });
    }
  };

  const exportToCSV = () => {
    const leaves = leavesData?.data;
    if (!leaves || leaves.length === 0) {
      toast.error('No leave records to export');
      return;
    }

    const headers = ['Employee', 'Employee Code', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Applied On'];
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
      accessor: (row: any) => getStatusBadge(row.status)
    },
  ];
  const columns = user?.role === 'EMPLOYEE' ? baseColumns : [...baseColumns, { header: 'Actions', accessor: (row: any) => row.status === 'PENDING' ? (<div className="flex gap-2"><Button variant="primary" size="sm" onClick={() => handleAction(row, 'APPROVED')}>Approve</Button><Button variant="danger" size="sm" onClick={() => handleAction(row, 'REJECTED')}>Reject</Button></div>) : <span className="text-slate-400 text-sm">Processed</span> }];

  return (
    <div className="space-y-6">
      <PageHeader
        title={user?.role === 'EMPLOYEE' ? 'Leave Approval History' : 'Leave Approvals'}
        description={user?.role === 'EMPLOYEE' ? 'View your past and present leave applications.' : 'Review and action pending leave requests from your team.'}
        actions={
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export Register
          </Button>
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable columns={columns} data={leavesData?.data || []} keyField="id" />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${action === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to {action.toLowerCase()} the leave request for
            <strong> {selectedLeave?.employee?.firstName} {selectedLeave?.employee?.lastName}</strong>?
          </p>

          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Remarks (Optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="flex min-h-[100px] w-full rounded-md border border-slate-300 dark:border-slate-600 bg-surface text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Add any remarks here..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              variant={action === 'APPROVED' ? 'primary' : 'danger'}
              onClick={submitAction}
              isLoading={statusMutation.isPending}
            >
              Confirm {action === 'APPROVED' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

