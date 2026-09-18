import apiClient from './client';
import { ApiResponse } from '../types';

export const dashboardApi = {
  getStats: async () => {
    const { data } = await apiClient.get<ApiResponse<any>>('/dashboard/stats');
    return data;
  },
  getAttrition: async (params?: { periodMonths?: number; department?: string; location?: string; employmentType?: string }) => {
    const { data } = await apiClient.get<ApiResponse<any>>('/dashboard/attrition', { params });
    return data;
  },
  getReports: async (type: string) => {
    const { data } = await apiClient.get(`/dashboard/reports/${type}?format=csv`, {
      responseType: 'blob'
    });
    return data;
  }
};
