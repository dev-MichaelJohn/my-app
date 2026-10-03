import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { AppError } from "@/libs/error.lib.js";
import { AnalyticsService, type IAnalyticsService } from "@/services/analytics.service.js";
import { AnalyticsQuerySchema } from "@my-app/shared";
import { errAsync } from "neverthrow";

export class AnalyticsController {
  constructor(private analyticsService: IAnalyticsService = new AnalyticsService()) {}

  getAnalytics = runAsync((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    return ValidateSchema(AnalyticsQuerySchema, req.query).asyncAndThen((query) => {
      return this.analyticsService.getAnalytics(query, user).map((data) => ({
        status: 200,
        message: "Analytics report generated successfully.",
        data,
      }));
    });
  });

  getDashboardOverview = runAsync((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    return this.analyticsService.getDashboardOverview(user).map((data) => ({
      status: 200,
      message: "Dashboard overview statistics retrieved successfully.",
      data,
    }));
  });
}
