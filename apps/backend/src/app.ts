import { createServer } from "http";
import { CreateApp } from "@/libs/app.lib.js";
import env from "@/configs/env.config.js";
import { GlobalErrorHandler } from "./middlewares/error.middleware.js";

const app = CreateApp();

app.use(GlobalErrorHandler);

const appServer = createServer(app);

export const StartApp = () => {
  appServer.listen(env.PORT, async () => {
    console.log(`🚀 Server online with Socket.io @ http://localhost:${env.PORT}`);
  });
};
