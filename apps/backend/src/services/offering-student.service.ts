import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  Accounts,
  Classes,
  CourseCurriculums,
  CourseOfferings,
  Courses,
  CreateOfferingStudentPayloadSchema,
  Faculties,
  OfferingStudentQuerySchema,
  OfferingStudents,
  OfferingStudentUpdate,
  PersonalDetails,
  Programs,
  Semesters,
  type CreateOfferingStudentPayload,
  type GetOfferingStudent,
  type GetUser,
  type IOfferingStudentUpdate,
  type PaginatedData,
} from "@my-app/shared";
import {
  aliasedTable,
  and,
  asc,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  SQL,
  sql,
} from "drizzle-orm";
import { errAsync, type ResultAsync } from "neverthrow";
import { OfferingService, type IOfferingService } from "./offering.service.js";
import { UserService, type IUserService } from "./user.service.js";
import db from "@/configs/db.config.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import { SemesterService, type ISemesterService } from "./semester.service.js";
import { logAuditEvent } from "@/libs/audit.lib.js";
import type { Request } from "express";

const StudentAccounts = aliasedTable(Accounts, "student_accounts");
const StudentDetails = aliasedTable(PersonalDetails, "student_details");
const FacultyAccounts = aliasedTable(Accounts, "faculty_accounts");
const FacultyDetails = aliasedTable(PersonalDetails, "faculty_details");

