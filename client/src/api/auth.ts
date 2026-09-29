import apiClient from './client';
import { ApiResponse, User, Employee } from '../types';

interface LoginResponse {
 token: string;
 user: User & { employee?: Employee };
}

// The /me endpoint returns the user object directly (not wrapped in { user, token })
type MeResponse = User & { employee?: Employee };

export const authApi = {
 login: async (credentials: { email: string; password: string }) => {
 const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
 return data;
 },
 getMe: async () => {
 const { data } = await apiClient.get<ApiResponse<MeResponse>>('/auth/me');
 return data;
 },
};
