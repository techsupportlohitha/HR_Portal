import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesApi } from '@/api/leaves';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { formatDate } from '@/utils/dateFormat';

export default function LeaveApplicationPage() {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    leaveType: 'PERSONAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => leavesApi.getMyLeaves(),
  });

  const applyMutation = useMutation({
    mutationFn: leavesApi.apply,
    onSuccess: () => {
      toast.success('Leave application submitted');
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      setFormData({ leaveType: 'PERSONAL', startDate: '', endDate: '', reason: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to apply leave'),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate(formData as any);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge variant="success">Approved</Badge>;
      case 'REJECTED': return <Badge variant="danger">Rejected</Badge>;
      case 'PENDING': return <Badge variant="warning">Pending</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  const columns = [
    { header: 'Leave Type', accessor: (row: any) => row.leaveType?.replace('_', ' ') || row.leaveType },
    { header: 'Start Date', accessor: (row: any) => formatDate(row.startDate).split(' ')[0] },
    { header: 'End Date', accessor: (row: any) => formatDate(row.endDate).split(' ')[0] },
    { header: 'Days', accessor: (row: any) => row.days },
    { header: 'Reason', accessor: (row: any) => row.reason },
    { header: 'Status', accessor: (row: any) => getStatusBadge(row.status) },
  ];

  const myLeaves = (leavesData as any)?.data || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Leave Management"
        description="Apply for time off and view your leave history."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Application Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Apply for Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col space-y-1 w-full">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Leave Type</label>
                  <Select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-slate-border bg-surface text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="PERSONAL">Personal Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="ON_DUTY">On Duty</option>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <DatePicker label="Start Date" type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
                  <DatePicker label="End Date" type="date" name="endDate" value={formData.endDate} onChange={handleChange} required />
                </div>

                <div className="flex flex-col space-y-1 w-full">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="flex min-h-[100px] w-full rounded-md border border-slate-border bg-surface text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" isLoading={applyMutation.isPending} className="w-full">Submit Application</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Leave History Table */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>My Leave History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="p-8 flex justify-center"><LoadingSpinner /></div>
              ) : myLeaves.length === 0 ? (
                <div className="text-center p-8 text-slate-500">
                  <p>You haven't requested any leaves yet.</p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={myLeaves}
                  keyField="id"
                />
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
