import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, UsersRound, Download } from 'lucide-react';
import { employeesApi } from '@/api/employees';
import { departmentsApi } from '@/api/departments';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePermissions } from '@/hooks/usePermissions';
import { useDebounce } from '@/hooks/useDebounce';
import { Select } from '@/components/ui/Select';

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canExport } = usePermissions();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [departmentId, setDepartmentId] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 12;

  // reset pagination when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, departmentId, location, status]);
  
  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.getAll,
  });

  const { data: empData, isLoading } = useQuery({
    queryKey: ['employees', { search: debouncedSearch, departmentId, location, status }],
    queryFn: () => employeesApi.getAll({ search: debouncedSearch, departmentId, location, status }),
  });

  const displayedEmployees = empData?.data?.slice((page - 1) * pageSize, page * pageSize) || [];
  const totalPages = Math.ceil((empData?.data?.length || 0) / pageSize);
  const customOrder = ['HR&ADMIN-IT', 'HR & ADMIN', 'COMMERCIAL', 'ACCOUNTS', 'PROCUREMENT'];
  const sortedDepts = [...(deptData?.data || [])].sort((a, b) => {
    const indexA = customOrder.indexOf(a.name);
    const indexB = customOrder.indexOf(b.name);
    if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });


  const getEmpTypeBadge = (type: string) => {
    if (type === 'PERMANENT') return <Badge variant="success">Full-time</Badge>;
    if (type === 'CONTRACT') return <Badge variant="warning">Part-time</Badge>;
    if (type === 'INTERN') return <Badge variant="default">Intern</Badge>;
    return <Badge variant="default">{type}</Badge>;
  };

  const getStatusBadge = (employeeStatus: string) => {
    if (employeeStatus === 'ACTIVE') return <Badge variant="success">Active</Badge>;
    if (employeeStatus === 'INACTIVE') return <Badge variant="warning">Inactive</Badge>;
    if (employeeStatus === 'TERMINATED') return <Badge variant="danger">Terminated</Badge>;
    return <Badge variant="default">{employeeStatus || 'Active'}</Badge>;
  };

  const handleExport = () => {
    if (!empData?.data?.length) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Employee ID,First Name,Last Name,Email,Phone,Department,Job Title,Employment Type,Status\n"
      + empData.data.map((e: any) => 
          `${e.employeeCode},${e.firstName},${e.lastName},${e.email},${e.phone || ''},${e.department?.name || ''},${e.designation || ''},${e.employmentType || ''},${e.status}`
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Employee_Register.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Management"
        description="Find, review, and manage employee records."
        actions={canExport('employees') && <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export Register
          </Button>}
      />

      {/* Station Cards */}
      {(user?.role === 'ADMIN' || user?.role === 'HR') && deptData?.data && deptData.data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 xl:gap-6">
          {sortedDepts.map((dept: any) => {
            const isSelected = departmentId === dept.id;
            return (
              <div
                key={dept.id} 
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Filter employees by ${dept.name}`}
                className={`bg-surface rounded-xl shadow-sm border ${isSelected ? 'border-accent-500 ring-1 ring-accent-500' : 'border-slate-border'} p-3 xl:p-5 cursor-pointer`}
                onClick={() => setDepartmentId(dept.id === departmentId ? '' : dept.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setDepartmentId(dept.id === departmentId ? '' : dept.id);
                  }
                }}
              >
                <div className="flex items-center gap-2 xl:gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent-600 text-white' : 'bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'}`}>
                    <UsersRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs xl:text-sm font-medium text-text-muted line-clamp-2" title={dept.name}>{dept.name}</p>
                    <div className="flex items-end gap-2">
                      <h3 className="text-2xl font-bold text-text-heading">{dept._count?.employees || 0}</h3>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 xl:gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input 
              aria-label="Search employees"
              placeholder="Search..." 
              className="w-full pl-9 pr-4 py-2 bg-surface border border-slate-300 dark:border-slate-600 shadow-sm rounded-lg text-sm focus:outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select 
            aria-label="Filter employees by office"
            className="px-3 py-2 bg-surface border border-slate-border rounded-lg text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">All Offices</option>
            <option value="Hyd Office">Hyd Office</option>
            <option value="Peddapuram Plant">Peddapuram Plant</option>
          </Select>
          
          <Select 
            aria-label="Filter employees by status"
            className="px-3 py-2 bg-surface border border-slate-border rounded-lg text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
          </Select>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setDepartmentId('');
              setLocation('');
              setStatus('');
            }}
            disabled={!search && !departmentId && !location && !status}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-navy-900 dark:hover:text-white underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
          >
            Clear filters
          </button>
        </div>

        <div className="flex w-full shrink-0 items-center justify-between gap-3 lg:w-auto">
          {!isLoading && (
            <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
              {empData?.data?.length || 0} {empData?.data?.length === 1 ? 'employee' : 'employees'}
            </p>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'HR') && (
            <Button onClick={() => navigate('/employees/new')} className="gap-2">
              <Plus className="w-4 h-4" /> Add new
            </Button>
          )}
        </div>
      </div>

      {(search || departmentId || location || status) && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active employee filters">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active filters:</span>
          {search && (
            <button type="button" onClick={() => setSearch('')} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-gray-700 hover:bg-slate-200 bg-surface dark:text-gray-300 dark:hover:bg-slate-700">
              Search: {search} ×
            </button>
          )}
          {departmentId && (
            <button type="button" onClick={() => setDepartmentId('')} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-gray-700 hover:bg-slate-200 bg-surface dark:text-gray-300 dark:hover:bg-slate-700">
              Department: {deptData?.data?.find((dept: any) => dept.id === departmentId)?.name || 'Selected'} ×
            </button>
          )}
          {location && (
            <button type="button" onClick={() => setLocation('')} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-gray-700 hover:bg-slate-200 bg-surface dark:text-gray-300 dark:hover:bg-slate-700">
              Office: {location} ×
            </button>
          )}
          {status && (
            <button type="button" onClick={() => setStatus('')} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-gray-700 hover:bg-slate-200 bg-surface dark:text-gray-300 dark:hover:bg-slate-700">
              Status: {status} ×
            </button>
          )}
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="py-12"><LoadingSpinner /></div>
      ) : empData?.data?.length === 0 ? (
        <EmptyState 
          icon={UsersRound}
          title="No employees found"
          description={search || departmentId || location || status ? "Try adjusting your search or filters to find what you're looking for." : "No employees are currently in the system."}
          actionLabel={search || departmentId || location || status ? "Clear Filters" : ((user?.role === 'ADMIN' || user?.role === 'HR') ? "Add Employee" : undefined)}
          onAction={() => {
            if (search || departmentId || location || status) {
              setSearch('');
              setDepartmentId('');
              setLocation('');
              setStatus('');
            } else if (user?.role === 'ADMIN' || user?.role === 'HR') {
              navigate('/employees/new');
            }
          }}
        />
      ) : (
        <div className="space-y-6">
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-sm dark:border-slate-700  md:block">
            <table className="w-full text-left">
              <caption className="sr-only">Employee directory</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-gray-600 dark:border-slate-700 bg-transparent dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-5 py-4 font-semibold">Employee</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Role & department</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Contact</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Office</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedEmployees.map((emp: any) => (
                  <tr
                    key={emp.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`View profile for ${emp.firstName} ${emp.lastName}`}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/employees/${emp.id}`);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {emp.profilePhoto ? (
                          <img src={emp.profilePhoto} alt="" className="h-10 w-10 rounded-full border border-slate-100 object-cover dark:border-slate-700" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600 bg-surface dark:text-slate-300">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="max-w-52 truncate font-semibold text-slate-800 dark:text-white">{emp.firstName} {emp.lastName}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{emp.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-48 truncate font-medium text-slate-800 dark:text-slate-200">{emp.designation || 'No designation'}</p>
                      <p className="mt-1 max-w-48 truncate text-sm text-slate-500 dark:text-slate-400">{emp.department?.name || 'No department'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-56 truncate text-sm font-medium text-slate-700 dark:text-slate-300" title={emp.email}>{emp.email}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{emp.phone || 'No phone number'}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{emp.location || 'Not assigned'}</td>
                    <td className="px-5 py-4">{getStatusBadge(emp.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-2 xl:gap-4 md:hidden">
            {displayedEmployees.map((emp: any) => (
              <div
                key={emp.id}
                role="link"
                tabIndex={0}
                aria-label={`View profile for ${emp.firstName} ${emp.lastName}`}
                onClick={() => navigate(`/employees/${emp.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/employees/${emp.id}`);
                  }
                }}
                className="group relative flex cursor-pointer flex-col gap-2 xl:gap-4 rounded-xl border border-slate-200 bg-surface p-5 transition-all hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-700  dark:hover:border-slate-600"
              >
                 <div className="flex justify-between items-start">
                   <div className="flex gap-2 xl:gap-4 items-center min-w-0">
                      {emp.profilePhoto ? (
                         <img src={emp.profilePhoto} alt={`${emp.firstName}`} className="w-12 h-12 rounded-full object-cover border border-slate-100 flex-shrink-0" />
                      ) : (
                         <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center font-bold text-slate-500 flex-shrink-0">
                           {emp.firstName?.[0]}{emp.lastName?.[0]}
                         </div>
                      )}
                      <div className="min-w-0">
                         <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 truncate">
                           <span className="truncate">{emp.firstName} {emp.lastName}</span>
                           {emp.status === 'ACTIVE' && <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Active"></div>}
                           {emp.status === 'INACTIVE' && <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" title="Inactive"></div>}
                           {emp.status === 'TERMINATED' && <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Terminated"></div>}
                         </h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{emp.designation || 'No designation'}</p>
                      </div>
                   </div>
                   <div className="flex-shrink-0 ml-2">
                     {getEmpTypeBadge(emp.employmentType || '')}
                   </div>
                 </div>

                 <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                   <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</span>
                   {getStatusBadge(emp.status)}
                 </div>

                 <div className="grid grid-cols-2 gap-y-4 gap-x-3 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Employee ID</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{emp.employeeCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Department</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate" title={emp.department?.name}>{emp.department?.name || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400 mb-1">Email</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate" title={emp.email}>{emp.email}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400 mb-1">Office Location</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate" title={emp.location}>{emp.location || '-'}</p>
                    </div>
                 </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-border pt-4">
              <p className="text-sm text-slate-500">
                Showing <span className="font-medium">{((page - 1) * pageSize) + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, empData?.data?.length || 0)}</span> of <span className="font-medium">{empData?.data?.length}</span> results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex gap-1 hidden sm:flex">
                   {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, i, arr) => (
                     <React.Fragment key={p}>
                       {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 py-1 text-slate-400">...</span>}
                       <button
                         onClick={() => setPage(p)}
                         className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${page === p ? 'bg-accent-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                       >
                         {p}
                       </button>
                     </React.Fragment>
                   ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}














