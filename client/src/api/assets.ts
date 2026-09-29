import apiClient from './client';
import { ApiResponse } from '../types';

export const assetsApi = {
 getAll: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/assets');
 return data;
 },
 getById: async (id: string) => {
 const { data } = await apiClient.get<ApiResponse<any>>(`/assets/${id}`);
 return data;
 },
 create: async (payload: any) => {
 const { data } = await apiClient.post<ApiResponse<any>>('/assets', payload);
 return data;
 },
 update: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/assets/${id}`, payload);
 return data;
 },
 assignAsset: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/assets/${id}/assign`, payload);
 return data;
 },
 returnAsset: async (id: string, payload: any) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/assets/${id}/return`, payload);
 return data;
 }
};

// updated