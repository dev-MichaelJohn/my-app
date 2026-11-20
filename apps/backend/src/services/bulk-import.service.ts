import Papa from "papaparse";
import { and, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { okAsync, ResultAsync } from "neverthrow";
import db, { type PgTransaction } from "@/configs/db.config.js";
import {
  Accounts,
  Classes,
  ClassStudents,
  CollegeDeans,
  Colleges,
  CourseCurriculums,
  CourseOfferings,
  Courses,
  Faculties,
  OfferingStudents,
  PersonalDetails,
  ProgramChairs,
  Programs,
  Roles,
  AccountRoles,
  Semesters,
  CollegeCsvRowSchema,
  ProgramCsvRowSchema,
  CourseCsvRowSchema,
  CurriculumCsvRowSchema,
  ClassCsvRowSchema,
  UserCsvRowSchema,
  FacultyCsvRowSchema,
  ClassStudentCsvRowSchema,
  OfferingStudentCsvRowSchema,
  type GetUser,
  type ImportSummary,
  type WelcomeEmailOpts,
} from "@my-app/shared";
import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import bcrypt from "bcryptjs";
import { UserService, type IUserService } from "./user.service.js";
import { logger } from "@/libs/logger.lib.js";
import { env } from "node:process";
import { WelcomeEmailTemplate, WelcomeTextTemplate } from "@/libs/email.lib.js";
import { EmailService, type IEmailService } from "./email.service.js";
import { generateSecureTemporaryPassword } from "@/libs/password.lib.js";

export interface IBulkImportService {
  importColleges(
    csvContent: string,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError>;
  importPrograms(
    csvContent: string,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError>;
  importCourses(
    csvContent: string,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError>;
  importCurriculums(
    csvContent: string,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError>;
  importClasses(
    csvContent: string,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError>;
  importUsers(
    csvContent: string,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError>;
  importFaculties(
    csvContent: string,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError>;
  importClassStudents(
    csvContent: string,
    semesterId?: number,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError>;
  importOfferingStudents(
    csvContent: string,
    offeringId?: number,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError>;
}

export class BulkImportService implements IBulkImportService {
  constructor(
    private userService: IUserService = new UserService(),
    private emailService: IEmailService = new EmailService(),
  ) {}

  private isPrivileged(actorUser?: GetUser): boolean {
    const roles = actorUser?.roles ?? [];
    return roles.includes("VPAA") || roles.includes("CLERK");
  }

  private getAllowedChairProgramIds(actorUser?: GetUser): Set<number> | null {
    if (!actorUser || this.isPrivileged(actorUser)) return null;
    const chairships = actorUser.offices?.chairships ?? [];
    if (chairships.length === 0) {
      throw new AppError(
        403,
        "Access denied: Only VPAA, Clerk, or designated Department Chairs can run this import.",
      );
    }
    return new Set(chairships.map((c) => c.id));
  }

  private getAllowedDeanCollegeIds(actorUser?: GetUser): Set<number> | null {
    if (!actorUser || this.isPrivileged(actorUser)) return null;
    const deanships = actorUser.offices?.deanships ?? [];
    if (deanships.length === 0) {
      throw new AppError(
        403,
        "Access denied: Only VPAA, Clerk, or designated College Deans can run this import.",
      );
    }
    return new Set(deanships.map((d) => d.id));
  }

  private async validateDeanCandidate(
    accountId: number,
    tx: PgTransaction,
  ): Promise<string | null> {
    const [account] = await tx
      .select({ id: Accounts.id })
      .from(Accounts)
      .where(and(eq(Accounts.id, accountId), isNull(Accounts.deleted_at)));

    if (!account) return "Dean account not found or is archived.";

    const userRoles = await tx
      .select({ system_role: Roles.system_role })
      .from(AccountRoles)
      .innerJoin(Roles, and(eq(Roles.id, AccountRoles.role_id), isNull(Roles.deleted_at)))
      .where(and(eq(AccountRoles.account_id, accountId), isNull(AccountRoles.deleted_at)));

    const nonAssignableRoles = ["VPAA", "CLERK", "STUDENT"];
    const conflictingRole = userRoles.find((r) => nonAssignableRoles.includes(r.system_role));
    if (conflictingRole) {
      return `This account has role "${conflictingRole.system_role}" and is not eligible to be assigned as a Dean.`;
    }

    const activeDeanships = await tx
      .select({ collegeName: Colleges.name })
      .from(CollegeDeans)
      .innerJoin(
        Colleges,
        and(eq(CollegeDeans.college_id, Colleges.id), isNull(Colleges.deleted_at)),
      )
      .where(and(eq(CollegeDeans.dean_id, accountId), isNull(CollegeDeans.deleted_at)));

    if (activeDeanships.length > 0) {
      return `This account is already assigned as the Dean of "${activeDeanships[0]!.collegeName}".`;
    }

    const activeChairships = await tx
      .select({ programName: Programs.name })
      .from(ProgramChairs)
      .innerJoin(
        Programs,
        and(eq(ProgramChairs.program_id, Programs.id), isNull(Programs.deleted_at)),
      )
      .where(and(eq(ProgramChairs.chair_id, accountId), isNull(ProgramChairs.deleted_at)));

    if (activeChairships.length > 0) {
      return `This account is currently assigned as the Department Chair of "${activeChairships[0]!.programName}".`;
    }

    return null;
  }

  private async validateChairCandidate(
    accountId: number,
    tx: PgTransaction,
  ): Promise<string | null> {
    const [account] = await tx
      .select({ id: Accounts.id })
      .from(Accounts)
      .where(and(eq(Accounts.id, accountId), isNull(Accounts.deleted_at)));

    if (!account) return "Chair account not found or is archived.";

    const userRoles = await tx
      .select({ system_role: Roles.system_role })
      .from(AccountRoles)
      .innerJoin(Roles, and(eq(Roles.id, AccountRoles.role_id), isNull(Roles.deleted_at)))
      .where(and(eq(AccountRoles.account_id, accountId), isNull(AccountRoles.deleted_at)));

    const nonAssignableRoles = ["VPAA", "CLERK", "STUDENT"];
    const conflictingRole = userRoles.find((r) => nonAssignableRoles.includes(r.system_role));
    if (conflictingRole) {
      return `This account has role "${conflictingRole.system_role}" and is not eligible to be assigned as a Department Chair.`;
    }

    const activeDeanships = await tx
      .select({ collegeName: Colleges.name })
      .from(CollegeDeans)
      .innerJoin(
        Colleges,
        and(eq(CollegeDeans.college_id, Colleges.id), isNull(Colleges.deleted_at)),
      )
      .where(and(eq(CollegeDeans.dean_id, accountId), isNull(CollegeDeans.deleted_at)));

    if (activeDeanships.length > 0) {
      return `This account is currently serving as Dean of "${activeDeanships[0]!.collegeName}".`;
    }

    const activeChairships = await tx
      .select({ programName: Programs.name })
      .from(ProgramChairs)
      .innerJoin(
        Programs,
        and(eq(ProgramChairs.program_id, Programs.id), isNull(Programs.deleted_at)),
      )
      .where(and(eq(ProgramChairs.chair_id, accountId), isNull(ProgramChairs.deleted_at)));

    if (activeChairships.length > 0) {
      return `This account is already Department Chair of "${activeChairships[0]!.programName}".`;
    }

    return null;
  }

  private async ensureFacultyRow(
    accountId: number,
    programId: number,
    tx: PgTransaction,
  ): Promise<void> {
    const grantFaculty = await this.userService.grantRole(accountId, "FACULTY", tx);
    if (grantFaculty.isErr()) throw grantFaculty.error;

    const [existing] = await tx
      .select({ id: Faculties.id })
      .from(Faculties)
      .where(
        and(
          eq(Faculties.account_id, accountId),
          eq(Faculties.program_id, programId),
          isNull(Faculties.deleted_at),
        ),
      );
    if (existing) return;

    const [anyHome] = await tx
      .select({ id: Faculties.id })
      .from(Faculties)
      .where(
        and(
          eq(Faculties.account_id, accountId),
          eq(Faculties.is_home, true),
          isNull(Faculties.deleted_at),
        ),
      );

    await tx.insert(Faculties).values({
      account_id: accountId,
      program_id: programId,
      is_home: !anyHome,
    });
  }

  importColleges(
    csvContent: string,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      if (actorUser && !this.isPrivileged(actorUser)) {
        throw new AppError(403, "Only VPAA and Clerk can bulk import colleges.");
      }

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
            reason: validation.error.issues[0]?.message || "Invalid format.",
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
            reason: `College name "${data.name}" already exists.`,
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
              reason: `Dean with ID "${data.dean_institutional_id}" not found.`,
            });
            continue;
          }

          const candidateError = await this.validateDeanCandidate(deanAccountId, tx);
          if (candidateError) {
            summary.failed++;
            summary.errors.push({
              row: rowNum,
              identifier: data.initialism,
              reason: candidateError,
            });
            continue;
          }
        }

        const [created] = await tx
          .insert(Colleges)
          .values({
            name: data.name,
            initialism: data.initialism,
            is_service_college: data.is_service_college,
          })
          .returning();

        if (deanAccountId && created) {
          await tx.insert(CollegeDeans).values({ college_id: created.id, dean_id: deanAccountId });

          const grantResult = await this.userService.grantRole(deanAccountId, "COLLEGE_DEAN", tx);
          if (grantResult.isErr()) throw grantResult.error;
        }

        codeSet.add(data.initialism);
        nameSet.add(data.name.toLowerCase());
        summary.successful++;
      }

      return summary;
    });
  }

  importPrograms(
    csvContent: string,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const allowedCollegeIds = this.getAllowedDeanCollegeIds(actorUser);

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
            reason: validation.error.issues[0]?.message || "Invalid format.",
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

        if (allowedCollegeIds && !allowedCollegeIds.has(collegeId)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.initialism,
            reason: `You can only import programs under your own college.`,
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
              reason: `Chair with ID "${data.chair_institutional_id}" not found.`,
            });
            continue;
          }

          const candidateError = await this.validateChairCandidate(chairAccountId, tx);
          if (candidateError) {
            summary.failed++;
            summary.errors.push({
              row: rowNum,
              identifier: data.initialism,
              reason: candidateError,
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

          const grantResult = await this.userService.grantRole(
            chairAccountId,
            "DEPARTMENT_CHAIR",
            tx,
          );
          if (grantResult.isErr()) throw grantResult.error;

          await this.ensureFacultyRow(chairAccountId, created.id, tx);
        }

        codeSet.add(data.initialism);
        collegeNameSet.add(compositeKey);
        summary.successful++;
      }

      return summary;
    });
  }

  importCourses(
    csvContent: string,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const allowedProgramIds = this.getAllowedChairProgramIds(actorUser);

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
            reason: validation.error.issues[0]?.message || "Invalid format.",
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
            reason: `Program code "${data.program_code}" not found.`,
          });
          continue;
        }

        if (allowedProgramIds && !allowedProgramIds.has(programId)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.initialism,
            reason: `You can only import courses for your own program.`,
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

        await tx.insert(Courses).values({
          program_id: programId,
          name: data.name,
          initialism: data.initialism,
          course_type: data.course_type,
        });
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
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const allowedProgramIds = this.getAllowedChairProgramIds(actorUser);

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
            reason: validation.error.issues[0]?.message || "Invalid format.",
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

        if (allowedProgramIds && !allowedProgramIds.has(programId)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.course_code,
            reason: `You can only import curriculum mappings for your own program.`,
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
            reason: `Course is already mapped for Year ${data.year_level}, ${data.semester_term} term.`,
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

  importClasses(
    csvContent: string,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const allowedProgramIds = this.getAllowedChairProgramIds(actorUser);

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
            reason: validation.error.issues[0]?.message || "Invalid format.",
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

        if (allowedProgramIds && !allowedProgramIds.has(programId)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: `${data.program_code} ${data.year_level}-${data.section}`,
            reason: `You can only import classes for your own program.`,
          });
          continue;
        }

        const classKey = `${programId}:${data.year_level}:${data.section.toUpperCase()}`;
        if (classSlotSet.has(classKey)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: `${data.program_code} ${data.year_level}-${data.section}`,
            reason: `Class section already exists.`,
          });
          continue;
        }

        await tx
          .insert(Classes)
          .values({ program_id: programId, year_level: data.year_level, section: data.section });
        classSlotSet.add(classKey);
        summary.successful++;
      }

      return summary;
    });
  }

  importUsers(
    csvContent: string,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      if (actorUser && !this.isPrivileged(actorUser)) {
        throw new AppError(
          403,
          "Only VPAA and Clerk can import general user accounts. Use Faculty or Class Roster import instead.",
        );
      }

      const actorRoles = actorUser?.roles ?? [];
      const isVpaa = !actorUser || actorRoles.includes("VPAA");

      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = parsed.data;
      const summary: ImportSummary = {
        entity: "Users",
        totalRows: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      const existingEmails = await tx
        .select({ email: Accounts.email })
        .from(Accounts)
        .where(isNull(Accounts.deleted_at));
      const emailSet = new Set(existingEmails.map((a) => a.email.toLowerCase()));

      const existingIds = await tx
        .select({ instId: PersonalDetails.institutional_id })
        .from(PersonalDetails)
        .where(isNull(PersonalDetails.deleted_at));
      const idSet = new Set(existingIds.map((p) => p.instId));

      const roles = await tx.select().from(Roles).where(isNull(Roles.deleted_at));
      const roleMap = new Map(roles.map((r) => [r.system_role, r.id]));

      const emailsToSend: Array<{
        email: string;
        recipientName: string;
        password?: string;
      }> = [];

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const validation = UserCsvRowSchema.safeParse(rows[i]);

        if (!validation.success) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: rows[i]?.institutional_id || rows[i]?.email || `Row ${rowNum}`,
            reason: validation.error.issues[0]?.message || "Invalid row format.",
          });
          continue;
        }

        const data = validation.data;

        if (data.role === "VPAA") {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.institutional_id,
            reason: "VPAA accounts cannot be provisioned via bulk import.",
          });
          continue;
        }

        if (data.role === "CLERK" && !isVpaa) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.institutional_id,
            reason: "Only VPAA can provision Clerk accounts.",
          });
          continue;
        }

        if (idSet.has(data.institutional_id)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.institutional_id,
            reason: `Institutional ID "${data.institutional_id}" is already registered.`,
          });
          continue;
        }

        if (emailSet.has(data.email)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.email,
            reason: `Email address "${data.email}" is already in use.`,
          });
          continue;
        }

        const roleId = roleMap.get(data.role);
        if (!roleId) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.institutional_id,
            reason: `System role "${data.role}" is invalid.`,
          });
          continue;
        }

        const rawPassword =
          data.password && data.password.trim().length >= 8
            ? data.password.trim()
            : generateSecureTemporaryPassword(12);

        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const [details] = await tx
          .insert(PersonalDetails)
          .values({
            institutional_id: data.institutional_id,
            first_name: data.first_name,
            last_name: data.last_name,
            middle_name: data.middle_name || null,
            suffix: data.suffix || null,
          })
          .returning();

        const [account] = await tx
          .insert(Accounts)
          .values({
            personal_details_id: details!.id,
            email: data.email,
            password: passwordHash,
            is_verified: Boolean(data.password && data.password.trim().length >= 8),
          })
          .returning();

        await tx.insert(AccountRoles).values({
          account_id: account!.id,
          role_id: roleId,
        });

        emailsToSend.push({
          email: data.email,
          recipientName: `${data.first_name} ${data.last_name}`,
          password: rawPassword,
        });

        idSet.add(data.institutional_id);
        emailSet.add(data.email);
        summary.successful++;
      }

      return { summary, emailsToSend };
    }).andThen(({ summary, emailsToSend }) => {
      this.dispatchWelcomeEmails(emailsToSend);
      return okAsync(summary);
    });
  }

  importFaculties(
    csvContent: string,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const allowedProgramIds = this.getAllowedChairProgramIds(actorUser);

      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = parsed.data;
      const summary: ImportSummary = {
        entity: "Faculties",
        totalRows: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      const programs = await tx.select().from(Programs).where(isNull(Programs.deleted_at));
      const programMap = new Map(programs.map((p) => [p.initialism.toUpperCase(), p.id]));

      const accounts = await tx
        .select({
          id: Accounts.id,
          email: Accounts.email,
          instId: PersonalDetails.institutional_id,
        })
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(isNull(Accounts.deleted_at));

      const accountByEmail = new Map(accounts.map((a) => [a.email.toLowerCase(), a.id]));
      const accountByInstId = new Map(accounts.map((a) => [a.instId, a.id]));

      const existingFaculties = await tx
        .select({ accountId: Faculties.account_id, programId: Faculties.program_id })
        .from(Faculties)
        .where(isNull(Faculties.deleted_at));
      const facultySlotSet = new Set(existingFaculties.map((f) => `${f.accountId}:${f.programId}`));
      const hasHomeSet = new Set(existingFaculties.map((f) => f.accountId));

      const [facultyRole] = await tx
        .select()
        .from(Roles)
        .where(and(eq(Roles.system_role, "FACULTY"), isNull(Roles.deleted_at)));
      if (!facultyRole) throw new AppError(500, "FACULTY role not configured.");

      const emailsToSend: Array<{ email: string; recipientName: string; password?: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const validation = FacultyCsvRowSchema.safeParse(rows[i]);

        if (!validation.success) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: rows[i]?.institutional_id || `Row ${rowNum}`,
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
            identifier: data.institutional_id,
            reason: `Program code "${data.program_code}" not found.`,
          });
          continue;
        }

        if (allowedProgramIds && !allowedProgramIds.has(programId)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.institutional_id,
            reason: `You can only appoint faculty to your own program.`,
          });
          continue;
        }

        let accountId = accountByInstId.get(data.institutional_id);
        const existingEmailOwner = accountByEmail.get(data.email);

        if (existingEmailOwner && accountId && existingEmailOwner !== accountId) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.email,
            reason: `Email "${data.email}" belongs to a different account.`,
          });
          continue;
        }

        if (!accountId && existingEmailOwner) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.email,
            reason: `Email "${data.email}" is already registered under a different ID.`,
          });
          continue;
        }

        if (!accountId) {
          const rawPassword =
            data.password && data.password.trim().length >= 8
              ? data.password.trim()
              : generateSecureTemporaryPassword(12);
          const passwordHash = await bcrypt.hash(rawPassword, 10);

          const [details] = await tx
            .insert(PersonalDetails)
            .values({
              institutional_id: data.institutional_id,
              first_name: data.first_name,
              last_name: data.last_name,
              middle_name: data.middle_name || null,
              suffix: data.suffix || null,
            })
            .returning();

          const [account] = await tx
            .insert(Accounts)
            .values({
              personal_details_id: details!.id,
              email: data.email,
              password: passwordHash,
              is_verified: Boolean(data.password && data.password.trim().length >= 8),
            })
            .returning();

          await tx.insert(AccountRoles).values({
            account_id: account!.id,
            role_id: facultyRole.id,
          });

          accountId = account!.id;
          accountByInstId.set(data.institutional_id, accountId);
          accountByEmail.set(data.email, accountId);

          emailsToSend.push({
            email: data.email,
            recipientName: `${data.first_name} ${data.last_name}`,
            password: rawPassword,
          });
        } else {
          const isStudent = await this.userService.hasRole(accountId, "STUDENT", tx);
          if (isStudent.isOk() && isStudent.value) {
            summary.failed++;
            summary.errors.push({
              row: rowNum,
              identifier: data.institutional_id,
              reason: `Account is a STUDENT and cannot be appointed as faculty.`,
            });
            continue;
          }
          const grantRes = await this.userService.grantRole(accountId, "FACULTY", tx);
          if (grantRes.isErr()) throw grantRes.error;
        }

        const slotKey = `${accountId}:${programId}`;
        if (facultySlotSet.has(slotKey)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.institutional_id,
            reason: `Instructor is already appointed to ${data.program_code}.`,
          });
          continue;
        }

        const isHome = !hasHomeSet.has(accountId);
        await tx.insert(Faculties).values({
          account_id: accountId,
          program_id: programId,
          is_home: isHome,
        });

        facultySlotSet.add(slotKey);
        hasHomeSet.add(accountId);
        summary.successful++;
      }

      return { summary, emailsToSend };
    }).andThen(({ summary, emailsToSend }) => {
      this.dispatchWelcomeEmails(emailsToSend);
      return okAsync(summary);
    });
  }

  importClassStudents(
    csvContent: string,
    semesterId?: number,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      const allowedProgramIds = this.getAllowedChairProgramIds(actorUser);

      let targetSemesterId = semesterId;
      if (!targetSemesterId) {
        const today = new Date().toISOString().slice(0, 10);
        const [activeSem] = await tx
          .select({ id: Semesters.id })
          .from(Semesters)
          .where(
            and(
              lte(Semesters.start_date, today),
              gte(Semesters.end_date, today),
              isNull(Semesters.deleted_at),
            ),
          )
          .orderBy(desc(Semesters.start_date))
          .limit(1);
        targetSemesterId = activeSem?.id;
      }

      if (!targetSemesterId) {
        throw new AppError(400, "No active or target semester found for class roster import.");
      }

      const [semester] = await tx
        .select()
        .from(Semesters)
        .where(and(eq(Semesters.id, targetSemesterId), isNull(Semesters.deleted_at)));
      if (!semester) throw new AppError(404, "Target semester not found.");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [ey, em, ed] = semester.end_date.split("-").map(Number);
      if (today > new Date(ey!, em! - 1, ed!, 23, 59, 59, 999)) {
        throw new AppError(400, "Cannot import students into a concluded semester.");
      }

      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = parsed.data;
      const summary: ImportSummary = {
        entity: "Class Students",
        totalRows: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      const classRows = await tx
        .select({
          id: Classes.id,
          programId: Classes.program_id,
          programCode: Programs.initialism,
          yearLevel: Classes.year_level,
          section: Classes.section,
        })
        .from(Classes)
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .where(and(isNull(Classes.deleted_at), isNull(Programs.deleted_at)));

      const classMap = new Map(
        classRows.map((c) => [
          `${c.programCode.toUpperCase()}:${c.yearLevel}:${c.section.toUpperCase()}`,
          c,
        ]),
      );

      const accounts = await tx
        .select({
          id: Accounts.id,
          email: Accounts.email,
          instId: PersonalDetails.institutional_id,
        })
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(isNull(Accounts.deleted_at));

      const accountByEmail = new Map(accounts.map((a) => [a.email.toLowerCase(), a.id]));
      const accountByInstId = new Map(accounts.map((a) => [a.instId, a.id]));

      const existingEnrollments = await tx
        .select({ studentId: ClassStudents.student_account_id })
        .from(ClassStudents)
        .where(
          and(eq(ClassStudents.semester_id, targetSemesterId), isNull(ClassStudents.deleted_at)),
        );
      const enrolledThisSemSet = new Set(existingEnrollments.map((e) => e.studentId));

      const [studentRole] = await tx
        .select()
        .from(Roles)
        .where(and(eq(Roles.system_role, "STUDENT"), isNull(Roles.deleted_at)));
      if (!studentRole) throw new AppError(500, "STUDENT role not configured.");

      const emailsToSend: Array<{ email: string; recipientName: string; password?: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const validation = ClassStudentCsvRowSchema.safeParse(rows[i]);

        if (!validation.success) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: rows[i]?.institutional_id || `Row ${rowNum}`,
            reason: validation.error.issues[0]?.message || "Invalid row format.",
          });
          continue;
        }

        const data = validation.data;
        const classKey = `${data.program_code.toUpperCase()}:${data.year_level}:${data.section.toUpperCase()}`;
        const targetClass = classMap.get(classKey);

        if (!targetClass) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.institutional_id,
            reason: `Class section "${data.program_code} ${data.year_level}-${data.section}" not found.`,
          });
          continue;
        }

        if (allowedProgramIds && !allowedProgramIds.has(targetClass.programId)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.institutional_id,
            reason: `You can only enroll students into classes under your own program.`,
          });
          continue;
        }

        let accountId = accountByInstId.get(data.institutional_id);
        const existingEmailOwner = accountByEmail.get(data.email);

        if (existingEmailOwner && accountId !== existingEmailOwner) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.email,
            reason: `Email "${data.email}" is already registered under a different account.`,
          });
          continue;
        }

        if (!accountId) {
          const rawPassword =
            data.password && data.password.trim().length >= 8
              ? data.password.trim()
              : generateSecureTemporaryPassword(12);
          const passwordHash = await bcrypt.hash(rawPassword, 10);

          const [details] = await tx
            .insert(PersonalDetails)
            .values({
              institutional_id: data.institutional_id,
              first_name: data.first_name,
              last_name: data.last_name,
              middle_name: data.middle_name || null,
              suffix: data.suffix || null,
            })
            .returning();

          const [account] = await tx
            .insert(Accounts)
            .values({
              personal_details_id: details!.id,
              email: data.email,
              password: passwordHash,
              is_verified: Boolean(data.password && data.password.trim().length >= 8),
            })
            .returning();

          await tx.insert(AccountRoles).values({
            account_id: account!.id,
            role_id: studentRole.id,
          });

          accountId = account!.id;
          accountByInstId.set(data.institutional_id, accountId);
          accountByEmail.set(data.email, accountId);

          emailsToSend.push({
            email: data.email,
            recipientName: `${data.first_name} ${data.last_name}`,
            password: rawPassword,
          });
        } else {
          const isStudent = await this.userService.hasRole(accountId, "STUDENT", tx);
          if (isStudent.isErr() || !isStudent.value) {
            summary.failed++;
            summary.errors.push({
              row: rowNum,
              identifier: data.institutional_id,
              reason: `Existing account does not hold the STUDENT role.`,
            });
            continue;
          }
        }

        if (enrolledThisSemSet.has(accountId)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.institutional_id,
            reason: `Student is already enrolled in a class roster for this semester.`,
          });
          continue;
        }

        await tx.insert(ClassStudents).values({
          class_id: targetClass.id,
          semester_id: targetSemesterId,
          student_account_id: accountId,
        });

        await this.syncStudentWithClassOfferings(accountId, targetClass.id, targetSemesterId, tx);

        enrolledThisSemSet.add(accountId);
        summary.successful++;
      }

      return { summary, emailsToSend };
    }).andThen(({ summary, emailsToSend }) => {
      this.dispatchWelcomeEmails(emailsToSend);
      return okAsync(summary);
    });
  }

  importOfferingStudents(
    csvContent: string,
    offeringId?: number,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
      if (!offeringId) {
        throw new AppError(400, "Target course_offering_id is required.");
      }

      const [offering] = await tx
        .select({
          id: CourseOfferings.id,
          semesterId: CourseOfferings.semester_id,
          programId: Classes.program_id,
          endDate: Semesters.end_date,
        })
        .from(CourseOfferings)
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
        .where(and(eq(CourseOfferings.id, offeringId), isNull(CourseOfferings.deleted_at)));

      if (!offering) throw new AppError(404, "Course offering not found.");

      const allowedProgramIds = this.getAllowedChairProgramIds(actorUser);
      if (allowedProgramIds && !allowedProgramIds.has(offering.programId)) {
        throw new AppError(
          403,
          "You can only import students into course offerings under your own program.",
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [ey, em, ed] = offering.endDate.split("-").map(Number);
      if (today > new Date(ey!, em! - 1, ed!, 23, 59, 59, 999)) {
        throw new AppError(400, "Cannot import students into a concluded semester offering.");
      }

      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = parsed.data;
      const summary: ImportSummary = {
        entity: "Offering Students",
        totalRows: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      const accounts = await tx
        .select({
          id: Accounts.id,
          email: Accounts.email,
          instId: PersonalDetails.institutional_id,
        })
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(isNull(Accounts.deleted_at));

      const accountByEmail = new Map(accounts.map((a) => [a.email.toLowerCase(), a.id]));
      const accountByInstId = new Map(accounts.map((a) => [a.instId, a.id]));

      const existingEnrolled = await tx
        .select({ studentId: OfferingStudents.student_account_id })
        .from(OfferingStudents)
        .where(
          and(
            eq(OfferingStudents.course_offering_id, offeringId),
            isNull(OfferingStudents.deleted_at),
          ),
        );
      const enrolledSet = new Set(existingEnrolled.map((e) => e.studentId));

      const [studentRole] = await tx
        .select()
        .from(Roles)
        .where(and(eq(Roles.system_role, "STUDENT"), isNull(Roles.deleted_at)));
      if (!studentRole) throw new AppError(500, "STUDENT role not configured.");

      const emailsToSend: Array<{ email: string; recipientName: string; password?: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const validation = OfferingStudentCsvRowSchema.safeParse(rows[i]);

        if (!validation.success) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: rows[i]?.institutional_id || `Row ${rowNum}`,
            reason: validation.error.issues[0]?.message || "Invalid row format.",
          });
          continue;
        }

        const data = validation.data;
        let accountId = accountByInstId.get(data.institutional_id);
        const existingEmailOwner = accountByEmail.get(data.email);

        if (existingEmailOwner && accountId !== existingEmailOwner) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.email,
            reason: `Email "${data.email}" is already registered under a different account.`,
          });
          continue;
        }

        if (!accountId) {
          const rawPassword =
            data.password && data.password.trim().length >= 8
              ? data.password.trim()
              : generateSecureTemporaryPassword(12);
          const passwordHash = await bcrypt.hash(rawPassword, 10);

          const [details] = await tx
            .insert(PersonalDetails)
            .values({
              institutional_id: data.institutional_id,
              first_name: data.first_name,
              last_name: data.last_name,
              middle_name: data.middle_name || null,
              suffix: data.suffix || null,
            })
            .returning();

          const [account] = await tx
            .insert(Accounts)
            .values({
              personal_details_id: details!.id,
              email: data.email,
              password: passwordHash,
              is_verified: Boolean(data.password && data.password.trim().length >= 8),
            })
            .returning();

          await tx.insert(AccountRoles).values({
            account_id: account!.id,
            role_id: studentRole.id,
          });

          accountId = account!.id;
          accountByInstId.set(data.institutional_id, accountId);
          accountByEmail.set(data.email, accountId);

          emailsToSend.push({
            email: data.email,
            recipientName: `${data.first_name} ${data.last_name}`,
            password: rawPassword,
          });
        } else {
          const isStudent = await this.userService.hasRole(accountId, "STUDENT", tx);
          if (isStudent.isErr() || !isStudent.value) {
            summary.failed++;
            summary.errors.push({
              row: rowNum,
              identifier: data.institutional_id,
              reason: `Existing account does not hold the STUDENT role.`,
            });
            continue;
          }
        }

        if (enrolledSet.has(accountId)) {
          summary.failed++;
          summary.errors.push({
            row: rowNum,
            identifier: data.institutional_id,
            reason: `Student is already enrolled in this course offering.`,
          });
          continue;
        }

        await tx.insert(OfferingStudents).values({
          student_account_id: accountId,
          course_offering_id: offeringId,
        });

        enrolledSet.add(accountId);
        summary.successful++;
      }

      return { summary, emailsToSend };
    }).andThen(({ summary, emailsToSend }) => {
      this.dispatchWelcomeEmails(emailsToSend);
      return okAsync(summary);
    });
  }

  private async syncStudentWithClassOfferings(
    studentAccountId: number,
    classId: number,
    semesterId: number,
    tx: PgTransaction,
  ): Promise<void> {
    const offerings = await tx
      .select({ id: CourseOfferings.id })
      .from(CourseOfferings)
      .where(
        and(
          eq(CourseOfferings.class_id, classId),
          eq(CourseOfferings.semester_id, semesterId),
          isNull(CourseOfferings.deleted_at),
        ),
      );

    if (offerings.length === 0) return;

    const offeringIds = offerings.map((o) => o.id);
    const existing = await tx
      .select({
        id: OfferingStudents.id,
        offeringId: OfferingStudents.course_offering_id,
        deletedAt: OfferingStudents.deleted_at,
      })
      .from(OfferingStudents)
      .where(
        and(
          eq(OfferingStudents.student_account_id, studentAccountId),
          inArray(OfferingStudents.course_offering_id, offeringIds),
        ),
      );

    const existingMap = new Map(existing.map((os) => [os.offeringId, os]));
    const newEnrollments: { student_account_id: number; course_offering_id: number }[] = [];

    for (const offering of offerings) {
      const match = existingMap.get(offering.id);
      if (!match) {
        newEnrollments.push({
          student_account_id: studentAccountId,
          course_offering_id: offering.id,
        });
      } else if (match.deletedAt !== null) {
        await tx
          .update(OfferingStudents)
          .set({ deleted_at: null, updated_at: new Date() })
          .where(eq(OfferingStudents.id, match.id));
      }
    }

    if (newEnrollments.length > 0) {
      await tx.insert(OfferingStudents).values(newEnrollments);
    }
  }

  private async dispatchWelcomeEmails(
    recipients: Array<{
      email: string;
      recipientName: string;
      password?: string;
    }>,
  ): Promise<void> {
    if (recipients.length === 0) return;

    logger.info(
      `Starting background credentials email delivery for ${recipients.length} user(s)...`,
    );

    for (const item of recipients) {
      const emailPayload: WelcomeEmailOpts = {
        recipientName: item.recipientName,
        email: item.email,
        generatedPassword: item.password || "",
        url: env.CLIENT_URL || "https://pit-fes.pages.dev",
      };

      await new Promise<void>((resolve) => {
        this.emailService
          .sendEmail({
            to: item.email,
            options: {
              subject: "PIT-FES Account Credentials Notice",
              text: WelcomeTextTemplate(emailPayload),
              html: WelcomeEmailTemplate(emailPayload),
            },
          })
          .match(
            () => {
              logger.info(`Credentials email delivered to ${item.email}`);
              resolve();
            },
            (err) => {
              logger.warn(`Failed to deliver credentials email to ${item.email}: ${err.message}`);
              resolve();
            },
          );
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
