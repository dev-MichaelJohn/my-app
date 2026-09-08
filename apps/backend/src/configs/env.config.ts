import "dotenv/config";
import { ValidateEnvironmentVariables } from "@/libs/env.lib.js";
import type { EnvType } from "@my-app/shared";

const env: EnvType = ValidateEnvironmentVariables(process.env).match(
  (data) => data,
  (error) => {
    console.log(error);
    process.exit(1);
  },
);

export default env;
