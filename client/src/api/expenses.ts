import apiClient from './client';
import { ApiResponse } from '../types';

export const expensesApi = {
 getAll: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/office-expenses');
 return data;
 },
 create: async (payload: any) => {
 const { data } = await apiClient.post<ApiResponse<any>>('/office-expenses', payload);
 return data;
 },
 updateStatus: async (id: string, status: string) => {
 const { data } = await apiClient.patch<ApiResponse<any>>(`/office-expenses/${id}/status`, { status });
 return data;
 }
};
