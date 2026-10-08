import React, { useState } from 'react';
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
  initialRequisitionId?: string;
}

export function ScheduleInterviewModal({ isOpen, onClose, initialRequisitionId }: ScheduleInterviewModalProps) {
  React.useEffect(() => { if (isOpen && initialRequisitionId) setRequisitionId(initialRequisitionId); }, [isOpen, initialRequisitionId]);
  const queryClient = useQueryClient();
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [requisitionId, setRequisitionId] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewerId, setInterviewerId] = useState('');
  const [interviewRound, setInterviewRound] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');

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
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      onClose();
      setCandidateName('');
      setCandidateEmail('');
      setRequisitionId('');
      setInterviewDate('');
      setInterviewerId('');
      setInterviewRound('');
      setInterviewLocation('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName || !requisitionId || !interviewDate) return;
    
    mutation.mutate({
      candidateName,
      email: candidateEmail || undefined,
      requisitionId,
      interviewDate: new Date(interviewDate).toISOString(),
      interviewerId: interviewerId || undefined,
      interviewRound: interviewRound || undefined,
      interviewLocation: interviewLocation || undefined,
      screeningStatus: 'SHORTLISTED', // Auto-shortlist for interview
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Interview">
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <Input
          label="Candidate Name"
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          placeholder="Enter candidate name"
          required
        />
        <Input
          label="Candidate Email"
          type="email"
          value={candidateEmail}
          onChange={(e) => setCandidateEmail(e.target.value)}
          placeholder="Enter candidate email"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Type of Interview"
            value={interviewRound}
            onChange={(e) => setInterviewRound(e.target.value)}
            required
          >
            <option value="">Select interview type...</option>
            <option value="TELEPHONIC">Telephonic</option>
            <option value="HR_INTERVIEW">HR Interview</option>
            <option value="TECHNICAL">Technical Interview</option>
            <option value="MANAGEMENT">Management Interview</option>
          </Select>
          <Input
            label="Place of Interview"
            value={interviewLocation}
            onChange={(e) => setInterviewLocation(e.target.value)}
            placeholder="e.g. Google Meet, Main Office"
            required
          />
        </div>

        <Input
          label="Interview Date & Time"
          type="datetime-local"
          value={interviewDate}
          onChange={(e) => setInterviewDate(e.target.value)}
          required
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
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



