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

export interface WorkflowRequest {
  id: string;
  organizationId: string;
  clientId: string;
  createdById: string;
  assignedToId: string | null;
  title: string;
  description: string;
  category: string;
  priority: RequestPriority;
  status: RequestStatus;
  dueDate: string | null;
  rejectionReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequestPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RequestListResponse {
  success: boolean;
  message: string;
  data: {
    requests: WorkflowRequest[];
    pagination: RequestPagination;
  };
}

export interface RequestFilters {
  page?: number;
  limit?: number;
  status?: RequestStatus;
  priority?: RequestPriority;
  category?: string;
}

export interface RequestAssignee {
  id: string;
  name: string;
  email: string;
}

export interface RequestAssigneesResponse {
  success: boolean;
  message: string;
  data: {
    developers: RequestAssignee[];
  };
}

export interface AssignRequestInput {
  version: number;
  assignedToId: string | null;
}
