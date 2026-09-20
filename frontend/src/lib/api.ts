import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ApiProblemDetails } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5271/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Automatically attach the Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Handle 401 with silent token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiProblemDetails>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || "";
    const isAuthRequest =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post<{ accessToken: string }>("/auth/refresh");
        const newAccessToken = data.accessToken;
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", newAccessToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Helper function to extract an error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    // 1. Direct string body
    if (typeof data === "string" && data.trim().length > 0) {
      return data.trim();
    }

    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;

      // 2. Check for backend error field: { error: string | { message: string } }
      if (typeof d.error === "string" && d.error.trim().length > 0) {
        return d.error.trim();
      }
      if (
        d.error &&
        typeof d.error === "object" &&
        "message" in d.error &&
        typeof (d.error as Record<string, unknown>).message === "string"
      ) {
        const msg = ((d.error as Record<string, unknown>).message as string).trim();
        if (msg.length > 0) return msg;
      }

      // 3. Check for message field: { message: string }
      if (typeof d.message === "string" && d.message.trim().length > 0) {
        return d.message.trim();
      }

      // 4. Check for RFC 7807 detail field: { detail: string }
      if (typeof d.detail === "string" && d.detail.trim().length > 0) {
        return d.detail.trim();
      }

      // 5. Check for validation errors: { errors: { field: ["error"] } } or array
      if (d.errors) {
        if (Array.isArray(d.errors) && d.errors.length > 0) {
          const first = d.errors[0];
          if (typeof first === "string" && first.trim().length > 0) {
            return first.trim();
          }
          if (
            first &&
            typeof first === "object" &&
            "message" in first &&
            typeof (first as Record<string, unknown>).message === "string"
          ) {
            const msg = ((first as Record<string, unknown>).message as string).trim();
            if (msg.length > 0) return msg;
          }
        } else if (typeof d.errors === "object") {
          for (const key of Object.keys(d.errors)) {
            const val = (d.errors as Record<string, unknown>)[key];
            if (Array.isArray(val) && val.length > 0) {
              const firstVal = val[0];
              if (typeof firstVal === "string" && firstVal.trim().length > 0) {
                return firstVal.trim();
              }
            } else if (typeof val === "string" && val.trim().length > 0) {
              return val.trim();
            }
          }
        }
      }

      // 6. Check for RFC 7807 title field: { title: string }
      if (typeof d.title === "string" && d.title.trim().length > 0) {
        return d.title.trim();
      }
    }

    // 7. Status code fallbacks when body contains no explicit message
    if (error.response?.status) {
      if (error.response.status === 400) {
        return "Invalid request. Please check your details.";
      }
      if (error.response.status === 401) {
        return "Invalid credentials or unauthorized.";
      }
      if (error.response.status === 403) {
        return "You do not have permission to perform this action.";
      }
      if (error.response.status === 404) {
        return "The requested resource was not found.";
      }
      if (error.response.status === 409) {
        return "A conflict occurred with existing data.";
      }
      if (error.response.status === 429) {
        return "Too many requests. Please try again later.";
      }
      if (error.response.status >= 500) {
        return "A server error occurred. Please try again later.";
      }
    }

    // 8. Network and connection errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return "Request timed out. Please check your connection.";
    }
    if (error.code === "ERR_NETWORK" || !error.response) {
      return "Unable to connect to the server. Please check your network connection.";
    }
  }

  if (error instanceof Error && !error.message.startsWith("Request failed with status code")) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

export default apiClient;
