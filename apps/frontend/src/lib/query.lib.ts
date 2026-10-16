import type { ResultAsync } from "neverthrow";
import { type ApiError } from "./api.lib.ts";
import { QueryClient, MutationCache } from "@tanstack/react-query";

export const toQuery = <T>(resultAsync: ResultAsync<T, ApiError>): Promise<T> => {
  return resultAsync.match(
    (data) => data,
    (error) => {
      throw error;
    },
  );
};

export const queryClient = new QueryClient({
  // Automatically trigger audit-log refresh whenever ANY mutation succeeds in the app
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      const mutationKey = mutation.options.mutationKey?.[0];
      // Avoid infinite loop if the mutation itself was an audit query
      if (mutationKey !== "audit-logs") {
        queryClient.invalidateQueries({
          queryKey: ["audit-logs"],
          refetchType: "all",
        });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 0, // Immediately consider data stale so invalidations take effect instantly
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true, // MUST BE true so opening dialogs & navigating always loads latest data
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
