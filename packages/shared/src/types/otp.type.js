import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { OTPCodes } from "../schemas/auth.schema.js";
import z from "zod";
export const ONE_MINUTE = 60 * 1000;
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_TIME = 5 * ONE_MINUTE;
export const OTPCodeSelect = createSelectSchema(OTPCodes, {
    code: (schema) => schema
        .trim()
        .length(OTP_LENGTH, `OTP code must be exactly ${OTP_LENGTH} digits.`)
        .regex(/^\d+$/, "OTP code must contain numbers only."),
    email: (schema) => schema.trim().toLowerCase().pipe(z.email("Invalid email address format.")),
});
export const OTPCodeInsert = createInsertSchema(OTPCodes, {
    code: (schema) => schema
        .trim()
        .length(OTP_LENGTH, `OTP code must be exactly ${OTP_LENGTH} digits.`)
        .regex(/^\d+$/, "OTP code must contain numbers only."),
    email: (schema) => schema.trim().toLowerCase().pipe(z.email("Invalid email address format.")),
});
export const OTPCodeUpdate = createUpdateSchema(OTPCodes, {
    code: (schema) => schema
        .trim()
        .length(OTP_LENGTH, `OTP code must be exactly ${OTP_LENGTH} digits.`)
        .regex(/^\d+$/, "OTP code must contain numbers only."),
    email: (schema) => schema.trim().toLowerCase().pipe(z.email("Invalid email address format.")),
});
export const VerifyOTPSchema = OTPCodeSelect.omit({
    expires_at: true,
    id: true,
    is_active: true,
    created_at: true,
});
