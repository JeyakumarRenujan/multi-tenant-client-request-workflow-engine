import api from "../api/axios";
import type {
  Client,
  ClientsResponse,
  CreateUserInput,
  ManagedUser,
  Pagination,
  UpdateUserInput,
  UsersResponse
} from "../types/user";

export async function getUsers(filters: {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
} = {}) {
  const response = await api.get<UsersResponse>("/users", {
    params: filters
  });

  return response.data.data;
}

export async function getClients(): Promise<{
  clients: Client[];
  pagination: Pagination;
}> {
  const response = await api.get<ClientsResponse>("/users/clients", {
    params: { page: 1, limit: 100 }
  });

  return response.data.data;
}

export async function createUser(input: CreateUserInput) {
  const response = await api.post<{ data: { user: ManagedUser } }>(
    "/users",
    input
  );

  return response.data.data.user;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput
) {
  const response = await api.patch<{ data: { user: ManagedUser } }>(
    `/users/${id}`,
    input
  );

  return response.data.data.user;
}

export async function updateUserStatus(
  id: string,
  isActive: boolean
) {
  const response = await api.patch<{ data: { user: ManagedUser } }>(
    `/users/${id}/status`,
    { isActive }
  );

  return response.data.data.user;
}
