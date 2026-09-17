import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
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
  start_date: () => z.iso.date("Start date must be a valid date."),
  end_date: () => z.iso.date("End date must be a valid date."),
});

export const SemesterInsert = createInsertSchema(Semesters, {
  school_year_start: (schema) =>
    schema
      .int("School year must be a whole number.")
      .min(2000, "School year seems too far in the past.")
      .max(2100, "School year seems too far in the future."),
  start_date: () => z.iso.date("Start date must be a valid date."),
  end_date: () => z.iso.date("End date must be a valid date."),
});

export const SemesterUpdate = createUpdateSchema(Semesters, {
  school_year_start: (schema) =>
    schema
      .int("School year must be a whole number.")
      .min(2000, "School year seems too far in the past.")
      .max(2100, "School year seems too far in the future."),
  start_date: () => z.iso.date("Start date must be a valid date."),
  end_date: () => z.iso.date("End date must be a valid date."),
});

export type ISemesterSelect = z.infer<typeof SemesterSelect>;
export type ISemesterInsert = z.infer<typeof SemesterInsert>;
export type ISemesterUpdate = z.infer<typeof SemesterUpdate>;
