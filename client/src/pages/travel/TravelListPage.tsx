import { AttachmentLink } from '@/components/ui/AttachmentLink';
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
import { hasAdminAccess } from '@/utils/roles';

const TRAVEL_MODE_LABELS: Record<string, string> = {
 AIR: 'Flight', TRAIN: 'Train', ROAD: 'Bus or cab', OWN_VEHICLE: 'Personal vehicle',
};

export default function TravelListPage() {
 const { user } = useAuth();
 const { canExport, canAdd, canEdit, canApprove } = usePermissions();
 const queryClient = useQueryClient();
 const isAdminOrHR = hasAdminAccess(user?.role);
 const mayCreateTravel = canAdd('travel');
 const mayEditTravel = canEdit('travel');
 const mayApproveTravel = canApprove('travel');
 
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [approvalModalOpen, setApprovalModalOpen] = useState(false);
 const [expenseModalOpen, setExpenseModalOpen] = useState(false);
 const [settleModalOpen, setSettleModalOpen] = useState(false);
 const [detailsModalOpen, setDetailsModalOpen] = useState(false);
 const [selectedRequest, setSelectedRequest] = useState<any>(null);

 const { data, isLoading } = useQuery({
 queryKey: ['travel'],
 queryFn: () => travelApi.getAll().then(res => res.data),
 });

 const detailsQuery = useQuery({
   queryKey: ['travel-detail', selectedRequest?.id],
   queryFn: () => travelApi.getById(selectedRequest.id).then(res => res.data),
   enabled: detailsModalOpen && Boolean(selectedRequest?.id),
 });
 const details = detailsQuery.data;
 const openDetails = (request: any) => {
   setSelectedRequest(request);
   setDetailsModalOpen(true);
 };
 const money = (value: any) => `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
 const expenseTotal = details
   ? [details.hotelExpense, details.foodAllowance, details.localConveyance, details.otherExpenses]
       .reduce((sum: number, value: any) => sum + Number(value ?? 0), 0)
   : 0;
 const personName = (person: any) => person ? [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || '—' : '—';
 const statusLabel = (value: string | undefined) => value?.replace(/^APPROVAL_/, '').replace(/_/g, ' ') || '—';
 const travelModeLabel = (value: string | undefined) => TRAVEL_MODE_LABELS[value || ''] || statusLabel(value);
 const netAmount = expenseTotal - Number(details?.advanceApproved ?? 0);

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
 + "ID,Employee,Destination,Purpose,Start Date,End Date,Mode,Amount Required,Legacy Advance Requested,Advance Approved,Total Expense,Amount Payable,Approval Status,Settlement Status\n"
 + data.map((e: any) => 
 `${e.id},${e.employee?.firstName || ''} ${e.employee?.lastName || ''},${e.destination},${e.travelPurpose},${e.startDate},${e.endDate},${e.travelMode},${e.amountRequired ?? ''},${e.advanceRequested || 0},${e.advanceApproved || 0},${e.totalExpenseClaimed || 0},${e.amountPayable || 0},${e.approvalStatus},${e.settlementStatus}`
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
 <button type="button" className="font-semibold text-text-heading hover:underline text-left" aria-label={`View travel request to ${row.destination}`} onClick={(event) => { event.stopPropagation(); openDetails(row); }}>{row.destination}</button>
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
 <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
 {row.approvalStatus === 'APPROVAL_PENDING' && mayApproveTravel && (
 <button 
 className="group flex items-center justify-start gap-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all duration-300 overflow-hidden w-8 hover:w-[110px]" 
 title="Review Request"
 onClick={() => {
 setSelectedRequest(row);
 setApprovalModalOpen(true);
 }}
 >
 <CheckCircle2 className="w-4 h-4 shrink-0" />
 <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Review</span>
 </button>
 )}

 {row.approvalStatus === 'APPROVAL_APPROVED' && row.settlementStatus === 'UNSETTLED' && row.employee?.id === user?.employeeId && mayCreateTravel && (
 <button 
 className="group flex items-center justify-start gap-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-300 overflow-hidden w-8 hover:w-[130px]" 
 title="Submit Expenses"
 onClick={() => {
 setSelectedRequest(row);
 setExpenseModalOpen(true);
 }}
 >
 <Receipt className="w-4 h-4 shrink-0" />
 <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Submit Bills</span>
 </button>
 )}

 {row.settlementStatus === 'SUBMITTED' && mayEditTravel && (
 <button 
 className="group flex items-center justify-start gap-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-300 overflow-hidden w-8 hover:w-[110px]" 
 title="Settle Claim"
 onClick={() => {
 setSelectedRequest(row);
 setSettleModalOpen(true);
 }}
 >
 <IndianRupee className="w-4 h-4 shrink-0" />
 <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Settle</span>
 </button>
 )}
 </div>
 ) 
 },
 ];

 const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 const formData = new FormData(e.currentTarget);
 const billUpload = formData.get('billUpload');
 const payload: any = {
 travelPurpose: formData.get('travelPurpose'),
 destination: formData.get('destination'),
 startDate: new Date(formData.get('startDate') as string).toISOString(),
 endDate: new Date(formData.get('endDate') as string).toISOString(),
 travelMode: formData.get('travelMode'),
 amountRequired: Number(formData.get('amountRequired')),
 };
 if (typeof billUpload === 'string' && billUpload) {
 payload.billUpload = billUpload;
 }
 createMutation.mutate(payload);
 };

 const handleExpenseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 const formData = new FormData(e.currentTarget);
 const billUpload = formData.get('billUpload');
 const payload: any = {
 hotelExpense: Number(formData.get('hotelExpense')) || 0,
 foodAllowance: Number(formData.get('foodAllowance')) || 0,
 localConveyance: Number(formData.get('localConveyance')) || 0,
 otherExpenses: Number(formData.get('otherExpenses')) || 0,
 };
 if (typeof billUpload === 'string' && billUpload) {
 payload.billUpload = billUpload;
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
 {mayCreateTravel && <Button onClick={() => setIsModalOpen(true)} className="gap-2">
 <Plus className="w-4 h-4" /> New Travel Request
 </Button>}
 </div>}
 />


 {isAdminOrHR && data && (
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
 ₹{data.filter((d:any) => d.settlementStatus === 'SETTLED').reduce((sum:number, d:any) => {
   const expenses = [d.hotelExpense, d.foodAllowance, d.localConveyance, d.otherExpenses];
   // Components remain authoritative when older saved totals were concatenated.
   const total = expenses.some(value => value != null)
     ? expenses.reduce((subtotal:number, value:any) => subtotal + Number(value ?? 0), 0)
     : Number(d.totalExpenseClaimed ?? 0);
   return sum + total;
 }, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
 </p>
 </div>
 <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
 <p className="text-sm text-text-muted mb-1 font-medium">Total Due to Pay</p>
 <p className="text-2xl font-bold text-text-heading">
 ₹{data.filter((d:any) => d.settlementStatus === 'SUBMITTED').reduce((sum:number, d:any) => {
   const expenses = [d.hotelExpense, d.foodAllowance, d.localConveyance, d.otherExpenses];
   const total = expenses.some(value => value != null)
     ? expenses.reduce((subtotal:number, value:any) => subtotal + Number(value ?? 0), 0)
     : Number(d.totalExpenseClaimed ?? 0);
   return sum + Math.max(0, total - Number(d.advanceApproved ?? 0));
 }, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
 </p>
 <p className="mt-1 text-xs text-text-muted">Submitted claims awaiting settlement</p>
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
 actionLabel={mayCreateTravel ? "Create Request" : undefined}
 onAction={mayCreateTravel ? () => setIsModalOpen(true) : undefined}
 />
 ) : (
 <DataTable 
 columns={columns} 
 data={data} 
 keyField="id" 
 emptyMessage="No travel requests found."
 onRowClick={openDetails}
 />
 )}
 </div>

 <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Travel Request Details" className="max-w-2xl">
   {detailsQuery.isLoading ? <div className="py-8"><LoadingSpinner /></div> : detailsQuery.isError ? (
     <div className="space-y-3"><p role="alert">Could not load this travel request.</p><Button onClick={() => detailsQuery.refetch()}>Retry</Button></div>
   ) : details ? (
     <div className="space-y-4 text-sm">
       <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5">
         <div className="flex items-start gap-3">
           <div className="rounded-xl bg-indigo-100 dark:bg-indigo-900/40 p-2.5 text-indigo-600 dark:text-indigo-300"><Plane className="h-5 w-5" /></div>
           <div className="min-w-0 flex-1">
             <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Trip to</p>
             <h3 className="mt-0.5 text-xl font-semibold text-text-heading break-words">{details.destination || 'Destination not specified'}</h3>
             <p className="mt-1 text-text-muted">{formatDate(details.startDate)} – {formatDate(details.endDate)} · {travelModeLabel(details.travelMode)}</p>
           </div>
         </div>
         <div className="mt-4 flex flex-wrap gap-2">
           <Badge className="capitalize" variant={details.approvalStatus === 'APPROVAL_APPROVED' ? 'success' : details.approvalStatus === 'APPROVAL_REJECTED' ? 'danger' : 'warning'}>{statusLabel(details.approvalStatus)} approval</Badge>
           <Badge className="capitalize" variant={details.settlementStatus === 'SETTLED' ? 'success' : details.settlementStatus === 'SUBMITTED' ? 'warning' : 'default'}>{statusLabel(details.settlementStatus)} settlement</Badge>
         </div>
       </div>
       <section className="rounded-2xl border border-slate-border p-4 sm:p-5">
         <h3 className="font-semibold text-text-heading mb-4">Trip information</h3>
         <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
           {[
             ['Employee', personName(details.employee)],
             ['Department', details.employee?.department?.name || '—'],
             ['Designation', details.employee?.designation || '—'],
             ['Business purpose', details.travelPurpose || '—'],
           ].map(([label, value]) => <div key={label}><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-1 font-medium text-text-heading break-words whitespace-pre-wrap">{value}</dd></div>)}
         </dl>
       </section>
       <section className="rounded-2xl border border-slate-border p-4 sm:p-5">
         <h3 className="font-semibold text-text-heading mb-4">Approval & settlement</h3>
         <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
           {[
             ['Reviewed by', personName(details.approver)],
             ['Approval date', details.approvalDate ? formatDateTime(details.approvalDate) : '—'],
             ['Verified by', details.verifiedBy?.email || '—'],
             ['Settlement date', details.settlementDate ? formatDateTime(details.settlementDate) : '—'],
           ].map(([label, value]) => <div key={label}><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-1 font-medium text-text-heading break-words">{value}</dd></div>)}
         </dl>
       </section>
       <section className="rounded-2xl border border-slate-border p-4 sm:p-5">
         <h3 className="font-semibold text-text-heading mb-4">Amount & expenses</h3>
         <dl className="space-y-3">
           {[
             ...(details.amountRequired != null
               ? [['Amount required', details.amountRequired]]
               : details.advanceRequested != null
                 ? [['Legacy advance requested', details.advanceRequested]]
                 : []),
             ['Advance approved', details.advanceApproved],
             ['Hotel', details.hotelExpense], ['Food', details.foodAllowance],
             ['Local transport', details.localConveyance], ['Other expenses', details.otherExpenses],
           ].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4"><dt className="text-text-muted">{label}</dt><dd className="font-medium text-text-heading whitespace-nowrap">{money(value)}</dd></div>)}
           <div className="flex justify-between gap-4 border-t border-slate-border pt-3"><dt className="font-medium text-text-heading">Total expenses</dt><dd className="font-semibold text-text-heading whitespace-nowrap">{money(expenseTotal)}</dd></div>
           {details.settlementStatus !== 'UNSETTLED' && <div className="flex justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3"><dt className="font-semibold text-text-heading">{netAmount < 0 ? 'Amount to recover' : 'Amount payable'}</dt><dd className="font-bold text-text-heading whitespace-nowrap">{money(Math.abs(netAmount))}</dd></div>}
         </dl>
       </section>
       <section className="rounded-2xl border border-slate-border p-4 sm:p-5">
         <h3 className="font-semibold text-text-heading mb-3">Bills & attachments</h3>
         {details.billUpload ? <ul className="space-y-2 text-sm">{details.billUpload.split(',').filter(Boolean).map((file: string, index: number) => {
           const filePath = file.trim();
           const isLink = /^https?:\/\//i.test(filePath) || /^\/(?!\/)/.test(filePath);
           const href = filePath.startsWith('/api/')
             ? new URL(filePath, new URL(apiClient.defaults.baseURL || '/api', window.location.origin).origin).href
             : filePath;
           return <li key={index}>{isLink ? <AttachmentLink module="travel" className="text-brand-primary underline break-all" href={href} target="_blank" rel="noopener noreferrer">View attachment {index + 1}</AttachmentLink> : <span className="break-all">{filePath}</span>}</li>;
         })}</ul> : <p className="text-sm text-text-muted">No files attached.</p>}
       </section>
       <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-border pt-4">
         <p className="text-xs text-text-muted break-all">Request ID: {details.id} · Created {formatDateTime(details.createdAt)}</p>
         <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Close</Button>
       </div>
     </div>
   ) : null}
 </Modal>

 {/* New Request Modal */}
 <Modal isOpen={isModalOpen && mayCreateTravel} onClose={() => setIsModalOpen(false)} title="New Travel Request">
 <form onSubmit={handleSubmit} className="space-y-4">
 <Input name="destination" label="Destination" placeholder="e.g. New York, NY" required />
 <Input name="travelPurpose" label="Business Purpose" required />
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <DatePicker name="startDate" label="Start Date" type="date" required />
 <DatePicker name="endDate" label="End Date" type="date" required />
 </div>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <div className="flex flex-col">
 <label htmlFor="travel-mode" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1  text-gray-700 dark:text-gray-300 mb-1">Travel Mode</label>
 <Select id="travel-mode" name="travelMode" className="w-full rounded-[1.25rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface px-4 py-3 text-[13px] focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
 <option value="AIR">Flight (Air)</option>
 <option value="TRAIN">Train</option>
 <option value="ROAD">Bus / Cab (Road)</option>
 <option value="OWN_VEHICLE">Personal Vehicle</option>
 </Select>
 </div>
 <Input name="amountRequired" label="Amount Required (₹)" type="number" step="0.01" min="0.01" required onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} />
 </div>
 <FileUpload name="billUpload" label="Upload Attachment (Optional)" module="travel" action="add" />
 
 <div className="flex justify-end space-x-2 pt-4">
 <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
 <Button type="submit" disabled={createMutation.isPending}>
 {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
 </Button>
 </div>
 </form>
 </Modal>

 {/* Approval Modal */}
 <Modal isOpen={approvalModalOpen && mayApproveTravel} onClose={() => setApprovalModalOpen(false)} title="Review Travel Request">
 <div className="space-y-4">
 <p className="text-sm text-gray-600">Review the estimated amount required for this trip. Enter an advance only if funds will be paid before the employee submits expenses.</p>
 
 <div className="bg-surface p-4 rounded-lg">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div><span className="text-gray-500">Employee:</span> <span className="font-medium text-text-heading">{selectedRequest?.employee?.firstName} {selectedRequest?.employee?.lastName}</span></div>
 <div><span className="text-gray-500">Destination:</span> <span className="font-medium text-text-heading">{selectedRequest?.destination}</span></div>
 <div><span className="text-gray-500">Amount Required:</span> <span className="font-medium text-text-heading">{selectedRequest?.amountRequired != null ? `₹${selectedRequest.amountRequired}` : 'Not provided (legacy request)'}</span></div>
 </div>
 </div>

 <Input id="advanceApproved" label="Amount to Disburse (₹)" type="number" step="0.01" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} defaultValue={0} />
 
 <div className="flex justify-end space-x-3 pt-4 border-t border-slate-border dark:border-slate-border">
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
 <Modal isOpen={expenseModalOpen && mayCreateTravel} onClose={() => setExpenseModalOpen(false)} title="Submit Travel Expenses">
 <form onSubmit={handleExpenseSubmit} className="space-y-4">
 <p className="text-sm text-gray-600">Fill in your expenses for this trip. The advance you received (if any) will be automatically deducted during settlement.</p>
 
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <Input name="hotelExpense" label="Hotel Expense (₹)" type="number" step="0.01" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} defaultValue={0} />
 <Input name="foodAllowance" label="Food Allowance (₹)" type="number" step="0.01" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} defaultValue={0} />
 <Input name="localConveyance" label="Local Conveyance (₹)" type="number" step="0.01" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} defaultValue={0} />
 <Input name="otherExpenses" label="Other Expenses (₹)" type="number" step="0.01" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} defaultValue={0} />
 </div>

 <FileUpload name="billUpload" label="Upload Bills/Receipts (Optional)" module="travel" action="add" />
 
 <div className="flex justify-end space-x-2 pt-4">
 <Button type="button" variant="outline" onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
 <Button type="submit" disabled={expenseMutation.isPending}>
 {expenseMutation.isPending ? 'Submitting...' : 'Submit Expenses'}
 </Button>
 </div>
 </form>
 </Modal>

 {/* Settle Claim Modal */}
 <Modal isOpen={settleModalOpen && mayEditTravel} onClose={() => setSettleModalOpen(false)} title="Verify & Settle Claim">
 <div className="space-y-4">
 <p className="text-sm text-gray-600">Verify the submitted expenses and bills. Finalize the settlement.</p>
 
 <div className="bg-surface p-4 rounded-lg space-y-3">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div><span className="text-gray-500">Employee:</span> <span className="font-medium text-text-heading">{selectedRequest?.employee?.firstName} {selectedRequest?.employee?.lastName}</span></div>
 <div><span className="text-gray-500 block mb-1">Attached Files:</span> 
 <div className="flex flex-col gap-1">
 {selectedRequest?.billUpload ? selectedRequest.billUpload.split(',').map((url: string, i: number) => (
 <AttachmentLink module="travel" key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm break-all">
 View File {i + 1}
 </AttachmentLink>
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

 <div className="flex justify-end space-x-3 pt-4 border-t border-slate-border dark:border-slate-border">
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




