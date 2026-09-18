import { formatDate } from '@/utils/dateFormat';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesApi } from '@/api/leaves';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Check, X, Plus, X as CloseIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';

export default function LeaveRequestPage() {
  const queryClient = useQueryClient();
  const [isAddLeaveModalOpen, setIsAddLeaveModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'Medical Leave',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['leaves', 'all'],
    queryFn: leavesApi.getAll,
  });

  const applyMutation = useMutation({
    mutationFn: leavesApi.apply,
    onSuccess: () => {
      toast.success('Leave application submitted');
      queryClient.invalidateQueries({ queryKey: ['leaves', 'all'] });
      setIsAddLeaveModalOpen(false);
      setFormData({ leaveType: 'Medical Leave', startDate: '', endDate: '', reason: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to apply leave'),
  });

  const statusMutation = useMutation({
    mutationFn: leavesApi.updateStatus,
    onSuccess: (_, variables) => {
      toast.success(`Leave request ${variables.status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['leaves', 'all'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const handleAction = (id: string, action: 'APPROVED' | 'REJECTED') => {
    statusMutation.mutate({ id, status: action, remarks: '' });
  };

  const handleApplyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
      let mappedType = 'SICK';
      if (formData.leaveType === 'Medical Leave') mappedType = 'SICK';
      else if (formData.leaveType === 'Personal Leave') mappedType = 'PERSONAL';
      else if (formData.leaveType === 'On Duty') mappedType = 'ON_DUTY';
    

    applyMutation.mutate({
      leaveType: mappedType as any,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
    });
  };

  const displayLeaveType = (type: string) => {
    if (type === 'SICK') return 'Medical Leave';
    if (type === 'PERSONAL') return 'Personal Leave';
    if (type === 'CASUAL') return 'Casual Leave'; // Keep casual for backward compatibility
    if (type === 'ON_DUTY') return 'On Duty';
    
    return type;
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-4 bg-[#f8f9fc] min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Leave Request</h1>
        <button
          onClick={() => setIsAddLeaveModalOpen(true)}
          className="bg-[#4b4e7c] hover:bg-[#3d3f66] text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Leave
        </button>
      </div>
      
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-surface rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-slate-border text-xs font-bold text-gray-700 uppercase tracking-wider">
                <th className="py-4 px-6">EMPLOYEE ID</th>
                <th className="py-4 px-6">EMPLOYEE ...</th>
                <th className="py-4 px-6">LEAVE TYPE</th>
                <th className="py-4 px-6">FROM</th>
                <th className="py-4 px-6">TO</th>
                <th className="py-4 px-6">REASON</th>
                <th className="py-4 px-6 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white">
              {leavesData?.data?.map((leave: any, index: number) => (
                <tr key={leave.id} className={index % 2 === 0 ? "bg-[#f5f5f5]" : "bg-surface"}>
                  <td className="py-4 px-6 text-[#e68a00] font-bold">
                    #EMP : {leave.employee?.employeeCode || '00000'}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {leave.employee?.profilePhoto ? (
                        <img src={leave.employee.profilePhoto} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                          {leave.employee?.firstName?.[0] || ''}{leave.employee?.lastName?.[0] || ''}
                        </div>
                      )}
                      <div className="font-semibold text-slate-800 flex flex-col leading-tight">
                        <span>{leave.employee?.firstName}</span>
                        <span>{leave.employee?.lastName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-600">
                    {displayLeaveType(leave.leaveType)}
                  </td>
                  <td className="py-4 px-6 text-slate-600">
                    {formatDate(leave.startDate)}
                  </td>
                  <td className="py-4 px-6 text-slate-600">
                    {formatDate(leave.endDate)}
                  </td>
                  <td className="py-4 px-6 text-slate-600">
                    <span className="truncate max-w-[150px] inline-block" title={leave.reason}>
                      {leave.reason?.length > 20 ? leave.reason.substring(0, 20) + '...' : leave.reason}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => handleAction(leave.id, 'APPROVED')}
                        className="w-7 h-7 flex items-center justify-center rounded-full border border-green-500 bg-surface hover:bg-green-50 text-green-500 transition-colors"
                        disabled={statusMutation.isPending}
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleAction(leave.id, 'REJECTED')}
                        className="w-7 h-7 flex items-center justify-center rounded-full border border-red-500 bg-surface hover:bg-red-50 text-red-500 transition-colors"
                        disabled={statusMutation.isPending}
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!leavesData?.data || leavesData.data.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No pending leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isAddLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-slate-800">Add Leave</h2>
              <button 
                onClick={() => setIsAddLeaveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleApplySubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Select Leave type</label>
                <Select 
                  name="leaveType" 
                  value={formData.leaveType} 
                  onChange={handleApplyChange}
                  className="w-full bg-[#f8f9fa] border-0 rounded-md px-4 py-3 text-slate-700 focus:ring-2 focus:ring-[#4b4e7c]"
                  required
                >
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Personal Leave">Personal Leave</option>
                  <option value="On Duty">On Duty</option>                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Leave From Date</label>
                  <DatePicker type="date" 
                    name="startDate" 
                    value={formData.startDate} 
                    onChange={handleApplyChange}
                    className="w-full bg-[#f8f9fa] border-0 rounded-md px-4 py-3 text-slate-700 focus:ring-2 focus:ring-[#4b4e7c]"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Leave to Date</label>
                  <DatePicker type="date" 
                    name="endDate" 
                    value={formData.endDate} 
                    onChange={handleApplyChange}
                    className="w-full bg-[#f8f9fa] border-0 rounded-md px-4 py-3 text-slate-700 focus:ring-2 focus:ring-[#4b4e7c]"
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Leave Reason</label>
                <textarea 
                  name="reason" 
                  value={formData.reason} 
                  onChange={handleApplyChange}
                  className="w-full bg-[#f8f9fa] border-0 rounded-md px-4 py-3 text-slate-700 focus:ring-2 focus:ring-[#4b4e7c] min-h-[120px] resize-y"
                  required 
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsAddLeaveModalOpen(false)}
                  className="bg-[#7a808d] hover:bg-[#686d79] text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Done
                </button>
                <button 
                  type="submit" 
                  disabled={applyMutation.isPending}
                  className="bg-[#4b4e7c] hover:bg-[#3d3f66] text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {applyMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



