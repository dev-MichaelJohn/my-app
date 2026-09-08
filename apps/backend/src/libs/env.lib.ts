import { type EnvType, EnvSchema } from "@my-app/shared";
import { err, ok, Result } from "neverthrow";
import z from "zod";

export const ValidateEnvironmentVariables = (
  rawEnv: NodeJS.ProcessEnv,
): Result<EnvType, z.ZodError> => {
  const parsed = EnvSchema.safeParse(rawEnv);
  return parsed.success ? ok(parsed.data) : err(parsed.error);
};
