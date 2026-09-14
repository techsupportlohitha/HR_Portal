import { formatDate, formatDateTime } from '@/utils/dateFormat';
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Search, Plus, FileText, Download, CheckCircle, Eye, Users } from 'lucide-react';
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

  const columns = [
    { 
      header: 'Document Name', 
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
             <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <span className="font-semibold text-navy-900 dark:text-white">{row.policyName}</span>
        </div>
      )
    },
    { header: 'Category', accessor: (row: any) => CATEGORIES.find(c => c.value === row.policyCategory)?.label || row.policyCategory, className: 'text-gray-600 dark:text-gray-400' },
    { header: 'Version', accessor: 'versionNumber', className: 'text-gray-600 dark:text-gray-400' },
    { 
      header: 'Published On', 
      accessor: (row: any) => formatDate(row.uploadDate),
      className: 'text-gray-600 dark:text-gray-400' 
    },
    {
      header: 'Actions',
      accessor: (row: any) => (
        <div className="flex items-center gap-2">
          <a href={row.filePath} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-xs font-medium" title="View / Download">
             <Eye className="w-3.5 h-3.5" /> View
          </a>
          
          {row.acknowledgementRequired && (
            hasAcknowledged(row.id) ? (
              <span className="p-2 bg-green-50 text-green-700 rounded flex items-center gap-1 text-xs font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Acknowledged
              </span>
            ) : (
              <button 
                onClick={() => ackMutation.mutate(row.id)}
                disabled={ackMutation.isPending}
                className="p-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded flex items-center gap-1 text-xs font-medium"
              >
                Acknowledge
              </button>
            )
          )}

          {isAdminOrHR && row.acknowledgementRequired && (
            <button 
              onClick={() => { setSelectedPolicy(row); setRecordsModalOpen(true); }}
              className="p-2 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded flex items-center gap-1 text-xs font-medium ml-2"
            >
              <Users className="w-3.5 h-3.5" /> Records
            </button>
          )}
        </div>
      ) 
    },
  ];

  const filteredData = (policiesData || []).filter((p: any) => p.policyName.toLowerCase().includes(search.toLowerCase()));

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

      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input 
            aria-label="Search documents"
            placeholder="Search documents..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-lg text-sm focus:outline-none transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable 
          caption="Documents and policies"
          columns={columns} 
          data={filteredData} 
          keyField="id" 
          emptyMessage="No documents found."
        />
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

          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
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
