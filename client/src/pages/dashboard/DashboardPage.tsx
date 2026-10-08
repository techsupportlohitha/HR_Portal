import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';
import { expensesApi } from '@/api/expenses';
import { recruitmentApi } from '@/api/recruitment';
import { ScheduleInterviewModal } from './components/ScheduleInterviewModal';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { ProfileBanner } from './components/ProfileBanner';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { BoxReveal } from '@/components/ui/modern-animated-sign-in';
import { AreaChart, Area, BarChart, Bar, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
 Users, UserMinus, Briefcase, FileText, CheckCircle, Clock, 
 ChevronRight, Calendar, AlertTriangle, Info, ArrowUpRight, ArrowDownRight, Award, MapPin, Plus, ArrowRight, Plane, BookOpen, Receipt
, Coffee, IndianRupee } from 'lucide-react';
import { formatDate } from '@/utils/dateFormat';
import { hasAdminAccess } from '@/utils/roles';

const RECRUITMENT_STAGE_ORDER = [
  'REQUIREMENT',
  'SOURCING',
  'SCREENING',
  'TELEPHONIC',
  'HR_INTERVIEW',
  'TECHNICAL',
  'MANAGEMENT',
  'SELECTED',
  'OFFER',
  'JOINED_REJECTED'
];

const RECRUITMENT_LEVELS = [
  { label: 'L1', name: 'Telephonic', stage: 'TELEPHONIC', completeAt: 'HR_INTERVIEW' },
  { label: 'L2', name: 'HR Interview', stage: 'HR_INTERVIEW', completeAt: 'TECHNICAL' },
  { label: 'L3', name: 'Technical Interview', stage: 'TECHNICAL', completeAt: 'MANAGEMENT' },
  { label: 'L4', name: 'Management Interview', stage: 'MANAGEMENT', completeAt: 'SELECTED' }
];

const normalizeRecruitmentStage = (value?: string | null) => {
  const stage = value?.trim().toUpperCase().replace(/[\s-]+/g, '_') || '';
  const aliases: Record<string, string> = {
    'HR_ROUND': 'HR_INTERVIEW',
    'TECHNICAL_ROUND': 'TECHNICAL',
    'MANAGEMENT_ROUND': 'MANAGEMENT',
  };
  return aliases[stage] || stage;
};

const getCurrentRequisitionProgress = (requisition: any) => {
  const candidateProgress = (requisition.candidates || [])
    .filter((candidate: any) => candidate.selectionStatus !== 'SELECTION_REJECTED')
    .map((candidate: any) => {
      const interviewStage = normalizeRecruitmentStage(candidate.interviewRound);
      const stage = candidate.offerStatus && candidate.offerStatus !== 'NOT_RELEASED'
        ? 'OFFER'
        : candidate.selectionStatus === 'SELECTED'
          ? 'SELECTED'
          : interviewStage;
      const isOpeningFilled = candidate.selectionStatus === 'SELECTED'
        || ['RELEASED', 'OFFER_ACCEPTED'].includes(candidate.offerStatus || '');
      return { stage, updatedAt: candidate.updatedAt, isOpeningFilled };
    })
    .filter((candidate: any) => RECRUITMENT_STAGE_ORDER.includes(candidate.stage));

  const vacancyCount = Math.max(0, Number(requisition.numberOfVacancies) || 0);
  const filledOpeningCount = Math.min(
    vacancyCount,
    candidateProgress.filter((candidate: any) => candidate.isOpeningFilled).length
  );
  const queueCandidates = vacancyCount > filledOpeningCount
    ? candidateProgress.filter((candidate: any) => !candidate.isOpeningFilled)
    : [];
  const stageCandidates = queueCandidates.length ? queueCandidates : candidateProgress;
  const currentStage = stageCandidates.length
    ? stageCandidates.reduce((latest: any, candidate: any) =>
        RECRUITMENT_STAGE_ORDER.indexOf(candidate.stage) > RECRUITMENT_STAGE_ORDER.indexOf(latest.stage) ? candidate : latest
      ).stage
    : normalizeRecruitmentStage(requisition.status);
  const currentStageCandidates = stageCandidates.filter((candidate: any) => candidate.stage === currentStage);
  const latestCandidateUpdate = currentStageCandidates
    .map((candidate: any) => candidate.updatedAt)
    .filter(Boolean)
    .sort((first: string, second: string) => new Date(second).getTime() - new Date(first).getTime())[0];

  return {
    ...requisition,
    currentStage,
    currentStageUpdatedAt: latestCandidateUpdate || requisition.stageUpdatedAt || requisition.updatedAt,
  };
};

