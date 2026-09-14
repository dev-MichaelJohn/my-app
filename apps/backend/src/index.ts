import { StartApp } from "./app.js";

StartApp().match(
  () => {},
  (err) => {
    console.error(`🛑 FATAL SYSTEM ERROR: ${err.message}`);
    console.error("Shutting down application process because startup checks failed.");
    process.exit(1);
  },
);
