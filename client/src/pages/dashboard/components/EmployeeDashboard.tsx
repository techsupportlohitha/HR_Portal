import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';
import { leavesApi } from '@/api/leaves';
import { performanceApi } from '@/api/performance';
import { assetsApi } from '@/api/assets';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BoxReveal } from '@/components/ui/modern-animated-sign-in';
import { 
  Calendar, Clock, Plane, BookOpen, Receipt, User, ArrowRight,
  CheckCircle, XCircle, AlertCircle, Coffee, Award, Star,
  Laptop
} from 'lucide-react';
import { formatDate } from '@/utils/dateFormat';
import clsx from 'clsx';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  
  const [shouldAnimate] = useState(() => {
    const hasAnimated = sessionStorage.getItem('emp_dashboard_animated');
    if (!hasAnimated) {
      sessionStorage.setItem('emp_dashboard_animated', 'true');
      return true;
    }
    return false;
  });

  
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then((res: any) => res.data),
  });

  const { data: balancesData, isLoading: loadingBalances } = useQuery({
    queryKey: ['leave-balances', user?.employee?.id],
    queryFn: () => leavesApi.getBalances(),
    enabled: !!user?.employee?.id,
  });

  const { data: myLeavesData, isLoading: loadingLeaves } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => leavesApi.getMyLeaves(),
  });

  const { data: performanceData, isLoading: loadingPerformance } = useQuery({
    queryKey: ['my-performance'],
    queryFn: () => performanceApi.getMyReviews(),
    enabled: !!user?.employee?.id,
  });

  const { data: assetsData, isLoading: loadingAssets } = useQuery({
    queryKey: ['my-assets'],
    queryFn: () => assetsApi.getAll(),
    enabled: !!user?.employee?.id,
  });

  if (loadingBalances || loadingLeaves || loadingPerformance || loadingAssets) {
    return <div className="p-8 flex justify-center"><LoadingSpinner className="w-10 h-10" /></div>;
  }

  const balances = (balancesData as any)?.data || [];
  const assets = (assetsData as any)?.data || [];
  const recentLeaves = ((myLeavesData as any)?.data || []).slice(0, 5);
  const reviews = (performanceData as any)?.data || [];
  
  // Get the most recent review if any exist
  const latestReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'REJECTED': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'PENDING': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED': return <XCircle className="w-4 h-4" />;
      case 'PENDING': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ROW 1: Profile, Performance & Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Snapshot */}
        <BoxReveal duration={0.5} disabled={!shouldAnimate}>
          <div className="bg-surface rounded-xl p-6 border border-slate-border shadow-sm flex flex-col h-full bg-gradient-to-br from-brand-primary/5 to-transparent">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center text-2xl font-bold shadow-md">
                {user?.employee?.firstName?.[0] || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-heading">{user?.employee?.firstName} {user?.employee?.lastName}</h2>
                <p className="text-brand-primary font-medium text-sm mb-1">{user?.employee?.designation}</p>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <span className="bg-white/50 px-2 py-0.5 rounded-full border border-slate-200">{user?.employee?.employeeCode}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-border/50 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted mb-1">Department</p>
                <p className="text-sm font-semibold text-text-heading">{user?.employee?.department?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Reporting To</p>
                <p className="text-sm font-semibold text-text-heading">
                  {user?.employee?.manager ? `${user?.employee?.manager.firstName} ${user?.employee?.manager.lastName}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </BoxReveal>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Performance Overview */}
          <BoxReveal duration={0.6} disabled={!shouldAnimate}>
            <div className="bg-surface rounded-xl p-6 border border-slate-border shadow-sm flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-text-heading">My Performance</h3>
                <Link to="/performance" className="text-xs font-semibold text-brand-primary hover:underline">View All</Link>
              </div>
              
              {latestReview ? (
                <div className="flex flex-col h-full justify-center space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-muted">Review Period</span>
                    <span className="text-sm font-bold bg-tint px-3 py-1 rounded-full text-brand-primary">{latestReview.reviewPeriod}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-muted">Status</span>
                    <span className="text-sm font-bold text-text-heading">{latestReview.status.replace('_', ' ')}</span>
                  </div>
                  {latestReview.finalRating ? (
                    <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-500">
                        <Star className="fill-current w-5 h-5" />
                        <span className="font-bold text-text-heading">Rating</span>
                      </div>
                      <span className="text-lg font-black text-brand-primary">{latestReview.finalRating} / 5</span>
                    </div>
                  ) : (
                    <div className="mt-2 p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Review is currently in progress
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Award className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-text-heading mb-1">No Reviews Yet</p>
                  <p className="text-xs text-text-muted">Your performance reviews will appear here once assigned.</p>
                </div>
              )}
            </div>
          </BoxReveal>

          {/* Assigned Assets */}
          <BoxReveal duration={0.7} disabled={!shouldAnimate}>
            <div className="bg-surface rounded-xl p-6 border border-slate-border shadow-sm flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-text-heading">Assigned Assets</h3>
                <Link to="/assets" className="text-xs font-semibold text-brand-primary hover:underline">View All</Link>
              </div>
              
              {assets.length > 0 ? (
                <div className="space-y-3 overflow-y-auto max-h-[140px] pr-2 custom-scrollbar">
                  {assets.slice(0, 3).map((asset: any) => (
                    <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center shrink-0">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-heading truncate">{asset.assetName}</p>
                        <p className="text-xs text-text-muted truncate">{asset.assetId} • {asset.brandModel || 'Standard'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Laptop className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-text-heading mb-1">No Assets Assigned</p>
                  <p className="text-xs text-text-muted">You have no active company assets.</p>
                </div>
              )}
            </div>
          </BoxReveal>
        </div>
      </div>

      {/* ROW 2: Quick Actions & Recent Leaves */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Quick Actions */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="font-bold text-text-heading text-lg">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              {(() => {
                const stats = statsData || {};
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

          {/* Recent Leave Requests */}
        <div className="md:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text-heading text-lg">My Recent Leaves</h3>
            <Link to="/leaves" className="text-sm font-semibold text-brand-primary hover:underline">View All</Link>
          </div>
          
          <div className="bg-surface rounded-xl border border-slate-border shadow-sm overflow-hidden flex-1 flex flex-col">
            {recentLeaves.length > 0 ? (
              <div className="divide-y divide-slate-border flex-1">
                {recentLeaves.map((leave: any) => {
                  const d = new Date(leave.startDate);
                  const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                  const dateNum = d.getDate();
                  
                  return (
                  <div key={leave.id} className="p-4 flex items-center justify-between hover:bg-tint transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{month}</span>
                        <span className="text-sm font-bold text-text-heading">{dateNum}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-text-heading">{leave.leaveType?.replace('_', ' ') || leave.leaveType}</p>
                        <p className="text-xs text-text-muted mt-0.5">{leave.days} day(s) &bull; {leave.reason}</p>
                      </div>
                    </div>
                    <div className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold", getStatusColor(leave.status))}>
                      {getStatusIcon(leave.status)}
                      {leave.status}
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400 flex-1">
                <Calendar className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-medium text-text-heading mb-1">No recent leaves</p>
                <p className="text-xs">You haven't taken any time off recently.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
