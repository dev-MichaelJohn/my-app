import env from "@/configs/env.config.js";
import { AppError } from "@/libs/error.lib.js";
import { logger } from "@/libs/logger.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { SendEmailSchema, type SendEmail } from "@my-app/shared";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

export interface IEmailService {
  sendEmail(details: SendEmail): ResultAsync<void, AppError>;
}

export class EmailService implements IEmailService {
  constructor() {
    if (env.BREVO_API_KEY) {
      logger.info("Transactional Email Engine: Brevo HTTP API active.");
    } else {
      logger.error("No Email Engine initialized. Please restart the server!");
    }
  }

  sendEmail(details: SendEmail): ResultAsync<void, AppError> {
    return ValidateSchema(SendEmailSchema, details).asyncAndThen(({ to, options }) => {
      return this.sendViaBrevo(to, options).mapErr((_err) => {
        logger.error("All email providers failed to send email.");
        return new AppError(500, "Failed to deliver email. Please try again later.");
      });
    });
  }

  private sendViaBrevo(to: string, options: SendEmail["options"]): ResultAsync<void, AppError> {
    if (!env.BREVO_API_KEY) {
      return errAsync(new AppError(500, "Brevo API key is not configured."));
    }

    const payload = {
      sender: {
        name: "My App",
        email: env.EMAIL_FROM || "no-reply@myapp.com",
      },
      to: [{ email: to }],
      subject: options.subject,
      ...(options.html && { htmlContent: options.html }),
      ...(options.text && { textContent: options.text }),
    };

    return ResultAsync.fromPromise(
      fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": env.BREVO_API_KEY,
        },
        body: JSON.stringify(payload),
      }),
      (err) => new AppError(500, `Brevo network error: ${(err as Error).message}`),
    ).andThen((response) => {
      if (response.ok) {
        logger.info(`Transactional email sent to ${to} via Brevo HTTP API`);
        return okAsync(undefined);
      }

      return ResultAsync.fromPromise(
        response.json() as Promise<{ message?: string }>,
        () => new AppError(response.status, response.statusText),
      ).andThen((errorData) =>
        errAsync(
          new AppError(
            response.status,
            `Brevo rejected: ${errorData.message || response.statusText}`,
          ),
        ),
      );
    });
  }
}
