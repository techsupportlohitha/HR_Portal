import { formatDate, formatDateTime } from '@/utils/dateFormat';
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Search, Plus, FileText, CheckCircle, Eye, Users, CalendarDays, Tag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesApi } from '@/api/policies';
import apiClient from '@/api/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'HR_POLICY', label: 'HR Policies' },
  { value: 'LEAVE_POLICY', label: 'Leave Policy' },
  { value: 'ATTENDANCE_POLICY', label: 'Attendance Policy' },
  { value: 'TRAVEL_POLICY', label: 'Travel Policy' },
  { value: 'CODE_OF_CONDUCT', label: 'Code of Conduct' },
  { value: 'EMPLOYEE_HANDBOOK', label: 'Employee Handbook' },
  { value: 'RECRUITMENT_POLICY', label: 'Recruitment Policy' },
  { value: 'PERFORMANCE_POLICY', label: 'Performance Management Policy' },
  { value: 'TRAINING_POLICY', label: 'Training Policy' },
  { value: 'POSH', label: 'POSH Policy' },
  { value: 'SAFETY', label: 'Safety Policy' },
  { value: 'CIRCULAR', label: 'Circulars' },
  { value: 'FORM', label: 'HR Forms' },
  { value: 'SOP', label: 'SOPs' }
];

