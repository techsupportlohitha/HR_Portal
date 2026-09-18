import { formatDate, formatDateTime } from '@/utils/dateFormat';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { travelApi } from '@/api/travel';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FileUpload } from '@/components/ui/FileUpload';
import toast from 'react-hot-toast';
import { Select } from '@/components/ui/Select';
import { Plane, Plus, FileText, CheckCircle2, Download, IndianRupee, Receipt } from 'lucide-react';
import apiClient from '@/api/client'; // Need this for custom expense put
import { PageHeader } from '@/components/ui/PageHeader';
import { DatePicker } from '@/components/ui/DatePicker';

export default function TravelListPage() {
  const { user } = useAuth();
  const { canExport } = usePermissions();
  const queryClient = useQueryClient();
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'HR_EXECUTIVE';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['travel'],
    queryFn: () => travelApi.getAll().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => travelApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit travel request');
    }
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status, advance }: { id: string, status: string, advance: number }) => 
      travelApi.updateApproval(id, { approvalStatus: status, advanceApproved: advance }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      setApprovalModalOpen(false);
      toast.success('Approval updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update approval');
    }
  });

  const expenseMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => 
      apiClient.put(`/travel/${id}/expenses`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      setExpenseModalOpen(false);
      toast.success('Expenses submitted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit expenses');
    }
  });

  const settleMutation = useMutation({
    mutationFn: (id: string) => 
      apiClient.put(`/travel/${id}/settle`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      setSettleModalOpen(false);
      toast.success('Claim settled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to settle claim');
    }
  });


  const handleExport = () => {
    if (!data?.length) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Employee,Destination,Purpose,Start Date,End Date,Mode,Advance Requested,Advance Approved,Total Expense,Amount Payable,Approval Status,Settlement Status\n"
      + data.map((e: any) => 
          `${e.id},${e.employee?.firstName || ''} ${e.employee?.lastName || ''},${e.destination},${e.travelPurpose},${e.startDate},${e.endDate},${e.travelMode},${e.advanceRequested || 0},${e.advanceApproved || 0},${e.totalExpenseClaimed || 0},${e.amountPayable || 0},${e.approvalStatus},${e.settlementStatus}`
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Travel_Register.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { 
      header: 'Destination & Purpose', 
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center">
             <Plane className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <div className="font-semibold text-text-heading">{row.destination}</div>
            <div className="text-xs text-gray-500 max-w-[200px] truncate">{row.travelPurpose}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'Employee', 
      accessor: (row: any) => `${row.employee?.firstName || ''} ${row.employee?.lastName || ''}`,
      className: 'text-gray-600 dark:text-gray-400'
    },
    { 
      header: 'Dates', 
      accessor: (row: any) => `${formatDate(row.startDate)} - ${formatDate(row.endDate)}`,
      className: 'text-gray-600 dark:text-gray-400 text-sm'
    },
    { 
      header: 'Approval', 
      accessor: (row: any) => {
        if (row.approvalStatus === 'APPROVAL_APPROVED') return <Badge variant="success">Approved</Badge>;
        if (row.approvalStatus === 'APPROVAL_REJECTED') return <Badge variant="danger">Rejected</Badge>;
        return <Badge variant="warning">Pending</Badge>;
      }
    },
    { 
      header: 'Settlement', 
      accessor: (row: any) => {
        if (row.settlementStatus === 'SETTLED') return <Badge variant="success">Settled</Badge>;
        if (row.settlementStatus === 'SUBMITTED') return <Badge variant="warning">Verifying</Badge>;
        return <Badge variant="default">Unsettled</Badge>;
      }
    },
    { 
      header: 'Action', 
      accessor: (row: any) => (
        <div className="flex items-center gap-2">
          {row.approvalStatus === 'APPROVAL_PENDING' && isAdminOrHR && (
            <button 
              className="p-1 text-gray-400 hover:text-green-500 transition-colors" 
              title="Review Request"
              onClick={() => {
                setSelectedRequest(row);
                setApprovalModalOpen(true);
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}

          {row.approvalStatus === 'APPROVAL_APPROVED' && row.settlementStatus === 'UNSETTLED' && row.employee?.id === user?.employeeId && (
            <button 
              className="p-1 text-gray-400 hover:text-indigo-500 transition-colors" 
              title="Submit Expenses"
              onClick={() => {
                setSelectedRequest(row);
                setExpenseModalOpen(true);
              }}
            >
              <Receipt className="w-4 h-4" />
            </button>
          )}

          {row.settlementStatus === 'SUBMITTED' && isAdminOrHR && (
            <button 
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors" 
              title="Settle Claim"
              onClick={() => {
                setSelectedRequest(row);
                setSettleModalOpen(true);
              }}
            >
              <IndianRupee className="w-4 h-4" />
            </button>
          )}
        </div>
      ) 
    },
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('billUpload') as File;
    const payload: any = {
      travelPurpose: formData.get('travelPurpose'),
      destination: formData.get('destination'),
      startDate: new Date(formData.get('startDate') as string).toISOString(),
      endDate: new Date(formData.get('endDate') as string).toISOString(),
      travelMode: formData.get('travelMode'),
      advanceRequested: Number(formData.get('advanceRequested')) || 0,
    };
    // Send file name as string for now if present, real implementation would upload to S3
    if (file && file.size > 0) {
      payload.billUpload = file.name;
    }
    createMutation.mutate(payload);
  };

  const handleExpenseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('billUpload') as File;
    const payload: any = {
      hotelExpense: Number(formData.get('hotelExpense')) || 0,
      foodAllowance: Number(formData.get('foodAllowance')) || 0,
      localConveyance: Number(formData.get('localConveyance')) || 0,
      otherExpenses: Number(formData.get('otherExpenses')) || 0,
    };
    if (file && file.size > 0) {
      payload.billUpload = file.name;
    }
    expenseMutation.mutate({
      id: selectedRequest.id,
      payload
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Travel Requests"
        description="Manage travel approvals and expense settlements."
        actions={<div className="flex gap-2">
          {canExport('travel') && <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export Register
          </Button>}
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Travel Request
          </Button>
        </div>}
      />


      {isAdminOrHR && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
            <p className="text-sm text-text-muted mb-1 font-medium">Pending Approval</p>
            <p className="text-2xl font-bold text-text-heading">{data.filter((d:any) => d.approvalStatus === 'APPROVAL_PENDING').length}</p>
          </div>
          <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
            <p className="text-sm text-text-muted mb-1 font-medium">Awaiting Settlement</p>
            <p className="text-2xl font-bold text-text-heading">{data.filter((d:any) => d.settlementStatus === 'SUBMITTED').length}</p>
          </div>
          <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
            <p className="text-sm text-text-muted mb-1 font-medium">Total Settled Expenses</p>
            <p className="text-2xl font-bold text-text-heading">
              ₹{data.filter((d:any) => d.settlementStatus === 'SETTLED').reduce((sum:number, d:any) => sum + Number(d.totalExpenseClaimed || 0), 0)}
            </p>
          </div>
        </div>
      )}

      <div className="animate-in fade-in">
        {isLoading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : !data || data.length === 0 ? (
          <EmptyState 
            icon={Plane}
            title="No travel requests"
            description="You don't have any travel requests or approvals pending."
            actionLabel="Create Request"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <DataTable 
            columns={columns} 
            data={data} 
            keyField="id" 
            emptyMessage="No travel requests found."
          />
        )}
      </div>

      {/* New Request Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Travel Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="destination" label="Destination" placeholder="e.g. New York, NY" required />
          <Input name="travelPurpose" label="Business Purpose" required />
          <div className="grid grid-cols-2 gap-4">
            <DatePicker name="startDate" label="Start Date" type="date" required />
            <DatePicker name="endDate" label="End Date" type="date" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="travel-mode" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Travel Mode</label>
              <Select id="travel-mode" name="travelMode" className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
                <option value="AIR">Flight (Air)</option>
                <option value="TRAIN">Train</option>
                <option value="ROAD">Bus / Cab (Road)</option>
                <option value="OWN_VEHICLE">Personal Vehicle</option>
              </Select>
            </div>
            <Input name="advanceRequested" label="Advance Required (₹)" type="number" step="1" min="0" defaultValue={0} onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} />
          </div>
          <FileUpload name="billUpload" label="Upload Attachment (Optional)" />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Approval Modal */}
      <Modal isOpen={approvalModalOpen} onClose={() => setApprovalModalOpen(false)} title="Review Travel Request">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Please review this travel request. Specify the approved advance amount if applicable.</p>
          
          <div className="bg-surface p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Employee:</span> <span className="font-medium text-text-heading">{selectedRequest?.employee?.firstName} {selectedRequest?.employee?.lastName}</span></div>
              <div><span className="text-gray-500">Destination:</span> <span className="font-medium text-text-heading">{selectedRequest?.destination}</span></div>
              <div><span className="text-gray-500">Advance Requested:</span> <span className="font-medium text-text-heading">₹{selectedRequest?.advanceRequested || 0}</span></div>
            </div>
          </div>

          <Input id="advanceApproved" label="Advance Approved (₹)" type="number" step="1" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} defaultValue={selectedRequest?.advanceRequested || 0} />
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={() => setApprovalModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => approveMutation.mutate({ id: selectedRequest.id, status: 'REJECTED', advance: 0 })}
              disabled={approveMutation.isPending}
            >
              Reject
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                const adv = Number((document.getElementById('advanceApproved') as HTMLInputElement).value);
                approveMutation.mutate({ id: selectedRequest.id, status: 'APPROVED', advance: adv });
              }}
              disabled={approveMutation.isPending}
            >
              Approve
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submit Expenses Modal */}
      <Modal isOpen={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Submit Travel Expenses">
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">Fill in your expenses for this trip. The advance you received (if any) will be automatically deducted during settlement.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <Input name="hotelExpense" label="Hotel Expense (₹)" type="number" step="1" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} required defaultValue={0} />
            <Input name="foodAllowance" label="Food Allowance (₹)" type="number" step="1" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} required defaultValue={0} />
            <Input name="localConveyance" label="Local Conveyance (₹)" type="number" step="1" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} required defaultValue={0} />
            <Input name="otherExpenses" label="Other Expenses (₹)" type="number" step="1" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} defaultValue={0} />
          </div>

          <FileUpload name="billUpload" label="Upload Bills/Receipts" required />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={expenseMutation.isPending}>
              {expenseMutation.isPending ? 'Submitting...' : 'Submit Expenses'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Settle Claim Modal */}
      <Modal isOpen={settleModalOpen} onClose={() => setSettleModalOpen(false)} title="Verify & Settle Claim">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Verify the submitted expenses and bills. Finalize the settlement.</p>
          
          <div className="bg-surface p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Employee:</span> <span className="font-medium text-text-heading">{selectedRequest?.employee?.firstName} {selectedRequest?.employee?.lastName}</span></div>
              <div><span className="text-gray-500 block mb-1">Attached Files:</span> 
                <div className="flex flex-col gap-1">
                  {selectedRequest?.billUpload ? selectedRequest.billUpload.split(',').map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm break-all">
                      View File {i + 1}
                    </a>
                  )) : <span className="text-gray-400 text-sm">No files attached</span>}
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-border pt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between col-span-2"><span className="text-gray-500">Total Expenses Claimed:</span> <span className="font-medium">₹{selectedRequest?.totalExpenseClaimed || 0}</span></div>
              <div className="flex justify-between col-span-2"><span className="text-gray-500">Advance Approved:</span> <span className="font-medium">₹{selectedRequest?.advanceApproved || 0}</span></div>
              <div className="flex justify-between col-span-2 pt-2 border-t border-slate-border text-base font-bold text-text-heading">
                <span>Net Amount (Payable/Recoverable):</span> 
                <span>₹{(selectedRequest?.totalExpenseClaimed || 0) - (selectedRequest?.advanceApproved || 0)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={() => setSettleModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => settleMutation.mutate(selectedRequest.id)}
              disabled={settleMutation.isPending}
            >
              Confirm Settlement
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}




