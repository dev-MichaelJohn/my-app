import Papa from "papaparse";
import { eq, isNull } from "drizzle-orm";
import { ResultAsync } from "neverthrow";
import db from "@/configs/db.config.js";
import {
  Accounts,
  Classes,
  CollegeDeans,
  Colleges,
  CourseCurriculums,
  Courses,
  PersonalDetails,
  ProgramChairs,
  Programs,
} from "@my-app/shared";
import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  CollegeCsvRowSchema,
  ProgramCsvRowSchema,
  CourseCsvRowSchema,
  CurriculumCsvRowSchema,
  ClassCsvRowSchema,
  type ImportSummary,
} from "@my-app/shared";

export interface IBulkImportService {
  importColleges(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
  importPrograms(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
  importCourses(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
  importCurriculums(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
  importClasses(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
}

export class BulkImportService {
  importColleges(csvContent: string, client: DbClient = db): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = parsed.data;

      const summary: ImportSummary = {
        entity: "Colleges",
        totalRows: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      const existingColleges = await tx.select().from(Colleges).where(isNull(Colleges.deleted_at));
      const collegeCodeSet = new Set(existingColleges.map((c) => c.initialism.toUpperCase()));

      const accounts = await tx
        .select({ accountId: Accounts.id, institutionalId: PersonalDetails.institutional_id })
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(isNull(Accounts.deleted_at));
      const accountMap = new Map(accounts.map((a) => [a.institutionalId, a.accountId]));

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const validation = CollegeCsvRowSchema.safeParse(rows[i]);

        if (!validation.success) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: rows[i]?.initialism || `Row ${rowNum}`,
            reason: validation.error.issues[0]?.message || "Invalid row format.",
          });
          continue;
        }

        const data = validation.data;

        if (collegeCodeSet.has(data.initialism)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.initialism,
            reason: `College code "${data.initialism}" already exists.`,
          });
          continue;
        }

        let deanAccountId: number | undefined = undefined;
        if (data.dean_institutional_id) {
          deanAccountId = accountMap.get(data.dean_institutional_id);
          if (!deanAccountId) {
            summary.failed++;
            summary.errors.push({
              row: rowNum,
              identifier: data.initialism,
              reason: `Dean with Institutional ID "${data.dean_institutional_id}" was not found.`,
            });
            continue;
          }
        }

        const [created] = await tx
          .insert(Colleges)
          .values({ name: data.name, initialism: data.initialism })
          .returning();
        if (deanAccountId && created) {
          await tx.insert(CollegeDeans).values({ college_id: created.id, dean_id: deanAccountId });
        }

        collegeCodeSet.add(data.initialism);
        summary.successful++;
      }

