import type { ResultAsync } from "neverthrow";
import { type ApiError } from "./api.lib.ts";
import { QueryClient } from "@tanstack/react-query";

export const toQuery = <T>(resultAsync: ResultAsync<T, ApiError>): Promise<T> => {
  return resultAsync.match(
    (data) => data,
    (error) => {
      throw error;
    },
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
