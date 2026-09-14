import type { Request } from "express";
import rateLimit from "express-rate-limit";

const UserKeyGenerator = (req: Request) => {
  if (req.user?.account.id) return `user:${req.user.account.id}`;
  return req.ip || req.socket.remoteAddress || "anonymous";
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication requests. Please try again in 15 minutes." },
});

export const standardApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  keyGenerator: UserKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "API rate limit exceeded. Please slow down your requests." },
});

export const evaluationExecutionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  keyGenerator: UserKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Evaluation submission burst limit reached. Please wait a moment." },
});
