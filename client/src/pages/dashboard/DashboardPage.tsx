import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';
import { recruitmentApi } from '@/api/recruitment';
import { ScheduleInterviewModal } from './components/ScheduleInterviewModal';
import { EmployeeDashboard } from './components/EmployeeDashboard';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { BoxReveal } from '@/components/ui/modern-animated-sign-in';
import { AreaChart, Area, BarChart, Bar, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
 Users, UserMinus, Briefcase, FileText, CheckCircle, Clock, 
 ChevronRight, Calendar, AlertTriangle, Info, ArrowUpRight, ArrowDownRight, Award, MapPin, Plus, ArrowRight, Plane, BookOpen, Receipt
, Coffee } from 'lucide-react';
import { formatDate } from '@/utils/dateFormat';

export default function DashboardPage() {
 const navigate = useNavigate();
 const { user } = useAuth();
 const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';
 const isManager = false;
 const [showAbsent, setShowAbsent] = useState(false);
 
 const [shouldAnimate] = useState(() => {
 const hasAnimated = sessionStorage.getItem('dashboard_animated');
 if (!hasAnimated) {
 sessionStorage.setItem('dashboard_animated', 'true');
 return true;
 }
 return false;
 });

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
 });
 const reqData = reqResponse?.data || [];
 const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

 if (isStatsLoading) return <LoadingSpinner />;

  if (!isAdminOrHR && !isManager) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Dashboard" description={`Welcome back, ${user?.employee?.firstName || user?.email.split('@')[0]}`} />
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

 return (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-0 sm:p-2 pb-12">
 <BoxReveal disabled={!shouldAnimate} boxColor="var(--skeleton)" duration={0.4} width="100%">
 <PageHeader
 title="Dashboard"
 description={`Welcome back, ${user?.employee?.firstName || user?.email || 'there'}. Here is your organizational overview.`}
 />
 </BoxReveal>

 {/* 1. Four Headline Metrics */}
 <BoxReveal disabled={!shouldAnimate} boxColor="var(--skeleton)" duration={0.5} width="100%">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {/* Active Employees / Today's Attendance */}
 <div className="relative bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-md transition-all">
 <div className="flex justify-between items-start mb-4">
 <div>
 <p className="text-sm font-medium text-text-muted mb-1">Active employees</p>
 <h3 className="text-3xl font-bold text-text-heading">{headline.activeEmployees || 0}</h3>
 </div>
 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
 <Users className="w-5 h-5" />
 </div>
 </div>

 {/* Today's Attendance Bar */}
 <div className="mt-1 mb-3">
 <div className="flex items-center justify-between text-xs font-medium mb-1.5">
 <span className="text-emerald-600">Present today: {headline.presentToday ?? headline.activeEmployees ?? 0}</span>
 <button
 onClick={() => setShowAbsent(v => !v)}
 className="text-rose-600 hover:underline focus:outline-none"
 >
 Absent: {headline.absentToday ?? 0}
 </button>
 </div>
 {(headline.activeEmployees ?? 0) > 0 && (
 <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
 <div
 className="h-full rounded-full bg-emerald-500 transition-all"
 style={{ width: `${Math.round(((headline.presentToday ?? headline.activeEmployees ?? 0) / headline.activeEmployees) * 100)}%` }}
 />
 </div>
 )}
 </div>



 {/* Absent list dropdown */}
 {showAbsent && (stats.absentEmployeesList?.length ?? 0) > 0 && (
 <div className="absolute top-full left-0 mt-2 w-64 bg-surface rounded-xl shadow-xl border border-slate-border z-50 overflow-hidden">
 <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border-b border-slate-border">
 <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">On Leave Today</p>
 </div>
 <div className="max-h-56 overflow-y-auto divide-y divide-slate-border">
 {(stats.absentEmployeesList || []).map((emp: any) => (
 <div key={emp.id} className="px-4 py-2.5 flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-700 dark:text-rose-400 text-xs font-bold uppercase shrink-0">
 {emp.name.charAt(0)}
 </div>
 <div>
 <p className="text-xs font-semibold text-text-heading leading-tight">{emp.name}</p>
 <p className="text-[10px] text-text-muted">{emp.department || 'No Dept'}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 {showAbsent && (stats.absentEmployeesList?.length ?? 0) === 0 && (
 <div className="absolute top-full left-0 mt-2 w-52 bg-surface rounded-xl shadow-xl border border-slate-border z-50 p-4 text-center">
 <p className="text-xs text-text-muted">No employees on approved leave today.</p>
 </div>
 )}
 </div>

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
 <h3 className="text-3xl font-bold text-text-heading group-hover:text-accent-600 transition-colors">{headline.openVacancies || 0}</h3>
 </div>
 <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
 <Briefcase className="w-5 h-5" />
 </div>
 </div>
 <div className="text-xs text-text-muted">
 <span className="font-medium text-text-heading">{stats.invitedForInterview || 0}</span> screening, <span className="font-medium text-text-heading">{stats.offersAccepted || 0}</span> accepted
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

 
{/* Interview Scheduling */}
        <div className="bg-surface rounded-xl border border-slate-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-heading flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent-600" /> Interview Scheduling
            </h3>
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent-600 hover:text-accent-700 bg-accent-50 hover:bg-accent-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Schedule Interview
            </button>
          </div>
          {(() => {
            const upcoming = stats?.upcomingInterviews || [];
            
            return upcoming.length > 0 ? (
              <div className="space-y-1">
                {upcoming.map((candidate: any) => {
                  const dateStr = new Date(candidate.interviewDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={candidate.id}
                      onClick={() => navigate('/recruitment')}
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
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-semibold text-text-muted group-hover:text-accent-600 dark:group-hover:text-accent-400">{dateStr}</span>
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

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 
 {/* Left Column: Needs Attention & Trend */}
 <div className="lg:col-span-1 flex flex-col gap-8 h-full">
          {/* Attendance Trend Chart (Only for HR/Admin) */}
          {isAdminOrHR && stats?.attendanceTrend && (
            <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5">
              <h3 className="font-bold text-text-heading mb-4 text-sm uppercase tracking-wider">Attendance (7 Days)</h3>
              <div className="h-48 w-full">
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

 
 

 

          

          {/* Quick Actions */}
          <div className="space-y-4 flex-1 flex flex-col">
            <h3 className="font-bold text-text-heading text-lg">Quick Actions</h3>
            <div className="flex-1 flex flex-col justify-between">
              {(() => {
                
                const pendingTraining = stats.moduleOverview?.training?.pendingApprovals || 0;
                const pendingTravel = stats.moduleOverview?.travel?.pendingApprovals || 0;
                const pendingExpenses = stats.moduleOverview?.expenses?.pendingApprovals || 0;

                return (
                  <>
                    <Link to="/training" className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-slate-border hover:border-brand-primary hover:shadow-md transition-all group">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                        <BookOpen size={20} />
                        {pendingTraining > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-navy-900">
                            {pendingTraining}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-text-heading group-hover:text-brand-primary transition-colors">
                          {pendingTraining > 0 ? 'Training Approvals' : 'Training Updates'}
                        </h4>
                        <p className="text-xs text-text-muted">
                          {pendingTraining > 0 ? `${pendingTraining} request${pendingTraining > 1 ? 's' : ''} awaiting action` : 'View training sessions'}
                        </p>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                    
                    <Link to="/travel" className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-slate-border hover:border-brand-primary hover:shadow-md transition-all group">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                        <Plane size={20} />
                        {pendingTravel > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-navy-900">
                            {pendingTravel}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-text-heading group-hover:text-brand-primary transition-colors">
                          {pendingTravel > 0 ? 'Travel Approvals' : 'Travel Request'}
                        </h4>
                        <p className="text-xs text-text-muted">
                          {pendingTravel > 0 ? `${pendingTravel} request${pendingTravel > 1 ? 's' : ''} awaiting action` : 'Plan business travel'}
                        </p>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                    </Link>

                    <Link to="/office-expenses" className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-slate-border hover:border-brand-primary hover:shadow-md transition-all group">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                        <Receipt size={20} />
                        {pendingExpenses > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-navy-900">
                            {pendingExpenses}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-text-heading group-hover:text-brand-primary transition-colors">
                          {pendingExpenses > 0 ? 'Expense Approvals' : 'Claim Expense'}
                        </h4>
                        <p className="text-xs text-text-muted">
                          {pendingExpenses > 0 ? `${pendingExpenses} claim${pendingExpenses > 1 ? 's' : ''} awaiting action` : 'Submit bills for reimbursement'}
                        </p>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  </>
                );
              })()}
            </div>
          </div>

  </div>

  {/* Right Column: Module Overview Table */}
 <div className="lg:col-span-2">
 <div className="bg-surface rounded-xl shadow-sm border border-slate-border overflow-hidden">
 <div className="p-5 border-b border-slate-border bg-tint flex items-center justify-between">
 <h3 className="font-bold text-text-heading flex items-center gap-2">
 <FileText className="w-5 h-5 text-blue-500" />
 Module Overview
 </h3>
 </div>
 
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead className="bg-surface text-text-muted border-b border-slate-border">
 <tr>
 <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wider">Module</th>
 <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wider">Useful Summary</th>
 <th className="px-5 py-3 font-semibold uppercase text-xs tracking-wider">Attention Signal</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-border">
 {/* Employees */}
 <tr className="hover:bg-tint transition-colors cursor-pointer" onClick={() => navigate('/employees')}>
 <td className="px-5 py-4 font-bold text-text-heading flex items-center gap-2"><Users className="w-4 h-4 text-orange-500"/> Employees</td>
 <td className="px-5 py-4 text-text-muted">
 <span className="font-medium text-text-heading">{moduleOverview.employees?.active || 0}</span> active headcount<br/>
 <span className="text-xs">{moduleOverview.employees?.joinersThisMonth || 0} joined, {moduleOverview.employees?.exitsThisMonth || 0} exited recently</span>
 </td>
 <td className="px-5 py-4 text-text-muted text-xs">
 -
 </td>
 </tr>

 {/* Recruitment */}
 {isAdminOrHR && (
 <tr className="hover:bg-tint transition-colors cursor-pointer" onClick={() => navigate('/recruitment')}>
 <td className="px-5 py-4 font-bold text-text-heading flex items-center gap-2"><Briefcase className="w-4 h-4 text-purple-500"/> Recruitment</td>
 <td className="px-5 py-4 text-text-muted">
 <span className="font-medium text-text-heading">{moduleOverview.recruitment?.vacancies || 0}</span> open vacancies<br/>
 <span className="text-xs">{moduleOverview.recruitment?.selectedCandidates || 0} selected, {moduleOverview.recruitment?.offersAccepted || 0} offers accepted</span>
 </td>
 <td className="px-5 py-4 text-text-muted text-xs">
 {stats.upcomingInterviews?.length > 0 ? (
 <span className="text-accent-600 font-medium">{stats.upcomingInterviews.length} upcoming interviews</span>
 ) : (
 "-"
 )}
 </td>
 </tr>
 )}

 {/* Performance */}
 <tr className="hover:bg-tint transition-colors cursor-pointer" onClick={() => navigate('/performance')}>
 <td className="px-5 py-4 font-bold text-text-heading flex items-center gap-2"><Award className="w-4 h-4 text-yellow-500"/> Performance</td>
 <td className="px-5 py-4 text-text-muted">
 <span className="font-medium text-text-heading">{moduleOverview.performance?.completed || 0} / {moduleOverview.performance?.total || 0}</span> reviews completed<br/>
 </td>
 <td className="px-5 py-4 text-text-muted text-xs">
 {needsAttention.filter((i: any) => i.module === 'Performance').length > 0 ? (
 <span className="text-orange-600 font-medium">{needsAttention.filter((i: any) => i.module === 'Performance').length} reviews awaiting your action</span>
 ) : (
 "-"
 )}
 </td>
 </tr>

 {/* Training */}
 <tr className="hover:bg-tint transition-colors cursor-pointer" onClick={() => navigate('/training')}>
 <td className="px-5 py-4 font-bold text-text-heading flex items-center gap-2"><Briefcase className="w-4 h-4 text-indigo-500"/> Training</td>
 <td className="px-5 py-4 text-text-muted">
 <span className="font-medium text-text-heading">{stats.trainingsThisMonth || 0}</span> sessions this month
 </td>
 <td className="px-5 py-4 text-text-muted text-xs">
 -
 </td>
 </tr>

 {/* Leave */}
 <tr className="hover:bg-tint transition-colors cursor-pointer" onClick={() => navigate(isAdminOrHR || isManager ? '/leaves/approvals' : '/leaves')}>
 <td className="px-5 py-4 font-bold text-text-heading flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-500"/> Leave</td>
 <td className="px-5 py-4 text-text-muted">
 <span className="font-medium text-text-heading">{stats.pendingLeaves || 0}</span> pending overall requests
 </td>
 <td className="px-5 py-4 text-text-muted text-xs">
 {moduleOverview.leave?.pendingApprovals > 0 ? (
 <span className="text-rose-600 font-medium">{moduleOverview.leave.pendingApprovals} awaiting your approval</span>
 ) : (
 "-"
 )}
 </td>
 </tr>

 {/* Travel */}
 <tr className="hover:bg-tint transition-colors cursor-pointer" onClick={() => navigate('/travel')}>
 <td className="px-5 py-4 font-bold text-text-heading flex items-center gap-2"><Plane className="w-4 h-4 text-cyan-500"/> Travel</td>
 <td className="px-5 py-4 text-text-muted">
 <span className="font-medium text-text-heading">{stats.pendingTravel || 0}</span> pending overall requests
 </td>
 <td className="px-5 py-4 text-text-muted text-xs">
 {moduleOverview.travel?.pendingApprovals > 0 ? (
 <span className="text-rose-600 font-medium">{moduleOverview.travel.pendingApprovals} awaiting your approval</span>
 ) : (
 "-"
 )}
 </td>
 </tr>

 {/* Office Expenses */}
 <tr className="hover:bg-tint transition-colors cursor-pointer" onClick={() => navigate('/expenses')}>
 <td className="px-5 py-4 font-bold text-text-heading flex items-center gap-2"><Receipt className="w-4 h-4 text-emerald-600"/> Office Expenses</td>
 <td className="px-5 py-4 text-text-muted">
 <span className="font-medium text-text-heading">{stats.pendingExpenses || 0}</span> pending overall requests
 </td>
 <td className="px-5 py-4 text-text-muted text-xs">
 {moduleOverview.expenses?.pendingApprovals > 0 ? (
 <span className="text-rose-600 font-medium">{moduleOverview.expenses.pendingApprovals} awaiting your approval</span>
 ) : (
 "-"
 )}
 </td>
 </tr>

 {/* Assets */}
 <tr className="hover:bg-tint transition-colors cursor-pointer" onClick={() => navigate('/assets')}>
 <td className="px-5 py-4 font-bold text-text-heading flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500"/> Assets</td>
 <td className="px-5 py-4 text-text-muted">
 <span className="font-medium text-text-heading">{moduleOverview.assets?.assigned || 0}</span> assets assigned
 </td>
 <td className="px-5 py-4 text-text-muted text-xs">
 -
 </td>
 </tr>

 </tbody>
 </table>
 </div>
 </div>
 </div>

</div>
 <ScheduleInterviewModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} />
 </div>
 );
}
