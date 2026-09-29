import apiClient from './client';
import { ApiResponse } from '../types';

export const policiesApi = {
 getAll: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/policies');
 return data;
 },
 create: async (payload: any) => {
 const { data } = await apiClient.post<ApiResponse<any>>('/policies', payload);
 return data;
 },
 update: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/policies/${id}`, payload);
 return data;
 },
 delete: async (id: string) => {
 const { data } = await apiClient.delete<ApiResponse<any>>(`/policies/${id}`);
 return data;
 },
 acknowledge: async (id: string) => {
 const { data } = await apiClient.post<ApiResponse<any>>(`/policies/${id}/acknowledge`, { status: 'ACKNOWLEDGED' });
 return data;
 },
 getAcknowledgements: async (id: string) => {
 const { data } = await apiClient.get<ApiResponse<any[]>>(`/policies/${id}/acknowledgements`);
 return data;
 },
 getMyAcknowledgements: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/policies/my-acknowledgements');
 return data;
 }
};
