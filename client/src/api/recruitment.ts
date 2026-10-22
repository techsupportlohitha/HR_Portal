import apiClient from "./client";
import { ApiResponse } from "../types";

export const recruitmentApi = {
  getPipeline: async (filters: Record<string, string | number> = {}) => {
    const { data } = await apiClient.get<ApiResponse<any>>("/recruitment/pipeline", { params: filters });
    return data;
  },
  moveCandidateStage: async (id: string, payload: { stage: string; expectedStage: string; reason?: string }) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/recruitment/candidates/${id}/stage`, payload);
    return data;
  },
  getInterviews: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(
      "/recruitment/interviews",
    );
    return data;
  },
  getCandidateRegister: async (
    filters: Record<string, string | number> = {},
  ) => {
    const { data } = await apiClient.get<ApiResponse<any>>(
      "/recruitment/candidates",
      { params: filters },
    );
    return data;
  },

  getRequisitions: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(
      "/recruitment/requisitions",
    );
    return data;
  },
  createRequisition: async (payload: any) => {
    const { data } = await apiClient.post<ApiResponse<any>>(
      "/recruitment/requisitions",
      payload,
    );
    return data;
  },
  updateRequisition: async (id: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(
      "/recruitment/requisitions/" + id,
      payload,
    );
    return data;
  },
  updateRequisitionStatus: async (id: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(
      `/recruitment/requisitions/${id}/status`,
      payload,
    );
    return data;
  },
  deleteRequisition: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ id: string; candidateCount: number; positionTitle: string }>>(`/recruitment/requisitions/${id}`);
    return data;
  },
  getCandidates: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(
      `/recruitment/requisitions/${id}/candidates`,
    );
    return data;
  },
  createCandidate: async (payload: any) => {
    const { data } = await apiClient.post<ApiResponse<any>>(
      "/recruitment/candidates",
      payload,
    );
    return data;
  },
  deleteCandidate: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ id: string; requisitionId: string; candidateName: string }>>(`/recruitment/candidates/${id}`);
    return data;
  },
  interviewCandidate: async (id: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(
      `/recruitment/candidates/${id}/interview`,
      payload,
    );
    return data;
  },
  offerCandidate: async (id: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(
      `/recruitment/candidates/${id}/offer`,
      payload,
    );
    return data;
  },
  createInterview: async (candidateId: string, payload: any) => {
    const { data } = await apiClient.post<ApiResponse<any>>(
      `/recruitment/candidates/${candidateId}/interviews`,
      payload,
    );
    return data;
  },
  rescheduleInterview: async (interviewId: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(
      `/recruitment/interviews/${interviewId}/schedule`,
      payload,
    );
    return data;
  },
  updateInterviewStatus: async (interviewId: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(
      `/recruitment/interviews/${interviewId}/status`,
      payload,
    );
    return data;
  },
  submitInterviewFeedback: async (interviewId: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(
      `/recruitment/interviews/${interviewId}/feedback`,
      payload,
    );
    return data;
  },
};

// updated
