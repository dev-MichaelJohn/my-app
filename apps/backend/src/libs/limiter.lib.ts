import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { createAPIResponse } from "./response.lib.js";

const UserKeyGenerator = (req: Request) => {
  if (req.user?.account.id) return `user:${req.user.account.id}`;
  return req.ip || req.socket.remoteAddress || "anonymous";
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const errorResponse = createAPIResponse(
      429,
      "Too many authentication requests. Please try again in 15 minutes.",
    );

    res.status(errorResponse.status).json(errorResponse);
  },
});

export const standardApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  keyGenerator: UserKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const errorResponse = createAPIResponse(
      429,
      "API rate limit exceeded. Please slow down your requests.",
    );

    res.status(errorResponse.status).json(errorResponse);
  },
});

export const evaluationExecutionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  keyGenerator: UserKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const errorResponse = createAPIResponse(
      429,
      "Evaluation submission burst limit reached. Please wait a moment.",
    );

    res.status(errorResponse.status).json(errorResponse);
  },
});
