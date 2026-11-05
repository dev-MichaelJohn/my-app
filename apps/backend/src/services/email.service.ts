// apps/backend/src/services/email.service.ts

import env from "@/configs/env.config.js";
import { AppError } from "@/libs/error.lib.js";
import { logger } from "@/libs/logger.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { SENDER_NAME, SendEmailSchema, type SendEmail } from "@my-app/shared";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

export interface IEmailService {
  sendEmail(details: SendEmail): ResultAsync<void, AppError>;
}

export class EmailService implements IEmailService {
  constructor() {
    if (env.BREVO_API_KEY) {
      logger.info("Transactional Email: Brevo HTTP API configured.");
    }
    if (env.RESEND_API_KEY) {
      logger.info("Transactional Email: Resend HTTP API configured as backup.");
    }
    if (!env.BREVO_API_KEY && !env.RESEND_API_KEY) {
      logger.warn(
        "⚠️ No email provider API keys configured. Set BREVO_API_KEY or RESEND_API_KEY in .env",
      );
    }
  }

  sendEmail(details: SendEmail): ResultAsync<void, AppError> {
    return ValidateSchema(SendEmailSchema, details).asyncAndThen(({ to, options }) => {
      // In dev mode, always log the email preview in case external mail servers fail
      if (env.NODE_ENV !== "production") {
        logger.debug(`[DEV EMAIL to ${to}] Subject: "${options.subject}"`);
      }

      // 1. Try Brevo first if configured
      if (env.BREVO_API_KEY) {
        return this.sendViaBrevo(to, options).orElse((brevoErr) => {
          logger.warn(`Brevo delivery failed: ${brevoErr.message}`);

          // 2. Fallback to Resend if available
          if (env.RESEND_API_KEY) {
            logger.info(`Attempting fallback email delivery via Resend to ${to}...`);
            return this.sendViaResend(to, options);
          }

          return errAsync(brevoErr);
        });
      }

      // If only Resend is configured
      if (env.RESEND_API_KEY) {
        return this.sendViaResend(to, options);
      }

      return errAsync(
        new AppError(500, "No email provider (Brevo or Resend) is configured on this server."),
      );
    });
  }

  private sendViaBrevo(to: string, options: SendEmail["options"]): ResultAsync<void, AppError> {
    const senderEmail = env.EMAIL_FROM || "no-reply@pit.edu.ph";

    const payload = {
      sender: {
        name: SENDER_NAME || "PIT-FES Notification",
        email: senderEmail,
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
          "api-key": env.BREVO_API_KEY!,
        },
        body: JSON.stringify(payload),
      }),
      (err) => new AppError(500, `Brevo network error: ${(err as Error).message}`),
    ).andThen((response) => {
      if (response.ok) {
        logger.info(`Email successfully delivered to ${to} via Brevo`);
        return okAsync(undefined);
      }

      return ResultAsync.fromPromise(
        response.json() as Promise<{ message?: string; code?: string }>,
        () =>
          new AppError(response.status, `Brevo HTTP ${response.status}: ${response.statusText}`),
      ).andThen((errorData) => {
        const errorDetail = errorData?.message || response.statusText;
        // Log the exact rejection reason from Brevo so you can see it in terminal
        logger.error(`Brevo rejected email [HTTP ${response.status}]: ${errorDetail}`);
        return errAsync(new AppError(response.status, `Email provider rejected: ${errorDetail}`));
      });
    });
  }

  private sendViaResend(to: string, options: SendEmail["options"]): ResultAsync<void, AppError> {
    const senderEmail = env.EMAIL_FROM || "onboarding@resend.dev";

    const payload = {
      from: `${SENDER_NAME || "PIT-FES"} <${senderEmail}>`,
      to: [to],
      subject: options.subject,
      ...(options.html && { html: options.html }),
      ...(options.text && { text: options.text }),
    };

    return ResultAsync.fromPromise(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
      (err) => new AppError(500, `Resend network error: ${(err as Error).message}`),
    ).andThen((response) => {
      if (response.ok) {
        logger.info(`Email successfully delivered to ${to} via Resend`);
        return okAsync(undefined);
      }

      return ResultAsync.fromPromise(
        response.json() as Promise<{ message?: string }>,
        () => new AppError(response.status, `Resend HTTP ${response.status}`),
      ).andThen((errorData) => {
        logger.error(`Resend rejected email: ${errorData?.message || response.statusText}`);
        return errAsync(
          new AppError(
            response.status,
            `Resend rejected: ${errorData?.message || response.statusText}`,
          ),
        );
      });
    });
  }
}
