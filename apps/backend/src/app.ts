import { createServer } from "http";
import {
  CreateApp,
  ListenHTTPServer,
  SetupGracefulShutdown,
  VerifyDatabaseConnection,
} from "@/libs/app.lib.js";
import env from "@/configs/env.config.js";
import { GlobalErrorHandler } from "./middlewares/error.middleware.js";
import { SeederFunction } from "./libs/seeder.lib.js";
import V1Router from "./routers/index.router.js";
import { logger } from "./libs/logger.lib.js";
import { loggerMiddleware } from "./middlewares/logger.middleware.js";
import { InitializeSocketServer } from "./libs/socket.lib.js";
import { checkSystemHealth } from "./libs/health.lib.js";

const app = CreateApp();

app.get("/healthz", async (_req, res) => {
  const { isHealthy, report } = await checkSystemHealth();
  res.status(isHealthy ? 200 : 503).json(report);
});

app.use(loggerMiddleware);
app.use("/api/v1", V1Router);
app.use(GlobalErrorHandler);

const appServer = createServer(app);

InitializeSocketServer(appServer);

export const StartApp = () => {
  return VerifyDatabaseConnection()
    .andThen(() => SeederFunction())
    .andThen(() => ListenHTTPServer(appServer, env.PORT))
    .map((server) => {
      logger.info(`Server online in [${env.NODE_ENV}] mode @ http://localhost:${env.PORT}`);
      SetupGracefulShutdown(appServer);
      return server;
    });
};
