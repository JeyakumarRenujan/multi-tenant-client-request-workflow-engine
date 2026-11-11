import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import axios from "axios";
import { AuthContext } from "./auth-context";
import api, { setAccessToken } from "../api/axios";
import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
  RefreshResponse,
} from "../types/auth";


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const restorationStarted = useRef(false);

  const login = async (credentials: LoginCredentials) => {
    const response = await api.post<LoginResponse>(
      "/auth/login",
      credentials
    );

    setAccessToken(response.data.data.accessToken);
    setUser(response.data.data.user);
  };

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const refreshResponse = await api.post<RefreshResponse>(
        "/auth/refresh"
      );

      setAccessToken(refreshResponse.data.data.accessToken);

      const userResponse = await api.get<{ data: { user: AuthUser } }>(
        "/auth/me"
      );

      setUser(userResponse.data.data.user);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setAccessToken(null);
        setUser(null);
      } else {
        console.error("Session restoration failed:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (restorationStarted.current) return;

    restorationStarted.current = true;
    void restoreSession();
  }, [restoreSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
