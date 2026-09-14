import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';
import { recruitmentApi } from '@/api/recruitment';
import {  Users, CheckCircle, Clock, UserMinus, Laptop, Briefcase, PhoneCall, Plus , UserCheck, Award } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TeamCard } from './components/TeamCard';
import { EmployeePerformanceCard } from './components/EmployeePerformanceCard';
import { ScheduleInterviewModal } from './components/ScheduleInterviewModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { BoxReveal } from '@/components/ui/modern-animated-sign-in';


export default function DashboardPage() {
  const { user } = useAuth();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [shouldAnimate] = useState(() => {
    const hasAnimated = sessionStorage.getItem('dashboard_animated');
    if (!hasAnimated) {
      sessionStorage.setItem('dashboard_animated', 'true');
      return true;
    }
    return false;
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then((res: any) => res.data),
  });

  const { data: reqData } = useQuery({
    queryKey: ['requisitions'],
    queryFn: recruitmentApi.getRequisitions,
  });

  const { data: attritionData } = useQuery({
    queryKey: ['dashboard-attrition'],
    queryFn: () => dashboardApi.getAttrition().then((res: any) => res.data),
    enabled: user?.role === 'ADMIN' || user?.role === 'HR',
  });

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" role="alert">
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  const stats = data || {};

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-0 sm:p-2">
      <BoxReveal disabled={!shouldAnimate} boxColor="var(--skeleton)" duration={0.4} width="100%">
        <PageHeader
          title="Dashboard"
          description={`Welcome back, ${user?.employee?.firstName || user?.email || 'there'}. Here is what needs your attention.`}
        />
      </BoxReveal>

      <BoxReveal disabled={!shouldAnimate} boxColor="var(--skeleton)" duration={0.5} width="100%">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Total Employees</p>
              <h3 className="text-2xl font-bold text-text-heading">{stats.totalEmployees || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Pending travel request</p>
              <h3 className="text-2xl font-bold text-text-heading">{stats.pendingTravel || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Laptop className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Assets Assigned</p>
              <h3 className="text-2xl font-bold text-text-heading">{stats.totalAssets || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Open Requisitions</p>
              <h3 className="text-2xl font-bold text-text-heading">{stats.openRequisitions || 0}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Recruitment Widget */}
      <div className="mt-8 border-t border-slate-border pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-text-heading flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Recruitment Process
            </h2>
          </div>
          <Link to="/recruitment" className="text-sm font-medium text-accent-600 hover:text-accent-700">View All {'>'}</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Table Area */}
          <div className="lg:col-span-2 bg-surface rounded-xl shadow-sm border border-slate-border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b border-slate-border bg-tint">
              <div className="bg-surface p-4 rounded-lg border border-blue-100">
                <div className="text-blue-600 font-bold flex items-center gap-2 mb-1">
                  <Briefcase className="w-4 h-4" />
                  {stats.openRequisitions || 0}
                </div>
                <div className="text-xs font-medium text-text-muted">Job Openings</div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-green-100">
                <div className="text-green-600 font-bold flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  {stats.invitedForInterview || 0}
                </div>
                <div className="text-xs font-medium text-text-muted">Invited for interview</div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-orange-100">
                <div className="text-orange-600 font-bold flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4" />
                  {stats.selectedCandidates || 0}
                </div>
                <div className="text-xs font-medium text-text-muted">Selected Candidates</div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-purple-100">
                <div className="text-purple-600 font-bold flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4" />
                  {stats.offersAccepted || 0}
                </div>
                <div className="text-xs font-medium text-text-muted">Offers Accepted</div>
              </div>
            </div>

            {/* Jobs Table */}
            <div className="overflow-x-auto p-0" tabIndex={0} aria-label="Recruitment openings table. Scroll horizontally to see all columns.">
              <table className="w-full text-sm text-left">
                <caption className="sr-only">Open recruitment positions</caption>
                <thead className="bg-tint text-text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">JOB</th>
                    <th className="px-5 py-3 font-semibold">VACANCIES</th>
                    <th className="px-5 py-3 font-semibold">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {reqData?.data?.slice(0, 4).map((req: any) => (
                    <tr key={req.id} className="hover:bg-tint cursor-pointer" onClick={() => window.location.href='/recruitment'}>
                      <td className="px-5 py-4 font-medium text-text-heading">{req.positionTitle}</td>
                      <td className="px-5 py-4 text-text-muted">{req.numberOfVacancies}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          req.status === 'REQUIREMENT' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' :
                          req.status === 'SOURCING' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          req.status === 'SCREENING' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' :
                          req.status === 'TELEPHONIC' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' :
                          req.status === 'HR_INTERVIEW' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                          req.status === 'TECHNICAL' ? 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400' :
                          req.status === 'MANAGEMENT' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' :
                          req.status === 'SELECTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' :
                          req.status === 'OFFER' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          req.status === 'JOINED_REJECTED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {req.status === 'JOINED_REJECTED' ? 'Completed' : req.status?.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!reqData?.data?.length && (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-text-muted">No active job openings</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

          <div className="flex flex-col gap-6">
            {/* Upcoming Interviews */}
            <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-text-heading text-lg">Upcoming Interviews</h3>
                {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                  <button 
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="p-1.5 bg-accent-50 text-accent-600 rounded-md hover:bg-accent-100 transition-colors"
                    title="Schedule Interview"
                    aria-label="Schedule interview"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {stats.upcomingInterviews?.map((interview: any) => (
                  <div key={interview.id} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-100 dark:bg-accent-900/50 flex items-center justify-center text-accent-700 font-bold uppercase overflow-hidden">
                        {interview.candidateName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-heading leading-tight">{interview.candidateName}</h4>
                        <p className="text-xs text-text-muted mt-0.5">{interview.requisition?.positionTitle || 'Candidate'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-muted text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(interview.interviewDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                {!stats.upcomingInterviews?.length && (
                  <div className="text-sm text-text-muted text-center py-4">No upcoming interviews</div>
                )}
              </div>

              </div>

            {/* Attrition */}
            <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col">
              <h3 className="font-bold text-text-heading mb-4 uppercase tracking-wider text-sm">ATTRITION</h3>
              
              <div className="flex-1 flex flex-col gap-4">
                {/* Attrition Rate */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900/50 shadow-sm relative overflow-hidden flex-1">
                  <h4 className="font-semibold text-xs mb-3 uppercase tracking-wide text-gray-800 dark:text-gray-200">ATTRITION RATE</h4>
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs text-text-muted mb-0.5">Monthly Attrition Rate</p>
                      <p className={`text-xl font-bold ${((attritionData?.attritionRate || 0) / 12) < 1.5 ? 'text-green-500' : 'text-orange-500'}`}>
                        {((attritionData?.attritionRate || 0) / 12).toFixed(2)}%
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">Target: Below 1.50%</p>
                    </div>
                    <div className="p-2 border-2 border-blue-600 rounded-lg text-blue-600 flex items-center justify-center">
                      <UserMinus className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="mt-8">
                    <p className="text-xs text-text-muted mb-0.5">Yearly Attrition Rate</p>
                    <p className={`text-xl font-bold ${(attritionData?.attritionRate || 0) < 12 ? 'text-green-500' : 'text-red-500'}`}>
                      {(attritionData?.attritionRate || 0).toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">Target: Below 12%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      </BoxReveal>
      
      {/* New Row: Team and Employee Performance */}
      <BoxReveal disabled={!shouldAnimate} boxColor="var(--skeleton)" duration={0.8} width="100%">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TeamCard />
        </div>
        <div className="lg:col-span-2">
          <EmployeePerformanceCard />
        </div>
      </div>
      
      <ScheduleInterviewModal 
        isOpen={isScheduleModalOpen} 
        onClose={() => setIsScheduleModalOpen(false)} 
      />
      </BoxReveal>
    </div>
  );
}
