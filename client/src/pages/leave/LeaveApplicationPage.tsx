import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesApi } from '@/api/leaves';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';

export default function LeaveApplicationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    leaveType: 'CASUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const applyMutation = useMutation({
    mutationFn: leavesApi.apply,
    onSuccess: () => {
      toast.success('Leave application submitted');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      navigate('/dashboard');
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="Time Off"
        description="Request time away from work."
      />

      <Card>
        <CardHeader>
          <CardTitle>Leave Application</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1 w-full">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Leave Type</label>
              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EARNED">Earned Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Start Date" type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
              <Input label="End Date" type="date" name="endDate" value={formData.endDate} onChange={handleChange} required />
            </div>

            <div className="flex flex-col space-y-1 w-full">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="flex min-h-[100px] w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={applyMutation.isPending}>Submit Application</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
