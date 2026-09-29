import apiClient from './client';
import { ApiResponse } from '../types';

export const notificationsApi = {
 getAll: async () => {
 const { data } = await apiClient.get<ApiResponse<any[]>>('/notifications');
 return data;
 },
 getUnreadCount: async () => {
 const { data } = await apiClient.get<ApiResponse<any>>('/notifications/unread-count');
 return data;
 },
 markRead: async (id: string) => {
 const { data } = await apiClient.patch<ApiResponse<any>>(`/notifications/${id}/read`);
 return data;
 },
 markAllRead: async () => {
 const { data } = await apiClient.patch<ApiResponse<any>>('/notifications/mark-all-read');
 return data;
 },
 clearRead: async () => {
 const { data } = await apiClient.delete<ApiResponse<any>>('/notifications/read/clear');
 return data;
 },
 delete: async (id: string) => {
 const { data } = await apiClient.delete<ApiResponse<any>>(`/notifications/${id}`);
 return data;
 }
};
