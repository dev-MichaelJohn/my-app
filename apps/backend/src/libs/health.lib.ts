import db from "@/configs/db.config.js";
import { sql } from "drizzle-orm";
import env from "@/configs/env.config.js";

export interface SystemHealthReport {
  status: "healthy" | "degraded";
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  database: {
    status: "connected" | "disconnected";
    latencyMs?: number;
    error?: string;
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
  };
}

export async function checkSystemHealth(): Promise<{
  isHealthy: boolean;
  report: SystemHealthReport;
}> {
  const start = Date.now();
  let dbStatus: "connected" | "disconnected" = "disconnected";
  let dbLatencyMs: number | undefined = undefined;
  let dbError: string | undefined = undefined;

  try {
    // 🏓 Pings Neon PostgreSQL to keep connection pool and compute warm
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - start;
    dbStatus = "connected";
  } catch (err: any) {
    dbStatus = "disconnected";
    dbError = err.message || "Failed to reach database.";
  }

  const mem = process.memoryUsage();
  const isHealthy = dbStatus === "connected";

  const report: SystemHealthReport = {
    status: isHealthy ? "healthy" : "degraded",
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      ...(dbLatencyMs !== undefined && { latencyMs: dbLatencyMs }),
      ...(dbError && { error: dbError }),
    },
    memory: {
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    },
  };

  return { isHealthy, report };
}
