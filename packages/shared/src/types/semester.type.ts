import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { Semesters } from "../schemas/institution.schema.js";
import z from "zod";

const schoolYearField = (schema: z.ZodNumber) =>
  schema
    .int("School year must be a whole number.")
    .min(2000, "School year seems too far in the past.")
    .max(2100, "School year seems too far in the future.");

export const SemesterSelect = createSelectSchema(Semesters, {
  school_year_start: schoolYearField,
  school_year_end: schoolYearField,
  start_date: () => z.coerce.date(),
  end_date: () => z.coerce.date(),
});

export const SemesterInsert = createInsertSchema(Semesters, {
  school_year_start: schoolYearField,
  start_date: () => z.coerce.date(),
  end_date: () => z.coerce.date(),
});

export const SemesterUpdate = createUpdateSchema(Semesters, {
  school_year_start: schoolYearField,
  start_date: () => z.coerce.date(),
  end_date: () => z.coerce.date(),
});

export type ISemesterSelect = z.infer<typeof SemesterSelect>;
export type ISemesterInsert = z.infer<typeof SemesterInsert>;
export type ISemesterUpdate = z.infer<typeof SemesterUpdate>;
