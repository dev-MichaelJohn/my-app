import { type ErrorRequestHandler } from "express";
import { AppError } from "@/libs/error.lib.js";
import { createAPIResponse } from "@/libs/response.lib.js";

export const GlobalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const errorResponse = createAPIResponse(err.status, err.message, null, err.errors);
    res.status(err.status).json(errorResponse);
    return;
  }

  const fallbackResponse = createAPIResponse(
    500,
    "Internal server error.",
    null,
    process.env.NODE_ENV === "development" ? err.message : null,
  );

  res.status(500).json(fallbackResponse);
};
