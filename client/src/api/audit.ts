import apiClient from './client';
import { ApiResponse } from '../types';

export const auditApi = {
 getAll: async (page = 1, limit = 10) => {
 const { data } = await apiClient.get<ApiResponse<any[]>>(`/audit?page=${page}&limit=${limit}`);
 return data;
 }
};
