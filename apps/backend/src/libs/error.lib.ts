import { type ZodError } from "zod";
import pg from "pg";
import { DrizzleQueryError } from "drizzle-orm";
import { logger } from "./logger.lib.js";

export class AppError extends Error {
  public status: number;
  public errors: unknown;

  constructor(status: number, message: string, errors: unknown = null) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const parseZodError = (error: ZodError): AppError => {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".");
    if (!errors[field]) errors[field] = issue.message;
  }

  // Log as WARN with clean JSON formatting (avoiding [object Object])
  logger.warn(`Validation failed: ${JSON.stringify(errors)}`);

  return new AppError(400, "Validation failed.", errors);
};

export interface DatabaseError extends Error {
  code?: string;
  detail: string;
}

const { DatabaseError } = pg;

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED", // nothing listening on the configured host/port
  "ENOTFOUND", // DNS lookup for the host failed
  "ETIMEDOUT", // connection attempt timed out
  "ECONNRESET", // connection was open, then dropped
]);

export function isDatabaseError(error: unknown): boolean {
  if (error instanceof DrizzleQueryError) return true;
  if (error instanceof DatabaseError) return true;
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string" &&
    CONNECTION_ERROR_CODES.has((error as NodeJS.ErrnoException).code!)
  );
}

function parseDetail(detail?: string) {
  const match = detail?.match(/^Key \(([^)]+)\)=\(([^)]*)\)/);
  if (!match) return undefined;
  return { field: match[1], value: match[2] };
}

export const parseDatabaseError = (error: unknown): AppError => {
  // If an AppError was thrown manually inside a transaction, return it directly
  if (error instanceof AppError) {
    return error;
  }

  const cause = error instanceof DrizzleQueryError ? error.cause : error;

  // ── 1. PostgreSQL Specific Errors ──
  if (cause instanceof DatabaseError) {
    const detail = parseDetail(cause.detail);

    switch (cause.code) {
      case "23505": {
        // unique_violation
        logger.warn(`Postgres Unique Violation (23505): ${cause.detail || cause.message}`);
        return new AppError(
          409,
          detail
            ? `A record with ${detail.field} "${detail.value}" already exists.`
            : "A record with this value already exists.",
        );
      }

      case "23503": {
        // foreign_key_violation
        logger.warn(`Postgres Foreign Key Violation (23503): ${cause.detail || cause.message}`);
        return new AppError(400, "Referenced record does not exist.");
      }

      case "23502": {
        // not_null_violation
        logger.warn(`Postgres Not-Null Violation (23502): Column "${cause.column}" is required.`);
        return new AppError(
          400,
          cause.column ? `Missing required field: ${cause.column}.` : "Missing a required field.",
        );
      }

      case "22P02": {
        // invalid_text_representation (e.g. string passed to integer column)
        logger.warn(`Postgres Invalid Representation (22P02): ${cause.message}`);
        return new AppError(400, "Invalid data format provided.");
      }

      default: {
        logger.error(
          `Unhandled Postgres Error [${cause.code || "UNKNOWN"}]: ${cause.message}`,
          cause,
        );
        return new AppError(500, "Database operation failed.");
      }
    }
  }

  // ── 2. Network & Connection Failures ──
  if (
    cause instanceof Error &&
    "code" in cause &&
    typeof (cause as NodeJS.ErrnoException).code === "string" &&
    CONNECTION_ERROR_CODES.has((cause as NodeJS.ErrnoException).code!)
  ) {
    const code = (cause as NodeJS.ErrnoException).code;
    logger.error(`Database Connection Failure [${code}]: Server cannot reach PostgreSQL.`);
    return new AppError(503, "Database is currently unavailable. Please try again shortly.");
  }

  // ── 3. Unhandled Generic Failures ──
  logger.error("Unhandled Database Query Error:", error);
  return new AppError(500, "Database operation failed.");
};
