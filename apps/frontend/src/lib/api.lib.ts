import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { ResultAsync } from "neverthrow";
import type { APIResponse } from "@my-app/shared";

let inMemoryToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryToken = token;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // Capture silent access token rotation
    const newToken = response.headers["x-access-token"];
    if (newToken) setAccessToken(newToken);
    return response;
  },
  (error: AxiosError) => {
    const requestUrl = error.config?.url || "";
    const isAuthRequest =
      requestUrl.includes("/auth/login") || requestUrl.includes("/auth/verify-otp");

    const isAuthPage =
      window.location.pathname.includes("/login") || window.location.pathname.includes("/auth");

    if (error.response?.status === 401 && !isAuthRequest && !isAuthPage) {
      setAccessToken(null);
      window.location.href = "/auth/login";
    }

    return Promise.reject(error);
  },
);

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string>;
}

export const request = <T>(config: AxiosRequestConfig): ResultAsync<T, ApiError> => {
  return ResultAsync.fromPromise(apiClient.request<APIResponse<T>>(config), (error) => {
    const axiosErr = error as AxiosError<APIResponse<T>>;
    const responseBody = axiosErr.response?.data;

    return {
      status: responseBody?.status ?? axiosErr.response?.status ?? 500,
      message: responseBody?.message || axiosErr.message || "An unexpected error occurred.",
      errors: (responseBody?.errors as Record<string, string>) ?? undefined,
    };
  }).map((axiosResponse) => {
    return axiosResponse.data.data as T;
  });
};

export const http = {
  get: <T>(url: string, params?: unknown) => request<T>({ method: "GET", url, params }),
  post: <T>(url: string, data?: unknown) => request<T>({ method: "POST", url, data }),
  patch: <T>(url: string, data?: unknown) => request<T>({ method: "PATCH", url, data }),
  delete: <T>(url: string) => request<T>({ method: "DELETE", url }),
};
