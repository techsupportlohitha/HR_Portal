import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { employeesApi } from '@/api/employees';
import PublicEmployeeVerificationPage from './PublicEmployeeVerificationPage';

vi.mock('@/api/employees', () => ({
  employeesApi: { getPublicCard: vi.fn() },
}));

describe('public employee verification page', () => {
  beforeEach(() => {
    vi.mocked(employeesApi.getPublicCard).mockResolvedValue({
      success: true,
      message: 'verified',
      data: {
        employeeCode: 'EMP-001',
        firstName: 'Devi',
        lastName: 'Employee',
        designation: 'Quality Analyst',
        profilePhoto: '/api/uploads/devi-profile.jpg',
        department: { name: 'Quality' },
      },
    });
  });

  it('shows the verified employee details and the official company link without a login step', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/employee-verification/signed-pass-token']}>
          <Routes>
            <Route path="/employee-verification/:token" element={<PublicEmployeeVerificationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Devi Employee' })).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
    expect(screen.getByText('Quality Analyst')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Devi Employee' })).toHaveAttribute('src', expect.stringContaining('/api/uploads/devi-profile.jpg'));
    expect(screen.getByRole('link', { name: /visit pattabhi agro foods website/i })).toHaveAttribute(
      'href',
      'https://www.pattabhiagro.com/pafpl/index.html',
    );
    expect(employeesApi.getPublicCard).toHaveBeenCalledWith('signed-pass-token');
  });
});
