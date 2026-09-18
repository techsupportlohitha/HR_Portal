import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { performanceApi } from '@/api/performance';
import { employeesApi } from '@/api/employees';
import toast from 'react-hot-toast';

interface PerformanceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceCreateModal({ isOpen, onClose }: PerformanceCreateModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    employeeId: '',
    reviewPeriod: 'QUARTERLY',
    kraDescription: '',
    kpiWeightage: 100,
    goalDescription: '',
    targetValue: ''
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll()
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => performanceApi.create(data),
    onSuccess: () => {
      toast.success('Performance review initiated!');
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      onClose();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create')
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Initiate Performance Review" className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <Select required name="employeeId" label="Employee" value={formData.employeeId} onChange={handleChange}>
              <option value="">Select Employee</option>
              {employees?.data?.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </Select>
            <Select name="reviewPeriod" label="Review Period" value={formData.reviewPeriod} onChange={handleChange}>
              <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              <option value="HALF_YEARLY">Half Yearly</option>
              <option value="ANNUAL">Annual</option>
            </Select>
          <div>
            <label htmlFor="kra-description" className="block text-sm font-medium mb-1">KRA Description</label>
            <textarea id="kra-description" name="kraDescription" value={formData.kraDescription} onChange={handleChange} className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-surface" rows={2} />
          </div>
          <div>
            <label htmlFor="goal-description" className="block text-sm font-medium mb-1">Goal Description</label>
            <textarea id="goal-description" name="goalDescription" value={formData.goalDescription} onChange={handleChange} className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-surface" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input name="targetValue" label="Target Value" value={formData.targetValue} onChange={handleChange} />
            <Input type="number" min="0" onKeyDown={(e) => { if(e.key === "-") e.preventDefault(); }} name="kpiWeightage" label="KPI Weightage (%)" value={formData.kpiWeightage} onChange={handleChange} />
          </div>
          
          <div className="sticky -bottom-4 z-10 -mx-4 -mb-4 flex justify-end gap-3 border-t border-gray-200 bg-surface px-4 py-3 dark:border-gray-700 ">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Initiate Review</Button>
          </div>
        </form>
    </Modal>
  );
}
