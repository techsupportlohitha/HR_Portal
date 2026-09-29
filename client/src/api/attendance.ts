import apiClient from './client';
import { ApiResponse, Attendance } from '../types';

export const attendanceApi = {
 clockIn: async () => {
 const { data } = await apiClient.post<ApiResponse<Attendance>>('/attendance/clock-in');
 return data;
 },
 clockOut: async () => {
 const { data } = await apiClient.post<ApiResponse<Attendance>>('/attendance/clock-out');
 return data;
 },
 getToday: async () => {
 const { data } = await apiClient.get<ApiResponse<Attendance | null>>('/attendance/today');
 return data;
 },
 getHistory: async (params?: { month?: number; year?: number }) => {
 const { data } = await apiClient.get<ApiResponse<Attendance[]>>('/attendance/history', { params });
 return data;
 },
 getSummary: async (params?: { month?: number; year?: number }) => {
 const { data } = await apiClient.get<ApiResponse<any>>('/attendance/summary', { params });
 return data;
 },
 getAllToday: async () => {
 const { data } = await apiClient.get<ApiResponse<Attendance[]>>('/attendance/today/all');
 return data;
 },
};
