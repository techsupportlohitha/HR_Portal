import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceApi } from '@/api/performance';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Select } from '@/components/ui/Select';

interface PerformanceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: any;
}

const PERFORMANCE_METRICS = [
  { key: 'WORK_QUALITY', label: 'Work quality', description: 'Accuracy, completeness, and standard of work' },
  { key: 'PRODUCTIVITY_RELIABILITY', label: 'Productivity & reliability', description: 'Delivery, deadlines, and dependable follow-through' },
  { key: 'COMMUNICATION', label: 'Communication', description: 'Clear, timely, and respectful communication' },
  { key: 'COLLABORATION', label: 'Collaboration', description: 'Teamwork, respect, and knowledge sharing' },
  { key: 'OWNERSHIP_INITIATIVE', label: 'Ownership & initiative', description: 'Responsibility, judgment, and proactive problem-solving' },
  { key: 'PROFESSIONAL_CONDUCT', label: 'Professional conduct', description: 'Integrity, punctuality, and policy compliance' },
  { key: 'LEARNING_ADAPTABILITY', label: 'Learning & adaptability', description: 'Applying feedback and adapting to change' }
] as const;

type MetricKey = typeof PERFORMANCE_METRICS[number]['key'];
type MetricRatings = Record<MetricKey, number | ''>;

const emptyMetricRatings = (): MetricRatings => PERFORMANCE_METRICS.reduce((ratings, metric) => {
  ratings[metric.key] = '';
  return ratings;
}, {} as MetricRatings);

const normaliseMetricRatings = (ratings: any): MetricRatings => PERFORMANCE_METRICS.reduce((result, metric) => {
  const value = ratings?.[metric.key];
  result[metric.key] = typeof value === 'number' ? value : value ? Number(value) : '';
  return result;
}, emptyMetricRatings());

