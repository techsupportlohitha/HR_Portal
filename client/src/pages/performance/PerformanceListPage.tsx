import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Search, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'My Performance' | 'Team/Company Reviews';

import { useQuery } from '@tanstack/react-query';
import { performanceApi } from '@/api/performance';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PerformanceReviewModal } from './PerformanceReviewModal';
import { PerformanceCreateModal } from './PerformanceCreateModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PerformanceListPage() {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';
  const secondTabName: Tab = isAdminOrHR ? 'Team/Company Reviews' : 'Team/Company Reviews'; // Simplified for type matching
  const [activeTab, setActiveTab] = useState<Tab>('My Performance');
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  
  const { data: rawReviews, isLoading } = useQuery({
    queryKey: ['performance', activeTab],
    queryFn: () => activeTab === 'My Performance' ? performanceApi.getMyReviews().then(res => res.data) : performanceApi.getAll().then(res => res.data)
  });

  const reviews = React.useMemo(() => {
    if (!rawReviews) return [];
    return rawReviews.filter((review: any) => {
      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (review.employee?.firstName?.toLowerCase().includes(searchStr)) || 
        (review.employee?.lastName?.toLowerCase().includes(searchStr)) ||
        (review.reviewPeriod?.toLowerCase().includes(searchStr));
      
      const matchesType = typeFilter === 'All Types' || review.reviewPeriod === typeFilter.toUpperCase().replace(' ', '_');
      const matchesStatus = statusFilter === 'All Status' || review.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rawReviews, searchQuery, typeFilter, statusFilter]);

  const hasActiveFilters = Boolean(searchQuery || typeFilter !== 'All Types' || statusFilter !== 'All Status');

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('All Types');
    setStatusFilter('All Status');
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'EMPLOYEE_REVIEW': return <Badge variant="default">Self Review Pending</Badge>;
      case 'MANAGER_REVIEW': return <Badge variant="info">Manager Review Pending</Badge>;
      case 'HR_REVIEW': return <Badge variant="warning">HR Review Pending</Badge>;
      case 'FINAL_APPROVAL': return <Badge className="bg-purple-500 text-white hover:bg-purple-600">Final Approval Pending</Badge>;
      case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <PageHeader
        title="Performance"
        description="Track review progress, feedback, and next approvals."
        actions={<>
          {(user?.role === 'ADMIN' || user?.role === 'HR') && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Initiate Review
            </Button>
          )}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-full w-full sm:w-auto">
          {(['My Performance', 'Team/Company Reviews'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex-1 sm:flex-none text-center",
                activeTab === tab 
                  ? "bg-white dark:bg-gray-900 text-navy-900 dark:text-white shadow-sm" 
                  : "text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300"
              )}
            >
              {tab}
            </button>
          ))}
          </div>
        </>}
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input 
            placeholder="Search reviews..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-lg text-sm focus:outline-none transition-all"
          />
        </div>
        
        <select 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
        >
          <option value="All Types">All Types</option>
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
          <option value="Half Yearly">Half Yearly</option>
          <option value="Annual">Annual</option>
        </select>
        
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
        >
          <option value="All Status">All Status</option>
          <option value="EMPLOYEE_REVIEW">Self Review Pending</option>
          <option value="MANAGER_REVIEW">Manager Review Pending</option>
          <option value="HR_REVIEW">HR Review Pending</option>
          <option value="FINAL_APPROVAL">Final Approval Pending</option>
          <option value="COMPLETED">Completed</option>
        </select>

        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-navy-900 dark:text-white underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Timeline View */}
      <div className="w-full pt-4 animate-in fade-in">
        {isLoading ? (
          <LoadingSpinner />
        ) : !reviews || reviews.length === 0 ? (
          <EmptyState
            icon={Target}
            title={hasActiveFilters ? 'No reviews match your filters' : 'No performance reviews yet'}
            description={
              hasActiveFilters
                ? 'Adjust or clear the filters to see more review cycles.'
                : isAdminOrHR
                  ? 'Start a review cycle to set goals, collect feedback, and track approvals.'
                  : 'Your assigned review cycles will appear here when they are initiated.'
            }
            actionLabel={hasActiveFilters ? 'Clear filters' : isAdminOrHR ? 'Initiate review' : undefined}
            onAction={hasActiveFilters ? clearFilters : isAdminOrHR ? () => setIsCreateModalOpen(true) : undefined}
          />
        ) : (
          <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-4 space-y-6 pl-12">
            {reviews.map((review: any) => (
              <Card key={review.id} className="hover:shadow-md transition-shadow relative cursor-pointer" onClick={() => setSelectedReview(review)}>
                <div className="absolute top-8 -left-[3.5rem] w-6 border-t-2 border-gray-100 dark:border-gray-800 border-dashed"></div>
                <div className="absolute top-7 -left-[3.8rem] h-3 w-3 rounded-full bg-gray-200 ring-4 ring-white"></div>
                
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-accent-50 dark:bg-accent-900/50 text-accent-600 dark:text-accent-400 rounded-xl flex items-center justify-center font-bold text-lg">
                        {review.reviewPeriod === 'ANNUAL' ? 'A' : review.reviewPeriod === 'HALF_YEARLY' ? 'H' : 'Q'}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg text-navy-900 dark:text-white">{review.reviewPeriod} Review</h3>
                        {getStatusBadge(review.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-0.5">Employee</p>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-navy-900 dark:text-white">
                              {review.employee ? `${review.employee.firstName} ${review.employee.lastName}` : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-0.5">Self Rating</p>
                          <p className="font-medium text-navy-900 dark:text-white">{review.selfRating || '-'}/5</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-0.5">Manager Rating</p>
                          <p className="font-medium text-navy-900 dark:text-white">{review.managerRating || '-'}/5</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedReview && (
        <PerformanceReviewModal
          isOpen={!!selectedReview}
          onClose={() => setSelectedReview(null)}
          review={selectedReview}
        />
      )}

      <PerformanceCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
