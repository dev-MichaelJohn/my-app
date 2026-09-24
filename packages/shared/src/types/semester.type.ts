import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { Semesters, SemeterTermEnum } from "../schemas/institution.schema.js";
import z from "zod";

const schoolYearField = (schema: z.ZodNumber) =>
  schema
    .int("School year must be a whole number.")
    .min(2000, "School year seems too far in the past.")
    .max(2100, "School year seems too far in the future.");

const dateField = () =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.");

export const SemesterSelect = createSelectSchema(Semesters, {
  school_year_start: schoolYearField,
  school_year_end: schoolYearField,
  start_date: dateField, // 👈 Returns string (matches Drizzle)
  end_date: dateField, // 👈 Returns string (matches Drizzle)
});

export const SemesterInsert = createInsertSchema(Semesters, {
  school_year_start: schoolYearField,
  start_date: dateField,
  end_date: dateField,
})
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
  })
  .refine((data) => new Date(data.start_date) < new Date(data.end_date), {
    message: "Start date must be chronologically before the end date.",
    path: ["end_date"],
  });

export const SemesterUpdate = createUpdateSchema(Semesters, {
  school_year_start: schoolYearField,
  start_date: dateField,
  end_date: dateField,
})
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) < new Date(data.end_date);
      }
      return true;
    },
    {
      message: "Start date must be chronologically before the end date.",
      path: ["end_date"],
    },
  );

export const SemesterQuerySchema = z.object({
  paginate: z
    .preprocess((val) => {
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return true;
    }, z.boolean())
    .default(true),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  semester_term: z.enum(SemeterTermEnum.enumValues).optional(),
  school_year_start: z.coerce.number().int().positive().optional(),
  is_archived: z
    .preprocess((val) => {
      if (val === "true" || val === true || val === "1" || val === 1) return true;
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return false;
    }, z.boolean())
    .default(false),
  sort_by: z
    .enum(["created_at", "start_date", "end_date", "school_year_start"])
    .default("start_date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ISemesterSelect = z.infer<typeof SemesterSelect>;
export type ISemesterInsert = z.infer<typeof SemesterInsert>;
export type ISemesterUpdate = z.infer<typeof SemesterUpdate>;
export type SemesterQuery = z.infer<typeof SemesterQuerySchema>;
export type GetSemester = ISemesterSelect;
