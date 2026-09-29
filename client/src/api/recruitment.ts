import apiClient from './client';
import { ApiResponse } from '../types';

export const recruitmentApi = {
 getRequisitions: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/recruitment/requisitions');
 return data;
 },
 createRequisition: async (payload: any) => {
 const { data } = await apiClient.post<ApiResponse<any>>('/recruitment/requisitions', payload);
 return data;
 },
 updateRequisitionStatus: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/recruitment/requisitions/${id}/status`, payload);
 return data;
 },
 getCandidates: async (id: string) => {
 const { data } = await apiClient.get<ApiResponse<any[]>>(`/recruitment/requisitions/${id}/candidates`);
 return data;
 },
 createCandidate: async (payload: any) => {
 const { data } = await apiClient.post<ApiResponse<any>>('/recruitment/candidates', payload);
 return data;
 },
 screenCandidate: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/recruitment/candidates/${id}/screen`, payload);
 return data;
 },
 interviewCandidate: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/recruitment/candidates/${id}/interview`, payload);
 return data;
 },
 offerCandidate: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/recruitment/candidates/${id}/offer`, payload);
 return data;
 }
};

// updated