import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentApi } from '@/api/recruitment';
import { departmentsApi } from '@/api/departments';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Plus, Briefcase, Users, ChevronLeft, ChevronRight, Download, Search, PhoneCall, UserCheck, Award, TrendingUp, Calendar, Clock, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { KanbanBoard } from './KanbanBoard';

export default function RecruitmentPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { canExport } = usePermissions();
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';
  
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedBoardReqId, setSelectedBoardReqId] = useState<string | null>(null);
  
  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.getAll,
  });

  const { data: reqResponse, isLoading } = useQuery({
    queryKey: ['requisitions'],
    queryFn: recruitmentApi.getRequisitions,
  });
  const { data: candidatesResponse, isLoading: isCandidatesLoading } = useQuery({
    queryKey: ['candidates', selectedReq?.id],
    queryFn: () => recruitmentApi.getCandidates(selectedReq!.id),
    enabled: !!selectedReq,
  });
  const candidatesData = candidatesResponse?.data || [];

  
  const data = reqResponse?.data || [];

  const createReqMutation = useMutation({
    mutationFn: (payload: any) => recruitmentApi.createRequisition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      setIsReqModalOpen(false);
    }
  });

  const updateReqStatusMutation = useMutation({
    mutationFn: ({ id, col }: any) => recruitmentApi.updateRequisitionStatus(id, { status: col }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
    }
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    updateReqStatusMutation.mutate({ id, col: newStatus });
  };

  const handleExportCandidates = () => {
    if (!candidatesData?.length) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Email,Mobile,Qualification,Total Exp (Yrs),Current Co.,Current Salary,Expected Salary,Notice Period (Days),Screening Status,Interview Status,Offer Status\n"
      + candidatesData.map((c: any) => 
          `"${c.candidateName}","${c.email}","${c.mobile}","${c.qualification || ''}",${c.totalExperience || 0},"${c.currentCompany || ''}",${c.currentSalary || 0},${c.expectedSalary || 0},${c.noticePeriod || 0},"${c.screeningStatus}","${c.selectionStatus}","${c.offerStatus}"`
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Candidates_${selectedReq?.positionTitle?.replace(/\s+/g, '_') || 'Pipeline'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusLabel = (status: string) => {
    if (status === 'JOINED_REJECTED') return 'Completed';
    return status?.replace('_', ' ') || 'Unknown';
  };

  const getStatusClasses = (status: string) => {
    if (status === 'REQUIREMENT') return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400';
    if (status === 'SOURCING') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    if (status === 'SCREENING') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
    if (status === 'TELEPHONIC') return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400';
    if (status === 'HR_INTERVIEW') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    if (status === 'TECHNICAL') return 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400';
    if (status === 'MANAGEMENT') return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
    if (status === 'SELECTED') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
    if (status === 'OFFER') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    if (status === 'JOINED_REJECTED') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    return 'bg-gray-100 text-gray-800 bg-surface dark:text-gray-300';
  };

  const handleSubmitReq = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createReqMutation.mutate({
      positionTitle: formData.get('positionTitle'),
      departmentId: formData.get('departmentId'),
      location: formData.get('location'),
      numberOfVacancies: Number(formData.get('numberOfVacancies')),
      requisitionDate: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6 flex flex-col h-full h-[calc(100vh-6rem)]">
      <PageHeader
        title="Recruitment Tracker"
        description="Manage job requisitions and candidate pipelines."
        actions={<div className="flex items-center gap-3">
          {viewMode === 'board' && (
             <Button variant="outline" onClick={() => setViewMode('list')}>Back to List</Button>
          )}
          {isAdminOrHR && viewMode === 'list' && (
            <Button onClick={() => setIsReqModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> New Requisition
            </Button>
          )}
        </div>}
      />

      <div className="animate-in fade-in flex-1 min-h-0 h-full">
        {selectedReq ? (

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setSelectedReq(null)} className="px-2">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-navy-900 dark:text-white">{selectedReq.positionTitle}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">HR Funnel Layout Structure</p>
                </div>
              </div>
              {canExport('recruitment') && (
                <Button variant="outline" onClick={handleExportCandidates}>
                  <Download className="w-4 h-4 mr-2" /> Export Register
                </Button>
              )}
            </div>
            {isCandidatesLoading ? (
              <div className="py-12"><LoadingSpinner /></div>
            ) : (
              <div className="bg-surface rounded-xl shadow-sm border border-slate-border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Candidate Name</th>
                      <th className="px-6 py-4 font-medium">Email</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-border">
                    {candidatesData?.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 font-medium text-navy-900 dark:text-white">{c.candidateName}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.email}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.selectionStatus || c.screeningStatus || 'APPLIED'}</td>
                      </tr>
                    ))}
                    {!candidatesData?.length && (
                      <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No candidates found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : viewMode === 'list' ? (
          <section aria-label="Job requisitions" className="space-y-3">
            <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:hidden">
              Tap a requisition to open its pipeline. Key status details stay visible on this screen.
            </p>
            {data.length === 0 ? (
              <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-surface px-6 text-center text-gray-600 dark:border-slate-700  dark:text-gray-400">
                No requisitions found.
              </div>
            ) : data.map((req: any) => (
              <article
                key={req.id}
                role="button"
                tabIndex={0}
                onClick={() => { setSelectedBoardReqId(req.id); setViewMode('board'); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedBoardReqId(req.id);
                    setViewMode('board');
                  }
                }}
                className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-slate-200 bg-surface p-4 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-slate-700  dark:hover:border-slate-600 md:grid md:grid-cols-[minmax(0,1fr)_15rem_auto] md:items-center md:gap-6 md:p-5"
                aria-label={`Open pipeline for ${req.positionTitle}`}
              >
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Briefcase className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-base font-semibold leading-6 text-navy-900 dark:text-white">{req.positionTitle}</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{req.location}</p>
                    <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">{req.department?.name || 'Department not specified'}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 md:border-l md:border-t-0 md:py-1 md:pl-6">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Candidates</dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200"><Users className="h-4 w-4" aria-hidden="true" />{req._count?.candidates || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Vacancies</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{req.numberOfVacancies}</dd>
                  </div>
                </dl>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:justify-end md:border-l md:border-t-0 md:py-1 md:pl-6">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(req.status)}`}>
                    {getStatusLabel(req.status)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 dark:text-primary-300">
                    Open pipeline <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <KanbanBoard 
            items={data.filter((req: any) => req.id === selectedBoardReqId).map((req: any) => ({
              id: req.id,
              title: req.positionTitle,
              subtitle: req.department?.name || req.location,
              status: req.status, // maps directly to the Kanban stages
              originalData: req
            }))} 
            onStatusChange={handleStatusChange} 
            onItemClick={(item) => setSelectedReq(item.originalData)}
          />
        )}
      </div>

      <Modal isOpen={isReqModalOpen} onClose={() => setIsReqModalOpen(false)} title="New Job Requisition">
        <form onSubmit={handleSubmitReq} className="space-y-4">
          <Input name="positionTitle" label="Job Title" placeholder="e.g. Senior Frontend Engineer" required />
          <div className="flex flex-col">
            <label htmlFor="requisition-department" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
            <Select id="requisition-department" name="departmentId" required className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-surface text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
              <option value="">Select Department...</option>
              {deptData?.data?.map((dept: any) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input name="location" label="Location" placeholder="e.g. Remote" required />
            <Input name="numberOfVacancies" label="Vacancies" type="number" min="1" required />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsReqModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createReqMutation.isPending}>
              {createReqMutation.isPending ? 'Submitting...' : 'Create Requisition'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!selectedReq} onClose={() => setSelectedReq(null)} title="Requisition Details">
         <div className="space-y-4 pb-4">
            <div>
              <h3 className="text-xl font-bold text-navy-900 dark:text-white">{selectedReq?.positionTitle}</h3>
              <p className="text-sm font-medium text-gray-500 mt-1">{selectedReq?.department?.name} • {selectedReq?.location}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-surface rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase font-semibold">Vacancies</span>
                <p className="text-lg font-bold text-navy-900 dark:text-white">{selectedReq?.numberOfVacancies}</p>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase font-semibold">Current Stage</span>
                <p className="text-lg font-bold text-navy-900 dark:text-white">{selectedReq?.status?.replace('_', ' ')}</p>
              </div>
            </div>
         </div>
      </Modal>

      
    </div>
  );
}






