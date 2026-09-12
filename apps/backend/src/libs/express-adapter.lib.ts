import { type Request, type Response, type NextFunction } from "express";
import { ResultAsync } from "neverthrow";
import { AppError } from "./error.lib.js";
import { createAPIResponse } from "./response.lib.js";

export type ControllerResult<T> =
  | T
  | {
      data: T;
      message?: string;
      status: number;
    };

type ControllerAction<T> = (
  req: Request,
  res: Response,
) => ResultAsync<ControllerResult<T>, AppError>;

interface RunAsyncOptions {
  status?: number;
  message?: string;
}

export const runAsync = <T>(action: ControllerAction<T>, defaultOptions: RunAsyncOptions = {}) => {
  const defaultStatus = defaultOptions.status ?? 200;
  const defaultMessage = defaultOptions.message ?? "Operation successful.";

  return (req: Request, res: Response, next: NextFunction) => {
    action(req, res).match(
      (result) => {
        let statusCode = defaultStatus;
        let message = defaultMessage;
        let payload: T | null = null;

        if (result !== null && typeof result === "object" && "data" in result) {
          const customResult = result as {
            data: T;
            message?: string;
            status: number;
          };
          payload = customResult.data ?? null;
          if (customResult.status) statusCode = customResult.status;
          if (customResult.message) message = customResult.message;
        } else {
          payload = (result as T) ?? null;
        }

        const responseBody = createAPIResponse(statusCode, message, payload);
        res.status(statusCode).json(responseBody);
      },
      (error) => {
        next(error);
      },
    );
  };
};

export const runMiddleware = <T>(
  action: (req: Request, res: Response) => ResultAsync<T, AppError>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    action(req, res).match(
      () => {
        next();
      },
      (error) => {
        next(error);
      },
    );
  };
};
