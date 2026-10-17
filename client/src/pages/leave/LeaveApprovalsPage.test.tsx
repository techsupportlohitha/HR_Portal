import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeaveApprovalsPage from './LeaveApprovalsPage';
import { leavesApi } from '@/api/leaves';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'HR' } }) }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ canApprove: () => true, canExport: () => false }) }));
vi.mock('@/api/leaves', () => ({
  leavesApi: {
    getAll: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

const leave = {
  id: 'leave-1',
  leaveType: 'PERSONAL',
  startDate: '2026-10-20',
  endDate: '2026-10-20',
  totalDays: 0.5,
  isHalfDay: true,
  halfDayPeriod: 'MORNING',
  reason: 'Family appointment',
  remarks: 'Approved after review',
  status: 'APPROVED',
  createdAt: '2026-10-16T10:00:00.000Z',
  employee: { firstName: 'Alex', lastName: 'Employee', employeeCode: 'EMP-12', department: { name: 'Operations' } },
  approver: { firstName: 'Sam', lastName: 'Manager' },
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><LeaveApprovalsPage /></QueryClientProvider>);
}

describe('Leave approvals history details', () => {
  beforeEach(() => {
    vi.mocked(leavesApi.getAll).mockResolvedValue({ data: [leave] } as any);
  });

  it('opens a summary popup with leave and approval history when a row is selected', async () => {
    renderPage();

    const employeeCell = await screen.findByText('Alex Employee');
    fireEvent.click(employeeCell.closest('tr')!);

    expect(screen.getByRole('dialog', { name: 'Leave Request Details' })).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'Leave Request Details' });
    expect(within(dialog).getByText('Family appointment')).toBeInTheDocument();
    expect(within(dialog).getByText('Approved after review')).toBeInTheDocument();
    expect(within(dialog).getByText('Sam Manager')).toBeInTheDocument();
    expect(within(dialog).getByText('EMP-12')).toBeInTheDocument();
    expect(within(dialog).getByText('Half day · Morning')).toBeInTheDocument();
  });

  it('keeps approval actions separate from opening the history popup', async () => {
    vi.mocked(leavesApi.getAll).mockResolvedValue({ data: [{ ...leave, status: 'PENDING' }] } as any);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(screen.getByRole('dialog', { name: 'Approve Leave Request' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Leave Request Details' })).not.toBeInTheDocument();
  });
});
