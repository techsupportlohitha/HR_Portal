import apiClient from './client';
import { ApiResponse, Employee } from '../types';

export const employeesApi = {
 getAll: async (params?: { page?: number; limit?: number; search?: string; departmentId?: string; status?: string; location?: string }) => {
 const { data } = await apiClient.get<ApiResponse<Employee[]>>('/employees', { params });
 return data;
 },
 getById: async (id: string) => {
 const { data } = await apiClient.get<ApiResponse<Employee>>(`/employees/${id}`);
 return data;
 },
 create: async (employeeData: Partial<Employee>) => {
 const { data } = await apiClient.post<ApiResponse<Employee>>('/employees', employeeData);
 return data;
 },
 update: async ({ id, ...employeeData }: Partial<Employee> & { id: string }) => {
 const { data } = await apiClient.put<ApiResponse<Employee>>(`/employees/${id}`, employeeData);
 return data;
 },
 delete: async (id: string) => {
 const { data } = await apiClient.delete<ApiResponse<null>>(`/employees/${id}`);
 return data;
 },
 getDashboardStats: async () => {
 const { data } = await apiClient.get<ApiResponse<any>>('/employees/dashboard-stats');
 return data;
 },
 uploadDocument: async (formData: FormData) => {
 const { data } = await apiClient.post<ApiResponse<any>>('/employees/documents/upload', formData, {
 headers: { 'Content-Type': 'multipart/form-data' }
 });
 return data;
 },
 getDocuments: async (employeeId: string) => {
 const { data } = await apiClient.get<ApiResponse<any[]>>(`/employees/documents/${employeeId}`);
 return data;
 },
 deleteDocument: async (documentId: string) => {
 const { data } = await apiClient.delete<ApiResponse<null>>(`/employees/documents/${documentId}`);
 return data;
 },
 verifyDocument: async (documentId: string) => {
 const { data } = await apiClient.put<ApiResponse<any>>(`/employees/documents/${documentId}/verify`);
 return data;
 },
 uploadPhoto: async (employeeId: string, file: File) => {
 const formData = new FormData();
 formData.append('photo', file);
 const { data } = await apiClient.post<ApiResponse<any>>(`/employees/${employeeId}/photo`, formData, {
 headers: { 'Content-Type': 'multipart/form-data' }
 });
 return data;
 }
};
