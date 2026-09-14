import { type EnvType, EnvSchema } from "@my-app/shared";
import { err, ok, Result } from "neverthrow";
import z from "zod";
import { logger } from "./logger.lib.js";

export const ValidateEnvironmentVariables = (
  rawEnv: NodeJS.ProcessEnv,
): Result<EnvType, z.ZodError> => {
  logger.info("Initializing environment variables...");
  const parsed = EnvSchema.safeParse(rawEnv);
  return parsed.success ? ok(parsed.data) : err(parsed.error);
};
