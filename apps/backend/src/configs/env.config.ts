import "dotenv/config";
import { ValidateEnvironmentVariables } from "@/libs/env.lib.js";
import type { EnvType } from "@my-app/shared";
import z from "zod";
import { logger } from "@/libs/logger.lib.js";

const env: EnvType = ValidateEnvironmentVariables(process.env).match(
  (data) => data,
  (error) => {
    const errors = z.prettifyError(error);
    logger.error(errors);
    logger.error("Shutting down server...");
    process.exit(1);
  },
);

export default env;
