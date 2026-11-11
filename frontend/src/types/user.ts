export type ManagedUserRole = "MANAGER" | "DEVELOPER" | "CLIENT_USER";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: ManagedUserRole;
  organizationId: string;
  clientId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  contactEmail: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UsersResponse {
  success: boolean;
  message: string;
  data: {
    users: ManagedUser[];
    pagination: Pagination;
  };
}

export interface ClientsResponse {
  success: boolean;
  message: string;
  data: {
    clients: Client[];
    pagination: Pagination;
  };
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: ManagedUserRole;
  clientId?: string | null;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: ManagedUserRole;
  clientId?: string | null;
}
