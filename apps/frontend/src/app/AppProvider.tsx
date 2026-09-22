import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import type { ReactNode } from "react";

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false, // Prevents refetching when switching tabs
        refetchOnReconnect: false, // Prevents refetching on network reconnect
      },
    },
  });

  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
};
