import React, { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recruitmentApi } from "@/api/recruitment";
import { departmentsApi } from "@/api/departments";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Plus,
  ChevronLeft,
  ChevronDown,
  Download,
  CheckCircle2,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { ScheduleInterviewModal } from "@/pages/dashboard/components/ScheduleInterviewModal";
import { candidateCsv } from "./interviewExport";

import { JobPositions } from "./JobPositions";
import { CandidatePipeline } from "./CandidatePipeline";
import { CandidateStageControls, CandidateStageHistory } from "./CandidateStageControls";
import { CANDIDATE_STAGES, candidateNextAction } from "./pipelineModel";
import { InterviewAppointmentPanel } from "./InterviewAppointmentPanel";
import { candidateDetailsUrl, normalizeRecruitmentSearch } from "./recruitmentNavigation";

const EMPTY_REQUISITIONS: any[] = [];
const STAGE_GUIDANCE: Record<string, string> = {
  TELEPHONIC: "Record the initial conversation and assessment here. This round does not need calendar scheduling.",
  HR_INTERVIEW: "Review the previous round’s feedback, schedule the HR interview, and submit feedback before moving forward.",
  TECHNICAL: "Use the previous round’s feedback to focus the technical discussion, then submit this round’s assessment.",
  MANAGEMENT: "Review the interview history, complete the management discussion, and record the hiring decision.",
  OFFER: "Track the offer response, key dates, and compensation details for this candidate.",
  JOINED: "Record whether the candidate joined and capture the actual joining date.",
};

