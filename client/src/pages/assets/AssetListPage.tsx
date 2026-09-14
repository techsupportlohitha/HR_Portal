import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi } from '@/api/assets';
import { employeesApi } from '@/api/employees';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Laptop, Plus, Settings2, RefreshCcw, Download } from 'lucide-react';

export default function AssetListPage() {
  const { user } = useAuth();
  const { canExport } = usePermissions();
  const queryClient = useQueryClient();
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetsApi.getAll().then(res => res.data),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({}),
    enabled: isAdminOrHR,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => assetsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => assetsApi.update(editingAsset.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsModalOpen(false);
      setEditingAsset(null);
    }
  });

    const approveReturnMutation = useMutation({
    mutationFn: (id: string) => assetsApi.update(id, { status: 'RETURNED', assignedEmployeeId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Return request approved');
    }
  });

  const returnMutation = useMutation({
    mutationFn: (id: string) => assetsApi.returnAsset(id, { returnCondition: 'RETURN_GOOD' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setReturnConfirmOpen(false);
      toast.success('Asset returned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to return asset');
    }
  });

  const columns = [
    { 
      header: 'Asset', 
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
             <Laptop className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
          </div>
          <div>
            <div className="font-semibold text-navy-900 dark:text-white">{row.brandModel || row.assetType}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">SN: {row.serialNumber}</div>
          </div>
        </div>
      )
    },
    { header: 'Type', accessor: 'assetType', className: 'text-gray-600 dark:text-gray-400 dark:text-gray-500' },
    { 
      header: 'Assigned To', 
      accessor: (row: any) => row.assignedEmployee ? `${row.assignedEmployee.firstName} ${row.assignedEmployee.lastName}` : <span className="text-gray-400 dark:text-gray-500">Unassigned</span>,
      className: 'text-gray-600 dark:text-gray-400 dark:text-gray-500'
    },
    { 
      header: 'Status', 
      accessor: (row: any) => {
        if (row.status === 'IN_USE') return <Badge variant="success">In Use</Badge>;
        if (row.status === 'RETURN_REQUESTED') return <Badge variant="warning">Return Requested</Badge>;
          if (row.status === 'RETURNED') return <Badge variant="default">Returned</Badge>;
        return <Badge variant="warning">{row.status}</Badge>;
      }
    },
    { 
      header: 'Action', 
      accessor: (row: any) => (
        <div className="flex items-center gap-2">
          {row.photoUrl && (
            <a 
              href={row.photoUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-accent-500 transition-colors" 
              title="View Photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </a>
          )}
          {row.status === 'IN_USE' && row.assignedEmployee?.id === (user?.employeeId || user?.employee?.id) && (
            <button 
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-amber-500 transition-colors" 
              title="Return Asset"
              onClick={() => {
                setSelectedAssetId(row.id);
                setReturnConfirmOpen(true);
              }}
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          )}
          {isAdminOrHR && row.status === 'RETURN_REQUESTED' && (
            <button 
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-green-600 transition-colors" 
              title="Approve Return"
              onClick={() => approveReturnMutation.mutate(row.id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </button>
          )}

          {isAdminOrHR && (
             <button 
               className="p-1 text-gray-400 dark:text-gray-500 hover:text-navy-900 dark:text-white transition-colors"
               onClick={() => {
                 setEditingAsset(row);
                
                 setIsModalOpen(true);
               }}
             >
               <Settings2 className="w-4 h-4" />
             </button>
          )}
        </div>
      ) 
    },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assignedEmployeeId = formData.get('assignedEmployeeId') as string;
    
    const payload: any = {
      assetType: formData.get('assetType'),
      assetCategory: formData.get('assetCategory'),
      brandModel: formData.get('brandModel'),
      serialNumber: formData.get('serialNumber'),
    };
    
    if (formData.get('purchaseValue')) payload.purchaseValue = Number(formData.get('purchaseValue'));
    if (formData.get('purchaseDate')) payload.purchaseDate = new Date(formData.get('purchaseDate') as string).toISOString();
    if (formData.get('issueDate')) payload.issueDate = new Date(formData.get('issueDate') as string).toISOString();
    if (formData.get('assetLocation')) payload.assetLocation = formData.get('assetLocation');
    if (formData.get('issueCondition')) payload.issueCondition = formData.get('issueCondition');
    if (formData.get('status')) payload.status = formData.get('status');

    if (assignedEmployeeId) {
      payload.assignedEmployeeId = assignedEmployeeId;
      if (!editingAsset) payload.status = 'IN_USE';
    } else if (editingAsset) {
      payload.assignedEmployeeId = null;
    }

    Object.keys(payload).forEach(key => {
      if (payload[key] === '') delete payload[key];
    });



    if (editingAsset) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Management"
        description={isAdminOrHR ? 'Manage company assets and assignments.' : 'View your assigned hardware and equipment.'}
        actions={isAdminOrHR && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => {
              if (!data) return;
              const csvContent = "data:text/csv;charset=utf-8," 
                + "Asset ID,Type,Category,Brand/Model,Serial Number,Purchase Value,Assigned Employee,Status\n"
                + data.map((a: any) => 
                    `${a.id},${a.assetType},${a.assetCategory},${a.brandModel || ''},${a.serialNumber || ''},${a.purchaseValue || ''},${a.assignedEmployee ? a.assignedEmployee.firstName + ' ' + a.assignedEmployee.lastName : 'Unassigned'},${a.status}`
                  ).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "Asset_Register.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}>
              <Download className="w-4 h-4 mr-2" /> Export Register
            </Button>
            <Button onClick={() => { setEditingAsset(null); setIsModalOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Add Asset
            </Button>
          </div>
        )}
      />

      <div className="animate-in fade-in">
        {isLoading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : !data || data.length === 0 ? (
          <EmptyState 
            icon={Laptop}
            title={isAdminOrHR ? "No assets in inventory" : "No assigned assets"}
            description={isAdminOrHR ? "Start tracking hardware by adding your first asset." : "You do not currently have any equipment assigned to you."}
            actionLabel={isAdminOrHR ? "Add Asset" : undefined}
            onAction={isAdminOrHR ? () => setIsModalOpen(true) : undefined}
          />
        ) : (
          <DataTable 
            columns={columns} 
            data={data} 
            keyField="id" 
            emptyMessage="No assets found."
          />
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAsset ? 'Edit Asset' : 'Add New Asset'}>
        <form key={editingAsset ? editingAsset.id : 'new'} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="asset-type" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Type</label>
              <Select id="asset-type" name="assetType" defaultValue={editingAsset?.assetType || ""} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
                <option value="LAPTOP">Laptop</option>
                <option value="DESKTOP">Desktop</option>
                <option value="MOBILE">Mobile</option>
                <option value="SIM">SIM</option>
                <option value="ID_CARD">ID Card</option>
                <option value="LAPTOP_BAG">Laptop Bag</option>
                <option value="VEHICLE">Vehicle</option>
                <option value="TOOLS">Tools</option>
                <option value="MACHINERY_TOOL">Machinery-related tools</option>
                <option value="ASSET_OTHER">Other company assets</option>
              </Select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="asset-category" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <Select id="asset-category" name="assetCategory" defaultValue={editingAsset?.assetCategory || ""} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
                <option value="IT">IT Equipment</option>
                <option value="NON_IT">Non-IT</option>
                <option value="VEHICLE_CAT">Vehicle</option>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input name="brandModel" defaultValue={editingAsset?.brandModel || ""} label="Brand & Model" placeholder="e.g. MacBook Pro 16" required />
            <Input name="serialNumber" defaultValue={editingAsset?.serialNumber || ""} label="Serial/ID Number" required />
            <Input name="purchaseDate" defaultValue={editingAsset?.purchaseDate ? new Date(editingAsset.purchaseDate).toISOString().split('T')[0] : ""} label="Purchase Date" type="date" />
            <Input name="purchaseValue" defaultValue={editingAsset?.purchaseValue || 0} label="Purchase Value" type="number" step="1" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="asset-assignee" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To (Optional)</label>
              <Select id="asset-assignee" name="assignedEmployeeId" defaultValue={editingAsset?.assignedEmployeeId || ""} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
                <option value="">Unassigned</option>
                {empData?.data?.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </Select>
            </div>
            <Input name="assetLocation" defaultValue={editingAsset?.assetLocation || ""} label="Location" placeholder="e.g. Hyderabad Office" />
            <Input name="issueDate" defaultValue={editingAsset?.issueDate ? new Date(editingAsset.issueDate).toISOString().split('T')[0] : ""} label="Issue Date" type="date" />
            <div className="flex flex-col">
              <label htmlFor="asset-condition" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Condition</label>
              <Select id="asset-condition" name="issueCondition" defaultValue={editingAsset?.issueCondition || ""} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
                <option value="">Select Condition</option>
                <option value="NEW">New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
              </Select>
            </div>
          </div>
          
          
          {editingAsset && (
            <div className="flex flex-col">
              <label htmlFor="asset-status" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <Select id="asset-status" name="status" defaultValue={editingAsset.status} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
                <option value="IN_USE">In Use</option>
                <option value="RETURN_REQUESTED">Return Requested</option>
                <option value="RETURNED">Returned</option>
                <option value="DAMAGED">Damaged</option>
                <option value="LOST">Lost</option>
                <option value="RETIRED">Retired</option>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingAsset ? 'Save Changes' : 'Add Asset')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={returnConfirmOpen}
        title="Return Asset"
        message="Are you sure you want to return this asset? This will notify IT and unassign it from your profile."
        confirmLabel="Confirm Return"
        onConfirm={() => selectedAssetId && returnMutation.mutate(selectedAssetId)}
        onCancel={() => {
          setReturnConfirmOpen(false);
          setSelectedAssetId(null);
        }}
      />
    </div>
  );
}
