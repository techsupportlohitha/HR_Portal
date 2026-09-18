import apiClient from './client';
import { ApiResponse } from '../types';

export const trainingApi = {
  getAll: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/training');
    return data;
  },
  create: async (payload: any) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/training', payload);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/training/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/training/${id}`);
    return data;
  },
  addParticipants: async (id: string, payload: any) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/training/${id}/participants`, payload);
    return data;
  },
  getMyTrainings: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/training/my-trainings');
    return {
      ...data,
      data: (data.data || []).map((participant: any) => ({
        ...participant.training,
        participant: {
          id: participant.id,
          employeeId: participant.employeeId,
          attendanceStatus: participant.attendanceStatus,
          feedbackRating: participant.feedbackRating,
          feedbackComments: participant.feedbackComments,
          assessmentScore: participant.assessmentScore,
          certificateIssued: participant.certificateIssued,
          certificateFile: participant.certificateFile,
        },
      })),
    };
  },
  getDashboardStats: async () => {
    const { data } = await apiClient.get<ApiResponse<any>>('/training/dashboard');
    return data;
  },
  submitFeedback: async (trainingId: string, employeeId: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/training/${trainingId}/participants/${employeeId}/feedback`, payload);
    return data;
  },
  recordAssessment: async (trainingId: string, employeeId: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/training/${trainingId}/participants/${employeeId}/assessment`, payload);
    return data;
  }
};
