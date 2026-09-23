import z from "zod";
const postgresRegex = /^postgresql?:\/\/(?:([^:]+)(?::([^@]+))?@)?([^:\/\s]+)(?::(\d+))?(?:\/([^\?\s]+))?(?:\?(.*))?$/;
export const EnvSchema = z.object({
    CLIENT_URL: z.url().default("http://localhost:5173"),
    NODE_ENV: z
        .enum(["development", "production", "test"], "NODE_ENV is invalid.")
        .default("development"),
    PORT: z.coerce
        .number("PORT must be a number.")
        .positive("PORT must be a positive number.")
        .nonoptional("PORT is required."),
    DATABASE_URL: z
        .url("DATABASE_URL must be a valid connection string URL.")
        .regex(postgresRegex, "DATABASE_URL must be a valid PostgreSQL connection string URL.")
        .nonoptional("DATABASE_URL is required"),
    JWT_SECRET: z
        .string("JWT_SECRET is invalid.")
        .trim()
        .min(32, "JWT_SECRET should be at least 32 characters long.")
        .nonempty("JWT_SECRET must not be an empty string.")
        .nonoptional("JWT_SECRET is required."),
    REFRESH_SECRET: z
        .string("REFRESH_SECRET is invalid.")
        .trim()
        .min(32, "REFRESH_SECRET should be at least 32 characters long.")
        .nonempty("REFRESH_SECRET must not be an empty string.")
        .nonoptional("REFRESH_SECRET is required."),
    EMAIL_FROM: z.string().trim(),
    RESEND_API_KEY: z.string().trim().optional(),
    BREVO_API_KEY: z.string().trim().optional(),
});
