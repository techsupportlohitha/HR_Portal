import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingApi } from '@/api/training';
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
import { Plus, Download, BookOpen, Clock, IndianRupee, Star, CheckCircle, Calendar, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import apiClient from '@/api/client';

export default function TrainingListPage() {
  const { user } = useAuth();
  const { canExport } = usePermissions();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const [selectedTrainingForEdit, setSelectedTrainingForEdit] = useState<any>(null);
  const [editingParticipant, setEditingParticipant] = useState<any>(null);
  const [newParticipantId, setNewParticipantId] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
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
          `${escapeCsv(t.id)},${escapeCsv(t.trainingTopic)},${escapeCsv(t.trainingType)},${escapeCsv(t.status || 'PENDING')},${escapeCsv(t.trainerName)},${escapeCsv(new Date(t.trainingDate).toLocaleDateString())},${escapeCsv(t.trainingLocation)},${t.trainingHours || 0},${t.trainingCost || 0}`
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
    { header: 'Date', accessor: (row: any) => new Date(row.trainingDate).toLocaleDateString() },
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
    
    if (!payload.targetDepartmentId) {
      delete payload.targetDepartmentId;
    }
    
    if (selectedTrainingForEdit) {
      updateMutation.mutate({ id: selectedTrainingForEdit.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderCalendarView = () => {
    const sorted = [...(trainingData?.data || [])].sort((a, b) => new Date(a.trainingDate).getTime() - new Date(b.trainingDate).getTime());
    return (
      <div className="space-y-4">
         {sorted.map((t: any) => (
           <div key={t.id} className="flex gap-6 items-start p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
             <div className="w-24 text-center shrink-0 border-r border-gray-100 dark:border-gray-800 pr-6">
               <div className="text-sm text-gray-500 font-bold uppercase">{new Date(t.trainingDate).toLocaleString('default', { month: 'short' })}</div>
               <div className="text-4xl font-black text-primary-600">{new Date(t.trainingDate).getDate()}</div>
               <div className="text-xs text-gray-400 mt-1">{new Date(t.trainingDate).getFullYear()}</div>
             </div>
             <div className="flex-1">
               <div className="flex justify-between items-start">
                 <h4 className="text-xl font-bold">{t.trainingTopic}</h4>
                 <Button variant="outline" size="sm" onClick={() => setSelectedTraining(t)}>Manage</Button>
               </div>
               <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mt-4">
                 <span className="flex items-center gap-1.5"><Users className="w-4 h-4"/> {t.trainerName || 'TBD'}</span>
                 <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {t.trainingHours} Hrs</span>
                 <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> {t.trainingLocation || 'Remote'}</span>
                 <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-semibold">{t.trainingType}</span>
               </div>
             </div>
           </div>
         ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Training Sessions"
        description="Plan learning, track attendance, and measure outcomes."
        actions={<div className="flex gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>List</button>
            <button onClick={() => setViewMode('calendar')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>Calendar</button>
          </div>
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

      {!isStatsLoading && statsData?.data && (
        <div className="space-y-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
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

              <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
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

              <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
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

              <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <Card>
               <CardContent className="p-4">
                  <h3 className="text-sm font-bold text-gray-500 mb-3">Department-wise Training</h3>
                  <div className="space-y-2">
                    {statsData.data.departmentWise?.length === 0 ? <p className="text-sm text-gray-400">No data</p> : null}
                    {statsData.data.departmentWise?.map((d: any) => (
                      <div key={d.name} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{d.name}</span>
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{d.value} Trainings</span>
                      </div>
                    ))}
                  </div>
               </CardContent>
             </Card>
             <Card>
               <CardContent className="p-4">
                  <h3 className="text-sm font-bold text-gray-500 mb-3">Employee-wise Training</h3>
                  <div className="space-y-2">
                    {statsData.data.employeeWise?.length === 0 ? <p className="text-sm text-gray-400">No data</p> : null}
                    {statsData.data.employeeWise?.map((e: any) => (
                      <div key={e.name} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{e.name}</span>
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{e.value} Sessions</span>
                      </div>
                    ))}
                  </div>
               </CardContent>
             </Card>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : viewMode === 'calendar' ? (
        renderCalendarView()
      ) : (
        <DataTable columns={columns} data={trainingData?.data || []} keyField="id" />
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
          <Input type="date" name="trainingDate" label="Training Date" required defaultValue={selectedTrainingForEdit?.trainingDate?.split('T')[0]} />
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
        <Modal isOpen={true} onClose={() => setSelectedTraining(null)} title={`Manage: ${selectedTraining.trainingTopic}`}>
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b dark:border-gray-800 pb-4">
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-gray-500">Trainer</p>
                  <p className="font-medium">{selectedTraining.trainerName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{new Date(selectedTraining.trainingDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedTraining.trainingType}</p>
                </div>
              </div>
              {isAdminOrHR && selectedTraining.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate({ id: selectedTraining.id, status: 'APPROVED' })}>Approve</Button>
                  <Button size="sm" variant="danger" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate({ id: selectedTraining.id, status: 'REJECTED' })}>Reject</Button>
                </div>
              )}
              {selectedTraining.status !== 'PENDING' && (
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedTraining.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedTraining.status}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Participants & Feedback</h3>
                <div className="flex gap-2">
                  <select 
                    aria-label="Employee to add to training"
                    className="p-1 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700" 
                    value={newParticipantId}
                    onChange={(e) => setNewParticipantId(e.target.value)}
                  >
                    <option value="">Select Employee...</option>
                    {employeesData?.data?.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
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
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Attendance</th>
                        <th className="px-4 py-3">Assessment</th>
                        <th className="px-4 py-3">Feedback</th>
                        <th className="px-4 py-3 text-center">Certificate</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800">
                      {selectedTraining.participants.map((p: any) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-medium">{p.employee?.firstName} {p.employee?.lastName}</td>
                          <td className="px-4 py-3 text-gray-500">{p.employee?.department?.name || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.attendanceStatus === 'TRAINING_PRESENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {p.attendanceStatus === 'TRAINING_PRESENT' ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{p.assessmentScore ? `${p.assessmentScore}%` : '-'}</td>
                          <td className="px-4 py-3">
                            {p.feedbackRating ? (
                              <div className="flex items-center text-amber-500 text-xs">
                                {p.feedbackRating} <Star className="w-3 h-3 ml-1 fill-current" />
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {p.certificateIssued ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : '-'}
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
                <div className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
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
            
            const assessmentData = {
              attendanceStatus: formData.get('attendanceStatus'),
              assessmentScore: formData.get('assessmentScore') ? Number(formData.get('assessmentScore')) : undefined,
              certificateIssued: formData.get('certificateIssued') === 'on'
            };

            const feedbackData = {
              feedbackRating: formData.get('feedbackRating') ? Number(formData.get('feedbackRating')) : undefined,
              feedbackComments: formData.get('feedbackComments') || undefined
            };

            updateParticipantMutation.mutate({
              trainingId: selectedTraining.id,
              employeeId: editingParticipant.employeeId,
              assessmentData,
              feedbackData
            });
          }} className="space-y-4">
            <Select name="attendanceStatus" label="Attendance" defaultValue={editingParticipant.attendanceStatus}>
                <option value="TRAINING_PRESENT">Present</option>
                <option value="TRAINING_ABSENT">Absent</option>
            </Select>
            <Input type="number" name="assessmentScore" label="Assessment Score (%)" min="1" max="100" onKeyDown={(e) => e.key === '-' && e.preventDefault()} defaultValue={editingParticipant.assessmentScore} />
            <div className="flex items-center gap-2">
              <input type="checkbox" name="certificateIssued" id="certificateIssued" defaultChecked={editingParticipant.certificateIssued} />
              <label htmlFor="certificateIssued" className="text-sm">Certificate Issued</label>
            </div>
            <hr className="my-4 dark:border-gray-800" />
            <Input type="number" name="feedbackRating" label="Feedback Rating (1-5)" min="1" max="5" onKeyDown={(e) => e.key === '-' && e.preventDefault()} defaultValue={editingParticipant.feedbackRating} />
            <Input name="feedbackComments" label="Feedback Comments" defaultValue={editingParticipant.feedbackComments} />
            
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
