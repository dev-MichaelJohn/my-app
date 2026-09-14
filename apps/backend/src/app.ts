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

const app = CreateApp();

app.use(GlobalErrorHandler);

const appServer = createServer(app);

export const StartApp = () => {
  return VerifyDatabaseConnection()
    .andThen(() => SeederFunction())
    .andThen(() => ListenHTTPServer(appServer, env.PORT))
    .map((server) => {
      console.info(`Server online in [${env.NODE_ENV}] mode @ http://localhost:${env.PORT}`);
      SetupGracefulShutdown(appServer);
      return server;
    });
};
