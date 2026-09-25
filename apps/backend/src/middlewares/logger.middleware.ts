import morgan, { type StreamOptions } from "morgan";
import { logger } from "@/libs/logger.lib.js";

const stream: StreamOptions = {
  write: (message) => logger.http(message.trim()),
};

const skip = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "test";
};

export const loggerMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  { stream, skip },
);
