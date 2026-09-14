import { StartApp } from "./app.js";
import { logger } from "./libs/logger.lib.js";

StartApp().match(
  () => {},
  (err) => {
    logger.error(`🛑 FATAL SYSTEM ERROR: ${err.message}`);
    logger.error("Shutting down application process because startup checks failed.");
    process.exit(1);
  },
);
