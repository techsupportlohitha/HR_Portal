import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceApi } from '@/api/performance';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PerformanceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: any;
}

export function PerformanceReviewModal({ isOpen, onClose, review }: PerformanceReviewModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>(review || {});
  const [isEditingCore, setIsEditingCore] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: any) => performanceApi.update(review.id, data),
    onSuccess: () => {
      toast.success('Review details updated!');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      setIsEditingCore(false);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update')
  });

  const selfAppraisalMutation = useMutation({
    mutationFn: (data: any) => performanceApi.submitSelfAppraisal(review.id, data),
    onSuccess: () => {
      toast.success('Self appraisal submitted!');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      onClose();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to submit')
  });

  const managerAppraisalMutation = useMutation({
    mutationFn: (data: any) => performanceApi.submitManagerAppraisal(review.id, data),
    onSuccess: () => {
      toast.success('Manager appraisal submitted!');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      onClose();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to submit')
  });

  const hrAppraisalMutation = useMutation({
    mutationFn: (data: any) => performanceApi.submitHrAppraisal(review.id, data),
    onSuccess: () => {
      toast.success('HR appraisal submitted!');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      onClose();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to submit')
  });

  const finalApprovalMutation = useMutation({
    mutationFn: (data: any) => performanceApi.submitFinalApproval(review.id, data),
    onSuccess: () => {
      toast.success('Final approval submitted!');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      onClose();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to submit')
  });

  if (!isOpen || !review) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? (value ? Number(value) : undefined) : value)
    }));
  };

  const status = review.status;
  
  const canSubmitSelf = status === 'EMPLOYEE_REVIEW' && (user?.employeeId === review.employeeId || user?.role === 'ADMIN' || user?.role === 'HR');
  const canSubmitManager = status === 'MANAGER_REVIEW' && (user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR'); 
  const canSubmitHR = status === 'HR_REVIEW' && (user?.role === 'HR' || user?.role === 'ADMIN');
  const canSubmitFinal = status === 'FINAL_APPROVAL' && (user?.role === 'HR' || user?.role === 'ADMIN');
  const canEditCore = user?.role === 'ADMIN' || user?.role === 'HR';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Performance Review - ${review.reviewPeriod}`} className="max-w-3xl">
        <div className="p-6 space-y-6 flex-1">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg relative">
            {canEditCore && !isEditingCore && (
              <button 
                onClick={() => setIsEditingCore(true)} 
                className="absolute top-4 right-4 text-sm text-accent-600 hover:text-accent-700"
              >
                Edit Details
              </button>
            )}
            
            {isEditingCore ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="review-period" className="block text-xs font-semibold uppercase text-gray-500 mb-1">Review Period</label>
                    <select id="review-period" name="reviewPeriod" value={formData.reviewPeriod || 'QUARTERLY'} onChange={handleChange} className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 dark:bg-gray-900 text-sm">
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="HALF_YEARLY">Half Yearly</option>
                      <option value="ANNUAL">Annual</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="review-target" className="block text-xs font-semibold uppercase text-gray-500 mb-1">Target Value</label>
                    <input id="review-target" type="text" name="targetValue" value={formData.targetValue || ''} onChange={handleChange} className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 dark:bg-gray-900 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="review-kra" className="block text-xs font-semibold uppercase text-gray-500 mb-1">KRA Description</label>
                    <textarea id="review-kra" name="kraDescription" value={formData.kraDescription || ''} onChange={handleChange} className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 dark:bg-gray-900 text-sm" rows={2} />
                  </div>
                  <div>
                    <label htmlFor="review-goal" className="block text-xs font-semibold uppercase text-gray-500 mb-1">Goal Description</label>
                    <textarea id="review-goal" name="goalDescription" value={formData.goalDescription || ''} onChange={handleChange} className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 dark:bg-gray-900 text-sm" rows={2} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditingCore(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => updateMutation.mutate(formData)} isLoading={updateMutation.isPending}>Save Changes</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Employee</p>
                  <p className="font-medium">{review.employee?.firstName} {review.employee?.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">KRA Description</p>
                  <p className="font-medium">{review.kraDescription || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Goal Description</p>
                  <p className="font-medium">{review.goalDescription || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Target Value</p>
                  <p className="font-medium">{review.targetValue || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          <form className="space-y-6">
            <div className={`space-y-4 ${status !== 'EMPLOYEE_REVIEW' ? 'opacity-70 pointer-events-none' : ''}`}>
              <h3 className="text-lg font-semibold border-b pb-2">1. Employee Self Appraisal</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input name="achievedValue" label="Achieved Value" value={formData.achievedValue || ''} onChange={handleChange} />
                <Input type="number" min="1" max="5" name="selfRating" label="Self Rating (1-5)" value={formData.selfRating || ''} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="employee-comments" className="block text-sm font-medium mb-1">Employee Comments</label>
                <textarea id="employee-comments" name="employeeComments" value={formData.employeeComments || ''} onChange={handleChange} className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 dark:bg-gray-900" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input name="strengths" label="Strengths" value={formData.strengths || ''} onChange={handleChange} />
                <Input name="areasOfImprovement" label="Areas of Improvement" value={formData.areasOfImprovement || ''} onChange={handleChange} />
                <div className="col-span-2">
                  <Input name="trainingRequirement" label="Training Requirements" value={formData.trainingRequirement || ''} onChange={handleChange} />
                </div>
              </div>
              {canSubmitSelf && (
                <Button type="button" onClick={() => selfAppraisalMutation.mutate(formData)} isLoading={selfAppraisalMutation.isPending}>
                  Submit Self Appraisal
                </Button>
              )}
            </div>

            {status !== 'EMPLOYEE_REVIEW' && (
              <div className={`space-y-4 ${status !== 'MANAGER_REVIEW' ? 'opacity-70 pointer-events-none' : ''}`}>
                <h3 className="text-lg font-semibold border-b pb-2">2. Manager Appraisal</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" min="1" max="5" name="managerRating" label="Manager Rating (1-5)" value={formData.managerRating || ''} onChange={handleChange} />
                  <Input name="salaryRevisionRecommendation" label="Salary Revision Recommendation" value={formData.salaryRevisionRecommendation || ''} onChange={handleChange} />
                </div>
                <div>
                  <label htmlFor="manager-comments" className="block text-sm font-medium mb-1">Manager Comments</label>
                  <textarea id="manager-comments" name="managerComments" value={formData.managerComments || ''} onChange={handleChange} className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 dark:bg-gray-900" rows={3} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="promotionRecommendation" name="promotionRecommendation" checked={formData.promotionRecommendation || false} onChange={handleChange} />
                  <label htmlFor="promotionRecommendation">Recommend for Promotion</label>
                </div>
                {canSubmitManager && (
                  <Button type="button" onClick={() => managerAppraisalMutation.mutate(formData)} isLoading={managerAppraisalMutation.isPending}>
                    Submit Manager Appraisal
                  </Button>
                )}
              </div>
            )}

            {(status === 'HR_REVIEW' || status === 'FINAL_APPROVAL' || status === 'COMPLETED') && (
              <div className={`space-y-4 ${status !== 'HR_REVIEW' ? 'opacity-70 pointer-events-none' : ''}`}>
                <h3 className="text-lg font-semibold border-b pb-2">3. HR Appraisal</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" min="1" max="5" name="hrRating" label="HR Rating (1-5)" value={formData.hrRating || ''} onChange={handleChange} />
                </div>
                <div>
                  <label htmlFor="hr-comments" className="block text-sm font-medium mb-1">HR Comments</label>
                  <textarea id="hr-comments" name="hrComments" value={formData.hrComments || ''} onChange={handleChange} className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 dark:bg-gray-900" rows={3} />
                </div>
                {canSubmitHR && (
                  <Button type="button" onClick={() => hrAppraisalMutation.mutate(formData)} isLoading={hrAppraisalMutation.isPending}>
                    Submit HR Appraisal
                  </Button>
                )}
              </div>
            )}

            {(status === 'FINAL_APPROVAL' || status === 'COMPLETED') && (
              <div className={`space-y-4 ${status !== 'FINAL_APPROVAL' ? 'opacity-70 pointer-events-none' : ''}`}>
                <h3 className="text-lg font-semibold border-b pb-2">4. Final Approval</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" min="1" max="5" name="finalRating" label="Final Rating (1-5)" value={formData.finalRating || ''} onChange={handleChange} />
                  <div>
                    <label htmlFor="final-approval-status" className="block text-sm font-medium mb-1">Approval Status</label>
                    <select id="final-approval-status" name="finalApprovalStatus" value={formData.finalApprovalStatus || 'APPROVAL_PENDING'} onChange={handleChange} className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600">
                      <option value="APPROVAL_PENDING">Pending</option>
                      <option value="APPROVAL_APPROVED">Approved</option>
                      <option value="APPROVAL_REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>
                {canSubmitFinal && (
                  <Button type="button" onClick={() => finalApprovalMutation.mutate(formData)} isLoading={finalApprovalMutation.isPending}>
                    Finalize Review
                  </Button>
                )}
              </div>
            )}
          </form>
        </div>
    </Modal>
  );
}
