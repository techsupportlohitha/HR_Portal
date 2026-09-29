import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginHistoryPage from './LoginHistoryPage';

vi.mock('@tanstack/react-query', () => ({
 useQuery: () => ({
 isLoading: false,
 data: {
 success: true,
 data: {
 data: [
 {
 id: 'audit-1',
 createdAt: '2026-09-04T09:00:00.000Z',
 actionPerformed: 'LOGIN',
 moduleAffected: 'Auth',
 ipAddress: '127.0.0.1',
 user: { email: 'admin@hrms.com' },
 },
 ],
 pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
 },
 },
 }),
}));

describe('LoginHistoryPage', () => {
 it('renders audit records from the paginated audit response', () => {
 render(<LoginHistoryPage />);

 expect(screen.getByRole('heading', { name: 'Activity & Login History' })).toBeInTheDocument();
 expect(screen.getByText('admin@hrms.com')).toBeInTheDocument();
 expect(screen.getByText('LOGIN')).toBeInTheDocument();
 });
});
