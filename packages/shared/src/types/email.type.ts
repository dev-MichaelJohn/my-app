import z from "zod";

export const INSTITUTE_NAME = "Palompon Institute of Technology";
export const SYSTEM_NAME = "Faculty Evaluation System";
export const INITIALISM = "PIT-FES";

export const SENDER_NAME = `${INITIALISM} Notification Services`;

export interface BaseEmailOpts {
  recipientName: string;
}

export interface WelcomeEmailOpts extends BaseEmailOpts {
  email: string;
  generatedPassword: string;
  url: string;
}

export interface UpdateEmailOpts extends BaseEmailOpts {
  updatedFields: Array<{
    label: string;
    oldValue: string;
    newValue: string;
  }>;
  updatedAt: Date;
}

export const SendEmailSchema = z.object({
  to: z.email(),
  options: z
    .object({
      subject: z.string(),
      text: z.string().optional(),
      html: z.string().optional(),
    })
    .refine((data) => data.text || data.html, {
      message: "Either text or html must be provided",
    }),
});

export type SendEmail = z.infer<typeof SendEmailSchema>;
