import apiClient from './client';
import { ApiResponse } from '../types';

export const requestsApi = {
 create: async (payload: any) => {
 const { data } = await apiClient.post<ApiResponse<any>>('/requests', payload);
 return data;
 },
 getMyRequests: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/requests/my-requests');
 return data;
 },
 getAll: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/requests');
 return data;
 },
 updateStatus: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/requests/${id}/status`, payload);
 return data;
 },
 assign: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/requests/${id}/assign`, payload);
 return data;
 }
};
