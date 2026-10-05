import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { ResultAsync } from "neverthrow";
import type { APIResponse } from "@my-app/shared";

let inMemoryToken: string | null = localStorage.getItem("access_token");

export const setAccessToken = (token: string | null) => {
  if (token) {
    const cleanToken = token.replace(/^bearer\s+/i, "").trim();
    inMemoryToken = cleanToken;
    localStorage.setItem("access_token", cleanToken);
  } else {
    inMemoryToken = null;
    localStorage.removeItem("access_token");
  }
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

// ── 🛡️ In-Flight Mutex & Queue to prevent Refresh Token Race Conditions ──
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    const newToken = response.headers["x-access-token"];
    if (newToken) {
      setAccessToken(newToken);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest?.url || "";

    const isAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/verify-otp") ||
      requestUrl.includes("/auth/me");

    const isAuthPage =
      typeof window !== "undefined" &&
      (window.location.pathname === "/" ||
        window.location.pathname.includes("/login") ||
        window.location.pathname.includes("/auth"));

    // Check if error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      if (isRefreshing) {
        // Queue this request until the in-flight refresh completes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient.request(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Trigger a single /auth/me call with withCredentials: true so the backend rotates the cookie
        const refreshResponse = await apiClient.get<APIResponse<any>>("/auth/me");
        const newAccessToken =
          refreshResponse.headers["x-access-token"] || localStorage.getItem("access_token");

        if (newAccessToken) {
          setAccessToken(newAccessToken);
          processQueue(null, newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient.request(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        if (!isAuthPage && typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401 && !isAuthRequest && !isAuthPage) {
      setAccessToken(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
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
