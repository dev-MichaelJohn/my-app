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
      const codeSet = new Set(existingColleges.map((c) => c.initialism.toUpperCase()));
      const nameSet = new Set(existingColleges.map((c) => c.name.toLowerCase()));

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

        if (codeSet.has(data.initialism)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.initialism,
            reason: `College code "${data.initialism}" already exists.`,
          });
          continue;
        }

        if (nameSet.has(data.name.toLowerCase())) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.name,
            reason: `College with name "${data.name}" already exists.`,
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
              reason: `Dean with ID "${data.dean_institutional_id}" was not found.`,
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

        codeSet.add(data.initialism);
        nameSet.add(data.name.toLowerCase());
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
      const codeSet = new Set(existingPrograms.map((p) => p.initialism.toUpperCase()));
      const collegeNameSet = new Set(
        existingPrograms.map((p) => `${p.college_id}:${p.name.toLowerCase()}`),
      );

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
            reason: `Parent college code "${data.college_code}" does not exist.`,
          });
          continue;
        }

        if (codeSet.has(data.initialism)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.initialism,
            reason: `Program code "${data.initialism}" already exists.`,
          });
          continue;
        }

        const compositeKey = `${collegeId}:${data.name.toLowerCase()}`;
        if (collegeNameSet.has(compositeKey)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.name,
            reason: `Program "${data.name}" already exists under ${data.college_code}.`,
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
              reason: `Chair with ID "${data.chair_institutional_id}" was not found.`,
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

        codeSet.add(data.initialism);
        collegeNameSet.add(compositeKey);
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

      const existingCourses = await tx.select().from(Courses).where(isNull(Courses.deleted_at));
      const courseNameSet = new Set(
        existingCourses.map((c) => `${c.program_id}:${c.name.toLowerCase()}`),
      );
      const courseCodeSet = new Set(
        existingCourses.map((c) => `${c.program_id}:${c.initialism.toUpperCase()}`),
      );

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
            reason: `Degree program code "${data.program_code}" does not exist.`,
          });
          continue;
        }

        const nameKey = `${programId}:${data.name.toLowerCase()}`;
        const codeKey = `${programId}:${data.initialism.toUpperCase()}`;

        if (courseCodeSet.has(codeKey)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.initialism,
            reason: `Course code "${data.initialism}" already exists in ${data.program_code}.`,
          });
          continue;
        }

        if (courseNameSet.has(nameKey)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.name,
            reason: `Course title "${data.name}" already exists in ${data.program_code}.`,
          });
          continue;
        }

        await tx
          .insert(Courses)
          .values({ program_id: programId, name: data.name, initialism: data.initialism });

        courseCodeSet.add(codeKey);
        courseNameSet.add(nameKey);
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

      const existingCurriculums = await tx
        .select()
        .from(CourseCurriculums)
        .where(isNull(CourseCurriculums.deleted_at));
      const slotSet = new Set(
        existingCurriculums.map(
          (curr) => `${curr.course_id}:${curr.program_id}:${curr.year_level}:${curr.semester_term}`,
        ),
      );

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

        const slotKey = `${courseId}:${programId}:${data.year_level}:${data.semester_term}`;
        if (slotSet.has(slotKey)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.course_code,
            reason: `Course is already mapped to ${data.program_code} for Year ${data.year_level}, ${data.semester_term} term.`,
          });
          continue;
        }

        await tx.insert(CourseCurriculums).values({
          program_id: programId,
          course_id: courseId,
          year_level: data.year_level,
          semester_term: data.semester_term,
        });

        slotSet.add(slotKey);
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

      const existingClasses = await tx.select().from(Classes).where(isNull(Classes.deleted_at));
      const classSlotSet = new Set(
        existingClasses.map((c) => `${c.program_id}:${c.year_level}:${c.section.toUpperCase()}`),
      );

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

        const classKey = `${programId}:${data.year_level}:${data.section.toUpperCase()}`;
        if (classSlotSet.has(classKey)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: `${data.program_code} ${data.year_level}-${data.section}`,
            reason: `Class section "${data.program_code} ${data.year_level}-${data.section}" already exists.`,
          });
          continue;
        }

        await tx.insert(Classes).values({
          program_id: programId,
          year_level: data.year_level,
          section: data.section,
        });

        classSlotSet.add(classKey);
        summary.successful++;
      }

      return summary;
    });
  }
}
