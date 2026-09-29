import apiClient from './client';
import { ApiResponse, Department } from '../types';

export const departmentsApi = {
 getAll: async () => {
 const { data } = await apiClient.get<ApiResponse<Department[]>>('/departments');
 return data;
 },
 getById: async (id: string) => {
 const { data } = await apiClient.get<ApiResponse<Department>>(`/departments/${id}`);
 return data;
 },
 create: async (departmentData: Partial<Department>) => {
 const { data } = await apiClient.post<ApiResponse<Department>>('/departments', departmentData);
 return data;
 },
 update: async ({ id, ...departmentData }: Partial<Department> & { id: string }) => {
 const { data } = await apiClient.put<ApiResponse<Department>>(`/departments/${id}`, departmentData);
 return data;
 },
 delete: async (id: string) => {
 const { data } = await apiClient.delete<ApiResponse<null>>(`/departments/${id}`);
 return data;
 },
};
