import { formatDate, formatDateTime } from '@/utils/dateFormat';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '@/api/expenses';
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
import { Select } from '@/components/ui/Select';
import { Wallet, Plus, CheckCircle2, Download, XCircle, IndianRupee } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DatePicker } from '@/components/ui/DatePicker';

export default function OfficeExpensesPage() {
  const { user } = useAuth();
  const { canExport } = usePermissions();
  const queryClient = useQueryClient();
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'HR_EXECUTIVE';
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['office-expenses'],
    queryFn: () => expensesApi.getAll().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => expensesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
      setIsModalOpen(false);
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => expensesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expenses'] });
    }
  });


  const handleExport = () => {
    if (!data?.length) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Employee,Date,Category,Description,Amount,Status\n"
      + data.map((e: any) => 
          `${e.id},${e.submittedBy?.firstName || ''} ${e.submittedBy?.lastName || ''},${e.expenseDate},${e.category},${e.description},${e.amount},${e.status}`
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Office_Expenses_Register.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { 
      header: 'Category & Description', 
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-teal-50 flex items-center justify-center">
             <Wallet className="w-4 h-4 text-teal-500" />
          </div>
          <div>
            <div className="font-semibold text-text-heading capitalize">{row.category.replace('_', ' ').toLowerCase()}</div>
            <div className="text-xs text-gray-500 max-w-[200px] truncate">{row.description}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'Amount', 
      accessor: (row: any) => <span className="font-medium">₹{row.amount}</span>
    },
    { 
      header: 'Submitted By', 
      accessor: (row: any) => `${row.submittedBy?.firstName || ''} ${row.submittedBy?.lastName || ''}`,
      className: 'text-gray-600 dark:text-gray-400'
    },
    { 
      header: 'Date', 
      accessor: (row: any) => formatDate(row.expenseDate),
      className: 'text-gray-600 dark:text-gray-400 text-sm'
    },
    { 
      header: 'Receipt(s)', 
      accessor: (row: any) => row.billUpload ? (
        <div className="flex flex-col">
          {row.billUpload.split(',').map((url: string, i: number) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline text-sm">
              File {i + 1}
            </a>
          ))}
        </div>
      ) : <span className="text-gray-400 text-sm">None</span>
    },
    { 
      header: 'Status', 
      accessor: (row: any) => {
        if (row.status === 'APPROVED') return <Badge variant="success">Approved</Badge>;
        if (row.status === 'REJECTED') return <Badge variant="danger">Rejected</Badge>;
        if (row.status === 'PAID') return <Badge variant="default">Paid</Badge>;
        return <Badge variant="warning">Pending</Badge>;
      }
    },
    { 
      header: 'Action', 
      accessor: (row: any) => (
        <div className="flex items-center gap-2">
          {row.status === 'PENDING' && isAdminOrHR && (
            <>
              <button 
                className="p-1 text-gray-400 hover:text-green-500 transition-colors" 
                title="Approve"
                onClick={() => statusMutation.mutate({ id: row.id, status: 'APPROVED' })}
                disabled={statusMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button 
                className="p-1 text-gray-400 hover:text-red-500 transition-colors" 
                title="Reject"
                onClick={() => statusMutation.mutate({ id: row.id, status: 'REJECTED' })}
                disabled={statusMutation.isPending}
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {row.status === 'APPROVED' && isAdminOrHR && (
            <button 
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors" 
              title="Mark as Paid"
              onClick={() => statusMutation.mutate({ id: row.id, status: 'PAID' })}
              disabled={statusMutation.isPending}
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
    createMutation.mutate({
      expenseDate: new Date(formData.get('expenseDate') as string).toISOString(),
      category: formData.get('category'),
      description: formData.get('description'),
      amount: Number(formData.get('amount')),
      billUpload: formData.get('billUpload')
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Office Expenses"
        description="Log and track petty cash and office reimbursements."
        actions={<div className="flex gap-2">
          {canExport('reports') && <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export Register
          </Button>}
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Submit Expense
          </Button>
        </div>}
      />

      {isAdminOrHR && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
            <p className="text-sm text-text-muted mb-1 font-medium">Pending Approval</p>
            <p className="text-2xl font-bold text-text-heading">{data.filter((d:any) => d.status === 'PENDING').length}</p>
          </div>
          <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
            <p className="text-sm text-text-muted mb-1 font-medium">Awaiting Payout</p>
            <p className="text-2xl font-bold text-text-heading">{data.filter((d:any) => d.status === 'APPROVED').length}</p>
          </div>
          <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
            <p className="text-sm text-text-muted mb-1 font-medium">Total Paid (All Time)</p>
            <p className="text-2xl font-bold text-text-heading">
              ₹{data.filter((d:any) => d.status === 'PAID').reduce((sum:number, d:any) => sum + Number(d.amount), 0)}
            </p>
          </div>
        </div>
      )}

      <div className="animate-in fade-in">
        {isLoading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : !data || data.length === 0 ? (
          <EmptyState 
            icon={Wallet}
            title="No expenses logged"
            description="There are no office expenses found."
            actionLabel="Submit Expense"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <DataTable 
            columns={columns} 
            data={data} 
            keyField="id" 
            emptyMessage="No expenses found."
          />
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit Office Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DatePicker name="expenseDate" label="Date incurred" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            <div className="flex flex-col">
              <label htmlFor="office-expense-category" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <Select id="office-expense-category" name="category" className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
                <option value="STATIONERY">Stationery</option>
                <option value="FOOD_SNACKS">Food & Snacks</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="UTILITIES">Utilities</option>
                <option value="IT_SOFTWARE">IT / Software</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
          </div>
          
          <Input name="description" label="Description" placeholder="e.g. Printer ink cartridges" required />
          <Input name="amount" label="Amount (₹)" type="number" step="1" min="0" defaultValue={0} onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} required />
          <FileUpload name="billUpload" label="Upload Receipt" />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting...' : 'Submit Expense'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

