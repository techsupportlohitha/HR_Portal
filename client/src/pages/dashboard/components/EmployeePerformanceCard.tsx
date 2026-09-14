import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { performanceApi } from '@/api/performance';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const CircularProgress = ({ score, ringClass }: { score: number, ringClass: string }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-14 h-14 transform -rotate-90">
        <circle
          className="text-slate-100 dark:text-slate-800 stroke-current"
          strokeWidth="4"
          cx="28"
          cy="28"
          r={radius}
          fill="transparent"
        ></circle>
        <circle
          className={ringClass + ' stroke-current'}
          strokeWidth="4"
          strokeLinecap="round"
          cx="28"
          cy="28"
          r={radius}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        ></circle>
      </svg>
      <span className="absolute text-sm font-bold text-slate-800 dark:text-slate-100">{score}%</span>
    </div>
  );
};

export function EmployeePerformanceCard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('This Month');
  const { data: perfData, isLoading } = useQuery({
    queryKey: ['performance', 'dashboard'],
    queryFn: () => performanceApi.getAll().then((res: any) => res.data),
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return { color: 'text-blue-600', ring: 'stroke-blue-600' };
    if (score >= 60) return { color: 'text-orange-500', ring: 'stroke-orange-500' };
    if (score >= 40) return { color: 'text-yellow-500', ring: 'stroke-yellow-500' };
    return { color: 'text-red-500', ring: 'stroke-red-500' };
  };

  const getPercentage = (review: any) => {
    const rating = Number(review.finalRating) || Number(review.managerRating) || Number(review.selfRating) || 0;
    return Math.round((rating / 5) * 100);
  };

const reviews = perfData || [];

  const filteredReviews = reviews.filter((review: any) => {
    if (!review.createdAt) return true;
    const createdAt = new Date(review.createdAt);
    const now = new Date();
    
    if (filter === 'This Month') {
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }
    if (filter === 'Last Month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return createdAt.getMonth() === lastMonth.getMonth() && createdAt.getFullYear() === lastMonth.getFullYear();
    }
    if (filter === 'This Year') {
      return createdAt.getFullYear() === now.getFullYear();
    }
    return true; // Fallback or 'All Time'
  });

  const topReviews = [...filteredReviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-slate-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-text-heading text-lg">Employee Performance</h3>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option>This Month</option>
          <option>Last Month</option>
          <option>This Year</option>
        </select>
      </div>

      <div className="bg-tint border-b border-slate-border rounded-lg px-4 py-3 flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-text-heading w-1/2">Name</span>
        <span className="text-sm font-medium text-text-heading w-1/4 text-center">Score</span>
        <span className="text-sm font-medium text-text-heading w-1/4 text-right">Action</span>
      </div>

      {isLoading ? (
        <div className="py-8"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-4">
          {topReviews.map((review: any, idx: number) => {
            const score = getPercentage(review);
            const { ring } = getScoreColor(score);
            return (
              <div key={idx} className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3 w-1/2">
                  <div>
                    <h4 className="font-semibold text-text-heading text-sm">
                      {review.employee?.firstName} {review.employee?.lastName}
                    </h4>
                    <p className="text-xs text-text-muted font-medium">
                      {review.employee?.department?.name || 'Employee'}
                    </p>
                  </div>
                </div>
                
                <div className="w-1/4 flex justify-center">
                  <CircularProgress score={score} ringClass={ring} />
                </div>

                <div className="w-1/4 flex justify-end">
                  <button onClick={() => navigate('/performance')} className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-text-muted hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" title="View Performance Review">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {topReviews.length === 0 && (
            <div className="text-sm text-text-muted text-center py-4">No performance reviews found</div>
          )}
        </div>
      )}
    </div>
  );
}
