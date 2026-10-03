import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AnalyticsAPI } from "../api/analytics.api";
import { toQuery } from "@/lib/query.lib";
import type { AnalyticsQuery } from "@my-app/shared";

export const analyticsApi = new AnalyticsAPI();

export const ANALYTICS_KEYS = {
  all: ["analytics"] as const,
  detail: (query: AnalyticsQuery) => [...ANALYTICS_KEYS.all, query] as const,
};

export const useAnalytics = (query: AnalyticsQuery) => {
  return useQuery({
    queryKey: ANALYTICS_KEYS.detail(query),
    queryFn: () => toQuery(analyticsApi.getAnalytics(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};
