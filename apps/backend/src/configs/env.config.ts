import "dotenv/config";
import { ValidateEnvironmentVariables } from "@/libs/env.lib.js";
import type { EnvType } from "@my-app/shared";
import z from "zod";

const env: EnvType = ValidateEnvironmentVariables(process.env).match(
  (data) => data,
  (error) => {
    const errors = z.prettifyError(error);
    console.error(errors);
    console.error("Shutting down server...");
    process.exit(1);
  },
);

export default env;
