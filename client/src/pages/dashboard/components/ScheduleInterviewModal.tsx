import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { recruitmentApi } from "@/api/recruitment";
import { employeesApi } from "@/api/employees";
import { employeeAssignmentOptions } from "@/utils/employeeAssignmentOptions";
import toast from "react-hot-toast";


interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRequisitionId?: string;
  existingCandidate?: any;
}

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  initialRequisitionId,
  existingCandidate,
}: ScheduleInterviewModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [requisitionId, setRequisitionId] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewerId, setInterviewerId] = useState("");
  const [interviewRound, setInterviewRound] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [interviewMode, setInterviewMode] = useState("IN_PERSON");
  React.useEffect(() => {
    if (!isOpen) return;
    setServerError("");
    setCandidateName(existingCandidate?.candidateName || "");
    setCandidateEmail(existingCandidate?.email || "");
    setRequisitionId(
      existingCandidate?.requisitionId || initialRequisitionId || "",
    );
    setInterviewDate(
      existingCandidate?.interviewDate
        ? new Date(
            new Date(existingCandidate.interviewDate).getTime() + 330 * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "",
    );
    setInterviewerId(existingCandidate?.interviewerId || "");
    setInterviewRound(existingCandidate?.interviewRound || (["HR_INTERVIEW", "TECHNICAL", "MANAGEMENT"].includes(existingCandidate?.currentStage) ? existingCandidate.currentStage : "HR_INTERVIEW"));
    setInterviewLocation(existingCandidate?.interviewLocation || "");
    setDurationMinutes(
      existingCandidate?.endsAt && existingCandidate?.interviewDate
        ? String(
            Math.max(
              15,
              Math.round(
                (new Date(existingCandidate.endsAt).getTime() -
                  new Date(existingCandidate.interviewDate).getTime()) /
                  60000,
              ),
            ),
          )
        : "60",
    );
    setInterviewMode(existingCandidate?.mode || "IN_PERSON");
    setRescheduleReason("");
  }, [isOpen, initialRequisitionId, existingCandidate]);

  const { data: empData, isError: employeeLoadError, refetch: reloadEmployees } = useQuery({
    queryKey: ["employees", "assignment-options"],
queryFn: () => employeesApi.getAllForAssignments(),
    enabled: isOpen,
  });

  const { data: reqData } = useQuery({
    queryKey: ["requisitions"],
    queryFn: recruitmentApi.getRequisitions,
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      existingCandidate
        ? existingCandidate.interviewId
          ? recruitmentApi.rescheduleInterview(
              existingCandidate.interviewId,
              payload.schedule,
            )
          : recruitmentApi.createInterview(
              existingCandidate.id,
              payload.schedule,
            )
        : recruitmentApi.createCandidate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-register"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-pipeline"] });
      toast.success(
        existingCandidate?.interviewId
          ? "Interview rescheduled"
          : "Interview scheduled",
      );
      onClose();
      setCandidateName("");
      setCandidateEmail("");
      setRequisitionId("");
      setInterviewDate("");
      setInterviewerId("");
      setInterviewRound("");
      setInterviewLocation("");
      setDurationMinutes("60");
      setInterviewMode("IN_PERSON");
    },
    onError: (error: any) => setServerError(error?.response?.data?.message || "Could not save interview. Your entries are still here. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName || !requisitionId || !interviewDate) return;

    setServerError("");
    if (!interviewerId || !interviewRound || (interviewMode !== "PHONE" && !interviewLocation.trim())) { setServerError("Complete the interviewer, round and location details before saving."); return; }
    const startsAt = new Date(interviewDate + ":00+05:30");
    if (!Number.isFinite(startsAt.getTime())) { setServerError("Choose a valid interview date and time."); return; }
    mutation.mutate({
      candidateName,
      email: candidateEmail || undefined,
      requisitionId,
      interviewDate: startsAt.toISOString(),
      interviewerId: interviewerId || undefined,
      interviewRound: interviewRound || undefined,
      interviewLocation: interviewLocation || undefined,
      interviewDurationMinutes: Number(durationMinutes),
      interviewMode,
      schedule: existingCandidate
        ? {
            round: interviewRound || "HR_INTERVIEW",
            startsAt: startsAt.toISOString(),
            endsAt: new Date(
              startsAt.getTime() + Number(durationMinutes) * 60000,
            ).toISOString(),
            timezone: "Asia/Kolkata",
            mode: interviewMode,
            location: interviewLocation || undefined,
            interviewerId: interviewerId || undefined,
            reason: rescheduleReason || undefined,
          }
        : undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        existingCandidate?.interviewId
          ? "Reschedule Interview"
          : "Schedule Interview"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <p className="text-sm text-text-muted">{existingCandidate?.interviewId ? "Update this appointment. Its previous schedule remains in history." : "Confirm the candidate, interviewer and appointment details below."}</p>
        {serverError && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{serverError}</p>}
        <fieldset className="space-y-3 rounded-xl border border-slate-border p-4"><legend className="px-1 font-semibold">Candidate and opening</legend>
        <Input
          label="Candidate Name"
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          placeholder="Enter candidate name"
          required
          disabled={!!existingCandidate}
        />
        <Input
          label="Candidate Email"
          type="email"
          value={candidateEmail}
          onChange={(e) => setCandidateEmail(e.target.value)}
          placeholder="Enter candidate email"
          disabled={!!existingCandidate}
        />
        <Select
          label="Position (Requisition)"
          value={requisitionId}
          onChange={(e) => setRequisitionId(e.target.value)}
          required
          disabled={!!existingCandidate}
        >
          <option value="">Select a position...</option>
          {reqData?.data
            ?.filter(
              (r: any) =>
                r.id === existingCandidate?.requisitionId ||
                !["CLOSED", "JOINED_REJECTED"].includes(r.status),
            )
            .map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.positionTitle}
              </option>
            ))}
        </Select>
        </fieldset>
        <fieldset className="space-y-3 rounded-xl border border-slate-border p-4"><legend className="px-1 font-semibold">Interviewer and time</legend>
        {employeeLoadError && <p role="alert" className="text-sm text-red-600">Could not load interviewers. <button type="button" className="underline" onClick={() => reloadEmployees()}>Retry</button></p>}
        <Select
          label="Interviewer"
          value={interviewerId}
          onChange={(e) => setInterviewerId(e.target.value)}
          required
        >
          <option value="">Select an interviewer...</option>
          {employeeAssignmentOptions((empData as any)?.data)}
        </Select>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Interview Date & Time" type="datetime-local" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} required />
          <Input label="Duration (minutes)" type="number" min="15" max="480" step="15" required value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
        </div>
        <p className="text-xs text-text-muted">All appointment times use Asia/Kolkata (IST).</p>
        </fieldset>
        <fieldset className="space-y-3 rounded-xl border border-slate-border p-4"><legend className="px-1 font-semibold">Round and location</legend>
          <Select label="Type of Interview" value={interviewRound} onChange={(e) => setInterviewRound(e.target.value)} required disabled={!!existingCandidate?.interviewId}>
            <option value="">Select interview type...</option>
            {existingCandidate?.interviewId && interviewRound === "TELEPHONIC" && <option value="TELEPHONIC">Telephonic (existing interview)</option>}
            <option value="HR_INTERVIEW">HR Interview</option><option value="TECHNICAL">Technical Interview</option><option value="MANAGEMENT">Management Interview</option>
          </Select>
          <Select label="Interview mode" value={interviewMode} onChange={(e) => setInterviewMode(e.target.value)}><option value="IN_PERSON">In person</option><option value="VIDEO">Video call</option><option value="PHONE">Phone call</option></Select>
          <Input label="Place of Interview" value={interviewLocation} onChange={(e) => setInterviewLocation(e.target.value)} placeholder={interviewMode === "VIDEO" ? "Meeting link or video call details" : interviewMode === "PHONE" ? "Phone details (optional)" : "Office address or meeting room"} required={interviewMode !== "PHONE"} />
        </fieldset>
        {existingCandidate && (
          <Input
            label={existingCandidate.interviewId ? "Reason for rescheduling" : "Reason for skipping or returning to a stage"}
            required={!!existingCandidate.interviewId}
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
          />
        )}
        {interviewDate && Number.isFinite(new Date(interviewDate + ":00+05:30").getTime()) && <div className="rounded-xl bg-tint p-3 text-sm"><p className="font-semibold">Review appointment</p><p className="mt-1">{candidateName} · {new Date(interviewDate + ":00+05:30").toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · Asia/Kolkata · {durationMinutes} minutes</p></div>}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {existingCandidate?.interviewId ? "Save Changes" : "Schedule interview"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
