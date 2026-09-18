import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingApi } from '@/api/training';
import { Timeline, type TimelineItem } from '@/components/ui/Timeline';
import { DataTable } from '@/components/ui/DataTable';
import {} from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Download, BookOpen, Clock, IndianRupee, Star, CheckCircle, Calendar, Users, TrendingUp, Search, SlidersHorizontal, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import apiClient from '@/api/client';
import { DatePicker } from '@/components/ui/DatePicker';

export default function TrainingListPage() {
  const { user } = useAuth();
  const { canExport } = usePermissions();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const [selectedTrainingForEdit, setSelectedTrainingForEdit] = useState<any>(null);
  const [editingParticipant, setEditingParticipant] = useState<any>(null);
  const [newParticipantId, setNewParticipantId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  const { data: trainingData, isLoading } = useQuery({
    queryKey: ['trainings'],
    queryFn: isAdminOrHR ? trainingApi.getAll : trainingApi.getMyTrainings,
  });

  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['trainings', 'dashboard'],
    queryFn: trainingApi.getDashboardStats,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await apiClient.get('/departments');
      return data;
    },
    enabled: isAdminOrHR
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await apiClient.get('/employees');
      return data;
    },
    enabled: isAdminOrHR
  });

  const createMutation = useMutation({
    mutationFn: trainingApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Training session created successfully');
      setIsModalOpen(false);
      setSelectedTrainingForEdit(null);
    },
    onError: () => toast.error('Failed to create training')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => trainingApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Training session updated successfully');
      setIsModalOpen(false);
      setSelectedTrainingForEdit(null);
    },
    onError: () => toast.error('Failed to update training')
  });

  const addParticipantMutation = useMutation({
    mutationFn: ({ id, employeeId }: { id: string, employeeId: string }) => trainingApi.addParticipants(id, { employeeId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Participant added successfully');
      setSelectedTraining((prev: any) => ({
        ...prev,
        participants: [...(prev?.participants || []), data.data]
      }));
    },
    onError: () => toast.error('Failed to add participant')
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => trainingApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Training status updated');
      setSelectedTraining(null);
    },
    onError: () => toast.error('Failed to update status')
  });

  const updateParticipantMutation = useMutation({
    mutationFn: async ({ trainingId, employeeId, assessmentData, feedbackData }: any) => {
      if (assessmentData) await trainingApi.recordAssessment(trainingId, employeeId, assessmentData);
      if (feedbackData) await trainingApi.submitFeedback(trainingId, employeeId, feedbackData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Participant updated');
      setEditingParticipant(null);
      setSelectedTraining(null); // Simple way to refresh manage view
    },
    onError: () => toast.error('Failed to update participant')
  });


  const handleExport = () => {
    if (!trainingData?.data?.length) return;
    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvContent = "data:text/csv;charset=utf-8,"
      + "ID,Topic,Type,Status,Trainer,Date,Location,Hours,Cost\n"
      + trainingData.data.map((t: any) =>
          `${escapeCsv(t.id)},${escapeCsv(t.trainingTopic)},${escapeCsv(t.trainingType)},${escapeCsv(t.status || 'PENDING')},${escapeCsv(t.trainerName)},${escapeCsv(formatDate(t.trainingDate))},${escapeCsv(t.trainingLocation)},${t.trainingHours || 0},${t.trainingCost || 0}`
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Training_Register.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { header: 'Topic', accessor: 'trainingTopic' },
    { header: 'Type', accessor: 'trainingType' },
    { header: 'Status', accessor: (row: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.status === 'APPROVED' ? 'bg-green-100 text-green-700' : row.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
        {row.status || 'PENDING'}
      </span>
    ) },
    { header: 'Trainer', accessor: 'trainerName' },
    { header: 'Date', accessor: (row: any) => row.trainingEndDate ? formatDate(row.trainingDate) + ' - ' + formatDate(row.trainingEndDate) : formatDate(row.trainingDate) },
    { header: 'Location', accessor: 'trainingLocation' },
    { header: 'Hours', accessor: 'trainingHours' },
    {
      header: 'Actions',
      accessor: (row: any) => (
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedTraining(row)}>
            Manage
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            setSelectedTrainingForEdit(row);
            setIsModalOpen(true);
          }}>
            Edit
          </Button>
        </div>
      )
    },
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries()) as any;

    if (payload.trainingHours) {
      payload.trainingHours = Number(payload.trainingHours);
    } else {
      delete payload.trainingHours;
    }

    if (payload.trainingCost) {
      payload.trainingCost = Number(payload.trainingCost);
    } else {
      delete payload.trainingCost;
    }

    if (!payload.targetDepartmentId) { delete payload.targetDepartmentId; }

    if (!payload.trainingEndDate) { delete payload.trainingEndDate; }

    if (selectedTrainingForEdit) {
      updateMutation.mutate({ id: selectedTrainingForEdit.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const trainingRows = trainingData?.data || [];
  const filteredTrainings = trainingRows.filter((t: any) => {
    const matchesSearch = !searchTerm || 
                          t.trainingTopic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.trainerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.trainingLocation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || t.trainingType === typeFilter;
    const matchesDepartment = departmentFilter === 'ALL' || t.targetDepartmentId === departmentFilter;
    return matchesSearch && matchesStatus && matchesType && matchesDepartment;
  });

  const renderCalendarView = () => {
    const sorted = [...(trainingData?.data || [])].sort((a, b) => new Date(a.trainingDate).getTime() - new Date(b.trainingDate).getTime());
  
  return (
      <div className="space-y-4">
         {sorted.map((t: any) => (
           <div key={t.id} className="flex flex-col p-6 bg-surface rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex justify-between items-start">
                 <div>
                   <h4 className="text-xl font-bold text-navy-900 dark:text-white">{t.trainingTopic}</h4>
                   <p className="text-sm text-gray-500 mt-1">
                     {t.trainingEndDate ? `${formatDate(t.trainingDate)} to ${formatDate(t.trainingEndDate)}` : formatDateTime(t.trainingDate)}
                   </p>
                 </div>
                 <Button variant="outline" size="sm" onClick={() => setSelectedTraining(t)}>Manage</Button>
               </div>
               <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mt-4">
                 <span className="flex items-center gap-1.5"><Users className="w-4 h-4"/> {t.trainerName || 'TBD'}</span>
                 <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {t.trainingHours} Hrs</span>
                 <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> {t.trainingLocation || 'Remote'}</span>
                 <span className="px-2 py-0.5 bg-surface rounded-full text-xs font-semibold">{t.trainingType}</span>
               </div>
             </div>
           ))}
      </div>
    );
  };

  const renderTimelineView = () => {
    const sorted = [...(filteredTrainings || [])].sort((a, b) => new Date(a.trainingDate).getTime() - new Date(b.trainingDate).getTime());
    const timelineItems: TimelineItem[] = sorted.map((t: any) => {
      const date = new Date(t.trainingDate);
      const isPast = date.getTime() < Date.now();

      let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
      if (t.status === 'COMPLETED' || t.status === 'APPROVED') status = 'completed';
      else if (isPast) status = 'completed';
      else if (date.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000) status = 'current';

      return {
        id: t.id,
        title: t.trainingTopic,
        description: `Trainer: ${t.trainerName || 'TBD'} • Location: ${t.trainingLocation || 'Remote'} • ${t.trainingHours} Hours`,
        date: formatDate(date),
        category: t.trainingType,
        status,
      };
    });

    return (
      <div className="bg-surface rounded-xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-8 text-center">Training Journey</h2>
        {timelineItems.length > 0 ? (
          <Timeline items={timelineItems} className="max-w-4xl mx-auto" />
        ) : (
          <div className="text-center text-gray-500 py-12">No training sessions found.</div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Training Sessions"
        description="Plan learning, track attendance, and measure outcomes."
        actions={<div className="flex gap-2">
                      {isAdminOrHR && (
              <>
                {canExport('training') && <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="w-4 h-4" /> Export Register
                </Button>}
                <Button onClick={() => {
                  setSelectedTrainingForEdit(null);
                  setIsModalOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" /> New Training
                </Button>
              </>
            )}
        </div>}
      />

      <div className="mt-5 rounded-xl border border-slate-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Search training</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-muted" aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Topic, trainer, location..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 dark:border-slate-600 "
                aria-label="Search training sessions"
              />
            </span>
          </label>
          <label className="w-full lg:w-44">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Type</span>
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-surface px-3 text-sm dark:border-slate-600 " aria-label="Filter by training type">
              <option value="ALL">All types</option>
              <option value="INTERNAL">Internal</option>
              <option value="EXTERNAL">External</option>
            </Select>
          </label>
          {isAdminOrHR && <label className="w-full lg:w-52">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Department</span>
            <Select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-surface px-3 text-sm dark:border-slate-600 " aria-label="Filter by department">
              <option value="ALL">All departments</option>
              {departmentsData?.data?.map((department: any) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </Select>
          </label>}
          {(searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL' || departmentFilter !== 'ALL') && (
            <Button variant="ghost" onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setTypeFilter('ALL');
              setDepartmentFilter('ALL');
            }} className="h-10 gap-2">
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </div>

      {!isStatsLoading && statsData?.data && (
        <div className="space-y-8 my-6 lg:my-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-muted line-clamp-2 break-words">Upcoming / Completed</p>
                    <h3 className="text-2xl font-bold text-text-heading">{statsData.data.upcomingTrainings} / {statsData.data.completedTrainings}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-muted line-clamp-2 break-words">Total Participants</p>
                    <h3 className="text-2xl font-bold text-text-heading">{statsData.data.totalParticipants}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-muted line-clamp-2 break-words">Effectiveness</p>
                    <h3 className="text-2xl font-bold text-text-heading">{statsData.data.averageFeedback.toFixed(1)} / 5.0</h3>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                    <IndianRupee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-muted line-clamp-2 break-words">Total Hours & Cost</p>
                    <h3 className="text-2xl font-bold text-text-heading leading-tight">{statsData.data.totalTrainingHours}h</h3>
                    <p className="text-sm font-semibold text-text-muted mt-0.5">₹{statsData.data.totalTrainingCost?.toLocaleString?.() ?? statsData.data.totalTrainingCost}</p>
                  </div>
                </div>
              </div>
            </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
              <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 bg-surface/50 px-5 py-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent-600" />
                  Department-wise Training
                </h3>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800 h-64 overflow-y-auto custom-scrollbar">
                  {statsData.data.departmentWise?.length === 0 ? (
                    <div className="p-5 text-center text-sm text-slate-500">No data available</div>
                  ) : (
                    statsData.data.departmentWise?.map((d: any, i: number) => (
                      <div key={d.name} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700'][i % 4]
                          }`}>
                            {d.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{d.name}</span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {d.value} {d.value === 1 ? 'Training' : 'Trainings'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
              <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 bg-surface/50 px-5 py-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent-600" />
                  Employee-wise Training
                </h3>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800 h-64 overflow-y-auto custom-scrollbar">
                  {statsData.data.employeeWise?.length === 0 ? (
                    <div className="p-5 text-center text-sm text-slate-500">No data available</div>
                  ) : (
                    statsData.data.employeeWise?.map((e: any, i: number) => (
                      <div key={e.name} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            ['bg-indigo-100 text-indigo-700', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700', 'bg-cyan-100 text-cyan-700'][i % 4]
                          }`}>
                            {e.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{e.name}</span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {e.value} {e.value === 1 ? 'Session' : 'Sessions'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        renderCalendarView()
      )}

      <Modal isOpen={isModalOpen} onClose={() => {
        setIsModalOpen(false);
        setSelectedTrainingForEdit(null);
      }} title={selectedTrainingForEdit ? "Edit Training Session" : "New Training Session"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="trainingTopic" label="Training Topic" required defaultValue={selectedTrainingForEdit?.trainingTopic} />
          <Select name="trainingType" label="Training Type" required defaultValue={selectedTrainingForEdit?.trainingType || "INTERNAL"}>
              <option value="INTERNAL">Internal</option>
              <option value="EXTERNAL">External</option>
          </Select>
          <Select name="targetDepartmentId" label="Target Department" defaultValue={selectedTrainingForEdit?.targetDepartmentId || ""}>
              <option value="">Any Department</option>
              {departmentsData?.data?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
          </Select>
          <Input name="trainerName" label="Trainer Name" required defaultValue={selectedTrainingForEdit?.trainerName} />
          <div className="grid grid-cols-2 gap-4">
              <DatePicker type="date" name="trainingDate" label="Start Date *" required defaultValue={selectedTrainingForEdit?.trainingDate?.split('T')[0]} />
              <DatePicker type="date" name="trainingEndDate" label="End Date" defaultValue={selectedTrainingForEdit?.trainingEndDate?.split('T')[0]} />
            </div>
          <Input name="trainingLocation" label="Location" required defaultValue={selectedTrainingForEdit?.trainingLocation} />
          <Input type="number" name="trainingHours" label="Duration (Hours)" required min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} defaultValue={selectedTrainingForEdit?.trainingHours} />
          <Input type="number" name="trainingCost" label="Cost (₹)" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()} defaultValue={selectedTrainingForEdit?.trainingCost} />
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => {
              setIsModalOpen(false);
              setSelectedTrainingForEdit(null);
            }}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* Manage Training Details Modal */}
      {selectedTraining && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedTraining(null)} 
          title={`Manage: ${selectedTraining.trainingTopic}`}
          className="max-w-4xl w-full"
        >
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b dark:border-gray-800 pb-4">
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-gray-500">Trainer</p>
                  <p className="font-medium">{selectedTraining.trainerName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{selectedTraining.trainingEndDate ? formatDate(selectedTraining.trainingDate) + ' - ' + formatDate(selectedTraining.trainingEndDate) : formatDate(selectedTraining.trainingDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedTraining.trainingType}</p>
                </div>
              </div>
              
              
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Participants & Feedback</h3>
                <div className="flex gap-2">
                  <Select
                    aria-label="Employee to add to training"
                    className="p-1 border rounded-md text-sm bg-surface dark:border-gray-700"
                    value={newParticipantId}
                    onChange={(e) => setNewParticipantId(e.target.value)}
                  >
                    <option value="">Select Employee...</option>
                    {employeesData?.data?.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    disabled={!newParticipantId || addParticipantMutation.isPending}
                    onClick={() => {
                      addParticipantMutation.mutate({ id: selectedTraining.id, employeeId: newParticipantId });
                      setNewParticipantId('');
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {selectedTraining.participants?.length > 0 ? (
                <div className="overflow-x-auto border dark:border-gray-800 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-surface text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Department</th>
                        
                        <th className="px-4 py-3">Feedback</th>
                        
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800">
                      {selectedTraining.participants.map((p: any) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-medium">{p.employee?.firstName} {p.employee?.lastName}</td>
                          <td className="px-4 py-3 text-gray-500">{p.employee?.department?.name || 'N/A'}</td>
                          
                          <td className="px-4 py-3">
                            {p.feedbackRating ? (
                              <div className="flex items-center text-amber-500 text-xs">
                                {p.feedbackRating} <Star className="w-3 h-3 ml-1 fill-current" />
                              </div>
                            ) : '-'}
                          </td>
                          
                          <td className="px-4 py-3">
                             <Button variant="ghost" size="sm" onClick={() => setEditingParticipant(p)}>Edit</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-surface p-4 rounded-lg text-center">
                  No participants enrolled in this training yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setSelectedTraining(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Participant Edit Modal */}
      {editingParticipant && (
        <Modal isOpen={true} onClose={() => setEditingParticipant(null)} title={`Update: ${editingParticipant.employee?.firstName || ''} ${editingParticipant.employee?.lastName || ''}`}>
          <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const feedbackData: any = {};
              
              if (isAdminOrHR) {
                const tr = formData.get('trainerFeedbackRating');
                if (tr) feedbackData.trainerFeedbackRating = Number(tr);
                feedbackData.trainerFeedbackComments = formData.get('trainerFeedbackComments') || undefined;
              } else {
                const fr = formData.get('feedbackRating');
                if (fr) feedbackData.feedbackRating = Number(fr);
                feedbackData.feedbackComments = formData.get('feedbackComments') || undefined;
              }
  
              updateParticipantMutation.mutate({
                trainingId: selectedTraining.id,
                employeeId: editingParticipant.employeeId,
                assessmentData: undefined,
                feedbackData
              });
            }} className="space-y-4">
              
              {isAdminOrHR ? (
                <>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg space-y-4 mb-6">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Trainer Feedback (You)</h4>
                    <Input type="number" name="trainerFeedbackRating" label="Trainer Feedback Rating (1-5)" min="1" max="5" onKeyDown={(e) => e.key === '-' && e.preventDefault()} defaultValue={editingParticipant.trainerFeedbackRating} />
                    <Input name="trainerFeedbackComments" label="Trainer Feedback Comments" defaultValue={editingParticipant.trainerFeedbackComments} />
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg space-y-4 opacity-70">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Trainee Feedback</h4>
                    <Input type="number" disabled label="Trainee Feedback Rating (1-5)" defaultValue={editingParticipant.feedbackRating} />
                    <Input disabled label="Trainee Feedback Comments" defaultValue={editingParticipant.feedbackComments} />
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg space-y-4 mb-6">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Trainee Feedback (You)</h4>
                    <Input type="number" name="feedbackRating" label="Feedback Rating (1-5)" min="1" max="5" onKeyDown={(e) => e.key === '-' && e.preventDefault()} defaultValue={editingParticipant.feedbackRating} />
                    <Input name="feedbackComments" label="Feedback Comments" defaultValue={editingParticipant.feedbackComments} />
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg space-y-4 opacity-70">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Trainer Feedback</h4>
                    <Input type="number" disabled label="Trainer Feedback Rating (1-5)" defaultValue={editingParticipant.trainerFeedbackRating} />
                    <Input disabled label="Trainer Feedback Comments" defaultValue={editingParticipant.trainerFeedbackComments} />
                  </div>
                </>
              )}
  
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingParticipant(null)}>Cancel</Button>
                <Button type="submit" disabled={updateParticipantMutation.isPending}>Save Changes</Button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
















