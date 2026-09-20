"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, LoginRequest, RegisterRequest, AuthResponse } from "@/types";
import apiClient, { getErrorMessage } from "@/lib/api";

function authResponseToUser(response: AuthResponse): User {
  return {
    id: response.id,
    username: response.username,
    displayName: response.displayName,
    email: response.email,
    location: response.location,
    locationId: response.location.id,
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateLocation: (locationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUserSession() {
      try {
        const savedToken = localStorage.getItem("access_token");
        if (savedToken) {
          setToken(savedToken);
          const res = await apiClient.get<User>("/me");
          setUser(res.data);
        } else {
          // Attempt silent session restore via HttpOnly refresh cookie
          try {
            const refreshRes = await apiClient.post<{ accessToken: string }>("/auth/refresh");
            if (refreshRes.data?.accessToken) {
              const newToken = refreshRes.data.accessToken;
              localStorage.setItem("access_token", newToken);
              setToken(newToken);
              const meRes = await apiClient.get<User>("/me");
              setUser(meRes.data);
            }
          } catch {
            // No active session cookie found
          }
        }
      } catch (error) {
        console.error("Session restore failed:", getErrorMessage(error));
        localStorage.removeItem("access_token");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserSession();
  }, []);

  const login = async (data: LoginRequest) => {
    const res = await apiClient.post<AuthResponse>("/auth/login", data);
    const newToken = res.data.accessToken;
    const newUser = authResponseToUser(res.data);

    localStorage.setItem("access_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const register = async (data: RegisterRequest) => {
    const res = await apiClient.post<AuthResponse>("/auth/register", data);
    const newToken = res.data.accessToken;
    const newUser = authResponseToUser(res.data);

    localStorage.setItem("access_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
    // Fire-and-forget server logout notification
    apiClient.post("/auth/logout").catch(() => {});
  };

  const updateLocation = async (locationId: string) => {
    await apiClient.put("/me/location", { locationId });
    const res = await apiClient.get<User>("/me");
    setUser(res.data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to consume AuthContext; throws an explicit error if used outside <AuthProvider>
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
