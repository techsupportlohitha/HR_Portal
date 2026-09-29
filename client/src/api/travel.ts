import apiClient from './client';
import { ApiResponse } from '../types';

export const travelApi = {
 getAll: async (params?: any) => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/travel', { params });
 return data;
 },
 getById: async (id: string) => {
 const { data } = await apiClient.get<ApiResponse<any>>(`/travel/${id}`);
 return data;
 },
 create: async (payload: any) => {
 const { data } = await apiClient.post<ApiResponse<any>>('/travel', payload);
 return data;
 },
 updateApproval: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/travel/${id}/approve`, payload);
 return data;
 },
 updateSettlement: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/travel/${id}/settle`, payload);
 return data;
 }
};

// updated