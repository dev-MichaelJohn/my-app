import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { ONE_MINUTE } from "./otp.type.js";
import { RefreshToken } from "../schemas/auth.schema.js";
import z from "zod";

export const ONE_HOUR = 60 * ONE_MINUTE;
export const ONE_DAY = 24 * ONE_HOUR;

export const ACCESS_TOKEN_LIFETIME = "15m";
export const REFRESH_TOKEN_LIFETIME = "1d";
export const REFRESH_COOKIE_LIFETIME = ONE_DAY;

export type RefreshCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  maxAge?: number;
};

export const RefreshTokenSelect = createSelectSchema(RefreshToken, {
  account_id: (schema) => schema.int().positive(),
  email: (schema) => schema.trim().toLowerCase().pipe(z.email("Invalid email address format.")),
  token_hash: (schema) =>
    schema
      .trim()
      .min(1, "Token hash is required")
      .regex(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/, "Invalid bcrypt hash structure"),
  expires_at: (schema) =>
    schema.refine((date) => date > new Date(), {
      message: "Expiration date must be in the future",
    }),
});

export const RefreshTokenInsert = createInsertSchema(RefreshToken, {
  account_id: (schema) => schema.int().positive(),
  email: (schema) => schema.trim().toLowerCase().pipe(z.email("Invalid email address format.")),
  token_hash: (schema) =>
    schema
      .trim()
      .min(1, "Token hash is required")
      .regex(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/, "Invalid bcrypt hash structure"),
  expires_at: (schema) =>
    schema.refine((date) => date > new Date(), {
      message: "Expiration date must be in the future",
    }),
});

export const RefreshTokenUpdate = createUpdateSchema(RefreshToken, {
  account_id: (schema) => schema.int().positive(),
  email: (schema) => schema.trim().toLowerCase().pipe(z.email("Invalid email address format.")),
  token_hash: (schema) =>
    schema
      .trim()
      .min(1, "Token hash is required")
      .regex(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/, "Invalid bcrypt hash structure"),
  expires_at: (schema) =>
    schema.refine((date) => date > new Date(), {
      message: "Expiration date must be in the future",
    }),
});

export type IRefreshTokenSelect = z.infer<typeof RefreshTokenSelect>;
export type IRefreshTokenInsert = z.infer<typeof RefreshTokenInsert>;
export type IRefreshTokenUpdate = z.infer<typeof RefreshTokenUpdate>;
