import path from "node:path";
import winston from "winston";
import { SSELogTransport } from "./stream.lib.js";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

const getLogLevel = () => {
  const env = process.env.NODE_ENV || "development";
  if (env === "production") return "info";
  if (env === "test") return "error";
  return "debug";
};

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `[${info.timestamp}] [${info.level}]: ${info.message}`),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.uncolorize(),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message}`,
  ),
);

export const logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),

    new winston.transports.File({
      filename: path.join("logs", "combined.txt"),
      level: getLogLevel(),
      format: fileFormat,
    }),

    new winston.transports.File({
      filename: path.join("logs", "error.txt"),
      level: "error",
      format: fileFormat,
    }),

    new SSELogTransport({ format: fileFormat }),
  ],
});
