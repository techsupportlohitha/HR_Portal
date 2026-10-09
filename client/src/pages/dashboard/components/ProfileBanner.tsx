import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plane, MessageSquare, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/hooks/usePermissions';

export function ProfileBanner() {
  const { user } = useAuth();
  const { canAdd } = usePermissions();
  const navigate = useNavigate();

  const employee = user?.employee;
  const firstName = employee?.firstName || user?.email?.split('@')[0] || 'User';
  const lastName = employee?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const employeeCode = employee?.employeeCode || 'N/A';
  
  // Combine designation, department, and location
  const details = [
    employee?.designation,
    employee?.department?.name,
    employee?.location
  ].filter(Boolean).join(' • ');

  return (
    <div className="bg-surface rounded-2xl p-6 border border-slate-border shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-6">
        <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden shrink-0 border-4 border-white shadow-sm flex items-center justify-center text-3xl font-bold text-slate-500">
          {employee?.profilePhoto ? (
            <img src={employee.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            firstName.charAt(0)
          )}
        </div>
        
        <div className="flex flex-col items-center sm:items-start">
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 sm:gap-3 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-text-heading">Welcome, {fullName}!</h1>
            {employeeCode !== 'N/A' && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold tracking-wide uppercase border border-emerald-100">
                {employeeCode}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm font-medium">
            {details || 'Employee'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center md:justify-end items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
        {user?.role !== 'ADMIN' && user?.role !== 'MANAGER' && canAdd('leave') && (
          <Button variant="primary" className="rounded-full shadow-sm text-sm h-9 px-4 flex items-center gap-2" onClick={() => navigate('/leaves')}>
            <Calendar className="w-4 h-4" />
            Apply Leave
          </Button>
        )}
        {user?.role === 'EMPLOYEE' && canAdd('travel') && (
            <Button variant="secondary" className="rounded-full shadow-sm text-sm h-9 px-4 flex items-center gap-2" onClick={() => navigate('/travel')}>
              <Plane className="w-4 h-4" />
              Travel Claim
            </Button>
        )}
        {user?.role === 'EMPLOYEE' && canAdd('expenses') && (
            <Button variant="secondary" className="rounded-full shadow-sm text-sm h-9 px-4 flex items-center gap-2" onClick={() => navigate('/office-expenses')}>
              <Receipt className="w-4 h-4" />
              Submit Expense
            </Button>
        )}
        {user?.role !== 'ADMIN' && user?.role !== 'MANAGER' && canAdd('requests') && (
          <Button variant="secondary" className="rounded-full shadow-sm text-sm h-9 px-4 flex items-center gap-2" onClick={() => navigate('/requests')}>
            <MessageSquare className="w-4 h-4" />
            HR Query
          </Button>
        )}
      </div>
    </div>
  );
}

