import apiClient from './client';
import { ApiResponse, Leave, LeaveBalance } from '../types';

export const leavesApi = {
  apply: async (leaveData: Partial<Leave>) => {
    const { data } = await apiClient.post<ApiResponse<Leave>>('/leaves/apply', leaveData);
    return data;
  },
  getMyLeaves: async () => {
    const { data } = await apiClient.get<ApiResponse<Leave[]>>('/leaves/my-leaves');
    return data;
  },
  getBalances: async () => {
    const { data } = await apiClient.get<ApiResponse<LeaveBalance[]>>('/leaves/balances');
    return data;
  },
  cancel: async (id: string) => {
    const { data } = await apiClient.patch<ApiResponse<Leave>>(`/leaves/${id}/cancel`);
    return data;
  },
  getAll: async () => {
    const { data } = await apiClient.get<ApiResponse<Leave[]>>('/leaves/all');
    return data;
  },
  updateStatus: async ({ id, status, remarks }: { id: string; status: string; remarks?: string }) => {
    const { data } = await apiClient.patch<ApiResponse<Leave>>(`/leaves/${id}/status`, { status, remarks });
    return data;
  },
  getDashboardStats: async () => {
    const { data } = await apiClient.get<ApiResponse<any>>('/leaves/dashboard-stats');
    return data;
  },
};