export default function RecruitmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { canExport, canEdit, canAdd, canViewRestricted } = usePermissions();

  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [editingReq, setEditingReq] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState(() => normalizeRecruitmentSearch(searchParams).get("tab") || "openings");
  const [closureRequest, setClosureRequest] = useState<any>(null);
  const [closureReason, setClosureReason] = useState("");
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  const applicationFormRef = useRef<HTMLFormElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [scheduleCandidate, setScheduleCandidate] = useState<any>(null);
  const [reviewStage, setReviewStage] = useState("TELEPHONIC");
  const [joiningOutcome, setJoiningOutcome] = useState("PENDING");
  React.useEffect(() => {
    const next = normalizeRecruitmentSearch(searchParams);
    const tab = next.get("tab") || "openings";
    setActiveTab(tab);
    setShowHistory(tab === "history");
    if (next.toString() !== searchParams.toString()) {
      navigate(`/recruitment?${next}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: departmentsApi.getAll,
  });

  const { data: reqResponse, isLoading } = useQuery({
    queryKey: ["requisitions"],
    queryFn: recruitmentApi.getRequisitions,
  });
  const { data: candidatesResponse, isLoading: isCandidatesLoading } = useQuery(
    {
      queryKey: ["candidates", selectedReq?.id],
      queryFn: () => recruitmentApi.getCandidates(selectedReq!.id),
      enabled: !!selectedReq,
    },
  );
  const candidatesData = candidatesResponse?.data || [];

  const data = reqResponse?.data ?? EMPTY_REQUISITIONS;
  const historyRequisitions = data.filter((req: any) =>
    ["CLOSED", "JOINED_REJECTED"].includes(req.status),
  );
  const activeRequisitions = data.filter(
    (req: any) => !["CLOSED", "JOINED_REJECTED"].includes(req.status),
  );
  const visibleRequisitions = data
    .filter((req: any) =>
      activeTab === "history" || showHistory
        ? ["CLOSED", "JOINED_REJECTED"].includes(req.status)
        : !["CLOSED", "JOINED_REJECTED"].includes(req.status),
    );
  const routeReqId = searchParams.get("reqId");
  const routeCandidateId = searchParams.get("candidateId");
  const routeCandidate = candidatesData.find(
    (candidate: any) => candidate.id === routeCandidateId,
  );
  const hiringCompleted = routeCandidate?.joiningStatus === "JOINED";
  React.useEffect(() => {
    setJoiningOutcome(routeCandidate?.joiningStatus || "PENDING");
  }, [routeCandidate?.id, routeCandidate?.joiningStatus]);
  const candidateStages = CANDIDATE_STAGES;
  const currentCandidateStage = routeCandidate?.currentStage === "SCREENING" ? "TELEPHONIC" : routeCandidate?.currentStage || "TELEPHONIC";
  const roundAppointments = (routeCandidate?.interviews || []).filter((interview: any) => interview.round === reviewStage).slice().sort((a: any, b: any) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  React.useEffect(() => {
    setReviewStage(currentCandidateStage);
  }, [routeCandidate?.id, currentCandidateStage]);
  const candidateStageIndex = routeCandidate
    ? Math.max(
        0,
        candidateStages.findIndex(
          (stage) => stage.value === currentCandidateStage,
        ),
      )
    : -1;
  const reviewStageIndex = Math.max(0, candidateStages.findIndex((stage) => stage.value === reviewStage));
  const isStageComplete = (stageValue: string, index: number) =>
    stageValue === "TELEPHONIC" ? index < candidateStageIndex
      : stageValue === "JOINED" ? routeCandidate?.joiningStatus === "JOINED"
      : stageValue === "OFFER" ? ["OFFER_ACCEPTED", "OFFER_DECLINED"].includes(routeCandidate?.offerStatus)
      : (routeCandidate?.interviews || []).some((interview: any) =>
          interview.round === stageValue && interview.status === "COMPLETED" && !!interview.feedbackSubmittedAt,
        );
  const collapseCompletedPreviousStage =
    ["HR_INTERVIEW", "TECHNICAL", "MANAGEMENT"].includes(reviewStage)
    && reviewStageIndex < candidateStageIndex
    && isStageComplete(reviewStage, reviewStageIndex);

  React.useEffect(() => {
    if (!routeReqId) {
      setSelectedReq(null);
      return;
    }
    if (!data.length) return;
    const requisition = data.find((req: any) => req.id === routeReqId);
    if (requisition) setSelectedReq(requisition);
  }, [routeReqId, data]);

  React.useEffect(() => {
    if (routeReqId && !routeCandidateId) {
      navigate(
        `/recruitment/interviews?reqId=${encodeURIComponent(routeReqId)}`,
        { replace: true },
      );
    }
  }, [routeReqId, routeCandidateId, navigate]);

  React.useEffect(() => {
    if (searchParams.get("tab") === "vacancies") {
      setSelectedReq(null);
    }
  }, [searchParams]);

  const createReqMutation = useMutation({
    mutationFn: (payload: any) => recruitmentApi.createRequisition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsReqModalOpen(false);
      setEditingReq(null);
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message || "Could not create requisition",
      ),
  });

  const offerMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      recruitmentApi.offerCandidate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-register"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Offer status updated");
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Could not update offer"),
  });
  const closureMutation = useMutation({
    mutationFn: ({ id, status, reason }: any) =>
      recruitmentApi.updateRequisitionStatus(id, { status, reason }),
    onSuccess: () => {
      setClosureRequest(null);
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Opening status updated");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Could not update opening"),
  });
  const applicationMutation = useMutation({
    mutationFn: (payload: any) => recruitmentApi.createCandidate(payload),
    onSuccess: (response: any) => {
      setApplicationOpen(false);
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-register"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-pipeline"] });
      navigate(
        candidateDetailsUrl(response.data.requisitionId, response.data.id),
      );
      toast.success("Application saved");
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message || "Could not save application",
      ),
  });
  const decisionMutation = useMutation({
    mutationFn: (payload: any) =>
      recruitmentApi.interviewCandidate(routeCandidate.id, payload),
    onSuccess: () => {
      [
        "requisitions",
        "candidate-register",
        "candidate-pipeline",
        "candidates",
        "interviews",
        "dashboard-stats",
      ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success("Candidate decision saved");
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message || "Could not save candidate decision",
      ),
  });
  const handleOfferSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (!routeCandidate) return;
    const salaryText = String(values.get("offeredSalary") || "");
    if (values.get("joiningStatus") === "JOINED" && values.get("offerStatus") !== "OFFER_ACCEPTED") {
      toast.error("Set Offer response to Accepted before confirming joining.");
      return;
    }
    offerMutation.mutate({
      id: routeCandidate.id,
      payload: {
        offerStatus: String(values.get("offerStatus")),
        offerDate: values.get("offerDate")
          ? new Date(String(values.get("offerDate"))).toISOString()
          : undefined,
        joiningDate: values.get("joiningDate")
          ? new Date(String(values.get("joiningDate"))).toISOString()
          : undefined,
        offeredSalary: salaryText ? Number(salaryText) : undefined,
        joiningStatus: values.has("joiningStatus") ? String(values.get("joiningStatus")) : undefined,
        actualJoiningDate: values.get("actualJoiningDate")
          ? new Date(String(values.get("actualJoiningDate"))).toISOString()
          : undefined,
      },
    });
  };
  const updateReqMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      recruitmentApi.updateRequisition(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsReqModalOpen(false);
      setEditingReq(null);
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message || "Could not update requisition",
      ),
  });

  const handleExportCandidates = () => {
    if (!candidatesData?.length) return;
    const encodedUri =
      "data:text/csv;charset=utf-8," +
      encodeURIComponent(candidateCsv(candidatesData));
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Candidates_${selectedReq?.positionTitle?.replace(/\s+/g, "_") || "Pipeline"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmitReq = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      positionTitle: formData.get("positionTitle"),
      departmentId: formData.get("departmentId"),
      location: formData.get("location"),
      numberOfVacancies: Number(formData.get("numberOfVacancies")),
    };

    if (editingReq) {
      updateReqMutation.mutate({ id: editingReq.id, payload });
    } else {
      createReqMutation.mutate({
        ...payload,
        requisitionDate: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="space-y-6">
      <nav aria-label="Recruitment breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
        <button type="button" className="hover:underline" onClick={() => navigate("/recruitment?tab=openings")}>Recruitment</button>
        {(selectedReq || searchParams.get("opening")) && <><span aria-hidden="true">/</span><button type="button" className="hover:underline" onClick={() => navigate(`/recruitment?tab=pipeline&opening=${encodeURIComponent(selectedReq?.id || searchParams.get("opening") || "")}&q=${encodeURIComponent(searchParams.get("q") || "")}&viewStage=${encodeURIComponent(searchParams.get("viewStage") || "TELEPHONIC")}`)}>{selectedReq?.positionTitle || data.find((item: any) => item.id === searchParams.get("opening"))?.positionTitle || "Opening"}</button></>}
        {routeCandidate && <><span aria-hidden="true">/</span><span aria-current="page" className="font-medium text-text-heading">{routeCandidate.candidateName}</span></>}
      </nav>
      <PageHeader
        title={!selectedReq && activeTab === "pipeline" ? `${data.find((item: any) => item.id === searchParams.get("opening"))?.positionTitle || "Recruitment"} candidates` : !selectedReq && activeTab === "openings" ? "Job positions" : "Recruitment Tracker"}
        description={!selectedReq && activeTab === "openings" ? "Manage positions and follow each applicant through hiring." : "Track stages, schedule interviews and review feedback."}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {canAdd("recruitment") && (
              <Button
                variant="outline"
                onClick={() => setApplicationOpen(true)}
              >
                New application
              </Button>
            )}
            {canAdd("recruitment") && activeTab !== "pipeline" && (
              <Button
                onClick={() => {
                  setEditingReq(null);
                  setIsReqModalOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> New position
              </Button>
            )}
          </div>
        }
      />

      <div className="animate-in fade-in flex-1 min-h-0 h-full">
        {selectedReq ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  aria-label="Back to position pipeline"
                  onClick={() =>
                    navigate(
                      searchParams.get("returnTo")?.startsWith("/recruitment/interviews?") ? searchParams.get("returnTo")! : activeTab === "pipeline"
                        ? `/recruitment?tab=pipeline&q=${encodeURIComponent(searchParams.get("q") || "")}&opening=${encodeURIComponent(searchParams.get("opening") || "")}&viewStage=${encodeURIComponent(searchParams.get("viewStage") || "TELEPHONIC")}`
                        : "/recruitment?tab=openings",
                    )
                  }
                  className="px-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-navy-900 dark:text-white">
                    {selectedReq.positionTitle}
                  </h2>
                  {selectedReq.closureSource && (
                    <p className="text-sm text-gray-500">
                      Closed{" "}
                      {selectedReq.closureSource === "AUTO_FILLED"
                        ? "automatically"
                        : "manually"}
                      : {selectedReq.closureReason || "No reason recorded"}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {routeCandidate ? "Candidate details and interview progress" : "Candidates for this opening"}
                  </p>
                </div>
              </div>
              {canExport("recruitment") && (
                <Button variant="outline" onClick={handleExportCandidates}>
                  <Download className="w-4 h-4 mr-2" /> Export Register
                </Button>
              )}
            </div>
            {routeCandidateId ? (
              isCandidatesLoading ? (
                <div className="py-12">
                  <LoadingSpinner />
                </div>
              ) : routeCandidate ? (
                <section
                  className="space-y-5 rounded-xl border border-slate-border bg-surface p-5 shadow-sm"
                  aria-label={`${routeCandidate.candidateName} recruitment stages`}
                >
                  <details className="group w-full rounded-lg border border-slate-border p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium"><span>Candidate details</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-text-muted sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-gray-500">Phone</dt>
                        <dd>{routeCandidate.mobile || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Qualification</dt>
                        <dd>{routeCandidate.qualification || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Experience</dt>
                        <dd>
                          {routeCandidate.totalExperience != null
                            ? `${routeCandidate.totalExperience} years`
                            : "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Current company</dt>
                        <dd>{routeCandidate.currentCompany || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Notice period</dt>
                        <dd>{routeCandidate.noticePeriod != null ? `${routeCandidate.noticePeriod} days` : "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Application source</dt>
                        <dd>{routeCandidate.source || "Not provided"}</dd>
                      </div>
                      {canViewRestricted("recruitment") && (
                        <>
                          <div>
                            <dt className="text-xs text-gray-500">Expected salary</dt>
                            <dd>
                              {routeCandidate.expectedSalary != null
                                ? `₹${Number(routeCandidate.expectedSalary).toLocaleString("en-IN")}`
                                : "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Current salary</dt>
                            <dd>
                              {routeCandidate.currentSalary != null
                                ? `₹${Number(routeCandidate.currentSalary).toLocaleString("en-IN")}`
                                : "Not provided"}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </details>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-navy-900 dark:text-white">
                        {routeCandidate.candidateName}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {routeCandidate.email || "No email provided"}
                      </p>
                    </div>

                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-border bg-tint p-4">
                    <div><p className="text-xs text-text-muted">Next action · {candidateStages.find(stage => stage.value === currentCandidateStage)?.label}</p><p className="mt-1 font-semibold text-text-heading">{candidateNextAction(routeCandidate)}</p></div>
                    <Button type="button" variant="outline" onClick={() => { setReviewStage(currentCandidateStage); requestAnimationFrame(() => document.getElementById("candidate-round-actions")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}>View current round</Button>
                  </div>
                  <nav aria-label="Candidate stages" className="rounded-xl border border-slate-border p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-text-heading">Hiring stages</h4>
                        <p className="text-xs text-text-muted">Step {reviewStageIndex + 1} of {candidateStages.length} · Select a stage to review it here.</p>
                      </div>
                      <span className="rounded-full bg-tint px-3 py-1 text-xs font-medium text-text-heading">
                        Current: {candidateStages[candidateStageIndex]?.label || "Completed"}
                      </span>
                    </div>
                    <ol aria-label="View recruitment stage" className="flex min-w-0 gap-2 overflow-x-auto pb-2">
                    {candidateStages.map((stage, index) => {
                      const locked = index < candidateStageIndex && (routeCandidate.interviews || []).some(
                        (interview: any) => interview.round === stage.value && interview.status === "COMPLETED" && !!interview.feedbackSubmittedAt,
                      );
                      const complete = isStageComplete(stage.value, index);
                      const current = index === candidateStageIndex && currentCandidateStage !== "JOINED";
                      return (
                        <li key={stage.value} className="w-40 shrink-0">
                          <button type="button" aria-pressed={reviewStage === stage.value} title={locked ? "View completed stage (read only)" : undefined} onClick={() => setReviewStage(stage.value)} className={`h-full w-full rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${locked ? "opacity-80" : ""} ${reviewStage === stage.value ? "ring-2 ring-brand-primary" : ""} ${current ? "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30" : complete ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-slate-border bg-surface"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${current ? "bg-orange-500 text-white" : complete ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}
                            >
                              {complete ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                index + 1
                              )}
                            </span>
                            <span className="font-semibold text-navy-900 dark:text-white">
                              {stage.label}
                            </span>
                          </div>
                          <p className="mt-2 pl-9 text-xs text-gray-500 dark:text-gray-400">
                            {current
                              ? "Current stage"
                              : complete
                                ? "Completed"
                                : index < candidateStageIndex ? "No completed review recorded" : "Upcoming"}
                          </p>
                          </button>
                        </li>
                      );
                    })}
                    </ol>
                  </nav>
                  <details open={!collapseCompletedPreviousStage} className={`group ${collapseCompletedPreviousStage ? "rounded-xl border border-slate-border bg-tint" : ""}`}>
                    <summary className={collapseCompletedPreviousStage ? "flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold" : "hidden"}>
                      <span>{candidateStages[reviewStageIndex]?.label} stage details</span>
                      <span className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Completed</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></span>
                    </summary>
                    <div className={collapseCompletedPreviousStage ? "space-y-4 border-t border-slate-border p-4" : "space-y-4"}>
                  <section id="candidate-round-actions" aria-label={`${candidateStages[reviewStageIndex]?.label || "Selected stage"} workspace`} className="space-y-2 rounded-xl border border-slate-border bg-tint p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{reviewStage === currentCandidateStage ? "Current stage" : reviewStageIndex < candidateStageIndex ? "Previous stage" : "Upcoming stage"}</p>
                        <h4 className="mt-1 text-lg font-semibold text-text-heading">{candidateStages[reviewStageIndex]?.label}</h4>
                      </div>
                      <span className="rounded-full border border-slate-border bg-surface px-3 py-1 text-xs font-medium text-text-muted">Step {reviewStageIndex + 1} / {candidateStages.length}</span>
                    </div>
                    <p className="text-sm text-text-muted">{STAGE_GUIDANCE[reviewStage]}</p>
                    <p className="text-sm font-medium">Application outcome: {(routeCandidate.selectionStatus || "IN_PROGRESS").replaceAll("_", " ").toLowerCase()}</p>
                  </section>

                  {canEdit("recruitment") && (
                    <div className="space-y-4">
                      {["OFFER", "JOINED"].includes(reviewStage) && <details open={!hiringCompleted} className="group rounded-xl border border-slate-border">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold">
                          <span>{reviewStage === "JOINED" ? "Offer and joining details" : "Offer management"}</span>
                          <span className="flex shrink-0 items-center gap-2">{hiringCompleted && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Completed</span>}<ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></span>
                        </summary>
                        <form
                        key={`${routeCandidate.id}:${reviewStage}`}
                        onSubmit={handleOfferSubmit}
                        className="space-y-3 border-t border-slate-border p-4"
                      >
                        {reviewStage === "OFFER" && <>
                        <Select
                          name="offerStatus"
                          label="Offer status"
                          defaultValue={
                            routeCandidate.offerStatus || "NOT_RELEASED"
                          }
                        >
                          <option value="NOT_RELEASED">Not released</option>
                          <option value="RELEASED">Released</option>
                          <option value="OFFER_ACCEPTED">Accepted</option>
                          <option value="OFFER_DECLINED">Declined</option>
                        </Select>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {canViewRestricted("recruitment") && (
                            <Input
                              name="offeredSalary"
                              label="Offer salary (₹)"
                              type="number"
                              min="0"
                              defaultValue={routeCandidate.offeredSalary ?? ""}
                            />
                          )}
                          <Input
                            name="offerDate"
                            label="Offer date"
                            type="date"
                            defaultValue={
                              routeCandidate.offerDate?.slice(0, 10) || ""
                            }
                          />
                          <Input
                            name="joiningDate"
                            label="Expected joining date"
                            type="date"
                            defaultValue={
                              routeCandidate.joiningDate?.slice(0, 10) || ""
                            }
                          />
                        </div>
                        </>}
                        {reviewStage === "JOINED" && <>
                        <Select
                          name="offerStatus"
                          label="Offer response"
                          defaultValue={routeCandidate.offerStatus || "NOT_RELEASED"}
                          required
                        >
                          {routeCandidate.offerStatus === "NOT_RELEASED" && <option value="NOT_RELEASED">Not released</option>}
                          <option value="RELEASED">Awaiting acceptance</option>
                          <option value="OFFER_ACCEPTED" disabled={!["RELEASED", "OFFER_ACCEPTED"].includes(routeCandidate.offerStatus)}>Accepted</option>
                          {routeCandidate.offerStatus === "OFFER_DECLINED" && <option value="OFFER_DECLINED">Declined</option>}
                        </Select>
                        {!["RELEASED", "OFFER_ACCEPTED"].includes(routeCandidate.offerStatus) && <Button type="button" variant="outline" onClick={() => setReviewStage("OFFER")}>Review offer</Button>}
                        <Select
                          name="joiningStatus"
                          label="Joining outcome"
                          value={joiningOutcome}
                          onChange={(event) => setJoiningOutcome(event.target.value)}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="JOINED">Joined</option>
                          <option value="NOT_JOINED">Did not join</option>
                        </Select>
                        <Input
                          name="actualJoiningDate"
                          label="Actual joining date"
                          type="date"
                          required={joiningOutcome === "JOINED"}
                          defaultValue={
                            routeCandidate.actualJoiningDate?.slice(0, 10) || ""
                          }
                        />
                        </>}
                        <Button
                          type="submit"
                          disabled={offerMutation.isPending}
                        >
                          {offerMutation.isPending
                            ? "Saving…"
                            : reviewStage === "JOINED" ? "Save joining outcome" : "Save offer status"}
                        </Button>
                        </form>
                      </details>}
                    </div>
                  )}
                  {["OFFER", "JOINED"].includes(reviewStage) && <dl className="grid grid-cols-1 gap-3 rounded-xl border border-slate-border p-4 text-sm sm:grid-cols-2">
                    <div><dt className="text-text-muted">{reviewStage === "OFFER" ? "Offer response" : "Joining outcome"}</dt><dd className="mt-1 font-medium">{(reviewStage === "OFFER" ? routeCandidate.offerStatus || "NOT_RELEASED" : routeCandidate.joiningStatus || "PENDING").replace("OFFER_", "").replaceAll("_", " ").toLowerCase()}</dd></div>
                    <div><dt className="text-text-muted">Expected joining date</dt><dd className="mt-1 font-medium">{routeCandidate.joiningDate ? new Date(routeCandidate.joiningDate).toLocaleDateString("en-IN", {timeZone:"Asia/Kolkata"}) : "Not provided"}</dd></div>
                    {reviewStage === "OFFER" && <div><dt className="text-text-muted">Offer date</dt><dd className="mt-1 font-medium">{routeCandidate.offerDate ? new Date(routeCandidate.offerDate).toLocaleDateString("en-IN", {timeZone:"Asia/Kolkata"}) : "Not provided"}</dd></div>}
                    {reviewStage === "OFFER" && canViewRestricted("recruitment") && <div><dt className="text-text-muted">Offered salary</dt><dd className="mt-1 font-medium">{routeCandidate.offeredSalary != null ? `₹${Number(routeCandidate.offeredSalary).toLocaleString("en-IN")}` : "Not provided"}</dd></div>}
                    {reviewStage === "JOINED" && <div><dt className="text-text-muted">Actual joining date</dt><dd className="mt-1 font-medium">{routeCandidate.actualJoiningDate ? new Date(routeCandidate.actualJoiningDate).toLocaleDateString("en-IN", {timeZone:"Asia/Kolkata"}) : "Not provided"}</dd></div>}
                  </dl>}
                  {!["OFFER", "JOINED"].includes(reviewStage) && <>
                  <section className="space-y-3" aria-label="Round appointments and feedback">
                    {canAdd("recruitment") && reviewStage !== "TELEPHONIC" && candidateStages.findIndex(stage => stage.value === reviewStage) >= candidateStageIndex && !roundAppointments.some((item: any) => item.status === "SCHEDULED") && !["SELECTED", "SELECTION_REJECTED"].includes(routeCandidate.selectionStatus) && routeCandidate.joiningStatus !== "JOINED" && <Button onClick={() => setScheduleCandidate({ ...routeCandidate, interviewId: undefined, interviewDate: undefined, interviewRound: reviewStage })}>Schedule {candidateStages.find(stage => stage.value === reviewStage)?.label.toLowerCase()}</Button>}
                    {roundAppointments.map((interview: any) => <InterviewAppointmentPanel key={interview.id} interview={interview} editable={canEdit("recruitment") && reviewStage === currentCandidateStage && !["SELECTED", "SELECTION_REJECTED"].includes(routeCandidate.selectionStatus) && routeCandidate.joiningStatus !== "JOINED"} onReschedule={() => setScheduleCandidate({ ...routeCandidate, ...interview, id: routeCandidate.id, interviewId: interview.id, interviewDate: interview.startsAt, interviewRound: interview.round, interviewLocation: interview.location })} />)}
                    {!roundAppointments.length && <p className="rounded-xl border border-dashed border-slate-border p-4 text-sm text-text-muted">{reviewStage === "TELEPHONIC" ? "Record the telephonic assessment through the existing stage controls below. Calendar scheduling is not required." : "No appointments recorded for this round."}</p>}
                  </section>
                  </>}
                  <CandidateStageControls
                    candidate={routeCandidate}
                    editable={canEdit("recruitment") && reviewStage === currentCandidateStage}
                    showHistory={false}
                    onOpenJoining={() => setReviewStage("JOINED")}
                    beforeHistory={canEdit("recruitment") && reviewStage === "MANAGEMENT" ? (
                      <details className="group rounded-xl border border-slate-border">
                        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-semibold">
                          <span>Candidate decision</span>
                          <span className="ml-2 text-sm font-normal capitalize text-text-muted">
                            {(routeCandidate.selectionStatus || "IN_PROGRESS").replace("SELECTION_", "").replaceAll("_", " ").toLowerCase()}
                          </span>
                          <ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                        </summary>
                        <form
                          className="grid gap-3 border-t border-slate-border p-4 sm:grid-cols-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const values = new FormData(e.currentTarget);
                            decisionMutation.mutate({
                              selectionStatus:
                                values.get("selectionStatus") === "IN_PROGRESS"
                                  ? null
                                  : values.get("selectionStatus"),
                            });
                          }}
                        >
                          <Select
                            name="selectionStatus"
                            label="Candidate decision"
                            defaultValue={routeCandidate.selectionStatus || "IN_PROGRESS"}
                          >
                            <option value="IN_PROGRESS">In progress</option>
                            <option value="SELECTION_ON_HOLD">On hold</option>
                            <option value="SELECTED">Selected</option>
                            <option value="SELECTION_REJECTED">Rejected</option>
                          </Select>
                          <div className="self-end">
                            <Button type="submit" disabled={decisionMutation.isPending}>
                              Save decision
                            </Button>
                          </div>
                        </form>
                      </details>
                    ) : null}
                  />
                    </div>
                  </details>
                  <CandidateStageHistory candidate={routeCandidate} />
                </section>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-border p-8 text-center text-gray-500">
                  Candidate not found for this requisition.
                </div>
              )
            ) : (
              <div className="py-12">
                <LoadingSpinner />
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {activeTab !== "pipeline" && <nav
              className="grid w-full grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:flex sm:w-fit sm:max-w-full"
              role="tablist"
              aria-label="Recruitment workspace"
            >
              {(["openings", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setShowHistory(tab === "history");
                    navigate(`/recruitment?tab=${tab}`);
                  }}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold capitalize ${activeTab === tab ? "bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-300" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"}`}
                >
                  {tab === "openings"
                    ? `Openings (${activeRequisitions.length})`
                    : `History (${historyRequisitions.length})`}
                </button>
              ))}
            </nav>}
            {activeTab === "pipeline" ? (
              <CandidatePipeline requisitions={data} />
            ) : (
              <JobPositions
                requisitions={visibleRequisitions}
                editable={canEdit("recruitment")}
                history={activeTab === "history"}
                onEdit={(opening) => { setEditingReq(opening); setIsReqModalOpen(true); }}
                onClose={(opening) => {
                  setClosureReason("");
                  setClosureRequest({ id: opening.id, status: ["CLOSED", "JOINED_REJECTED"].includes(opening.status) ? "REQUIREMENT" : "CLOSED" });
                }}
              />
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={isReqModalOpen}
        onClose={() => {
          setIsReqModalOpen(false);
          setEditingReq(null);
        }}
        title={editingReq ? "Edit Job Requisition" : "New Job Requisition"}
      >
        <form onSubmit={handleSubmitReq} className="space-y-4">
          <Input
            name="positionTitle"
            label="Job Title"
            placeholder="e.g. Senior Frontend Engineer"
            required
            defaultValue={editingReq?.positionTitle}
          />
          <div className="flex flex-col">
            <label
              htmlFor="requisition-department"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1  text-gray-700 dark:text-gray-300 mb-1"
            >
              Department
            </label>
            <Select
              id="requisition-department"
              name="departmentId"
              required
              defaultValue={editingReq?.departmentId}
              className="w-full rounded-[1.25rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface px-4 py-3 text-[13px] focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] bg-surface text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            >
              <option value="">Select Department...</option>
              {deptData?.data?.map((dept: any) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              name="location"
              label="Location"
              placeholder="e.g. Remote"
              required
              defaultValue={editingReq?.location}
            />
            <Input
              name="numberOfVacancies"
              label="Vacancies"
              type="number"
              min="1"
              required
              defaultValue={editingReq?.numberOfVacancies}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsReqModalOpen(false);
                setEditingReq(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createReqMutation.isPending || updateReqMutation.isPending
              }
            >
              {createReqMutation.isPending || updateReqMutation.isPending
                ? "Submitting..."
                : editingReq
                  ? "Update Requisition"
                  : "Create Requisition"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!closureRequest}
        onClose={() => setClosureRequest(null)}
        title={
          closureRequest?.status === "CLOSED"
            ? "Close opening"
            : "Reopen opening"
        }
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            closureMutation.mutate({
              ...closureRequest,
              reason: closureReason,
            });
          }}
        >
          <Input
            label="Reason"
            required
            value={closureReason}
            onChange={(e) => setClosureReason(e.target.value)}
          />
          <Button
            type="submit"
            disabled={closureMutation.isPending || !closureReason.trim()}
          >
            Save opening status
          </Button>
        </form>
      </Modal>
      <Modal
        isOpen={applicationOpen && canAdd("recruitment")}
        onClose={() => { setApplicationOpen(false); setIsParsingResume(false); setResumeFileName(""); }}
        title="New application"
      >
        <form
          ref={applicationFormRef}
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const values = new FormData(e.currentTarget);
            const optionalNumber = (name: string) => {
              const value = String(values.get(name) ?? "").trim();
              return value === "" ? undefined : Number(value);
            };
            applicationMutation.mutate({
              candidateName: values.get("candidateName"),
              requisitionId: values.get("requisitionId"),
              email: values.get("email") || undefined,
              mobile: values.get("mobile") || undefined,
              qualification: values.get("qualification") || undefined,
              totalExperience: optionalNumber("totalExperience"),
              currentCompany: values.get("currentCompany") || undefined,
              currentSalary: optionalNumber("currentSalary"),
              expectedSalary: optionalNumber("expectedSalary"),
              noticePeriod: optionalNumber("noticePeriod"),
              source: values.get("source") || undefined,
            });
          }}
        >
          <div className="rounded-xl border border-slate-border p-4">
            <p className="mb-2 text-sm font-semibold text-text-heading">Fill application from resume</p>
            <input
              ref={resumeInputRef}
              id="candidate-resume"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={isParsingResume}
              hidden
              onChange={async (event) => {
                const fileInput = event.currentTarget;
                const file = fileInput.files?.[0];
                if (!file) return;
                if (file.size > 20 * 1024 * 1024) {
                  toast.error("Resume must be 20 MB or smaller.");
                  setResumeFileName("");
                  fileInput.value = "";
                  return;
                }
                setResumeFileName(file.name);
                setIsParsingResume(true);
                try {
                  const { extractResumeFields, readResumeText } = await import("./resumeAutofill");
                  const text = await readResumeText(file);
                  const fields = extractResumeFields(text);
                  const form = applicationFormRef.current;
                  let filledCount = 0;
                  for (const [name, value] of Object.entries(fields)) {
                    const input = form?.elements.namedItem(name);
                    if (input instanceof HTMLInputElement && value) {
                      input.value = value;
                      input.dispatchEvent(new Event("input", { bubbles: true }));
                      input.dispatchEvent(new Event("change", { bubbles: true }));
                      filledCount += 1;
                    }
                  }
                  if (filledCount) {
                    toast.success(`Filled ${filledCount} field${filledCount === 1 ? "" : "s"}. Review the details before saving.`);
                  } else {
                    toast.error("No supported details were found. This resume may be scanned or use an unsupported layout.");
                  }
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not read this resume.");
                } finally {
                  setIsParsingResume(false);
                  fileInput.value = "";
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isParsingResume}
                onClick={() => resumeInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isParsingResume ? "Reading resume…" : "Upload resume"}
              </Button>
              {resumeFileName && <span className="max-w-full truncate text-xs text-text-muted">{resumeFileName}</span>}
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Choose a PDF or DOCX (up to 20 MB). Extracted details stay editable; review them before saving.
            </p>
          </div>
          <Select name="requisitionId" label="Opening" required defaultValue={selectedReq?.id || searchParams.get("opening") || ""}>
            <option value="">Choose an opening</option>
            {activeRequisitions.map((req: any) => (
              <option key={req.id} value={req.id}>
                {req.positionTitle}
              </option>
            ))}
          </Select>
          <fieldset className="space-y-3 rounded-xl border border-slate-border p-4">
            <legend className="px-1 font-semibold text-text-heading">Contact details</legend>
            <Input name="candidateName" label="Candidate name" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="email" label="Email" type="email" required />
              <Input name="mobile" label="Phone" type="tel" maxLength={20} required />
            </div>
          </fieldset>
          <fieldset className="space-y-3 rounded-xl border border-slate-border p-4">
            <legend className="px-1 font-semibold text-text-heading">Education & experience</legend>
            <Input name="qualification" label="Qualification" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="totalExperience" label="Total experience (years)" type="number" min="0" step="0.01" placeholder="0 for a fresher" required />
              <Input name="currentCompany" label="Current company (optional)" />
            </div>
          </fieldset>
          <fieldset className="space-y-3 rounded-xl border border-slate-border p-4">
            <legend className="px-1 font-semibold text-text-heading">Availability & compensation</legend>
            {canViewRestricted("recruitment") && <div className="grid gap-3 sm:grid-cols-2">
              <Input name="currentSalary" label="Current salary (₹, optional)" type="number" min="0" step="0.01" />
              <Input name="expectedSalary" label="Expected salary (₹, optional)" type="number" min="0" step="0.01" />
            </div>}
            <Input name="noticePeriod" label="Notice period (days, optional)" type="number" min="0" step="1" placeholder="0 for immediate availability" />
            <Input name="source" label="Application source (optional)" placeholder="Referral, job portal, company website…" />
          </fieldset>
          <Button type="submit" disabled={applicationMutation.isPending}>
            Save application
          </Button>
        </form>
      </Modal>
      <ScheduleInterviewModal
        isOpen={!!scheduleCandidate && canAdd("recruitment")}
        onClose={() => setScheduleCandidate(null)}
        existingCandidate={scheduleCandidate}
      />
    </div>
  );
}
