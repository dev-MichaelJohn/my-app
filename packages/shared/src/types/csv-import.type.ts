import { z } from "zod";
import { SemeterTermEnum, SystemRoles, YearLevelEnum } from "../schemas/index.schema.js";

export const CollegeCsvRowSchema = z.object({
  name: z.string().trim().min(3, "College name must be at least 3 characters."),
  initialism: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .transform((v) => v.toUpperCase()),
  dean_institutional_id: z.string().trim().optional().or(z.literal("")),
});

export const ProgramCsvRowSchema = z.object({
  name: z.string().trim().min(3, "Program name must be at least 3 characters."),
  initialism: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .transform((v) => v.toUpperCase()),
  college_code: z.string().trim().min(2, "College code is required."),
  chair_institutional_id: z.string().trim().optional().or(z.literal("")),
});

export const CourseCsvRowSchema = z.object({
  name: z.string().trim().min(3, "Course title must be at least 3 characters."),
  initialism: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .transform((v) => v.toUpperCase()),
  program_code: z.string().trim().min(2, "Program code is required."),
});

export const CurriculumCsvRowSchema = z.object({
  program_code: z.string().trim().min(2, "Program code is required."),
  course_code: z.string().trim().min(2, "Course code is required."),
  year_level: z.enum(YearLevelEnum.enumValues),
  semester_term: z.enum(SemeterTermEnum.enumValues),
});

export const ClassCsvRowSchema = z.object({
  program_code: z.string().trim().min(2, "Program code is required."),
  year_level: z.enum(YearLevelEnum.enumValues),
  section: z
    .string()
    .trim()
    .length(1, "Section must be a single letter (e.g. A, B).")
    .transform((v) => v.toUpperCase()),
});

export const UserCsvRowSchema = z.object({
  institutional_id: z
    .string()
    .trim()
    .min(5, "Institutional ID must be at least 5 characters.")
    .max(32),
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email format.")),
  first_name: z.string().trim().min(2, "First name is required."),
  last_name: z.string().trim().min(2, "Last name is required."),
  middle_name: z.string().trim().optional().or(z.literal("")),
  suffix: z.string().trim().optional().or(z.literal("")),
  role: z.enum(SystemRoles.enumValues).default("STUDENT"),
  password: z.string().trim().optional().or(z.literal("")),
});

export type CollegeCsvRow = z.infer<typeof CollegeCsvRowSchema>;
export type ProgramCsvRow = z.infer<typeof ProgramCsvRowSchema>;
export type CourseCsvRow = z.infer<typeof CourseCsvRowSchema>;
export type CurriculumCsvRow = z.infer<typeof CurriculumCsvRowSchema>;
export type ClassCsvRow = z.infer<typeof ClassCsvRowSchema>;
export type UserCsvRow = z.infer<typeof UserCsvRowSchema>;

export interface ImportSummary {
  entity: string;
  totalRows: number;
  successful: number;
  failed: number;
  errors: { row: number; identifier: string; reason: string }[];
}
