import apiClient from './client';
import { ApiResponse } from '../types';

export const performanceApi = {
 getAll: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/performance');
 return data;
 },
 getMyReviews: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/performance/my-reviews');
 return data;
 },
 create: async (payload: any) => {
 const { data } = await apiClient.post<ApiResponse<any>>('/performance', payload);
 return data;
 },
 update: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/performance/${id}`, payload);
 return data;
 },
 submitSelfAppraisal: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/performance/${id}/self-appraisal`, payload);
 return data;
 },
 submitManagerAppraisal: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/performance/${id}/manager-appraisal`, payload);
 return data;
 },
 submitHrAppraisal: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/performance/${id}/hr-appraisal`, payload);
 return data;
 },
 submitFinalApproval: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/performance/${id}/final-approval`, payload);
 return data;
 }
};
