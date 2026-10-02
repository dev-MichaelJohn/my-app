import { http, type ApiError } from "@/lib/api.lib";
import type { AnalyticsQuery, ComprehensiveAnalyticsReport } from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class AnalyticsAPI {
  getAnalytics(query: AnalyticsQuery): ResultAsync<ComprehensiveAnalyticsReport, ApiError> {
    return http.get<ComprehensiveAnalyticsReport>("/analytics", query);
  }
}

export const analyticsApi = new AnalyticsAPI();
