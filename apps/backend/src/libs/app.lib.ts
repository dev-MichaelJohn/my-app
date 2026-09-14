import express, { type Express } from "express";
import passport from "passport";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import "@/configs/passport.config.js";
import env from "@/configs/env.config.js";
import { FromDbPromise } from "./result.lib.js";
import db from "@/configs/db.config.js";
import { sql } from "drizzle-orm";
import { ResultAsync } from "neverthrow";
import http from "node:http";
import { AppError } from "./error.lib.js";
import { logger } from "./logger.lib.js";

export const CreateApp = (): Express => {
  const app = express();

  app.set("trust proxy", 1);

  app.use(compression());

  app.use(express.json());
  app.use(passport.initialize());
  app.use(cookieParser());
  app.use(
    cors({
      origin: env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
      exposedHeaders: ["x-access-token", "Content-Disposition"],
    }),
  );

  return app;
};

export const VerifyDatabaseConnection = () => {
  return FromDbPromise(db.execute(sql`SELECT 1`)).map(() => {
    logger.info("Database connection established successfully.");
  });
};

export const ListenHTTPServer = (server: http.Server, port: number) => {
  return ResultAsync.fromPromise(
    new Promise<http.Server>((resolve, reject) => {
      server.listen(port, () => {
        resolve(server);
      });

      server.once("error", (err) => {
        reject(new AppError(500, `Failed to bind HTTP server on port ${port}: ${err.message}`));
      });
    }),
    (err) => (err instanceof AppError ? err : new AppError(500, "Server startup error.")),
  );
};

export const SetupGracefulShutdown = (server: http.Server) => {
  const shutdown = (signal: string) => {
    logger.warn(`🛑 Received ${signal}. Starting graceful shutdown...`);

    server.close(() => {
      logger.info("HTTP server closed.");
      logger.info("Process terminated cleanly.");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown: Active connections could not close in time.");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};
