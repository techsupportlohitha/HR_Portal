import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, Shield, Users, Lock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';

const ROLES = ['ADMIN', 'HR', 'HR_EXECUTIVE', 'MANAGER', 'EMPLOYEE'];
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Super Admin',
  HR: 'HR Admin',
  HR_EXECUTIVE: 'HR Executive',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};
const PERMISSION_FLAGS = [
  { key: 'canView', label: 'View' },
  { key: 'canAdd', label: 'Add' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
  { key: 'canApprove', label: 'Approve' },
  { key: 'canExport', label: 'Export' },
];

function PermissionToggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
        disabled
          ? 'bg-green-100 border-green-300 cursor-not-allowed'
          : checked
          ? 'bg-primary-500 border-primary-500 hover:bg-primary-600'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-primary-400'
      }`}
    >
      {(checked || disabled) && <CheckCircle className="w-3 h-3 text-white" />}
    </button>
  );
}

function PermissionsMatrix() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['permissions-matrix'],
    queryFn: async () => {
      const { data } = await apiClient.get('/permissions');
      return data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.patch('/permissions', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['my-permissions'] });
    },
    onError: () => toast.error('Failed to update permission'),
  });

  if (isLoading) return <div className="py-16"><LoadingSpinner /></div>;
  if (!data) return null;

  const { modules, permissions } = data;

  const getPermission = (role: string, moduleKey: string) =>
    permissions.find((p: any) => p.role === role && p.module === moduleKey);

  const toggle = (role: string, module: string, flag: string, currentVal: boolean) => {
    updateMutation.mutate({ role, module, [flag]: !currentVal });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 sticky left-0 z-10 min-w-[180px]">
              Module
            </th>
            {ROLES.map(role => (
              <th key={role} colSpan={PERMISSION_FLAGS.length} className="py-3 px-2 text-center font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-l border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1">
                  {role === 'ADMIN' && <Lock className="w-3 h-3 text-green-500" />}
                  {ROLE_LABELS[role]}
                </div>
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-slate-200 dark:border-slate-700" />
            {ROLES.flatMap(role =>
              PERMISSION_FLAGS.map(flag => (
                <th key={`${role}-${flag.key}`} className="py-2 px-1 text-center text-gray-400 font-normal border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                  {flag.label}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {modules.map((mod: any, idx: number) => (
            <tr key={mod.key} className={idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-gray-50/80 dark:bg-gray-800/80/50'}>
              <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200 sticky left-0 bg-inherit border-r border-slate-200 dark:border-slate-700">
                {mod.label}
              </td>
              {ROLES.flatMap(role => {
                const perm = getPermission(role, mod.key);
                const isAdmin = role === 'ADMIN';
                return PERMISSION_FLAGS.map(flag => (
                  <td key={`${role}-${mod.key}-${flag.key}`} className="py-3 px-1 text-center">
                    <PermissionToggle
                      checked={isAdmin ? true : Boolean(perm?.[flag.key])}
                      disabled={isAdmin}
                      onChange={() => !isAdmin && toggle(role, mod.key, flag.key, Boolean(perm?.[flag.key]))}
                    />
                  </td>
                ));
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserAccountsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [resetModal, setResetModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users', search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await apiClient.get(`/users?${params}`);
      return data.data as any[];
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await apiClient.patch(`/users/${id}/role`, { role });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-users'] }); toast.success('Role updated'); },
    onError: () => toast.error('Failed to update role'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiClient.patch(`/users/${id}/status`, { isActive });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-users'] }); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update status'),
  });

  const resetMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      await apiClient.post(`/users/${id}/reset-password`, { newPassword });
    },
    onSuccess: () => { toast.success('Password reset successfully'); setResetModal(null); setNewPassword(''); },
    onError: () => toast.error('Failed to reset password'),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          aria-label="Filter users by role"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none"
        >
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {isLoading ? <div className="py-12"><LoadingSpinner /></div> : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:hidden">
            Scroll horizontally to reach every account action.
          </p>
          <div className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-500" tabIndex={0} role="region" aria-label="User role table. Scroll horizontally for more columns.">
          <table className="w-full min-w-[42rem] divide-y divide-slate-100 dark:divide-slate-700">
            <thead className="bg-transparent dark:bg-transparent border-b border-slate-200 dark:border-slate-700">
              <tr>
                {['User', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className={`${h === 'Last Login' ? 'hidden md:table-cell ' : ''}px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(users || []).map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600">
                        {u.employee?.firstName?.[0] || u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-navy-900 dark:text-white">
                          {u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : 'No Employee Linked'}
                        </p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                        {u.employee?.employeeCode && (
                          <p className="text-xs text-gray-400">{u.employee.employeeCode} · {u.employee.department?.name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Change role for ${u.email}`}
                      value={u.role}
                      onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                      disabled={u.role === 'ADMIN'}
                      className="text-xs py-1 px-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => statusMutation.mutate({ id: u.id, isActive: !u.isActive })}
                      disabled={u.role === 'ADMIN'}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {u.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setResetModal(u)}
                      className="text-xs text-gray-400 hover:text-navy-900 dark:text-gray-500 dark:hover:text-white transition-colors font-medium flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" /> Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {resetModal && (
        <Modal isOpen={!!resetModal} onClose={() => { setResetModal(null); setNewPassword(''); }} title={`Reset Password — ${resetModal.email}`}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Set a new temporary password for this user. Their active sessions will be invalidated.</p>
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setResetModal(null); setNewPassword(''); }}>Cancel</Button>
              <Button
                onClick={() => resetMutation.mutate({ id: resetModal.id, newPassword })}
                disabled={newPassword.length < 6 || resetMutation.isPending}
              >
                {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function RoleManagementPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="User & Role Management"
        description="Manage accounts and permission boundaries."
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'users'
              ? 'bg-white dark:bg-gray-900 text-navy-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> User Accounts
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'permissions'
              ? 'bg-white dark:bg-gray-900 text-navy-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" /> Role Permissions Matrix
        </button>
      </div>

      {activeTab === 'users' ? <UserAccountsTab /> : (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Lock className="w-4 h-4 flex-shrink-0" />
            ADMIN role permissions are locked (always full access). Changes to other roles take effect on the user&apos;s next page load.
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <PermissionsMatrix />
          </div>
        </div>
      )}
    </div>
  );
}
