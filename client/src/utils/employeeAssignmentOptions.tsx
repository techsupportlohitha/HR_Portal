import type { ReactNode } from 'react';

export function employeeAssignmentOptions(employees: any[] = []): ReactNode[] {
  const activeEmployees = employees.filter((employee) => !employee.user || employee.user.isActive);
  const managers = activeEmployees.filter((employee) => employee.user?.role === 'MANAGER');
  const otherUserAccounts = activeEmployees.filter((employee) => employee.user && !['MANAGER', 'EMPLOYEE'].includes(employee.user.role));
  const otherEmployees = activeEmployees.filter((employee) => !employee.user || employee.user.role === 'EMPLOYEE');

  return [...managers, ...otherUserAccounts, ...otherEmployees].map((employee) => {
    const name = `${employee.firstName} ${employee.lastName}`.trim();
    const accountRole = employee.user?.role;
    const roleLabel = accountRole === 'MANAGER' ? 'Manager' : accountRole === 'HR' ? 'HR' : accountRole === 'ADMIN' ? 'Admin' : null;
    const label = roleLabel ? `${roleLabel} · ${name}` : name;
    return <option key={employee.id} value={employee.id}>{label}</option>;
  });
}
