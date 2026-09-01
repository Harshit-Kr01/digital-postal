import axios, { AxiosError } from 'axios';
import { ApiProblemDetails } from '@/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach the Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiProblemDetails>) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
    return Promise.reject(error);
  }
);

// Helper function to extract an error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as ApiProblemDetails;
    if (data.detail) return data.detail;
    if (data.title) return data.title;
    if (data.errors) {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey && data.errors[firstKey].length > 0) {
        return data.errors[firstKey][0];
      }
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

export default apiClient;