export default function PolicyListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');

  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  const { data: policiesData, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: () => policiesApi.getAll().then(res => res.data),
  });

  const { data: acksData } = useQuery({
    queryKey: ['my-acknowledgements'],
    queryFn: () => policiesApi.getMyAcknowledgements().then(res => res.data),
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['policy-acknowledgements', selectedPolicy?.id],
    queryFn: () => policiesApi.getAcknowledgements(selectedPolicy!.id).then(res => res.data),
    enabled: !!selectedPolicy && isAdminOrHR && recordsModalOpen,
  });

  const createMutation = useMutation({
    mutationFn: policiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Document uploaded successfully');
      setIsModalOpen(false);
      setFile(null);
    },
    onError: () => toast.error('Failed to upload document')
  });

  const ackMutation = useMutation({
    mutationFn: policiesApi.acknowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-acknowledgements'] });
      toast.success('Document acknowledged');
    },
    onError: () => toast.error('Failed to acknowledge document')
  });

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a file');

    try {
      setIsUploading(true);
      const formData = new FormData(e.currentTarget);
      const uploadData = new FormData();
      uploadData.append('files', file);

      const res = await apiClient.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data.urls.length > 0) {
        createMutation.mutate({
          policyName: formData.get('policyName'),
          policyCategory: formData.get('policyCategory'),
          versionNumber: formData.get('versionNumber') || 'v1.0',
          acknowledgementRequired: formData.get('acknowledgementRequired') === 'on',
          filePath: res.data.urls[0]
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const hasAcknowledged = (policyId: string) => {
    return acksData?.some((a: any) => a.policyId === policyId && a.acknowledgementStatus === 'ACKNOWLEDGED');
  };

  const filteredData = (policiesData || []).filter((p: any) => p.policyName.toLowerCase().includes(search.toLowerCase()));

  const getCategoryLabel = (category: string) =>
    CATEGORIES.find((item) => item.value === category)?.label || category;

  const getFileExtension = (path: string) => {
    const extension = path?.split('.').pop()?.split('?')[0];
    return extension && extension.length <= 5 ? extension.toUpperCase() : 'FILE';
  };

  const recordsColumns = [
    { header: 'Employee Name', accessor: (row: any) => `${row.employee?.firstName} ${row.employee?.lastName}` },
    { header: 'Date Acknowledged', accessor: (row: any) => row.acknowledgementDate ? formatDateTime(row.acknowledgementDate) : 'N/A' },
    { header: 'Status', accessor: 'acknowledgementStatus' }
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Documents & Policies"
        description="View, download, and acknowledge HR documents."
        actions={isAdminOrHR && (
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Upload Document
          </Button>
        )}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input 
            aria-label="Search documents"
            placeholder="Search documents..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface border border-slate-300 dark:border-slate-600 shadow-sm rounded-lg text-sm focus:outline-none transition-all"
          />
        </div>
        {!isLoading && (
          <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {filteredData.length} {filteredData.length === 1 ? 'document' : 'documents'}
          </p>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : filteredData.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-surface px-6 text-center dark:border-slate-700 ">
          <FileText className="mb-4 h-10 w-10 text-gray-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">No documents found</h2>
          <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
            {search ? 'Try a different document name or clear the search.' : 'Uploaded HR documents will appear here.'}
          </p>
          {search && (
            <Button variant="outline" className="mt-4" onClick={() => setSearch('')}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <section aria-label="Documents and policies" className="space-y-3">
          {filteredData.map((policy: any) => {
            const acknowledged = hasAcknowledged(policy.id);

            return (
              <article
                key={policy.id}
                className="group flex flex-col gap-5 rounded-xl border border-slate-200 bg-surface p-4 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-700  dark:hover:border-slate-600 md:grid md:grid-cols-[minmax(0,1fr)_15rem_auto] md:items-center md:gap-6 md:p-5"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                    <span className="mt-0.5 text-[10px] font-bold tracking-wide">{getFileExtension(policy.filePath)}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-base font-semibold leading-6 text-navy-900 dark:text-white">
                      {policy.policyName}
                    </h2>
                    <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-gray-700 bg-surface dark:text-gray-300">
                      <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{getCategoryLabel(policy.policyCategory)}</span>
                    </span>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 md:border-l md:border-t-0 md:py-1 md:pl-6">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Version</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{policy.versionNumber}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Published
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{formatDate(policy.uploadDate)}</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 md:justify-end md:border-l md:border-t-0 md:py-1 md:pl-6">
                  {policy.acknowledgementRequired && acknowledged && (
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-300">
                      <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Acknowledged
                    </div>
                  )}

                  <a
                    href={policy.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-surface dark:text-navy-900 dark:hover:bg-gray-100 md:flex-none"
                    aria-label={`View ${policy.policyName}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" /> View
                  </a>

                  {policy.acknowledgementRequired && !acknowledged && (
                    <button
                      type="button"
                      onClick={() => ackMutation.mutate(policy.id)}
                      disabled={ackMutation.isPending}
                      className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-300 md:flex-none"
                      aria-label={`Acknowledge ${policy.policyName}`}
                    >
                      Acknowledge
                    </button>
                  )}

                  {isAdminOrHR && policy.acknowledgementRequired && (
                    <button
                      type="button"
                      onClick={() => { setSelectedPolicy(policy); setRecordsModalOpen(true); }}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-800"
                      aria-label={`View acknowledgement records for ${policy.policyName}`}
                    >
                      <Users className="h-4 w-4" aria-hidden="true" /> Records
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Upload Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload HR Document">
        <form onSubmit={handleUpload} className="space-y-4">
          <Input name="policyName" label="Document Name" required />
          <Select name="policyCategory" label="Category" required>
              <option value="">Select Category...</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Input name="versionNumber" label="Version (e.g., v1.0)" defaultValue="v1.0" required />
          
          <div className="flex items-center gap-2 py-2">
            <input type="checkbox" name="acknowledgementRequired" id="ack" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <label htmlFor="ack" className="text-sm text-gray-700 dark:text-gray-300">Requires Employee Acknowledgement</label>
          </div>

          <Input type="file" label="Attachment (PDF, DOCX)" required onChange={(e) => setFile(e.target.files?.[0] || null)} />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-border mt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isUploading || createMutation.isPending}>
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Records Modal */}
      {selectedPolicy && (
        <Modal isOpen={recordsModalOpen} onClose={() => setRecordsModalOpen(false)} title={`Acknowledgements: ${selectedPolicy.policyName} (${selectedPolicy.versionNumber})`}>
          <div className="mb-4">
            <p className="text-sm text-gray-500">Date Published: {formatDate(selectedPolicy.uploadDate)}</p>
          </div>
          {recordsLoading ? (
            <LoadingSpinner />
          ) : (
            <DataTable 
              caption={`Acknowledgements for ${selectedPolicy.policyName}`}
              columns={recordsColumns} 
              data={recordsData || []} 
              keyField="id" 
              emptyMessage="No acknowledgements recorded yet."
            />
          )}
        </Modal>
      )}
    </div>
  );
}