export interface IOfferingStudentService {
  getOfferingStudentById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
    actorUser?: GetUser,
  ): ResultAsync<GetOfferingStudent, AppError>;
  getOfferingStudents(
    rawQuery: unknown,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<PaginatedData<GetOfferingStudent[]>, AppError>;
  createOfferingStudent(
    info: CreateOfferingStudentPayload,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetOfferingStudent, AppError>;
  updateOfferingStudent(
    id: number,
    info: IOfferingStudentUpdate,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetOfferingStudent, AppError>;
  deleteOfferingStudent(
    id: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;
  restoreOfferingStudent(
    id: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetOfferingStudent, AppError>;
}

export class OfferingStudentService implements IOfferingStudentService {
  constructor(
    private offeringService: IOfferingService = new OfferingService(),
    private userService: IUserService = new UserService(),
    private semesterService: ISemesterService = new SemesterService(),
  ) {}

  private selectFields = {
    id: OfferingStudents.id,
    created_at: OfferingStudents.created_at,
    updated_at: OfferingStudents.updated_at,
    deleted_at: OfferingStudents.deleted_at,

    student: sql<GetOfferingStudent["student"]>`
      JSON_BUILD_OBJECT(
        'account', JSON_BUILD_OBJECT(
          'id', ${StudentAccounts.id},
          'personal_details_id', ${StudentAccounts.personal_details_id},
          'email', ${StudentAccounts.email},
          'is_verified', ${StudentAccounts.is_verified}
        ),
        'details', JSON_BUILD_OBJECT(
          'id', ${StudentDetails.id},
          'institutional_id', ${StudentDetails.institutional_id},
          'first_name', ${StudentDetails.first_name},
          'last_name', ${StudentDetails.last_name},
          'middle_name', ${StudentDetails.middle_name},
          'suffix', ${StudentDetails.suffix}
        )
      )
    `,

    offering: sql<GetOfferingStudent["offering"]>`
      JSON_BUILD_OBJECT(
        'id', ${CourseOfferings.id},
        'created_at', ${CourseOfferings.created_at},
        'updated_at', ${CourseOfferings.updated_at},
        'deleted_at', ${CourseOfferings.deleted_at},
        'course_curriculum', JSON_BUILD_OBJECT(
          'id', ${CourseCurriculums.id},
          'course', JSON_BUILD_OBJECT(
            'id', ${Courses.id},
            'name', ${Courses.name},
            'initialism', ${Courses.initialism}
          )
        ),
        'class', JSON_BUILD_OBJECT(
          'id', ${Classes.id},
          'year_level', ${Classes.year_level},
          'section', ${Classes.section},
          'program', JSON_BUILD_OBJECT(
            'id', ${Programs.id},
            'name', ${Programs.name},
            'initialism', ${Programs.initialism}
          )
        ),
        'semester', JSON_BUILD_OBJECT(
          'id', ${Semesters.id},
          'semester_term', ${Semesters.semester_term},
          'school_year_start', ${Semesters.school_year_start},
          'school_year_end', ${Semesters.school_year_end},
          'start_date', ${Semesters.start_date},
          'end_date', ${Semesters.end_date},
          'created_at', ${Semesters.created_at},
          'updated_at', ${Semesters.updated_at},
          'deleted_at', ${Semesters.deleted_at}
        ),
        'faculty', CASE
          WHEN ${CourseOfferings.faculty_id} IS NULL THEN NULL
          ELSE (
            SELECT JSON_BUILD_OBJECT(
              'account', JSON_BUILD_OBJECT(
                'id', fa.id,
                'personal_details_id', fa.personal_details_id,
                'email', fa.email,
                'is_verified', fa.is_verified
              ),
              'details', JSON_BUILD_OBJECT(
                'id', fd.id,
                'institutional_id', fd.institutional_id,
                'first_name', fd.first_name,
                'last_name', fd.last_name,
                'middle_name', fd.middle_name,
                'suffix', fd.suffix
              )
            )
            FROM ${Faculties} f
            INNER JOIN ${Accounts} fa ON f.account_id = fa.id
            INNER JOIN ${PersonalDetails} fd ON fa.personal_details_id = fd.id
            WHERE f.id = ${CourseOfferings.faculty_id}
              AND f.deleted_at IS NULL
              AND fa.deleted_at IS NULL
            LIMIT 1
          )
        END
      )
    `,
  };

  private async assertOfferingScope(
    programId: number,
    facultyAccountId: number | null | undefined,
    actorUser: GetUser | undefined,
    mode: "read" | "write",
    tx: any,
  ): Promise<void> {
    if (!actorUser) return;
    const roles = actorUser.roles ?? [];
    if (roles.includes("VPAA") || roles.includes("CLERK")) return;

    const chairships = actorUser.offices?.chairships ?? [];
    if (chairships.some((c) => c.id === programId)) return;

    if (mode === "read") {
      const deanships = actorUser.offices?.deanships ?? [];
      if (deanships.length > 0) {
        const deanCollegeIds = deanships.map((d) => d.id);
        const [prog] = await tx
          .select({ id: Programs.id })
          .from(Programs)
          .where(and(eq(Programs.id, programId), inArray(Programs.college_id, deanCollegeIds)));
        if (prog) return;
      }

      if (roles.includes("FACULTY") && facultyAccountId === actorUser.account.id) {
        return;
      }
    }

    throw new AppError(
      403,
      "Access denied: You can only access or modify offering enrollments within your authorized program scope.",
    );
  }

  getOfferingStudentById(
    id: number,
    client: DbClient = db,
    includeArchived = false,
    actorUser?: GetUser,
  ): ResultAsync<GetOfferingStudent, AppError> {
    return WithTransaction(client, async (tx) => {
      const [record] = await tx
        .select(this.selectFields)
        .from(OfferingStudents)
        .innerJoin(StudentAccounts, eq(OfferingStudents.student_account_id, StudentAccounts.id))
        .innerJoin(StudentDetails, eq(StudentAccounts.personal_details_id, StudentDetails.id))
        .innerJoin(CourseOfferings, eq(OfferingStudents.course_offering_id, CourseOfferings.id))
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
        .where(
          and(
            eq(OfferingStudents.id, id),
            includeArchived ? undefined : isNull(OfferingStudents.deleted_at),
          ),
        )
        .groupBy(
          OfferingStudents.id,
          StudentAccounts.id,
          StudentDetails.id,
          CourseOfferings.id,
          CourseCurriculums.id,
          Courses.id,
          Classes.id,
          Programs.id,
          Semesters.id,
        );

      if (!record) throw new AppError(404, "Offering student enrollment record not found.");

      await this.assertOfferingScope(
        record.offering.class.program.id,
        record.offering.faculty?.account.id,
        actorUser,
        "read",
        tx,
      );

      return record;
    });
  }

  getOfferingStudents(
    rawQuery: unknown,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<PaginatedData<GetOfferingStudent[]>, AppError> {
    return ValidateSchema(OfferingStudentQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const {
        paginate,
        page,
        limit,
        search,
        student_account_id,
        course_offering_id,
        is_archived,
        sort_by,
        order,
      } = parsed;

      const filters: SQL[] = [
        is_archived ? isNotNull(OfferingStudents.deleted_at) : isNull(OfferingStudents.deleted_at),
        isNull(StudentAccounts.deleted_at),
        isNull(CourseOfferings.deleted_at),
        isNull(Courses.deleted_at),
        isNull(Classes.deleted_at),
        isNull(Semesters.deleted_at),
      ];

      const roles = actorUser?.roles ?? [];
      const isPrivileged = roles.includes("VPAA") || roles.includes("CLERK");

      if (!isPrivileged && actorUser) {
        const chairships = actorUser.offices?.chairships ?? [];
        const deanships = actorUser.offices?.deanships ?? [];

        if (chairships.length > 0) {
          filters.push(
            inArray(
              Programs.id,
              chairships.map((c) => c.id),
            ),
          );
        } else if (deanships.length > 0) {
          filters.push(
            inArray(
              Programs.college_id,
              deanships.map((d) => d.id),
            ),
          );
        } else if (roles.includes("FACULTY")) {
          filters.push(
            sql`EXISTS (
              SELECT 1 FROM ${Faculties} f
              WHERE f.id = ${CourseOfferings.faculty_id}
                AND f.account_id = ${actorUser.account.id}
                AND f.deleted_at IS NULL
            )`,
          );
        }
      }

      if (search) {
        const term = `%${search}%`;
        filters.push(
          or(
            ilike(StudentDetails.first_name, term),
            ilike(StudentDetails.last_name, term),
            ilike(StudentDetails.institutional_id, term),
            ilike(StudentAccounts.email, term),
            ilike(Courses.name, term),
            ilike(Courses.initialism, term),
            ilike(Programs.initialism, term),
          )!,
        );
      }

      if (student_account_id !== undefined)
        filters.push(eq(OfferingStudents.student_account_id, student_account_id));

      if (course_offering_id !== undefined)
        filters.push(eq(OfferingStudents.course_offering_id, course_offering_id));

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: OfferingStudents.created_at,
        student_account_id: OfferingStudents.student_account_id,
        course_offering_id: OfferingStudents.course_offering_id,
      };

      const sortColumn = sortColumnMap[sort_by] ?? OfferingStudents.created_at;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseDataQuery = tx
          .select(this.selectFields)
          .from(OfferingStudents)
          .innerJoin(StudentAccounts, eq(OfferingStudents.student_account_id, StudentAccounts.id))
          .innerJoin(StudentDetails, eq(StudentAccounts.personal_details_id, StudentDetails.id))
          .innerJoin(CourseOfferings, eq(OfferingStudents.course_offering_id, CourseOfferings.id))
          .innerJoin(
            CourseCurriculums,
            eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
          )
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
          .leftJoin(
            Faculties,
            and(eq(CourseOfferings.faculty_id, Faculties.id), isNull(Faculties.deleted_at)),
          )
          .leftJoin(
            FacultyAccounts,
            and(eq(Faculties.account_id, FacultyAccounts.id), isNull(FacultyAccounts.deleted_at)),
          )
          .leftJoin(FacultyDetails, eq(FacultyAccounts.personal_details_id, FacultyDetails.id))
          .where(whereCondition)
          .groupBy(
            OfferingStudents.id,
            StudentAccounts.id,
            StudentDetails.id,
            CourseOfferings.id,
            CourseCurriculums.id,
            Courses.id,
            Classes.id,
            Programs.id,
            Semesters.id,
            Faculties.id,
            FacultyAccounts.id,
            FacultyDetails.id,
          )
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const results = await baseDataQuery;
          return createPaginatedData({
            data: results,
            currentPage: 1,
            pageSize: results.length,
            totalItems: results.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedDataQuery = baseDataQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(OfferingStudents.id) })
          .from(OfferingStudents)
          .innerJoin(StudentAccounts, eq(OfferingStudents.student_account_id, StudentAccounts.id))
          .innerJoin(StudentDetails, eq(StudentAccounts.personal_details_id, StudentDetails.id))
          .innerJoin(CourseOfferings, eq(OfferingStudents.course_offering_id, CourseOfferings.id))
          .innerJoin(
            CourseCurriculums,
            eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
          )
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
          .leftJoin(
            Faculties,
            and(eq(CourseOfferings.faculty_id, Faculties.id), isNull(Faculties.deleted_at)),
          )
          .where(whereCondition);

        const [results, countResult] = await Promise.all([paginatedDataQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;

        return createPaginatedData({
          data: results,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  createOfferingStudent(
    info: CreateOfferingStudentPayload,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetOfferingStudent, AppError> {
    return ValidateSchema(CreateOfferingStudentPayloadSchema, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const offeringResult = await this.offeringService.getOfferingById(
          parsed.course_offering_id,
          tx,
        );
        if (offeringResult.isErr()) throw offeringResult.error;
        const offering = offeringResult.value;

        await this.assertOfferingScope(
          offering.class.program.id,
          offering.faculty?.account.id,
          actorUser,
          "write",
          tx,
        );
        await this.semesterService.validateSemesterOpen(offering.semester.id, tx);

        let studentAccountId: number;
        if ("new_user" in parsed) {
          const createdUser = await this.userService.createUser(
            { ...parsed.new_user, role: "STUDENT" },
            tx,
            actorUser,
            req,
          );
          if (createdUser.isErr()) throw createdUser.error;
          studentAccountId = createdUser.value.account.id;
        } else {
          studentAccountId = parsed.student_account_id;
          const isStudent = await this.userService.hasRole(studentAccountId, "STUDENT", tx);
          if (isStudent.isErr()) throw isStudent.error;
          if (!isStudent.value) {
            throw new AppError(400, "The selected account does not have a STUDENT role.");
          }
        }

        const [existing] = await tx
          .select()
          .from(OfferingStudents)
          .where(
            and(
              eq(OfferingStudents.student_account_id, studentAccountId),
              eq(OfferingStudents.course_offering_id, parsed.course_offering_id),
            ),
          );

        let enrollmentId: number;

        if (existing) {
          if (existing.deleted_at === null) {
            throw new AppError(
              409,
              "Student is already actively enrolled in this course offering.",
            );
          }

          const [restored] = await tx
            .update(OfferingStudents)
            .set({ deleted_at: null, updated_at: new Date() })
            .where(eq(OfferingStudents.id, existing.id))
            .returning({ id: OfferingStudents.id });

          if (!restored) throw new AppError(500, "Failed to restore enrollment record.");
          enrollmentId = restored.id;
        } else {
          const [created] = await tx
            .insert(OfferingStudents)
            .values({
              student_account_id: studentAccountId,
              course_offering_id: parsed.course_offering_id,
            })
            .returning({ id: OfferingStudents.id });

          if (!created) throw new AppError(500, "Failed to enroll student in course offering.");
          enrollmentId = created.id;
        }

        const fullRecord = await this.getOfferingStudentById(enrollmentId, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "CREATE",
          entity: "offering_students",
          entityId: fullRecord.value.id,
          entityName: `${fullRecord.value.student.details.last_name}, ${fullRecord.value.student.details.first_name} in ${fullRecord.value.offering.course_curriculum.course.initialism}`,
          newRecord: fullRecord.value,
          tx,
        });

        return fullRecord.value;
      });
    });
  }

  updateOfferingStudent(
    id: number,
    info: IOfferingStudentUpdate,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetOfferingStudent, AppError> {
    return ValidateSchema(OfferingStudentUpdate, info).asyncAndThen((parsed) => {
      const hasUpdates = Boolean(parsed && Object.keys(parsed).length > 0);
      if (!hasUpdates) {
        return errAsync(new AppError(400, "No update parameters were provided."));
      }

      return WithTransaction(client, async (tx) => {
        const existing = await this.getOfferingStudentById(id, tx, false, actorUser);
        if (existing.isErr()) throw existing.error;

        await this.assertOfferingScope(
          existing.value.offering.class.program.id,
          existing.value.offering.faculty?.account.id,
          actorUser,
          "write",
          tx,
        );

        if (parsed.student_account_id) {
          const isStudent = await this.userService.hasRole(
            parsed.student_account_id,
            "STUDENT",
            tx,
          );
          if (isStudent.isErr()) throw isStudent.error;
          if (!isStudent.value) throw new AppError(400, "Account must have a STUDENT role.");
        }

        if (parsed.course_offering_id) {
          const offeringResult = await this.offeringService.getOfferingById(
            parsed.course_offering_id,
            tx,
          );
          if (offeringResult.isErr()) throw offeringResult.error;
          await this.assertOfferingScope(
            offeringResult.value.class.program.id,
            offeringResult.value.faculty?.account.id,
            actorUser,
            "write",
            tx,
          );
          await this.semesterService.validateSemesterOpen(offeringResult.value.semester.id, tx);
        }

        const [updated] = await tx
          .update(OfferingStudents)
          .set(parsed)
          .where(and(eq(OfferingStudents.id, id), isNull(OfferingStudents.deleted_at)))
          .returning({ id: OfferingStudents.id });

        if (!updated) throw new AppError(500, "Failed to update enrollment record.");

        const fullRecord = await this.getOfferingStudentById(id, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "UPDATE",
          entity: "offering_students",
          entityId: fullRecord.value.id,
          entityName: `${fullRecord.value.student.details.last_name}, ${fullRecord.value.student.details.first_name}`,
          oldRecord: existing.value,
          newRecord: fullRecord.value,
          tx,
        });

        return fullRecord.value;
      });
    });
  }

  deleteOfferingStudent(
    id: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getOfferingStudentById(id, tx, false, actorUser);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      await this.assertOfferingScope(
        current.offering.class.program.id,
        current.offering.faculty?.account.id,
        actorUser,
        "write",
        tx,
      );
      await this.semesterService.validateSemesterOpen(current.offering.semester.id, tx);

      const [deleted] = await tx
        .update(OfferingStudents)
        .set({ deleted_at: new Date() })
        .where(and(eq(OfferingStudents.id, id), isNull(OfferingStudents.deleted_at)))
        .returning({ id: OfferingStudents.id });

      if (!deleted) throw new AppError(404, "Enrollment record was not found or already deleted.");

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "DELETE",
        entity: "offering_students",
        entityId: current.id,
        entityName: `${current.student.details.last_name}, ${current.student.details.first_name} from ${current.offering.course_curriculum.course.initialism}`,
        oldRecord: current,
        tx,
      });

      return undefined;
    });
  }

  restoreOfferingStudent(
    id: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetOfferingStudent, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getOfferingStudentById(id, tx, true, actorUser);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      await this.assertOfferingScope(
        current.offering.class.program.id,
        current.offering.faculty?.account.id,
        actorUser,
        "write",
        tx,
      );

      if (!current.deleted_at) throw new AppError(400, "This enrollment record is already active.");

      const offeringResult = await this.offeringService.getOfferingById(current.offering.id, tx);
      if (offeringResult.isErr())
        throw new AppError(400, "Cannot restore: Course offering is archived or deleted.");

      await this.semesterService.validateSemesterOpen(offeringResult.value.semester.id, tx);

      const [conflict] = await tx
        .select()
        .from(OfferingStudents)
        .where(
          and(
            ne(OfferingStudents.id, id),
            eq(OfferingStudents.student_account_id, current.student.account.id),
            eq(OfferingStudents.course_offering_id, current.offering.id),
            isNull(OfferingStudents.deleted_at),
          ),
        );

      if (conflict)
        throw new AppError(
          409,
          "Cannot restore: Student is already actively enrolled in this course offering.",
        );

      const [restored] = await tx
        .update(OfferingStudents)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(OfferingStudents.id, id))
        .returning({ id: OfferingStudents.id });

      if (!restored) throw new AppError(500, "Failed to restore enrollment record.");

      const fullRecord = await this.getOfferingStudentById(id, tx);
      if (fullRecord.isErr()) throw fullRecord.error;

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "RESTORE",
        entity: "offering_students",
        entityId: fullRecord.value.id,
        entityName: `${fullRecord.value.student.details.last_name}, ${fullRecord.value.student.details.first_name} to ${fullRecord.value.offering.course_curriculum.course.initialism}`,
        newRecord: fullRecord.value,
        tx,
      });

      return fullRecord.value;
    });
  }
}
