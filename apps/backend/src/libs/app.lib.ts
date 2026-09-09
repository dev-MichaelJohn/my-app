import express, { type Express } from "express";
import passport from "passport";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import "@/configs/passport.config.js";
import env from "@/configs/env.config.js";

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
