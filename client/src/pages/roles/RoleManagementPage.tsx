import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Search, Shield, Users, Lock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';
import { Select } from '@/components/ui/Select';
import { usePermissions } from '@/hooks/usePermissions';
import { PaginationControls } from '@/components/ui/PaginationControls';
const hasLockedPermissions = (role: string) => role === 'ADMIN' || role === 'HR';

const ROLES = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
const ROLE_LABELS: Record<string, string> = {
 ADMIN: 'Admin',
 HR: 'HR',
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
 { key: 'canViewRestricted', label: 'Restricted data' },
];

function PermissionToggle({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: () => void }) {
 return (
 <button
 type="button"
 role="switch"
 aria-label={label}
 aria-checked={checked}
 title={label}
 onClick={onChange}
 disabled={disabled}
 className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
 disabled
 ? 'bg-primary-100 border-primary-300 dark:bg-primary-900/50 dark:border-primary-800 cursor-not-allowed'
 : checked
 ? 'bg-primary-500 border-primary-500 hover:bg-primary-600'
 : 'bg-surface border-slate-border hover:border-primary-400'
 }`}
 >
 {checked && <CheckCircle className={`w-3 h-3 ${disabled ? 'text-primary-500 dark:text-primary-400' : 'text-white'}`} />}
 </button>
 );
}

function PermissionsMatrix() {
 const queryClient = useQueryClient();
 const { canEdit } = usePermissions();
 const mayEditRoles = canEdit('roles');

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

 const { modules, permissions, roles } = data;
 const matrixRoles = roles.map((entry: { role: string }) => entry.role);

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
 <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 bg-surface sticky left-0 z-10 min-w-[180px]">
 Module
 </th>
 {matrixRoles.map((role: string) => (
 <th key={role} colSpan={PERMISSION_FLAGS.length} className="py-3 px-2 text-center font-semibold text-gray-700 dark:text-gray-300 bg-surface border-l border-slate-border">
 <div className="flex items-center justify-center gap-1">
 {hasLockedPermissions(role) && <Lock className="w-3 h-3 text-primary-500" />}
 {ROLE_LABELS[role]}
 </div>
 </th>
 ))}
 </tr>
 <tr>
 <th className="sticky left-0 z-10 bg-surface border-b border-slate-border" />
 {matrixRoles.flatMap((role: string) =>
 PERMISSION_FLAGS.map(flag => (
 <th key={`${role}-${flag.key}`} className="py-2 px-1 text-center text-gray-400 font-normal border-b border-slate-border whitespace-nowrap">
 {flag.label}
 </th>
 ))
 )}
 </tr>
 </thead>
 <tbody>
 {modules.map((mod: any, idx: number) => (
 <tr key={mod.key} className={idx % 2 === 0 ? 'bg-surface' : 'bg-gray-50/80 bg-surface/50'}>
 <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200 sticky left-0 bg-inherit border-r border-slate-border">
 {mod.label}
 </td>
 {matrixRoles.flatMap((role: string) => {
 const perm = getPermission(role, mod.key);
 const isAdmin = hasLockedPermissions(role);
 return PERMISSION_FLAGS.map(flag => (
 <td key={`${role}-${mod.key}-${flag.key}`} className="py-3 px-1 text-center">
 <PermissionToggle
 label={`${ROLE_LABELS[role]}: ${mod.label} — ${flag.label}`}
 checked={isAdmin ? true : Boolean(perm?.[flag.key])}
 disabled={isAdmin || !mayEditRoles || updateMutation.isPending}
 onChange={() => !isAdmin && mayEditRoles && toggle(role, mod.key, flag.key, Boolean(perm?.[flag.key]))}
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
 const { canAdd, canEdit } = usePermissions();
 const mayAddUsers = canAdd('roles');
 const mayEditUsers = canEdit('roles');
 const [search, setSearch] = useState('');
 const debouncedSearch = useDebounce(search, 500);
 const [roleFilter, setRoleFilter] = useState('');
 const [page, setPage] = useState(1);
 const pageSize = 10;
 const [resetModal, setResetModal] = useState<any>(null);
 const [newPassword, setNewPassword] = useState('');
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [newUser, setNewUser] = useState({ email: '', password: '', role: 'MANAGER' });

 const addUserMutation = useMutation({
 mutationFn: async (data: any) => {
 await apiClient.post(`/users`, data);
 },
 onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-users'] }); toast.success('User created successfully'); setIsAddModalOpen(false); setNewUser({ email: '', password: '', role: 'MANAGER' }); },
 onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create user'),
 });


 const { data: users, isLoading } = useQuery({
 queryKey: ['all-users', debouncedSearch, roleFilter],
 queryFn: async () => {
 const params = new URLSearchParams();
 if (debouncedSearch) params.set('search', debouncedSearch);
 if (roleFilter) params.set('role', roleFilter);
 const { data } = await apiClient.get(`/users?${params}`);
 return data.data as any[];
 },
 });
 const userRows = users || [];
 const displayedUsers = userRows.slice((page - 1) * pageSize, page * pageSize);

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
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div className="flex gap-3 flex-1 min-w-[200px]">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
 <input
 placeholder="Search users..."
 value={search}
 onChange={e => { setSearch(e.target.value); setPage(1); }}
 className="w-full pl-9 pr-4 py-2 h-[42px] rounded-[1.25rem] border border-slate-200 dark:border-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-[13px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all bg-white dark:bg-surface text-slate-900 dark:text-white"
 />
 </div>
 <Select
 aria-label="Filter users by role"
 value={roleFilter}
 onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
 className="py-2 px-3 bg-surface border border-slate-border rounded-lg text-sm focus:outline-none"
 >
 <option value="">All Roles</option>
 {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
 </Select>
 </div>
 {mayAddUsers && <Button onClick={() => setIsAddModalOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Add User</Button>}
 </div>


 {isLoading ? <div className="py-12"><LoadingSpinner /></div> : (
 <div className="bg-surface rounded-xl border border-slate-border overflow-hidden">
 <p className="border-b border-slate-border px-4 py-2 text-xs text-gray-500 dark:border-slate-border dark:text-gray-400 sm:hidden">
 Scroll horizontally to reach every account action.
 </p>
 <div className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-500" tabIndex={0} role="region" aria-label="User role table. Scroll horizontally for more columns.">
 <table className="w-full min-w-[42rem] divide-y divide-slate-border">
 <thead className="bg-transparent dark:bg-transparent border-b border-slate-border">
 <tr>
 {['User', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
 <th key={h} className={`${h === 'Last Login' ? 'hidden md:table-cell ' : ''}px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-border">
 {displayedUsers.map((u: any) => (
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
 <Select
 aria-label={`Change role for ${u.email}`}
 value={u.role}
 onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
 disabled={u.role === 'ADMIN' || !mayEditUsers}
 className="text-xs py-1 px-2 rounded border border-slate-border bg-surface focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
 >
 {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
 </Select>
 </td>
 <td className="px-4 py-3">
 <button
 onClick={() => statusMutation.mutate({ id: u.id, isActive: !u.isActive })}
 disabled={u.role === 'ADMIN' || !mayEditUsers}
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
 {u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}
 </td>
 <td className="px-4 py-3">
 {mayEditUsers && <button
 onClick={() => setResetModal(u)}
 className="text-xs text-gray-400 hover:text-navy-900 dark:text-gray-500 dark:hover:text-white transition-colors font-medium flex items-center gap-1"
 >
 <Lock className="w-3 h-3" /> Reset Password
 </button>}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 <PaginationControls page={page} pageSize={pageSize} total={userRows.length} onPageChange={setPage} itemLabel="users" />


 {mayAddUsers && isAddModalOpen && (
 <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Management User">
 <div className="space-y-4 py-2">
 <p className="text-sm text-slate-500">Create a standalone user account that is not linked to an employee profile.</p>
 <Input
 label="Email Address"
 type="email"
 value={newUser.email}
 onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
 required
 />
 <Input
 label="Password"
 type="password"
 placeholder="Min 6 characters"
 value={newUser.password}
 onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
 required
 />
 <Select
 label="Role"
 value={newUser.role}
 onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}
 required
 >
 {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
 </Select>
 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
 <Button
 onClick={() => addUserMutation.mutate(newUser)}
 disabled={addUserMutation.isPending || newUser.password.length < 6 || !newUser.email}
 >
 {addUserMutation.isPending ? 'Creating...' : 'Create User'}
 </Button>
 </div>
 </div>
 </Modal>
 )}

      {mayEditUsers && resetModal && (
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
 <div className="space-y-6">
 <PageHeader
 title="User & Role Management"
 description="Manage accounts and permission boundaries."
 />

 {/* Tabs */}
 <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-surface p-1 sm:flex sm:w-fit">
 <button
 onClick={() => setActiveTab('users')}
 className={`flex min-w-0 items-center justify-center gap-2 rounded-md px-2 py-2 text-center text-xs font-medium transition-all sm:px-4 sm:text-sm ${
 activeTab === 'users'
 ? 'bg-accent-600 text-white shadow-md dark:bg-accent-500'
 : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
 }`}
 >
 <Users className="h-4 w-4 shrink-0" /> <span>User Accounts</span>
 </button>
 <button
 onClick={() => setActiveTab('permissions')}
 className={`flex min-w-0 items-center justify-center gap-2 rounded-md px-2 py-2 text-center text-xs font-medium transition-all sm:px-4 sm:text-sm ${
 activeTab === 'permissions'
 ? 'bg-accent-600 text-white shadow-md dark:bg-accent-500'
 : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
 }`}
 >
 <Shield className="h-4 w-4 shrink-0" /> <span>Role Permissions Matrix</span>
 </button>
 </div>

 {activeTab === 'users' ? <UserAccountsTab /> : (
 <div className="space-y-4">
 <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
 <Lock className="w-4 h-4 flex-shrink-0" />
 ADMIN and HR role permissions are locked (always full access). Manager permissions are editable. Changes take effect on the user&apos;s next page load.
 </div>
 <div className="bg-surface rounded-xl border border-slate-border overflow-hidden">
 <PermissionsMatrix />
 </div>
 </div>
 )}
 </div>
 );
}











