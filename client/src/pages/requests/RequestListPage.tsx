import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from '@/api/requests';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Settings } from 'lucide-react';
import apiClient from '@/api/client';
import { PageHeader } from '@/components/ui/PageHeader';

const REQUEST_TYPES = [
  { value: 'HR_QUERY', label: 'HR Query' },
  { value: 'LEAVE_QUERY', label: 'Leave-related query' },
  { value: 'SALARY_QUERY', label: 'Salary query' },
  { value: 'DOCUMENT_REQUEST', label: 'Document request' },
  { value: 'EXPERIENCE_LETTER', label: 'Experience letter request' },
  { value: 'PAYSLIP', label: 'Payslip request' },
  { value: 'JOINING_DOCUMENTS', label: 'Joining document request' },
  { value: 'GENERAL', label: 'General HR request' },
  { value: 'OTHER', label: 'Other request' }
];

export default function RequestListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);

  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: isAdminOrHR ? requestsApi.getAll : requestsApi.getMyRequests,
  });

  const { data: admins } = useQuery({
    queryKey: ['hr-users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/requests/staff');
      return data;
    },
    enabled: isAdminOrHR
  });

  const createMutation = useMutation({
    mutationFn: requestsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Request submitted successfully');
      setIsModalOpen(false);
    },
    onError: () => toast.error('Failed to submit request')
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, payload }: any) => requestsApi.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Ticket status updated');
      setManageModalOpen(false);
    },
    onError: () => toast.error('Failed to update ticket')
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedToId }: any) => requestsApi.assign(id, { assignedToId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Ticket assigned');
    },
    onError: () => toast.error('Failed to assign ticket')
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return <Badge variant="default">Submitted</Badge>;
      case 'ASSIGNED': return <Badge variant="info">Assigned</Badge>;
      case 'IN_PROGRESS': return <Badge variant="warning">In Progress</Badge>;
      case 'RESOLVED': return <Badge variant="success">Resolved</Badge>;
      case 'TICKET_CLOSED': return <Badge variant="default">Closed</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  const getReqTypeLabel = (val: string) => {
    return REQUEST_TYPES.find(t => t.value === val)?.label || val;
  };

  const columns = [
    { header: 'Ticket Number', accessor: 'id' },
    { header: 'Type', accessor: (row: any) => getReqTypeLabel(row.requestType) },
    { header: 'Description', accessor: 'description' },
    { header: 'Date', accessor: (row: any) => formatDate(row.createdAt) },
    { header: 'Status', accessor: (row: any) => getStatusBadge(row.status) },
  ];

  if (isAdminOrHR) {
    columns.splice(2, 0, { header: 'Employee', accessor: (row: any) => `${row.employee?.firstName || ''} ${row.employee?.lastName || ''}` });
    columns.push({
      header: 'Actions',
      accessor: (row: any) => (
        <Button variant="outline" size="sm" onClick={() => { setSelectedReq(row); setManageModalOpen(true); }}>
          <Settings className="w-4 h-4 mr-2" /> Manage
        </Button>
      )
    });
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate(Object.fromEntries(formData.entries()));
  };

  const handleUpdateStatus = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateStatusMutation.mutate({
      id: selectedReq.id,
      payload: Object.fromEntries(formData.entries())
    });
  };

  return (
    <div className="p-6">
      <PageHeader
        title="HR Helpdesk"
        description="Submit, track, and resolve workplace requests."
        actions={<Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable caption="HR helpdesk requests" columns={columns} data={requestsData?.data || []} keyField="id" />
      )}

      {/* New Request Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit HR Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select name="requestType" label="Request Type" required>
              <option value="">Select request type...</option>
              {REQUEST_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
          </Select>
          <Input name="description" label="Description" required />
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>Submit</Button>
          </div>
        </form>
      </Modal>

      {/* Manage Request Modal (Admin/HR) */}
      {selectedReq && (
        <Modal isOpen={manageModalOpen} onClose={() => setManageModalOpen(false)} title={`Manage Ticket: ${selectedReq.id}`}>
          <div className="mb-6 p-4 bg-surface/50 rounded-lg">
            <p className="text-sm"><strong>Employee:</strong> {selectedReq.employee?.firstName} {selectedReq.employee?.lastName}</p>
            <p className="text-sm mt-2"><strong>Query:</strong> {selectedReq.description}</p>
          </div>

          <div className="space-y-4">
            <Select
                label="Assign Ticket To"
                value={selectedReq.assignedToId || ''} 
                onChange={(e) => assignMutation.mutate({ id: selectedReq.id, assignedToId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {admins?.data?.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.employee?.firstName || 'Admin'} {u.employee?.lastName || ''} ({u.email})</option>
                ))}
            </Select>

            <form onSubmit={handleUpdateStatus} className="space-y-4 pt-4 border-t border-slate-border">
              <Select name="status" label="Update Status" defaultValue={selectedReq.status} required>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="TICKET_CLOSED">Closed</option>
              </Select>
              
              <Input name="responseNotes" label="Response Notes" defaultValue={selectedReq.responseNotes || ''} />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="submit" disabled={updateStatusMutation.isPending}>Save Status</Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}



