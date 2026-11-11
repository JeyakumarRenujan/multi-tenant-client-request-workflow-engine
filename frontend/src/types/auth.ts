export type UserRole =
  | "PLATFORM_ADMIN"
  | "ORGANIZATION_ADMIN"
  | "MANAGER"
  | "DEVELOPER"
  | "CLIENT_USER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  clientId: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    user: AuthUser;
  };
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
  };
}
