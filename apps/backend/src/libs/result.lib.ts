import { Result, ResultAsync, ok, err } from "neverthrow";
import { AppError, parseZodError, parseDatabaseError } from "./error.lib.js";
import z from "zod";

export const ValidateSchema = <T extends z.ZodType>(
  schema: T,
  data: unknown,
): Result<z.infer<T>, AppError> => {
  const parsed = schema.safeParse(data);
  return parsed.success ? ok(parsed.data) : err(parseZodError(parsed.error));
};

export const FromDbPromise = <T>(promise: Promise<T>): ResultAsync<T, AppError> => {
  return ResultAsync.fromPromise(promise, (error) => parseDatabaseError(error));
};
