import { http, type ApiError } from "@/lib/api.lib";
import type {
  AnalyticsQuery,
  ComprehensiveAnalyticsReport,
  DashboardOverviewStats,
} from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class AnalyticsAPI {
  getAnalytics(query: AnalyticsQuery): ResultAsync<ComprehensiveAnalyticsReport, ApiError> {
    return http.get<ComprehensiveAnalyticsReport>("/analytics", query);
  }

  getDashboardOverview(): ResultAsync<DashboardOverviewStats, ApiError> {
    return http.get<DashboardOverviewStats>("/analytics/dashboard-overview");
  }
}