      return summary;
    });
  }

  importPrograms(csvContent: string, client: DbClient = db): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = parsed.data;

      const summary: ImportSummary = {
        entity: "Programs",
        totalRows: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      const colleges = await tx.select().from(Colleges).where(isNull(Colleges.deleted_at));
      const collegeMap = new Map(colleges.map((c) => [c.initialism.toUpperCase(), c.id]));

      const existingPrograms = await tx.select().from(Programs).where(isNull(Programs.deleted_at));
      const programCodeSet = new Set(existingPrograms.map((p) => p.initialism.toUpperCase()));

      const accounts = await tx
        .select({ accountId: Accounts.id, institutionalId: PersonalDetails.institutional_id })
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(isNull(Accounts.deleted_at));
      const accountMap = new Map(accounts.map((a) => [a.institutionalId, a.accountId]));

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const validation = ProgramCsvRowSchema.safeParse(rows[i]);

        if (!validation.success) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: rows[i]?.initialism || `Row ${rowNum}`,
            reason: validation.error.issues[0]?.message || "Invalid row format.",
          });
          continue;
        }

        const data = validation.data;
        const collegeId = collegeMap.get(data.college_code.toUpperCase());

        if (!collegeId) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.initialism,
            reason: `College code "${data.college_code}" does not exist.`,
          });
          continue;
        }

        if (programCodeSet.has(data.initialism)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.initialism,
            reason: `Program code "${data.initialism}" already exists.`,
          });
          continue;
        }

        let chairAccountId: number | undefined = undefined;
        if (data.chair_institutional_id) {
          chairAccountId = accountMap.get(data.chair_institutional_id);
          if (!chairAccountId) {
            summary.failed++;
            summary.errors.push({
              row: rowNum,
              identifier: data.initialism,
              reason: `Chair with Institutional ID "${data.chair_institutional_id}" was not found.`,
            });
            continue;
          }
        }

        const [created] = await tx
          .insert(Programs)
          .values({ college_id: collegeId, name: data.name, initialism: data.initialism })
          .returning();
        if (chairAccountId && created) {
          await tx
            .insert(ProgramChairs)
            .values({ program_id: created.id, chair_id: chairAccountId });
        }

        programCodeSet.add(data.initialism);
        summary.successful++;
      }

      return summary;
    });
  }

  importCourses(csvContent: string, client: DbClient = db): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = parsed.data;

      const summary: ImportSummary = {
        entity: "Courses",
        totalRows: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      const programs = await tx.select().from(Programs).where(isNull(Programs.deleted_at));
      const programMap = new Map(programs.map((p) => [p.initialism.toUpperCase(), p.id]));

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const validation = CourseCsvRowSchema.safeParse(rows[i]);

        if (!validation.success) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: rows[i]?.initialism || `Row ${rowNum}`,
            reason: validation.error.issues[0]?.message || "Invalid row format.",
          });
          continue;
        }

        const data = validation.data;
        const programId = programMap.get(data.program_code.toUpperCase());

        if (!programId) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.initialism,
            reason: `Program code "${data.program_code}" does not exist.`,
          });
          continue;
        }

        await tx
          .insert(Courses)
          .values({ program_id: programId, name: data.name, initialism: data.initialism });
        summary.successful++;
      }

      return summary;
    });
  }

  importCurriculums(
    csvContent: string,
    client: DbClient = db,
  ): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = parsed.data;

      const summary: ImportSummary = {
        entity: "Curriculums",
        totalRows: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      const programs = await tx.select().from(Programs).where(isNull(Programs.deleted_at));
      const programMap = new Map(programs.map((p) => [p.initialism.toUpperCase(), p.id]));

      const courses = await tx.select().from(Courses).where(isNull(Courses.deleted_at));
      const courseMap = new Map(courses.map((c) => [c.initialism.toUpperCase(), c.id]));

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const validation = CurriculumCsvRowSchema.safeParse(rows[i]);

        if (!validation.success) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: rows[i]?.course_code || `Row ${rowNum}`,
            reason: validation.error.issues[0]?.message || "Invalid row format.",
          });
          continue;
        }

        const data = validation.data;
        const programId = programMap.get(data.program_code.toUpperCase());
        const courseId = courseMap.get(data.course_code.toUpperCase());

        if (!programId) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.course_code,
            reason: `Program code "${data.program_code}" not found.`,
          });
          continue;
        }

        if (!courseId) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.course_code,
            reason: `Course code "${data.course_code}" not found.`,
          });
          continue;
        }

        await tx.insert(CourseCurriculums).values({
          program_id: programId,
          course_id: courseId,
          year_level: data.year_level,
          semester_term: data.semester_term,
        });

        summary.successful++;
      }

      return summary;
    });
  }

  importClasses(csvContent: string, client: DbClient = db): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = parsed.data;

      const summary: ImportSummary = {
        entity: "Classes",
        totalRows: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      const programs = await tx.select().from(Programs).where(isNull(Programs.deleted_at));
      const programMap = new Map(programs.map((p) => [p.initialism.toUpperCase(), p.id]));

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const validation = ClassCsvRowSchema.safeParse(rows[i]);

        if (!validation.success) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: rows[i]?.program_code || `Row ${rowNum}`,
            reason: validation.error.issues[0]?.message || "Invalid row format.",
          });
          continue;
        }

        const data = validation.data;
        const programId = programMap.get(data.program_code.toUpperCase());

        if (!programId) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: `${data.program_code} ${data.year_level}-${data.section}`,
            reason: `Program code "${data.program_code}" not found.`,
          });
          continue;
        }

        await tx.insert(Classes).values({
          program_id: programId,
          year_level: data.year_level,
          section: data.section,
        });

        summary.successful++;
      }

      return summary;
    });
  }
}
