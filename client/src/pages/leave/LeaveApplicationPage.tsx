import React, { useState, useMemo } from 'react';
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
import { Clock, CalendarDays } from 'lucide-react';

type DurationType = 'full' | 'half' | 'hour';

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function LeaveApplicationPage() {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    leaveType: 'PERSONAL',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [durationType, setDurationType] = useState<DurationType>('full');
  const [hourlyDuration, setHourlyDuration] = useState(60); // minutes

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
      setDurationType('full');
      setHourlyDuration(60);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to apply leave'),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Compute live leave duration label
  const leaveDurationLabel = useMemo(() => {
    if (!formData.startDate) return null;
    const start = parseLocalDate(formData.startDate);
    const end = formData.endDate ? parseLocalDate(formData.endDate) : start;
    let days = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const d = cur.getDay();
      if (d !== 0) days++;
      cur.setDate(cur.getDate() + 1);
    }
    if (durationType === 'half' && days === 1) return '0.5 Days';
    if (durationType === 'hour' && days === 1) return `${hourlyDuration} Minutes`;
    return `${days} Day${days !== 1 ? 's' : ''}`;
  }, [formData.startDate, formData.endDate, durationType, hourlyDuration]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (durationType !== 'full') {
      const start = parseLocalDate(formData.startDate);
      const end = formData.endDate ? parseLocalDate(formData.endDate) : start;
      if (start.toDateString() !== end.toDateString()) {
        toast.error('Half-day and hourly leaves must be for a single day only.');
        return;
      }
    }
    applyMutation.mutate({
      ...formData,
      isHalfDay: durationType === 'half',
      isHourly: durationType === 'hour',
      hourlyDuration: durationType === 'hour' ? hourlyDuration : undefined,
    } as any);
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
    { header: 'Duration', accessor: (row: any) => {
      if (row.isHalfDay) return '0.5 Days';
      if (row.isHourly && row.hourlyDuration) return `${row.hourlyDuration} min`;
      return `${row.totalDays} Day${row.totalDays !== 1 ? 's' : ''}`;
    }},
    { header: 'Reason', accessor: (row: any) => row.reason },
    { header: 'Status', accessor: (row: any) => getStatusBadge(row.status) },
  ];

  const myLeaves = (leavesData as any)?.data || [];

  return (
    <div className="space-y-6">
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Leave Type</label>
                  <Select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-[1.25rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface px-4 py-3 text-[13px] focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-slate-900 dark:text-slate-100"
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

                {/* Duration Type Selector */}
                <div className="flex flex-col space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Leave Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Full Day */}
                    <button
                      type="button"
                      onClick={() => setDurationType('full')}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                        durationType === 'full'
                          ? 'border-brand-primary bg-brand-light text-brand-primary dark:bg-brand-primary/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                      Full Day
                    </button>

                    {/* Half Day */}
                    <button
                      type="button"
                      onClick={() => setDurationType('half')}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                        durationType === 'half'
                          ? 'border-brand-primary bg-brand-light text-brand-primary dark:bg-brand-primary/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4 opacity-60" />
                      Half Day
                    </button>

                    {/* Hourly */}
                    <button
                      type="button"
                      onClick={() => setDurationType('hour')}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                        durationType === 'hour'
                          ? 'border-brand-primary bg-brand-light text-brand-primary dark:bg-brand-primary/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      By Hour
                    </button>
                  </div>

                  {/* Half Day note */}
                  {durationType === 'half' && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">
                      Applicable for single-day applications (0.5 day)
                    </p>
                  )}

                  {/* Hourly selector */}
                  {durationType === 'hour' && (
                    <div className="space-y-2 mt-1">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">
                        Applicable for single-day applications only
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[60, 120, 180].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setHourlyDuration(mins)}
                            className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                              hourlyDuration === mins
                                ? 'border-brand-primary bg-brand-light text-brand-primary dark:bg-brand-primary/20'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {mins / 60}h
                          </button>
                        ))}
                      </div>

                    </div>
                  )}
                </div>

                {/* Live duration preview */}
                {leaveDurationLabel && (
                  <div className="flex items-center justify-between bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 dark:border-brand-primary/30 rounded-xl px-4 py-3">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total Leave Duration:</span>
                    <span className="text-sm font-bold text-brand-primary">{leaveDurationLabel}</span>
                  </div>
                )}

                <div className="flex flex-col space-y-1 w-full">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Reason</label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="flex min-h-[100px] w-full rounded-[1.25rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface px-4 py-3 text-[13px] focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-slate-900 dark:text-slate-100 resize-none"
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

