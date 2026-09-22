import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import type { ReactNode } from "react";
import { queryClient } from "@/lib/query.lib";

export const AppProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
};
