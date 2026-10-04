import Papa from "papaparse";
import { and, eq, isNull } from "drizzle-orm";
import { ResultAsync } from "neverthrow";
import db, { type PgTransaction } from "@/configs/db.config.js";
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
  Roles,
  AccountRoles,
} from "@my-app/shared";
import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  CollegeCsvRowSchema,
  ProgramCsvRowSchema,
  CourseCsvRowSchema,
  CurriculumCsvRowSchema,
  ClassCsvRowSchema,
  UserCsvRowSchema,
  type ImportSummary,
} from "@my-app/shared";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { UserService, type IUserService } from "./user.service.js";

export interface IBulkImportService {
  importColleges(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
  importPrograms(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
  importCourses(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
  importCurriculums(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
  importClasses(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
  importUsers(csvContent: string, client?: DbClient): ResultAsync<ImportSummary, AppError>;
}

export class BulkImportService implements IBulkImportService {
  constructor(private userService: IUserService = new UserService()) {}

  // =========================================================================
  // ── Candidate Validations (Aligned with CollegeService & ProgramService) ──
  // =========================================================================

  private async validateDeanCandidate(
    accountId: number,
    tx: PgTransaction,
  ): Promise<string | null> {
    const [account] = await tx
      .select({ id: Accounts.id })
      .from(Accounts)
      .where(and(eq(Accounts.id, accountId), isNull(Accounts.deleted_at)));

    if (!account) return "Dean account not found or is archived.";

    // 1. Check non-assignable roles (SYS_ADMIN, ADMIN, STUDENT)
    const userRoles = await tx
      .select({ system_role: Roles.system_role })
      .from(AccountRoles)
      .innerJoin(Roles, and(eq(Roles.id, AccountRoles.role_id), isNull(Roles.deleted_at)))
      .where(and(eq(AccountRoles.account_id, accountId), isNull(AccountRoles.deleted_at)));

    const nonAssignableRoles = ["SYS_ADMIN", "ADMIN", "STUDENT"];
    const conflictingRole = userRoles.find((r) => nonAssignableRoles.includes(r.system_role));
    if (conflictingRole) {
      return `This account has role "${conflictingRole.system_role}" and is not eligible to be assigned as a Dean.`;
    }

    // 2. Check if already Dean of another active college
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

    // 3. Check if already active Program Chair
    const activeChairships = await tx
      .select({ programName: Programs.name })
      .from(ProgramChairs)
      .innerJoin(
        Programs,
        and(eq(ProgramChairs.program_id, Programs.id), isNull(Programs.deleted_at)),
      )
      .where(and(eq(ProgramChairs.chair_id, accountId), isNull(ProgramChairs.deleted_at)));

    if (activeChairships.length > 0) {
      return `This account is currently assigned as the Program Chair of "${activeChairships[0]!.programName}".`;
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

    // 1. Check non-assignable roles (SYS_ADMIN, ADMIN, STUDENT)
    const userRoles = await tx
      .select({ system_role: Roles.system_role })
      .from(AccountRoles)
      .innerJoin(Roles, and(eq(Roles.id, AccountRoles.role_id), isNull(Roles.deleted_at)))
      .where(and(eq(AccountRoles.account_id, accountId), isNull(AccountRoles.deleted_at)));

    const nonAssignableRoles = ["SYS_ADMIN", "ADMIN", "STUDENT"];
    const conflictingRole = userRoles.find((r) => nonAssignableRoles.includes(r.system_role));
    if (conflictingRole) {
      return `This account has role "${conflictingRole.system_role}" and is not eligible to be assigned as a Program Chair.`;
    }

    return null;
  }

  // =========================================================================
  // ── 1. Import Colleges ──
  // =========================================================================

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

          // 🛡️ Full validation check identical to CollegeService
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
          .values({ name: data.name, initialism: data.initialism })
          .returning();

        if (deanAccountId && created) {
          await tx.insert(CollegeDeans).values({ college_id: created.id, dean_id: deanAccountId });

          // 🚀 Formally grant SUPERVISOR role through UserService
          const grantResult = await this.userService.grantRole(deanAccountId, "SUPERVISOR", tx);
          if (grantResult.isErr()) throw grantResult.error;
        }

        codeSet.add(data.initialism);
        nameSet.add(data.name.toLowerCase());
        summary.successful++;
      }

      return summary;
    });
  }

  // =========================================================================
  // ── 2. Import Programs ──
  // =========================================================================

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

          // 🛡️ Full validation check identical to ProgramService
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

          // 🚀 Formally grant SUPERVISOR role through UserService
          const grantResult = await this.userService.grantRole(chairAccountId, "SUPERVISOR", tx);
          if (grantResult.isErr()) throw grantResult.error;
        }

        codeSet.add(data.initialism);
        collegeNameSet.add(compositeKey);
        summary.successful++;
      }

      return summary;
    });
  }

  // =========================================================================
  // ── 3. Import Courses ──
  // =========================================================================

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

  // =========================================================================
  // ── 4. Import Curriculums ──
  // =========================================================================

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

  // =========================================================================
  // ── 5. Import Classes ──
  // =========================================================================

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

  // =========================================================================
  // ── 6. Import Users (Async Hashed) ──
  // =========================================================================

  importUsers(csvContent: string, client: DbClient = db): ResultAsync<ImportSummary, AppError> {
    return WithTransaction(client, async (tx) => {
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

        // Generate temporary password with non-blocking async bcrypt
        const rawPassword =
          data.password && data.password.trim().length >= 6
            ? data.password.trim()
            : this.generateTemporaryPassword();
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        // 1. Insert Personal Details
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

        // 2. Insert Account
        const [account] = await tx
          .insert(Accounts)
          .values({
            personal_details_id: details!.id,
            email: data.email,
            password: passwordHash,
            is_verified: false,
          })
          .returning();

        // 3. Map Role
        await tx.insert(AccountRoles).values({
          account_id: account!.id,
          role_id: roleId,
        });

        idSet.add(data.institutional_id);
        emailSet.add(data.email);
        summary.successful++;
      }

      return summary;
    });
  }

  private generateTemporaryPassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
    return Array.from({ length: 12 }, () => chars[crypto.randomInt(0, chars.length)]).join("");
  }
}