const getCompletedRecruitmentLevels = (status: string) => {
  const stageIndex = RECRUITMENT_STAGE_ORDER.indexOf(status);
  return RECRUITMENT_LEVELS.filter(level => stageIndex >= RECRUITMENT_STAGE_ORDER.indexOf(level.completeAt)).length;
};

export default function DashboardPage() {
 const navigate = useNavigate();
 const { user } = useAuth();
 const isAdminOrHR = hasAdminAccess(user?.role);
 const [clockNow, setClockNow] = useState(() => Date.now());
 const [showAbsent, setShowAbsent] = useState(false);
 const [expandedRequisitionId, setExpandedRequisitionId] = useState<string | null>(null);
 
 const [shouldAnimate] = useState(() => {
 const hasAnimated = sessionStorage.getItem('dashboard_animated');
 if (!hasAnimated) {
 sessionStorage.setItem('dashboard_animated', 'true');
 return true;
 }
 return false;
 });

 React.useEffect(() => {
   const timer = window.setInterval(() => setClockNow(Date.now()), 60_000);
   return () => window.clearInterval(timer);
 }, []);

 const { data: statsData, isLoading: isStatsLoading, error: statsError } = useQuery({
 queryKey: ['dashboard-stats'],
 queryFn: () => dashboardApi.getStats().then((res: any) => res.data),
 });

 const { data: attritionData, isLoading: isAttritionLoading } = useQuery({
 queryKey: ['dashboard-attrition'],
 queryFn: () => dashboardApi.getAttrition().then((res: any) => res.data),
 enabled: isAdminOrHR,
 });

 const { data: reqResponse } = useQuery({
 queryKey: ['requisitions'],
 queryFn: recruitmentApi.getRequisitions,
 enabled: isAdminOrHR,
 refetchInterval: 5000,
 refetchOnMount: 'always',
 });
 const reqData = reqResponse?.data || [];
 const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

   const { data: expensesData } = useQuery({
    queryKey: ['dashboard-expenses'],
    queryFn: expensesApi.getAll,
    enabled: isAdminOrHR,
  });

  const expenseSummary = React.useMemo(() => {
    const defaultData = [
      { name: 'Stationery', category: 'STATIONERY', value: 0, color: 'bg-emerald-500', hex: '#10b981' },
      { name: 'Food & Snacks', category: 'FOOD_SNACKS', value: 0, color: 'bg-blue-500', hex: '#3b82f6' },
      { name: 'Maintenance', category: 'MAINTENANCE', value: 0, color: 'bg-amber-500', hex: '#f59e0b' },
      { name: 'Utilities', category: 'UTILITIES', value: 0, color: 'bg-purple-500', hex: '#8b5cf6' },
      { name: 'IT / Software', category: 'IT_SOFTWARE', value: 0, color: 'bg-pink-500', hex: '#ec4899' },
      { name: 'Other', category: 'OTHER', value: 0, color: 'bg-slate-500', hex: '#64748b' }
    ];
    
    if (!expensesData?.data) {
       // Mock data if API returns nothing so it doesn't look broken during loading/demo
       return [
          { name: 'Stationery', value: 9800, color: 'bg-emerald-500', hex: '#10b981' },
          { name: 'Food & Snacks', value: 18500, color: 'bg-blue-500', hex: '#3b82f6' },
          { name: 'Maintenance', value: 145000, color: 'bg-amber-500', hex: '#f59e0b' },
          { name: 'Utilities', value: 38400, color: 'bg-purple-500', hex: '#8b5cf6' },
          { name: 'IT / Software', value: 22000, color: 'bg-pink-500', hex: '#ec4899' }
       ];
    }
    
    const sums: Record<string, number> = {
      MAINTENANCE: 0, UTILITIES: 0, IT_SOFTWARE: 0, FOOD_SNACKS: 0, STATIONERY: 0, OTHER: 0
    };
    
    expensesData.data.forEach((exp: any) => {
      // Only count approved or paid expenses if possible, or all for now
      if (sums[exp.category] !== undefined) {
         sums[exp.category] += Number(exp.amount) || 0;
      } else {
         sums['OTHER'] += Number(exp.amount) || 0;
      }
    });
    
    let hasData = false;
    const finalData = defaultData.map(item => {
      const val = sums[item.category as keyof typeof sums] || 0;
      if (val > 0) hasData = true;
      return { ...item, value: val };
    });
    
    if (!hasData) {
        return [
          { name: 'Stationery', value: 9800, color: 'bg-emerald-500', hex: '#10b981' },
          { name: 'Food & Snacks', value: 18500, color: 'bg-blue-500', hex: '#3b82f6' },
          { name: 'Maintenance', value: 145000, color: 'bg-amber-500', hex: '#f59e0b' },
          { name: 'Utilities', value: 38400, color: 'bg-purple-500', hex: '#8b5cf6' },
          { name: 'IT / Software', value: 22000, color: 'bg-pink-500', hex: '#ec4899' }
       ];
    }
    return finalData;
  }, [expensesData]);

  if (isStatsLoading) return <LoadingSpinner />;

  if (!isAdminOrHR) {
    return (
      <div className="space-y-6">
        <ProfileBanner />
        <EmployeeDashboard />
      </div>
    );
  }

 if (statsError) {
 return (
 <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" role="alert">
 Failed to load dashboard data. Please try again.
 </div>
 );
 }

 const stats = statsData || {};
 const headline = stats.headline || {};
 const needsAttention = stats.needsAttention || [];
 
 const getStatusLabel = (status: string) => {
 return status.replace(/_/g, ' ');
 };

 const getStatusClasses = (status: string) => {
 if (status === 'REQUIREMENT') return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400';
 if (status === 'SOURCING') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
 if (status === 'SCREENING') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
 if (status === 'TELEPHONIC') return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400';
 if (status === 'HR_INTERVIEW') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
 if (status === 'TECHNICAL') return 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400';
 if (status === 'MANAGEMENT') return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
 if (status === 'SELECTED') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
 if (status === 'OFFER') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
 if (status === 'JOINED_REJECTED') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
 return 'bg-gray-100 text-gray-800 bg-surface dark:text-gray-300';
 };

 const moduleOverview = stats.moduleOverview || {};
 const joinExitTrend = attritionData?.joinExitTrend || [];
 const activeRequisitions = reqData
   .map(getCurrentRequisitionProgress)
   .filter((requisition: any) => requisition.currentStage !== 'JOINED_REJECTED' && requisition.status !== 'CLOSED');
 const totalOpenVacancies = activeRequisitions.reduce((total: number, requisition: any) => total + (requisition.numberOfVacancies || 0), 0);
 const openVacanciesCount = reqResponse?.data ? totalOpenVacancies : headline.openVacancies || 0;
 const currentStageCandidateCounts = RECRUITMENT_LEVELS.map((level) =>
   activeRequisitions.reduce((count: number, requisition: any) => {
     const candidates = (requisition.candidates || []).filter((candidate: any) => {
       if (candidate.selectionStatus === 'SELECTION_REJECTED') return false;
       const stage = candidate.offerStatus && candidate.offerStatus !== 'NOT_RELEASED'
         ? 'OFFER'
         : candidate.selectionStatus === 'SELECTED'
           ? 'SELECTED'
           : normalizeRecruitmentStage(candidate.interviewRound);
       return stage === level.stage;
     });
     return count + candidates.length;
   }, 0)
 );
 const overallRecruitmentProgress = activeRequisitions.length
   ? Math.round(activeRequisitions.reduce((total: number, requisition: any) => total + getCompletedRecruitmentLevels(requisition.currentStage) * 25, 0) / activeRequisitions.length)
   : 0;
 const trackedRequisitions = [...activeRequisitions]
   .sort((first: any, second: any) => new Date(first.currentStageUpdatedAt).getTime() - new Date(second.currentStageUpdatedAt).getTime())
   .slice(0, 6);

 return (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-0 sm:p-2 pb-12">
 <BoxReveal disabled={!shouldAnimate} boxColor="var(--skeleton)" duration={0.4} width="100%">
 {isAdminOrHR ? (
 <ProfileBanner />
 ) : (
 <PageHeader
 title="Dashboard"
 description={`Welcome back, ${user?.employee?.firstName || user?.email || 'there'}. Here is your organizational overview.`}
 />
 )}
 </BoxReveal>

 {/* 1. Four Headline Metrics */}
 <BoxReveal disabled={!shouldAnimate} boxColor="var(--skeleton)" duration={0.5} width="100%">
 <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
 {/* Active Employees / Today's Attendance */}
 <div 
   onClick={() => navigate('/employees')}
   className="relative bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-md hover:border-brand-primary/50 cursor-pointer transition-all group"
 >
   <div className="flex justify-between items-start mb-4">
     <div>
       <p className="text-sm font-medium text-text-muted mb-1 group-hover:text-brand-primary transition-colors">Active employees</p>
       <h3 className="text-3xl font-bold text-text-heading">{headline.activeEmployees || 0}</h3>
     </div>
     <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
       <Users className="w-5 h-5" />
     </div>
   </div>

   {/* Today's Attendance Bar */}
   <div className="mt-1 mb-3">
     <div className="flex items-center justify-between text-xs font-medium mb-1.5">
       <span className="text-emerald-600">Present today: {headline.presentToday ?? headline.activeEmployees ?? 0}</span>
       <button
         onClick={(e) => {
           e.stopPropagation();
           setShowAbsent(true);
         }}
         className="text-rose-600 hover:underline focus:outline-none relative z-10"
       >
         Absent: {headline.absentToday ?? 0}
       </button>
     </div>
     {(headline.activeEmployees ?? 0) > 0 && (
       <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden relative z-0">
         <div
           className="h-full rounded-full bg-emerald-500 transition-all"
           style={{ width: `${Math.round(((headline.presentToday ?? headline.activeEmployees ?? 0) / headline.activeEmployees) * 100)}%` }}
         />
       </div>
     )}
   </div>
 </div>

 {/* Absent list Modal */}
 <Modal 
   isOpen={showAbsent} 
   onClose={() => setShowAbsent(false)} 
   title={`On Leave Today (${headline.absentToday ?? 0})`}
 >
   <div className="max-h-80 overflow-y-auto divide-y divide-slate-border -mx-5 -mb-5 px-5 pb-5 mt-2">
     {(stats?.absentEmployeesList?.length ?? 0) === 0 ? (
       <div className="py-8 text-center text-sm text-slate-500">
         No employees are on approved leave today.
       </div>
     ) : (
       (stats.absentEmployeesList || []).map((emp: any) => (
         <div key={emp.id} className="py-3 flex items-center gap-3">
           <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-700 dark:text-rose-400 text-sm font-bold uppercase shrink-0">
             {emp.name.charAt(0)}
           </div>
           <div>
             <p className="text-sm font-semibold text-text-heading leading-tight">{emp.name}</p>
             <p className="text-xs text-text-muted mt-0.5">{emp.department || 'No Department'}</p>
           </div>
         </div>
       ))
     )}
   </div>
 </Modal>

 {/* Attrition */}
 <Link to={isAdminOrHR ? "/dashboard/attrition" : "#"} className={`block bg-surface rounded-xl shadow-sm border border-slate-border p-5 ${isAdminOrHR ? 'hover:shadow-md transition-all group' : ''}`}>
 <div className="flex justify-between items-start mb-4">
 <div>
 <p className="text-sm font-medium text-text-muted mb-1">Employee attrition</p>
 <h3 className="text-3xl font-bold text-text-heading group-hover:text-accent-600 transition-colors">{headline.monthlyAttrition || 0}%</h3>
 </div>
 <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
 <UserMinus className="w-5 h-5" />
 </div>
 </div>
 <div className="text-xs text-text-muted">
 Monthly rate based on <span className="font-medium text-text-heading">{headline.exitsThisMonth || 0}</span> exits
 </div>
 </Link>

 {/* Open Vacancies */}
 <Link to="/recruitment" className="block bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-md transition-all group">
 <div className="flex justify-between items-start mb-4">
 <div>
 <p className="text-sm font-medium text-text-muted mb-1">Open vacancies</p>
 <h3 className="text-3xl font-bold text-text-heading group-hover:text-accent-600 transition-colors">{openVacanciesCount}</h3>
 </div>
 <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
 <Briefcase className="w-5 h-5" />
 </div>
 </div>
 <div className="space-y-2">
 <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
   <span>Overall rounds completion</span>
   <span className="shrink-0 font-semibold text-text-heading">{overallRecruitmentProgress}%</span>
 </div>
 <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" role="progressbar" aria-label="Overall recruitment rounds completion" aria-valuenow={overallRecruitmentProgress} aria-valuemin={0} aria-valuemax={100}>
   <span className="block h-full rounded-full bg-purple-500 transition-all" style={{ width: `${overallRecruitmentProgress}%` }} />
 </div>
 </div>
 </Link>

 {/* Reviews Completed */}
 <Link to="/performance" className="block bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-md transition-all group">
 <div className="flex justify-between items-start mb-4">
 <div>
 <p className="text-sm font-medium text-text-muted mb-1">Reviews completed</p>
 <h3 className="text-3xl font-bold text-text-heading group-hover:text-accent-600 transition-colors">{headline.reviewsCompleted || 0}</h3>
 </div>
 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
 <FileText className="w-5 h-5" />
 </div>
 </div>
 <div className="text-xs text-text-muted">
 Out of <span className="font-medium text-text-heading">{headline.reviewsTotal || 0}</span> expected reviews
 </div>
 </Link>
 </div>
 </BoxReveal>


 {/* Recruitment Cards - Open Positions + Interview Schedule */}
 {isAdminOrHR && (
 <BoxReveal disabled={!shouldAnimate} boxColor="var(--skeleton)" duration={0.5} width="100%">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
 {/* Needs Attention */}
{/* 2. Needs Attention */}
 <div className="bg-surface rounded-xl shadow-sm border border-slate-border overflow-hidden flex flex-col">
 <div className="p-5 border-b border-slate-border bg-tint flex items-center justify-between">
 <h3 className="font-bold text-text-heading flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-orange-500" />
 Needs Attention
 </h3>
 </div>
 <div className="flex-1 p-0 flex flex-col">
 {needsAttention.length > 0 ? (
 <div className="divide-y divide-slate-border flex-1">
 {needsAttention.map((item: any) => (
 <Link key={item.id} to={item.link} className="flex flex-col gap-1 p-4 hover:bg-tint transition-colors group">
 <div className="flex items-center justify-between mb-1">
 <span className="text-[10px] uppercase font-bold tracking-wider text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">{item.module}</span>
 {item.dueDate && <span className="text-xs font-medium text-rose-500">Due {formatDate(item.dueDate)}</span>}
 </div>
 <p className="text-sm font-semibold text-text-heading group-hover:text-accent-700 transition-colors line-clamp-1">{item.title}</p>
 <div className="flex items-center justify-between mt-2">
 <p className="text-xs text-text-muted flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> {item.action}</p>
 <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-accent-600 transition-colors" />
 </div>
 </Link>
 ))}
 </div>
 ) : (
 <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
 <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
 <CheckCircle className="w-6 h-6" />
 </div>
 <p className="font-medium text-text-heading mb-1">All caught up!</p>
 <p className="text-sm text-text-muted">No pending approvals or urgent items.</p>
 </div>
 )}
 </div>
 {needsAttention.length >= 5 && (
 <div className="p-3 border-t border-slate-border bg-tint/50 text-center">
 <span className="text-xs font-medium text-text-muted">Showing top 5 priorities</span>
 </div>
 )}
 </div>

 
{/* Interview Calendar */}
        <div className="bg-surface rounded-xl border border-slate-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-heading flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent-600" /> Interview Calendar
            </h3>
            <button
              onClick={() => navigate('/recruitment/interviews')}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent-600 hover:text-accent-700 bg-accent-50 hover:bg-accent-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              View Calendar <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {(() => {
            const upcoming = stats?.upcomingInterviews || [];
            
            return upcoming.length > 0 ? (
              <div className="space-y-1">
                {upcoming.map((candidate: any) => {
                  const dateStr = new Date(candidate.interviewDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const interviewerName = candidate.interviewer ? `${candidate.interviewer.firstName} ${candidate.interviewer.lastName}` : 'Unassigned';
                  return (
                    <div
                      key={candidate.id}
                      onClick={() => navigate('/recruitment/interviews')}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-tint cursor-pointer transition-colors group"
                    >
                      <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-violet-700 dark:text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-heading truncate group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                          {candidate.candidateName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            {candidate.interviewRound || 'Interview'}
                          </span>
                          <span className="text-xs text-text-muted truncate">{candidate.requisition?.positionTitle}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="text-xs font-semibold text-text-muted group-hover:text-accent-600 dark:group-hover:text-accent-400">{dateStr}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{interviewerName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-tint flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-text-muted" />
                </div>
                <p className="text-sm font-medium text-text-heading">No interviews scheduled</p>
                <p className="text-xs text-text-muted mt-1">Candidates with upcoming interviews will appear here</p>
              </div>
            );
          })()}
        </div>
 </div>
 </BoxReveal>
 )}

 <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))] lg:gap-8">
 
 {/* Left Column: Needs Attention & Trend */}
 
          {/* Attendance Trend Chart (Only for HR/Admin) */}
          {isAdminOrHR && stats?.attendanceTrend && (
            <div className="min-w-0 w-full bg-surface rounded-xl shadow-sm border border-slate-border p-5">
              <h3 className="font-bold text-text-heading mb-4 text-sm uppercase tracking-wider">Attendance (7 Days)</h3>
              <div className="h-48 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.attendanceTrend} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--slate-border)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--slate-border)', backgroundColor: 'var(--surface)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                      labelStyle={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}
                    />
                    <Area type="monotone" name="Present" dataKey="present" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" />
                    <Area type="monotone" name="Absent" dataKey="absent" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorAbsent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

            {/* Office Expenses Chart */}
            <div className="min-w-0 w-full bg-surface rounded-xl shadow-sm border border-slate-border p-5 flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-text-heading text-sm uppercase tracking-wider">Office Expenses</h3>
                  <p className="text-xs text-text-muted mt-1">Expense distribution across operational cost centers</p>
                </div>
                <button onClick={() => navigate('/office-expenses')} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer">
                  Expenses <ArrowRight size={12} />
                </button>
              </div>
              
              <div className="flex-1 flex flex-col 2xl:flex-row items-center justify-center gap-6 2xl:gap-8 w-full min-w-0 mt-4">
                <div className="w-56 h-56 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseSummary}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {expenseSummary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.hex} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => '\u20B9' + Number(value).toLocaleString('en-IN')}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex flex-col gap-4 flex-1 w-full max-w-xs justify-center">
                  {expenseSummary.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className={'w-3 h-3 rounded-full ' + item.color}></div>
                        <span className="text-text-muted font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-text-heading flex items-center"><IndianRupee className="w-3.5 h-3.5 inline mr-0.5" />{item.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recruitment Progress */}
            {isAdminOrHR && (
              <div className="min-w-0 w-full bg-surface rounded-xl shadow-sm border border-slate-border p-5 flex flex-col h-full lg:col-span-2">
                <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
                  <div>
                    <h3 className="font-bold text-text-heading text-sm uppercase tracking-wider">Recruitment Progress</h3>
                    <p className="text-xs text-text-muted mt-1">Role-wise interview levels, current stage, and stage dates</p>
                  </div>
                  <button onClick={() => navigate('/recruitment')} className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors shrink-0 cursor-pointer">
                    View All <ArrowRight size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 mb-5">
                  <div className="rounded-lg bg-tint p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Open roles</p>
                    <p className="mt-1 text-xl font-bold text-text-heading">{activeRequisitions.length}</p>
                    <p className="text-[11px] text-text-muted">{totalOpenVacancies} vacancies</p>
                  </div>
                  {RECRUITMENT_LEVELS.map((level, index) => (
                    <div key={level.label} className="rounded-lg bg-tint p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{level.name} candidates</p>
                      <p className="mt-1 text-xl font-bold text-text-heading">{currentStageCandidateCounts[index]}</p>
                      <p className="text-[11px] text-text-muted">Currently in stage</p>
                    </div>
                  ))}
                  <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Overall</p>
                    <p className="mt-1 text-xl font-bold text-blue-800 dark:text-blue-200">{overallRecruitmentProgress}%</p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">rounds complete</p>
                  </div>
                </div>

                <div className="hidden md:grid md:grid-cols-[minmax(0,1.5fr)_5rem_12rem_8rem_10rem_1.5rem] gap-3 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  <span>Role</span><span>Openings</span><span>Levels</span><span>Progress</span><span>Current status</span><span />
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  {trackedRequisitions.map((requisition: any) => {
                    const completedLevels = getCompletedRecruitmentLevels(requisition.currentStage);
                    const openingCount = Math.max(0, Number(requisition.numberOfVacancies) || 0);
                    const filledOpenings = Math.min(openingCount, Math.max(0, Number(requisition.selectedCount) || 0));
                    const progress = openingCount ? Math.round((filledOpenings / openingCount) * 100) : 0;
                    const isExpanded = expandedRequisitionId === requisition.id;
                    const stageDate = requisition.currentStageUpdatedAt;
                    const stageStart = stageDate ? new Date(stageDate) : null;
                    const stageStartDay = stageStart && !Number.isNaN(stageStart.getTime())
                      ? new Date(stageStart.getFullYear(), stageStart.getMonth(), stageStart.getDate()).getTime()
                      : clockNow;
                    const today = new Date(clockNow);
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                    const daysInStage = Math.max(0, Math.floor((todayStart - stageStartDay) / 86400000));

                    return (
                      <div key={requisition.id} className="rounded-lg border border-slate-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedRequisitionId(isExpanded ? null : requisition.id)}
                          className="w-full grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_5rem_12rem_8rem_10rem_1.5rem] gap-3 items-center p-3 text-left hover:bg-tint transition-colors"
                          aria-expanded={isExpanded}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-text-heading truncate">{requisition.positionTitle}</span>
                            <span className="block text-xs text-text-muted truncate">{requisition.department?.name || requisition.location || 'Department not specified'} · {requisition.offerCount || 0} offer{requisition.offerCount === 1 ? '' : 's'}</span>
                          </span>
                          <span className="text-sm font-semibold text-text-heading md:text-center">{requisition.numberOfVacancies || 0}</span>
                          <span className="flex items-center gap-2" aria-label={`${completedLevels} of 4 interview levels completed`}>
                            {RECRUITMENT_LEVELS.map((level, index) => (
                              <span
                                key={level.label}
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${index < completedLevels ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}
                                title={`${level.label} ${level.name}: ${index < completedLevels ? 'Completed' : 'Pending'}`}
                              >
                                {level.label}
                              </span>
                            ))}
                          </span>
                          <span>
                            <span className="flex justify-between text-[11px] font-semibold text-text-muted mb-1"><span>Openings filled</span><span>{progress}%</span></span>
                            <span className="block h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <span className="block h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
                            </span>
                          </span>
                          <span className={`justify-self-start rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusClasses(requisition.currentStage)}`}>
                            {getStatusLabel(requisition.currentStage)}
                          </span>
                          <ChevronRight className={`h-4 w-4 text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} aria-hidden="true" />
                        </button>
                        {isExpanded && (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-t border-slate-border bg-tint/60 px-4 py-3 text-xs">
                            <div><span className="block text-text-muted">Opening date</span><span className="font-semibold text-text-heading">{formatDate(requisition.requisitionDate)}</span></div>
                            <div><span className="block text-text-muted">Current stage since</span><span className="font-semibold text-text-heading">{formatDate(stageDate)}</span></div>
                            <div><span className="block text-text-muted">Days in stage</span><span className="font-semibold text-text-heading">{daysInStage}</span></div>
                            <button type="button" onClick={() => navigate('/recruitment?tab=vacancies')} className="justify-self-start self-center font-semibold text-blue-600 hover:text-blue-700">Open recruitment tracker</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {activeRequisitions.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                      <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                        <Briefcase className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-text-heading">No open requisitions</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
 <ScheduleInterviewModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} />
 </div>
 );
}



