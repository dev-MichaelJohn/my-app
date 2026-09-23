import { createSelectSchema } from "drizzle-orm/zod";
import { Semesters } from "../schemas/institution.schema.js";
import z from "zod";

export const SemesterSelect = createSelectSchema(Semesters, {
  school_year_start: (schema) =>
    schema
      .int("School year must be a whole number.")
      .min(2000, "School year seems too far in the past.")
      .max(2100, "School year seems too far in the future."),
  school_year_end: (schema) =>
    schema
      .int("School year must be a whole number.")
      .min(2000, "School year seems too far in the past.")
      .max(2100, "School year seems too far in the future."),
  start_date: () => z.date("Start date must be a valid date (YYYY-MM-DD)."),
  end_date: () => z.date("End date must be a valid date (YYYY-MM-DD)."),
});

export const SemesterInsert = SemesterSelect.omit({
  id: true,
  school_year_end: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

export const SemesterUpdate = SemesterInsert.partial();

export type ISemesterSelect = z.infer<typeof SemesterSelect>;
export type ISemesterInsert = z.infer<typeof SemesterInsert>;
export type ISemesterUpdate = z.infer<typeof SemesterUpdate>;
