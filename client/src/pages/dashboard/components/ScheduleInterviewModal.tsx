import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { recruitmentApi } from '@/api/recruitment';
import { employeesApi } from '@/api/employees';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduleInterviewModal({ isOpen, onClose }: ScheduleInterviewModalProps) {
  const queryClient = useQueryClient();
  const [candidateName, setCandidateName] = useState('');
  const [requisitionId, setRequisitionId] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewerId, setInterviewerId] = useState('');

  const { data: empData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll(),
    enabled: isOpen
  });

  const { data: reqData } = useQuery({
    queryKey: ['requisitions'],
    queryFn: recruitmentApi.getRequisitions,
    enabled: isOpen
  });

  const mutation = useMutation({
    mutationFn: recruitmentApi.createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      onClose();
      setCandidateName('');
      setRequisitionId('');
      setInterviewDate('');
      setInterviewerId('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName || !requisitionId || !interviewDate) return;
    
    mutation.mutate({
      candidateName,
      requisitionId,
      interviewDate: new Date(interviewDate).toISOString(),
      interviewerId: interviewerId || undefined,
      screeningStatus: 'SHORTLISTED', // Auto-shortlist for interview
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Interview">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Candidate Name"
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          placeholder="Enter candidate name"
          required
        />
        <Select
          label="Position (Requisition)"
          value={requisitionId}
          onChange={(e) => setRequisitionId(e.target.value)}
          required
        >
          <option value="">Select a position...</option>
          {reqData?.data?.map((r: any) => (
            <option key={r.id} value={r.id}>
              {r.positionTitle}
            </option>
          ))}
        </Select>
        <Select
          label="Interviewer"
          value={interviewerId}
          onChange={(e) => setInterviewerId(e.target.value)}
          required
        >
          <option value="">Select an interviewer...</option>
          {(empData as any)?.data?.filter((e: any) => e.isActive).map((emp: any) => (
            <option key={emp.id} value={emp.id}>
              {emp.firstName} {emp.lastName}
            </option>
          ))}
        </Select>
        <Input
          label="Interview Date & Time"
          type="datetime-local"
          value={interviewDate}
          onChange={(e) => setInterviewDate(e.target.value)}
          required
        />
        
        {mutation.isError && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
            Failed to schedule interview. Please try again.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-border">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Schedule
          </Button>
        </div>
      </form>
    </Modal>
  );
}
