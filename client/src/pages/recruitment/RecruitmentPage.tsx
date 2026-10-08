import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentApi } from '@/api/recruitment';
import { departmentsApi } from '@/api/departments';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Plus, Briefcase, Users, ChevronLeft, ChevronRight, Download, CheckCircle2, Pencil } from 'lucide-react';

export default function RecruitmentPage() {
  const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const queryClient = useQueryClient();
 const { canExport, canEdit, canAdd } = usePermissions();
 
 const [isReqModalOpen, setIsReqModalOpen] = useState(false);
 const [selectedReq, setSelectedReq] = useState<any>(null);
 const [editingReq, setEditingReq] = useState<any>(null);
 const [showHistory, setShowHistory] = useState(false);
 
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
 const historyRequisitions = data.filter((req: any) => ['CLOSED', 'JOINED_REJECTED'].includes(req.status));
 const visibleRequisitions = data.filter((req: any) =>
   showHistory
     ? ['CLOSED', 'JOINED_REJECTED'].includes(req.status)
     : !['CLOSED', 'JOINED_REJECTED'].includes(req.status)
 );
 const routeReqId = searchParams.get('reqId');
 const routeCandidateId = searchParams.get('candidateId');
 const routeCandidate = candidatesData.find((candidate: any) => candidate.id === routeCandidateId);
 const candidateStages = [
   { value: 'TELEPHONIC', label: 'Telephonic' },
   { value: 'HR_INTERVIEW', label: 'HR interview' },
   { value: 'TECHNICAL', label: 'Technical Interview' },
   { value: 'MANAGEMENT', label: 'Management interview' },
   { value: 'OFFER', label: 'Offer' },
 ];
 const candidateStageIndex = routeCandidate
   ? Math.max(0, candidateStages.findIndex((stage) => stage.value === routeCandidate.interviewRound))
   : -1;

 React.useEffect(() => {
   if (!routeReqId || !data.length) return;
   const requisition = data.find((req: any) => req.id === routeReqId);
   if (requisition) setSelectedReq(requisition);
 }, [routeReqId, data]);

 React.useEffect(() => {
   if (routeReqId && !routeCandidateId) {
     navigate(`/recruitment/interviews?reqId=${encodeURIComponent(routeReqId)}`, { replace: true });
   }
 }, [routeReqId, routeCandidateId, navigate]);

 React.useEffect(() => {
   if (searchParams.get('tab') === 'vacancies') {
     setSelectedReq(null);
   }
 }, [searchParams]);

 const createReqMutation = useMutation({
 mutationFn: (payload: any) => recruitmentApi.createRequisition(payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['requisitions'] });
 setIsReqModalOpen(false);
 setEditingReq(null);
 }
 });

 const updateReqMutation = useMutation({
 mutationFn: ({ id, payload }: { id: string, payload: any }) => recruitmentApi.updateRequisition(id, payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['requisitions'] });
 setIsReqModalOpen(false);
 setEditingReq(null);
 }
 });

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

 const handleSubmitReq = (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 const formData = new FormData(e.currentTarget);
 const payload = {
 positionTitle: formData.get('positionTitle'),
 departmentId: formData.get('departmentId'),
 location: formData.get('location'),
 numberOfVacancies: Number(formData.get('numberOfVacancies'))
 };

 if (editingReq) {
 updateReqMutation.mutate({ id: editingReq.id, payload });
 } else {
 createReqMutation.mutate({ ...payload, requisitionDate: new Date().toISOString() });
 }
 };

 return (
 <div className="space-y-6 flex flex-col h-full h-[calc(100vh-6rem)]">
 <PageHeader
 title="Recruitment Tracker"
 description="Manage job openings and scheduled interviews."
 actions={<div className="flex items-center gap-3">
 {canAdd('recruitment') && (
 <Button onClick={() => { setEditingReq(null); setIsReqModalOpen(true); }} className="gap-2">
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
 <Button variant="ghost" onClick={() => navigate('/recruitment?tab=vacancies')} className="px-2">
 <ChevronLeft className="w-5 h-5" />
 </Button>
 <div>
 <h2 className="text-xl font-bold text-navy-900 dark:text-white">{selectedReq.positionTitle}</h2>
 <p className="text-sm text-gray-500 dark:text-gray-400">{routeCandidate ? 'Candidate stage tracker' : 'HR Funnel Layout Structure'}</p>
 </div>
 </div>
 {canExport('recruitment') && (
 <Button variant="outline" onClick={handleExportCandidates}>
 <Download className="w-4 h-4 mr-2" /> Export Register
 </Button>
 )}
 </div>
 {routeCandidateId ? (
   isCandidatesLoading ? <div className="py-12"><LoadingSpinner /></div> : routeCandidate ? (
     <section className="space-y-5 rounded-xl border border-slate-border bg-surface p-5 shadow-sm" aria-label={`${routeCandidate.candidateName} recruitment stages`}>
       <div className="flex flex-wrap items-start justify-between gap-4">
         <div>
           <h3 className="text-lg font-bold text-navy-900 dark:text-white">{routeCandidate.candidateName}</h3>
           <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{routeCandidate.email || 'No email provided'}{routeCandidate.interviewDate ? ` · Interview ${new Date(routeCandidate.interviewDate).toLocaleString()}` : ''}</p>
         </div>
       </div>
       <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
         {candidateStages.map((stage, index) => {
           const complete = index < candidateStageIndex;
           const current = index === candidateStageIndex;
           return (
             <li key={stage.value} className={`rounded-xl border p-4 ${current ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30' : complete ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-slate-border bg-surface'}`}>
               <div className="flex items-center gap-2">
                 <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${current ? 'bg-orange-500 text-white' : complete ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                   {complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                 </span>
                 <span className="font-semibold text-navy-900 dark:text-white">{stage.label}</span>
               </div>
               <p className="mt-2 pl-9 text-xs text-gray-500 dark:text-gray-400">{current ? 'Current stage' : complete ? 'Completed' : 'Upcoming'}</p>
             </li>
           );
         })}
       </ol>
       {routeCandidate.selectionStatus && <p className="text-sm text-gray-600 dark:text-gray-300">Selection status: <span className="font-semibold">{routeCandidate.selectionStatus.replaceAll('_', ' ')}</span></p>}
     </section>
   ) : <div className="rounded-xl border border-dashed border-slate-border p-8 text-center text-gray-500">Candidate not found for this requisition.</div>
 ) : <div className="py-12"><LoadingSpinner /></div>}
 </div>
 ) : isLoading ? (
 <div className="py-12"><LoadingSpinner /></div>
 ) : (
 <section aria-label="Job requisitions" className="space-y-3">
 <div className="flex w-fit max-w-full items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Vacancy status">
   <button type="button" role="tab" aria-selected={!showHistory} onClick={() => setShowHistory(false)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${!showHistory ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-300' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'}`}>
     Open vacancies ({data.length - historyRequisitions.length})
   </button>
   <button type="button" role="tab" aria-selected={showHistory} onClick={() => setShowHistory(true)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${showHistory ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-300' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'}`}>
     History ({historyRequisitions.length})
   </button>
 </div>
 <p className="border-b border-slate-border px-4 py-2 text-xs text-gray-500 dark:border-slate-border dark:text-gray-400 sm:hidden">
 Tap an opening to view its scheduled interviews.
 </p>
 {visibleRequisitions.length === 0 ? (
 <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-border bg-surface px-6 text-center text-gray-600 dark:text-gray-400">
 {showHistory ? 'No closed vacancies in history.' : 'No open vacancies found.'}
 </div>
 ) : visibleRequisitions.map((req: any) => (
 <article
 key={req.id}
 role="button"
 tabIndex={0}
 onClick={() => navigate(`/recruitment/interviews?reqId=${encodeURIComponent(req.id)}`)}
 onKeyDown={(event) => {
 if (event.key === 'Enter' || event.key === ' ') {
 event.preventDefault();
 navigate(`/recruitment/interviews?reqId=${encodeURIComponent(req.id)}`);
 }
 }}
 className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-slate-border bg-surface p-4 shadow-sm transition duration-200 hover:border-slate-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:hover:border-slate-600 md:grid md:grid-cols-[minmax(0,1fr)_15rem_auto] md:items-center md:gap-6 md:p-5"
 aria-label={`View scheduled interviews for ${req.positionTitle}`}
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

 <dl className="grid grid-cols-2 gap-4 border-t border-slate-border pt-4 dark:border-slate-border md:border-l md:border-t-0 md:py-1 md:pl-6">
 <div>
 <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Candidates</dt>
 <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200"><Users className="h-4 w-4" aria-hidden="true" />{req._count?.candidates || 0}</dd>
 </div>
 <div>
 <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Vacancies</dt>
 <dd className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{req.numberOfVacancies}</dd>
 </div>
 </dl>

 <div className="flex items-center justify-between gap-3 border-t border-slate-border pt-4 dark:border-slate-border md:justify-end md:border-l md:border-t-0 md:py-1 md:pl-6">
 {canEdit('recruitment') && (
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="gap-1.5"
 onClick={(event) => {
 event.stopPropagation();
 setEditingReq(req);
 setIsReqModalOpen(true);
 }}
 onKeyDown={(event) => event.stopPropagation()}
 aria-label={`Edit ${req.positionTitle} requisition`}
 >
 <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
 </Button>
 )}
 <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 dark:text-primary-300">
 View interviews <ChevronRight className="h-4 w-4" aria-hidden="true" />
 </span>
 </div>
 </article>
 ))}
 </section>
 )}
 </div>

 <Modal isOpen={isReqModalOpen} onClose={() => { setIsReqModalOpen(false); setEditingReq(null); }} title={editingReq ? "Edit Job Requisition" : "New Job Requisition"}>
 <form onSubmit={handleSubmitReq} className="space-y-4">
 <Input name="positionTitle" label="Job Title" placeholder="e.g. Senior Frontend Engineer" required defaultValue={editingReq?.positionTitle} />
 <div className="flex flex-col">
 <label htmlFor="requisition-department" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1  text-gray-700 dark:text-gray-300 mb-1">Department</label>
 <Select id="requisition-department" name="departmentId" required defaultValue={editingReq?.departmentId} className="w-full rounded-[1.25rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface px-4 py-3 text-[13px] focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] bg-surface text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
 <option value="">Select Department...</option>
 {deptData?.data?.map((dept: any) => (
 <option key={dept.id} value={dept.id}>{dept.name}</option>
 ))}
 </Select>
 </div>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <Input name="location" label="Location" placeholder="e.g. Remote" required defaultValue={editingReq?.location} />
 <Input name="numberOfVacancies" label="Vacancies" type="number" min="1" required defaultValue={editingReq?.numberOfVacancies} />
 </div>
 
 <div className="flex justify-end space-x-2 pt-4">
 <Button type="button" variant="outline" onClick={() => { setIsReqModalOpen(false); setEditingReq(null); }}>Cancel</Button>
 <Button type="submit" disabled={createReqMutation.isPending || updateReqMutation.isPending}>
 {createReqMutation.isPending || updateReqMutation.isPending ? 'Submitting...' : (editingReq ? 'Update Requisition' : 'Create Requisition')}
 </Button>
 </div>
 </form>
 </Modal>

 
 </div>
 );
}







