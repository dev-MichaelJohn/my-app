import { type ZodError } from "zod";
import pg from "pg";
import { DrizzleQueryError } from "drizzle-orm";

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

export const parseZodError = (error: ZodError) => {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".");
    if (!errors[field]) errors[field] = issue.message;
  }

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
  const cause = error instanceof DrizzleQueryError ? error.cause : error;

  if (cause instanceof DatabaseError) {
    const detail = parseDetail(cause.detail);

    switch (cause.code) {
      case "23505": // unique_violation
        return new AppError(
          409,
          detail
            ? `A record with ${detail.field} "${detail.value}" already exists.`
            : "A record with this value already exists.",
        );
      case "23503": // foreign_key_violation
        return new AppError(400, "Referenced record does not exist.");
      case "23502": // not_null_violation
        return new AppError(
          400,
          cause.column ? `Missing required field: ${cause.column}.` : "Missing a required field.",
        );
      case "22P02": // invalid_text_representation
        return new AppError(400, "Invalid data format provided.");
      default:
        return new AppError(500, "Database operation failed.");
    }
  }

  if (
    cause instanceof Error &&
    "code" in cause &&
    typeof (cause as NodeJS.ErrnoException).code === "string" &&
    CONNECTION_ERROR_CODES.has((cause as NodeJS.ErrnoException).code!)
  ) {
    return new AppError(503, "Database is currently unavailable. Please try again shortly.");
  }

  return new AppError(500, "Database operation failed.");
};
