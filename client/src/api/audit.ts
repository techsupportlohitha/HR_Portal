import apiClient from './client';
import { ApiResponse } from '../types';

export const auditApi = {
 getAll: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/audit');
 return data;
 }
};