export function PerformanceReviewModal({ isOpen, onClose, review }: PerformanceReviewModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>(review || {});
  const [metricRatings, setMetricRatings] = useState<MetricRatings>(emptyMetricRatings());
  const [isEditingCore, setIsEditingCore] = useState(false);

  useEffect(() => {
    setFormData(review || {});
    const currentRatings = review?.status === 'EMPLOYEE_REVIEW'
      ? review?.selfMetricRatings
      : review?.status === 'MANAGER_REVIEW'
        ? review?.managerMetricRatings
        : review?.status === 'HR_REVIEW'
          ? review?.hrMetricRatings
          : undefined;
    setMetricRatings(normaliseMetricRatings(currentRatings));
  }, [review]);

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
      toast.success('Self-review submitted and locked.');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      onClose();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to submit')
  });

  const managerAppraisalMutation = useMutation({
    mutationFn: (data: any) => performanceApi.submitManagerAppraisal(review.id, data),
    onSuccess: () => {
      toast.success('Manager review submitted and locked.');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      onClose();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to submit')
  });

  const hrAppraisalMutation = useMutation({
    mutationFn: (data: any) => performanceApi.submitHrAppraisal(review.id, data),
    onSuccess: () => {
      toast.success('HR review submitted and locked.');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      onClose();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to submit')
  });

  const finalApprovalMutation = useMutation({
    mutationFn: (data: any) => performanceApi.submitFinalApproval(review.id, data),
    onSuccess: () => {
      toast.success('Review finalized.');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      onClose();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to submit')
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? (value ? Number(value) : undefined) : value)
    }));
  };

  const handleMetricChange = (key: MetricKey, value: number) => {
    setMetricRatings((prev) => ({ ...prev, [key]: value }));
  };

  const hasCompleteMetricRatings = useMemo(
    () => PERFORMANCE_METRICS.every((metric) => metricRatings[metric.key] !== ''),
    [metricRatings]
  );

  const status = review?.status;
  const canSubmitSelf = status === 'EMPLOYEE_REVIEW' && (user?.employeeId === review.employeeId || user?.role === 'ADMIN' || user?.role === 'HR');
  const canSubmitManager = status === 'MANAGER_REVIEW' && (user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR');
  const canSubmitHR = status === 'HR_REVIEW' && (user?.role === 'HR' || user?.role === 'ADMIN');
  const canSubmitFinal = status === 'FINAL_APPROVAL' && (user?.role === 'HR' || user?.role === 'ADMIN');
  const canEditCore = user?.role === 'ADMIN' || user?.role === 'HR';
  const canViewHr = user?.role !== 'EMPLOYEE';

  const renderMetricRatings = (ratings: MetricRatings, editable: boolean, idPrefix: string) => (
    <div className="space-y-3">
      {PERFORMANCE_METRICS.map((metric) => (
        <div key={metric.key} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-navy-900 dark:text-white">{metric.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{metric.description}</p>
          </div>
          <div className="flex items-center gap-1" role="radiogroup" aria-label={`${metric.label} rating`}>
            {[1, 2, 3, 4, 5].map((score) => {
              const selected = ratings[metric.key] === score;
              return (
                <button
                  key={`${idPrefix}-${metric.key}-${score}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${metric.label}: ${score} out of 5`}
                  disabled={!editable}
                  onClick={() => handleMetricChange(metric.key, score)}
                  className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm font-semibold transition-colors ${selected
                    ? 'border-accent-600 bg-accent-600 text-white'
                    : 'border-slate-300 text-gray-500 hover:border-accent-400 hover:text-accent-600 dark:border-slate-600 dark:text-gray-400'} disabled:cursor-default disabled:opacity-80`}
                >
                  {score}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-500 dark:text-gray-400">1 = Far below expectations · 3 = Meets expectations · 5 = Exceptional</p>
    </div>
  );

  const submitWithMetrics = (mutation: { mutate: (data: any) => void }) => {
    if (!hasCompleteMetricRatings) {
      toast.error('Rate all seven metrics before submitting.');
      return;
    }
    mutation.mutate({ ...formData, metricRatings });
  };

  if (!isOpen || !review) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${review.reviewPeriod} performance review`} className="max-w-3xl">
      <div className="flex-1 space-y-6 p-6">
        <div className="relative rounded-lg bg-surface p-4">
          {canEditCore && !isEditingCore && (
            <button onClick={() => setIsEditingCore(true)} className="absolute right-4 top-4 text-sm text-accent-600 hover:text-accent-700">
              Edit details
            </button>
          )}

          {isEditingCore ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="review-period" className="mb-1 block text-xs font-semibold uppercase text-gray-500">Review period</label>
                  <Select id="review-period" name="reviewPeriod" value={formData.reviewPeriod || 'QUARTERLY'} onChange={handleChange} className="w-full rounded-md border border-gray-300 bg-surface p-2 text-sm dark:border-gray-700">
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half-yearly</option>
                    <option value="ANNUAL">Annual</option>
                  </Select>
                </div>
                <div>
                  <label htmlFor="review-target" className="mb-1 block text-xs font-semibold uppercase text-gray-500">Target value</label>
                  <input id="review-target" type="text" name="targetValue" value={formData.targetValue || ''} onChange={handleChange} className="w-full rounded-md border border-gray-300 bg-surface p-2 text-sm dark:border-gray-700" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="review-kra" className="mb-1 block text-xs font-semibold uppercase text-gray-500">KRA description</label>
                  <textarea id="review-kra" name="kraDescription" value={formData.kraDescription || ''} onChange={handleChange} className="w-full rounded-md border border-gray-300 bg-surface p-2 text-sm dark:border-gray-700" rows={2} />
                </div>
                <div>
                  <label htmlFor="review-goal" className="mb-1 block text-xs font-semibold uppercase text-gray-500">Goal description</label>
                  <textarea id="review-goal" name="goalDescription" value={formData.goalDescription || ''} onChange={handleChange} className="w-full rounded-md border border-gray-300 bg-surface p-2 text-sm dark:border-gray-700" rows={2} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditingCore(false)}>Cancel</Button>
                <Button size="sm" onClick={() => updateMutation.mutate(formData)} isLoading={updateMutation.isPending}>Save changes</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs font-semibold uppercase text-gray-500">Employee</p><p className="font-medium">{review.employee?.firstName} {review.employee?.lastName}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-500">KRA</p><p className="font-medium">{review.kraDescription || 'Not provided'}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-500">Goal</p><p className="font-medium">{review.goalDescription || 'Not provided'}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-500">Target</p><p className="font-medium">{review.targetValue || 'Not provided'}</p></div>
              {review.finalRating != null && <div><p className="text-xs font-semibold uppercase text-gray-500">Final score</p><p className="font-medium">{review.finalRating}/5</p></div>}
            </div>
          )}
        </div>

        <form className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4 border-b pb-2">
              <div><h3 className="text-lg font-semibold">Employee self-review</h3><p className="text-sm text-gray-500">Rate each shared workplace metric from 1 to 5.</p></div>
              {status !== 'EMPLOYEE_REVIEW' && <span className="text-xs font-medium text-gray-500">Submitted & locked</span>}
            </div>
            {renderMetricRatings(canSubmitSelf ? metricRatings : normaliseMetricRatings(review.selfMetricRatings), canSubmitSelf, 'self')}
            <div className={canSubmitSelf ? '' : 'opacity-70'}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input name="achievedValue" label="Achieved value" value={formData.achievedValue || ''} onChange={handleChange} disabled={!canSubmitSelf} /><Input name="strengths" label="Strengths" value={formData.strengths || ''} onChange={handleChange} disabled={!canSubmitSelf} /></div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"><Input name="areasOfImprovement" label="Areas for improvement" value={formData.areasOfImprovement || ''} onChange={handleChange} disabled={!canSubmitSelf} /><Input name="trainingRequirement" label="Training requirements" value={formData.trainingRequirement || ''} onChange={handleChange} disabled={!canSubmitSelf} /></div>
              <label htmlFor="employee-comments" className="mb-1 mt-4 block text-sm font-medium">Employee comments <span className="font-normal text-gray-500">(optional)</span></label>
              <textarea id="employee-comments" name="employeeComments" value={formData.employeeComments || ''} onChange={handleChange} disabled={!canSubmitSelf} className="w-full rounded-md border border-gray-300 bg-surface p-2 dark:border-gray-700" rows={3} />
            </div>
            {canSubmitSelf && <Button type="button" onClick={() => submitWithMetrics(selfAppraisalMutation)} isLoading={selfAppraisalMutation.isPending}>Submit self-review</Button>}
          </section>

          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4 border-b pb-2">
              <div><h3 className="text-lg font-semibold">Manager review</h3><p className="text-sm text-gray-500">The manager’s rating carries 60% of the final score.</p></div>
              {status !== 'MANAGER_REVIEW' && <span className="text-xs font-medium text-gray-500">{status === 'EMPLOYEE_REVIEW' ? 'Waiting for self-review' : 'Submitted & locked'}</span>}
            </div>
            {renderMetricRatings(canSubmitManager ? metricRatings : normaliseMetricRatings(review.managerMetricRatings), canSubmitManager, 'manager')}
            <div className={canSubmitManager ? '' : 'opacity-70'}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input name="salaryRevisionRecommendation" label="Salary revision recommendation" value={formData.salaryRevisionRecommendation || ''} onChange={handleChange} disabled={!canSubmitManager} /><div className="flex items-center gap-2 pt-7"><input type="checkbox" id="promotionRecommendation" name="promotionRecommendation" checked={formData.promotionRecommendation || false} onChange={handleChange} disabled={!canSubmitManager} /><label htmlFor="promotionRecommendation">Recommend for promotion</label></div></div>
              <label htmlFor="manager-comments" className="mb-1 mt-4 block text-sm font-medium">Manager comments <span className="font-normal text-gray-500">(optional)</span></label>
              <textarea id="manager-comments" name="managerComments" value={formData.managerComments || ''} onChange={handleChange} disabled={!canSubmitManager} className="w-full rounded-md border border-gray-300 bg-surface p-2 dark:border-gray-700" rows={3} />
            </div>
            {canSubmitManager && <Button type="button" onClick={() => submitWithMetrics(managerAppraisalMutation)} isLoading={managerAppraisalMutation.isPending}>Submit manager review</Button>}
          </section>

          {canViewHr && (
            <section className="space-y-4">
              <div className="flex items-start justify-between gap-4 border-b pb-2"><div><h3 className="text-lg font-semibold">HR independent review</h3><p className="text-sm text-gray-500">An independent HR assessment carrying 20% of the final score.</p></div>{status !== 'HR_REVIEW' && <span className="text-xs font-medium text-gray-500">{status === 'EMPLOYEE_REVIEW' || status === 'MANAGER_REVIEW' ? 'Waiting for manager review' : 'Submitted & locked'}</span>}</div>
              {renderMetricRatings(canSubmitHR ? metricRatings : normaliseMetricRatings(review.hrMetricRatings), canSubmitHR, 'hr')}
              <div className={canSubmitHR ? '' : 'opacity-70'}><label htmlFor="hr-comments" className="mb-1 block text-sm font-medium">HR comments <span className="font-normal text-gray-500">(optional)</span></label><textarea id="hr-comments" name="hrComments" value={formData.hrComments || ''} onChange={handleChange} disabled={!canSubmitHR} className="w-full rounded-md border border-gray-300 bg-surface p-2 dark:border-gray-700" rows={3} /></div>
              {canSubmitHR && <Button type="button" onClick={() => submitWithMetrics(hrAppraisalMutation)} isLoading={hrAppraisalMutation.isPending}>Submit HR review</Button>}
            </section>
          )}

          {canViewHr && (status === 'FINAL_APPROVAL' || status === 'COMPLETED') && (
            <section className="space-y-4">
              <div className="border-b pb-2"><h3 className="text-lg font-semibold">Final approval</h3><p className="text-sm text-gray-500">Calculated from self 20%, manager 60%, and HR 20%. This score cannot be entered manually.</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input name="finalRating" label="Calculated final rating (out of 5)" value={review.finalRating || 'Calculated after approval'} disabled /><div><label htmlFor="final-approval-status" className="mb-1 block text-sm font-medium">Approval status</label><Select id="final-approval-status" name="finalApprovalStatus" value={formData.finalApprovalStatus || 'APPROVAL_PENDING'} onChange={handleChange} disabled={!canSubmitFinal} className="flex h-10 w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm dark:border-slate-600"><option value="APPROVAL_PENDING">Pending</option><option value="APPROVAL_APPROVED">Approved</option><option value="APPROVAL_REJECTED">Rejected</option></Select></div></div>
              {canSubmitFinal && <Button type="button" onClick={() => finalApprovalMutation.mutate(formData)} isLoading={finalApprovalMutation.isPending}>Finalize review</Button>}
            </section>
          )}
        </form>
      </div>
    </Modal>
  );
}
