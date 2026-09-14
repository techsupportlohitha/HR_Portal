import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentApi } from '@/api/recruitment';
import { departmentsApi } from '@/api/departments';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { UserSearch, Plus, Briefcase, Users, ChevronLeft, Download } from 'lucide-react';
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

  const columns = [
    { 
      header: 'Position', 
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center">
             <Briefcase className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="font-semibold text-navy-900 dark:text-white">{row.positionTitle}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{row.location}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'Department', 
      accessor: (row: any) => row.department?.name,
      className: 'text-gray-600 dark:text-gray-400 dark:text-gray-500'
    },
    { 
      header: 'Vacancies', 
      accessor: 'numberOfVacancies',
      className: 'text-gray-600 dark:text-gray-400 dark:text-gray-500'
    },
    { 
      header: 'Candidates', 
      accessor: (row: any) => (
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 dark:text-gray-500">
           <Users className="w-4 h-4" /> {row._count?.candidates || 0}
        </div>
      )
    },
    { 
      header: 'Status', 
      accessor: (row: any) => {
        if (row.status === 'OPEN') return <Badge variant="success">Open</Badge>;
        if (row.status === 'CLOSED') return <Badge variant="default">Closed</Badge>;
        if (row.status === 'ON_HOLD') return <Badge variant="warning">On Hold</Badge>;
        return <Badge variant="default">{row.status}</Badge>;
      }
    },
  ];

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
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Candidate Name</th>
                      <th className="px-6 py-4 font-medium">Email</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
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
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:hidden">
              Tap a requisition to open its pipeline. Key status details stay visible on this screen.
            </p>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Position</th>
                  <th className="hidden px-6 py-4 sm:table-cell">Department</th>
                  <th className="hidden px-6 py-4 md:table-cell">Vacancies</th>
                  <th className="px-6 py-4">Candidates</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.map((req: any) => (
                  <tr 
                    key={req.id} 
                    onClick={() => { setSelectedBoardReqId(req.id); setViewMode('board'); }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-navy-900 dark:text-white">{req.positionTitle}</p>
                          <p className="text-xs text-gray-500">{req.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 text-gray-600 dark:text-gray-300 sm:table-cell">{req.department?.name || 'N/A'}</td>
                    <td className="hidden px-6 py-4 text-gray-600 dark:text-gray-300 md:table-cell">{req.numberOfVacancies}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {req._count?.candidates || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        req.status === 'REQUIREMENT' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' :
                        req.status === 'SOURCING' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        req.status === 'SCREENING' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        req.status === 'TELEPHONIC' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' :
                        req.status === 'HR_INTERVIEW' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                        req.status === 'TECHNICAL' ? 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400' :
                        req.status === 'MANAGEMENT' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' :
                        req.status === 'SELECTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' :
                        req.status === 'OFFER' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                        req.status === 'JOINED_REJECTED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {req.status === 'JOINED_REJECTED' ? 'Completed' : req.status?.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No requisitions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
            <Select id="requisition-department" name="departmentId" required className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
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
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase font-semibold">Vacancies</span>
                <p className="text-lg font-bold text-navy-900 dark:text-white">{selectedReq?.numberOfVacancies}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase font-semibold">Current Stage</span>
                <p className="text-lg font-bold text-navy-900 dark:text-white">{selectedReq?.status?.replace('_', ' ')}</p>
              </div>
            </div>
         </div>
      </Modal>
    </div>
  );
}
