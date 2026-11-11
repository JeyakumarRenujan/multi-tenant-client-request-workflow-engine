import api from "../api/axios";
import type {
  RequestFilters,
  RequestListResponse,
  WorkflowRequest,
  RequestAssigneesResponse,
  AssignRequestInput,
  RequestActivityResponse
} from "../types/request";

export interface CreateRequestInput {
  title: string;
  description: string;
  category: "FEATURE" | "BUG" | "CHANGE_REQUEST" | "OTHER";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: string;
}

export interface TransitionRequestInput {
  version: number;
  status:
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "IN_PROGRESS"
    | "COMPLETED";
  rejectionReason?: string;
}

export async function getRequests(filters: RequestFilters = {}) {
  const response = await api.get<RequestListResponse>("/requests", {
    params: filters
  });

  return response.data.data;
}

export async function getRequestById(id: string) {
  const response = await api.get<{
    success: boolean;
    message: string;
    data: { request: WorkflowRequest };
  }>(`/requests/${id}`);

  return response.data.data.request;
}

export async function createRequest(input: CreateRequestInput) {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: { request: WorkflowRequest };
  }>("/requests", input);

  return response.data.data.request;
}

export async function transitionRequest(
  id: string,
  input: TransitionRequestInput
) {
  const response = await api.patch<{
    success: boolean;
    message: string;
    data: { request: WorkflowRequest };
  }>(`/requests/${id}/status`, input);

  return response.data.data.request;
}

export async function getRequestAssignees() {
  const response = await api.get<RequestAssigneesResponse>(
    "/requests/assignees"
  );

  return response.data.data.developers;
}

export async function assignRequest(
  id: string,
  input: AssignRequestInput
) {
  const response = await api.patch<{
    success: boolean;
    message: string;
    data: { request: WorkflowRequest };
  }>(`/requests/${id}/assignment`, input);

  return response.data.data.request;
}

export async function getRequestActivity(id: string) {
  const response = await api.get<RequestActivityResponse>(
    `/requests/${id}/activity`
  );

  return response.data.data.activities;
}