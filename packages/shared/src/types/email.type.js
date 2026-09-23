import z from "zod";
export const INSTITUTE_NAME = "Palompon Institute of Technology";
export const SYSTEM_NAME = "Faculty Evaluation System";
export const INITIALISM = "PIT-FES";
export const SENDER_NAME = `${INITIALISM} Notification Services`;
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
