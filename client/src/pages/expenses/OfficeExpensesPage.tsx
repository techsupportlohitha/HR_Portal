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
import { hasAdminAccess } from '@/utils/roles';

export default function OfficeExpensesPage() {
 const { user } = useAuth();
 const { canExport, canAdd, canApprove } = usePermissions();
 const queryClient = useQueryClient();
 const isAdminOrHR = hasAdminAccess(user?.role);
 const mayCreateExpense = canAdd('expenses');
 const mayApproveExpense = canApprove('expenses');
 
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [detailsModalOpen, setDetailsModalOpen] = useState(false);
 const [selectedExpense, setSelectedExpense] = useState<any>(null);
 const openDetails = (expense: any) => {
   setSelectedExpense(expense);
   setDetailsModalOpen(true);
 };
 const money = (value: any) => `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
 const statusLabel = (value: string | undefined) => value?.replace(/_/g, ' ') || '—';

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
 <button type="button" className="font-semibold text-text-heading capitalize hover:underline text-left" aria-label={`View ${row.category.replace(/_/g, ' ').toLowerCase()} expense details`} onClick={(event) => { event.stopPropagation(); openDetails(row); }}>{row.category.replace(/_/g, ' ').toLowerCase()}</button>
 <div className="text-xs text-gray-500 max-w-[200px] truncate">{row.description}</div>
 </div>
 </div>
 )
 },
 { 
 header: 'Amount', 
 accessor: (row: any) => <span className="font-medium"><IndianRupee className="w-3 h-3 inline mr-0.5 -mt-0.5"/>{row.amount}</span>
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
 <a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="text-indigo-500 hover:underline text-sm">
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
 <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
 {row.status === 'PENDING' && mayApproveExpense && (
 <>
 <button 
 className="group flex items-center justify-start gap-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all duration-300 overflow-hidden w-8 hover:w-28" 
 title="Approve"
 onClick={() => statusMutation.mutate({ id: row.id, status: 'APPROVED' })}
 disabled={statusMutation.isPending}
 >
 <CheckCircle2 className="w-4 h-4 shrink-0" />
 <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Approve</span>
 </button>
 <button 
 className="group flex items-center justify-start gap-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-300 overflow-hidden w-8 hover:w-24" 
 title="Reject"
 onClick={() => statusMutation.mutate({ id: row.id, status: 'REJECTED' })}
 disabled={statusMutation.isPending}
 >
 <XCircle className="w-4 h-4 shrink-0" />
 <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Reject</span>
 </button>
 </>
 )}
 {row.status === 'APPROVED' && mayApproveExpense && (
 <button 
 className="group flex items-center justify-start gap-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-300 overflow-hidden w-8 hover:w-[100px]" 
 title="Mark as Paid"
 onClick={() => statusMutation.mutate({ id: row.id, status: 'PAID' })}
 disabled={statusMutation.isPending}
 >
 <IndianRupee className="w-4 h-4 shrink-0" />
 <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Pay Now</span>
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
 {canExport('expenses') && <Button variant="outline" onClick={handleExport} className="gap-2">
 <Download className="w-4 h-4" /> Export Register
 </Button>}
 {mayCreateExpense && <Button onClick={() => setIsModalOpen(true)} className="gap-2">
 <Plus className="w-4 h-4" /> Submit Expense
 </Button>}
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
<IndianRupee className="w-5 h-5 inline mr-1 -mt-1"/>{data.filter((d:any) => d.status === 'PAID').reduce((sum:number, d:any) => sum + Number(d.amount), 0)}
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
 actionLabel={mayCreateExpense ? "Submit Expense" : undefined}
 onAction={mayCreateExpense ? () => setIsModalOpen(true) : undefined}
 />
 ) : (
 <DataTable 
 columns={columns} 
 data={data} 
 keyField="id" 
 emptyMessage="No expenses found."
 onRowClick={openDetails}
 />
 )}
 </div>

 <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Office Expense Details" className="max-w-2xl">
   {selectedExpense && <div className="space-y-5">
     <section>
       <h3 className="font-semibold text-text-heading mb-3">Expense information</h3>
       <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
         {[
           ['Category', statusLabel(selectedExpense.category)],
           ['Description', selectedExpense.description || '—'],
           ['Amount', money(selectedExpense.amount)],
           ['Expense date', formatDate(selectedExpense.expenseDate)],
           ['Submitted by', [selectedExpense.submittedBy?.firstName, selectedExpense.submittedBy?.lastName].filter(Boolean).join(' ') || '—'],
           ['Request ID', selectedExpense.id],
           ['Created', formatDateTime(selectedExpense.createdAt)],
           ['Last updated', formatDateTime(selectedExpense.updatedAt)],
         ].map(([label, value]) => <div key={label}><dt className="text-text-muted">{label}</dt><dd className="text-text-heading break-words whitespace-pre-wrap">{value}</dd></div>)}
       </dl>
     </section>
     <section className="border-t border-slate-border pt-4">
       <h3 className="font-semibold text-text-heading mb-3">Approval & payment</h3>
       <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
         <div><dt className="text-text-muted">Status</dt><dd className="text-text-heading">{statusLabel(selectedExpense.status)}</dd></div>
         <div><dt className="text-text-muted">Approved by</dt><dd className="text-text-heading">{[selectedExpense.approvedBy?.firstName, selectedExpense.approvedBy?.lastName].filter(Boolean).join(' ') || '—'}</dd></div>
       </dl>
     </section>
     <section className="border-t border-slate-border pt-4">
       <h3 className="font-semibold text-text-heading mb-2">Receipt & attachments</h3>
       {selectedExpense.billUpload ? <ul className="space-y-2 text-sm">{selectedExpense.billUpload.split(',').filter(Boolean).map((file: string, index: number) => <li key={index}><a className="text-brand-primary underline break-all" href={file.trim()} target="_blank" rel="noopener noreferrer">View receipt {index + 1}</a></li>)}</ul> : <p className="text-sm text-text-muted">No receipt attached.</p>}
     </section>
     <div className="flex justify-end border-t border-slate-border pt-4"><Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Close</Button></div>
   </div>}
 </Modal>

 <Modal isOpen={isModalOpen && mayCreateExpense} onClose={() => setIsModalOpen(false)} title="Submit Office Expense">
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <DatePicker name="expenseDate" label="Date incurred" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
 <div className="flex flex-col">
 <label htmlFor="office-expense-category" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1  text-gray-700 dark:text-gray-300 mb-1">Category</label>
 <Select id="office-expense-category" name="category" className="w-full rounded-[1.25rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface px-4 py-3 text-[13px] focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
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
 <FileUpload name="billUpload" label="Upload Receipt" module="expenses" action="add" />
 
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

