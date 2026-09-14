import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Auth
import LoginPage from '@/pages/auth/LoginPage';

// Authenticated pages load on demand so the login shell and first route stay small.
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const EmployeeListPage = lazy(() => import('@/pages/employees/EmployeeListPage'));
const EmployeeFormPage = lazy(() => import('@/pages/employees/EmployeeFormPage'));
const EmployeeDetailPage = lazy(() => import('@/pages/employees/EmployeeDetailPage'));
const DepartmentListPage = lazy(() => import('@/pages/departments/DepartmentListPage'));
const DepartmentFormPage = lazy(() => import('@/pages/departments/DepartmentFormPage'));
const PerformanceListPage = lazy(() => import('@/pages/performance/PerformanceListPage'));
const TrainingListPage = lazy(() => import('@/pages/training/TrainingListPage'));
const RequestListPage = lazy(() => import('@/pages/requests/RequestListPage'));
const PolicyListPage = lazy(() => import('@/pages/policies/PolicyListPage'));
const AssetListPage = lazy(() => import('@/pages/assets/AssetListPage'));
const TravelListPage = lazy(() => import('@/pages/travel/TravelListPage'));
const OfficeExpensesPage = lazy(() => import('@/pages/expenses/OfficeExpensesPage'));
const RecruitmentPage = lazy(() => import('@/pages/recruitment/RecruitmentPage'));
const NotificationListPage = lazy(() => import('@/pages/notifications/NotificationListPage'));
const AttritionDashboardPage = lazy(() => import('@/pages/attrition/AttritionDashboardPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const AuditLogPage = lazy(() => import('@/pages/audit/AuditLogPage'));
const LoginHistoryPage = lazy(() => import('@/pages/loginHistory/LoginHistoryPage'));
const RoleManagementPage = lazy(() => import('@/pages/roles/RoleManagementPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Leaves
const LeaveApplicationPage = lazy(() => import('@/pages/leave/LeaveApplicationPage'));

const LeaveApprovalsPage = lazy(() => import('@/pages/leave/LeaveApprovalsPage'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900"><LoadingSpinner /></div>}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          
          <Route path="/employees" element={<EmployeeListPage />} />
          <Route path="/employees/new" element={<EmployeeFormPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
          <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
          
          <Route path="/performance" element={<PerformanceListPage />} />
          <Route path="/documents" element={<PolicyListPage />} />
          <Route path="/assets" element={<AssetListPage />} />
          <Route path="/travel" element={<TravelListPage />} />
          <Route path="/office-expenses" element={<OfficeExpensesPage />} />
          
          <Route path="/departments" element={<DepartmentListPage />} />
          <Route path="/departments/new" element={<DepartmentFormPage />} />
          <Route path="/departments/:id/edit" element={<DepartmentFormPage />} />
          
          <Route path="/training" element={<TrainingListPage />} />
          <Route path="/requests" element={<RequestListPage />} />
          <Route path="/leaves" element={<LeaveApplicationPage />} />

          <Route path="/policies" element={<Navigate to="/documents" replace />} />
          <Route path="/profile" element={<Navigate to="/settings" replace />} />
          <Route path="/notifications" element={<NotificationListPage />} />

          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'HR']} />}>
            <Route path="/recruitment" element={<RecruitmentPage />} />
            <Route path="/leaves/approvals" element={<LeaveApprovalsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/login-history" element={<LoginHistoryPage />} />
            <Route path="/roles" element={<RoleManagementPage />} />
            <Route path="/dashboard/attrition" element={<AttritionDashboardPage />} />
            <Route path="/attrition" element={<Navigate to="/dashboard/attrition" replace />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
