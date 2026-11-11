export type RequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED";

export type RequestPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export interface DashboardSummary {
  totalRequests: number;
  statusCounts: Record<RequestStatus, number>;
  priorityCounts: Record<RequestPriority, number>;
  overdueCount: number;
  generatedAt: string;
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardSummary;
}
