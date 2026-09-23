import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { ResultAsync } from "neverthrow";
import type { APIResponse } from "@my-app/shared";

let inMemoryToken: string | null = localStorage.getItem("access_token");

export const setAccessToken = (token: string | null) => {
  if (token) {
    const cleanToken = token.replace(/^bearer\s+/i, "").trim();
    inMemoryToken = cleanToken;
    localStorage.setItem("access_token", cleanToken);
    console.log("[Auth] Access Token SAVED:", cleanToken.slice(0, 15) + "...");
  } else {
    inMemoryToken = null;
    localStorage.removeItem("access_token");
    console.log("[Auth] Access Token CLEARED");
  }
};

if (typeof window !== "undefined") {
  (window as any).__getAccessToken = () => inMemoryToken;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
    console.log(`[HTTP ${config.method?.toUpperCase()}] ${config.url} | Authorization attached`);
  } else {
    console.warn(
      `[HTTP ${config.method?.toUpperCase()}] ${config.url} | No Access Token attached (using cookies only)`,
    );
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const newToken = response.headers["x-access-token"];
    if (newToken) {
      console.log("[Auth] New Access Token received via x-access-token header!");
      setAccessToken(newToken);
    }
    return response;
  },
  (error: AxiosError) => {
    const requestUrl = error.config?.url || "";
    const isAuthRequest =
      requestUrl.includes("/auth/login") || requestUrl.includes("/auth/verify-otp");

    const isAuthPage =
      window.location.pathname.includes("/login") || window.location.pathname.includes("/auth");

    console.error(`[HTTP Error ${error.response?.status}] ${requestUrl}:`, error.response?.data);

    if (error.response?.status === 401 && !isAuthRequest && !isAuthPage) {
      console.warn("[Auth] 401 Unauthorized encountered. Redirecting to login...");
      setAccessToken(null);
      window.location.href = "/login";
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
    const axiosErr = error as AxiosError<APIResponse<T> | string>;
    const responseData = axiosErr.response?.data;
    const status = axiosErr.response?.status ?? 500;

    let message = "An unexpected error occurred.";
    if (typeof responseData === "object" && responseData?.message) {
      message = responseData.message;
    } else if (typeof responseData === "string") {
      message = responseData;
    } else {
      message = axiosErr.message || message;
    }

    return {
      status,
      message,
      errors:
        (typeof responseData === "object" && (responseData?.errors as Record<string, string>)) ||
        undefined,
    };
  }).map((axiosResponse) => {
    return axiosResponse.data.data as T;
  });
};

export const http = {
  get: <T>(url: string, params?: unknown) => request<T>({ method: "GET", url, params }),
  post: <T>(url: string, data?: unknown) => request<T>({ method: "POST", url, data }),
  put: <T>(url: string, data?: unknown) => request<T>({ method: "PUT", url, data }),
  patch: <T>(url: string, data?: unknown) => request<T>({ method: "PATCH", url, data }),
  delete: <T>(url: string) => request<T>({ method: "DELETE", url }),
};
