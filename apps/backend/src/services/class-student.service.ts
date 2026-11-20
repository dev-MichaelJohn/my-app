import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  Accounts,
  Classes,
  ClassStudentQuerySchema,
  ClassStudents,
  ClassStudentUpdate,
  CourseOfferings,
  CreateClassStudentPayloadSchema,
  OfferingStudents,
  PersonalDetails,
  Programs,
  Semesters,
  type CreateClassStudentPayload,
  type GetClassStudent,
  type GetUser,
  type IClassStudentUpdate,
  type PaginatedData,
} from "@my-app/shared";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { ClassService, type IClassService } from "./class.service.js";
import { UserService, type IUserService } from "./user.service.js";
import db, { type PgTransaction } from "@/configs/db.config.js";
import {
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
import { ValidateSchema } from "@/libs/result.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import { logAuditEvent } from "@/libs/audit.lib.js";
import type { Request } from "express";

export interface IClassStudentService {
  getClassStudentById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
    actorUser?: GetUser,
  ): ResultAsync<GetClassStudent, AppError>;
  getClassStudents(
    rawQuery: unknown,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<PaginatedData<GetClassStudent[]>, AppError>;
  createClassStudent(
    classStudentInfo: CreateClassStudentPayload,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetClassStudent, AppError>;
  updateClassStudent(
    id: number,
    classStudentInfo: IClassStudentUpdate,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetClassStudent, AppError>;
  deleteClassStudent(
    id: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;
  restoreClassStudent(
    id: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetClassStudent, AppError>;
  validateSemesterOpen(semesterId: number, tx: PgTransaction): Promise<void>;
}

export class ClassStudentService implements IClassStudentService {
  constructor(
    private classService: IClassService = new ClassService(),
    private userService: IUserService = new UserService(),
  ) {}

  private selectFields = {
    id: ClassStudents.id,
    created_at: ClassStudents.created_at,
    deleted_at: ClassStudents.deleted_at,

    class: sql<GetClassStudent["class"]>`
      JSON_BUILD_OBJECT(
        'id', ${Classes.id},
        'year_level', ${Classes.year_level},
        'section', ${Classes.section},
        'created_at', ${Classes.created_at},
        'updated_at', ${Classes.updated_at},
        'deleted_at', ${Classes.deleted_at},
        'program', JSON_BUILD_OBJECT(
          'id', ${Programs.id},
          'name', ${Programs.name},
          'initialism', ${Programs.initialism}
        )
      )
    `,

    student: sql<GetClassStudent["student"]>`
      JSON_BUILD_OBJECT(
        'account', JSON_BUILD_OBJECT(
          'id', ${Accounts.id},
          'personal_details_id', ${Accounts.personal_details_id},
          'email', ${Accounts.email},
          'is_verified', ${Accounts.is_verified}
        ),
        'details', JSON_BUILD_OBJECT(
          'id', ${PersonalDetails.id},
          'institutional_id', ${PersonalDetails.institutional_id},
          'first_name', ${PersonalDetails.first_name},
          'last_name', ${PersonalDetails.last_name},
          'middle_name', ${PersonalDetails.middle_name},
          'suffix', ${PersonalDetails.suffix}
        )
      )
    `,

    semester: sql<GetClassStudent["semester"]>`
      JSON_BUILD_OBJECT(
        'id', ${Semesters.id},
        'semester_term', ${Semesters.semester_term},
        'school_year_start', ${Semesters.school_year_start},
        'school_year_end', ${Semesters.school_year_end},
        'start_date', ${Semesters.start_date},
        'end_date', ${Semesters.end_date},
        'created_at', ${Semesters.created_at},
        'updated_at', ${Semesters.updated_at},
        'deleted_at', ${Semesters.deleted_at}
      )
    `,
  };

  private async assertClassStudentScope(
    programId: number,
    actorUser: GetUser | undefined,
    tx: PgTransaction,
    mode: "read" | "write",
  ): Promise<void> {
    if (!actorUser) return;
    const roles = actorUser.roles ?? [];
    if (roles.includes("VPAA") || roles.includes("CLERK")) return;

    const chairships = actorUser.offices?.chairships || [];
    if (chairships.some((c) => c.id === programId)) return;

    if (mode === "read") {
      const deanships = actorUser.offices?.deanships || [];
      if (deanships.length > 0) {
        const [prog] = await tx
          .select({ college_id: Programs.college_id })
          .from(Programs)
          .where(eq(Programs.id, programId));
        if (prog && deanships.some((d) => d.id === prog.college_id)) return;
      }
    }

    throw new AppError(
      403,
      "Access denied: You can only manage class rosters within your authorized program scope.",
    );
  }

  getClassStudentById(
    id: number,
    client: DbClient = db,
    includeArchived: boolean = false,
    actorUser?: GetUser,
  ): ResultAsync<GetClassStudent, AppError> {
    return WithTransaction(client, async (tx) => {
      const [record] = await tx
        .select(this.selectFields)
        .from(ClassStudents)
        .innerJoin(Classes, eq(ClassStudents.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .innerJoin(Semesters, eq(ClassStudents.semester_id, Semesters.id))
        .innerJoin(Accounts, eq(ClassStudents.student_account_id, Accounts.id))
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(
          and(
            eq(ClassStudents.id, id),
            includeArchived ? undefined : isNull(ClassStudents.deleted_at),
          ),
        );

      if (!record) {
        throw new AppError(404, "Class student enrollment record not found.");
      }

      await this.assertClassStudentScope(record.class.program.id, actorUser, tx, "read");

      return record;
    });
  }

  getClassStudents(
    rawQuery: unknown,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<PaginatedData<GetClassStudent[]>, AppError> {
    return ValidateSchema(ClassStudentQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const {
        paginate,
        page,
        limit,
        search,
        class_id,
        student_id,
        semester_id,
        is_archived,
        sort_by,
        order,
      } = parsed;

      const filters: SQL[] = [
        is_archived ? isNotNull(ClassStudents.deleted_at) : isNull(ClassStudents.deleted_at),
        isNull(Classes.deleted_at),
        isNull(Semesters.deleted_at),
        isNull(Accounts.deleted_at),
      ];

      const roles = actorUser?.roles ?? [];
      const isPrivileged = roles.includes("VPAA") || roles.includes("CLERK");

      if (!isPrivileged && actorUser) {
        const deanships = actorUser.offices?.deanships || [];
        const chairships = actorUser.offices?.chairships || [];

        if (chairships.length > 0) {
          const chairProgramIds = chairships.map((c) => c.id);
          filters.push(inArray(Programs.id, chairProgramIds));
        } else if (deanships.length > 0) {
          const deanCollegeIds = deanships.map((d) => d.id);
          filters.push(inArray(Programs.college_id, deanCollegeIds));
        } else {
          return okAsync(
            createPaginatedData({ data: [], currentPage: 1, pageSize: limit, totalItems: 0 }),
          );
        }
      }

      if (search) {
        const term = `%${search}%`;
        filters.push(
          or(
            ilike(PersonalDetails.first_name, term),
            ilike(PersonalDetails.last_name, term),
            ilike(PersonalDetails.institutional_id, term),
            ilike(Accounts.email, term),
            ilike(Programs.name, term),
          )!,
        );
      }

      if (class_id !== undefined) filters.push(eq(ClassStudents.class_id, class_id));
      if (student_id !== undefined) filters.push(eq(ClassStudents.student_account_id, student_id));
      if (semester_id !== undefined) filters.push(eq(ClassStudents.semester_id, semester_id));

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: ClassStudents.created_at,
        class_id: ClassStudents.class_id,
        semester_id: ClassStudents.semester_id,
        student_id: ClassStudents.student_account_id,
      };

      const sortColumn = sortColumnMap[sort_by] ?? ClassStudents.created_at;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseDataQuery = tx
          .select(this.selectFields)
          .from(ClassStudents)
          .innerJoin(Classes, eq(ClassStudents.class_id, Classes.id))
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .innerJoin(Semesters, eq(ClassStudents.semester_id, Semesters.id))
          .innerJoin(Accounts, eq(ClassStudents.student_account_id, Accounts.id))
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .where(whereCondition)
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
          .select({ total: countDistinct(ClassStudents.id) })
          .from(ClassStudents)
          .innerJoin(Classes, eq(ClassStudents.class_id, Classes.id))
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .innerJoin(Semesters, eq(ClassStudents.semester_id, Semesters.id))
          .innerJoin(Accounts, eq(ClassStudents.student_account_id, Accounts.id))
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
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

  createClassStudent(
    classStudentInfo: CreateClassStudentPayload,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetClassStudent, AppError> {
    return ValidateSchema(CreateClassStudentPayloadSchema, classStudentInfo).asyncAndThen(
      (parsed) => {
        return WithTransaction(client, async (tx) => {
          const classResult = await this.classService.getClassById(parsed.class_id, tx);
          if (classResult.isErr()) throw classResult.error;

          await this.assertClassStudentScope(classResult.value.program.id, actorUser, tx, "write");
          await this.validateSemesterOpen(parsed.semester_id, tx);

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

          const [activeEnrollment] = await tx
            .select({
              id: ClassStudents.id,
              classId: ClassStudents.class_id,
              section: Classes.section,
              yearLevel: Classes.year_level,
              programCode: Programs.initialism,
            })
            .from(ClassStudents)
            .innerJoin(Classes, eq(ClassStudents.class_id, Classes.id))
            .innerJoin(Programs, eq(Classes.program_id, Programs.id))
            .where(
              and(
                eq(ClassStudents.semester_id, parsed.semester_id),
                eq(ClassStudents.student_account_id, studentAccountId),
                isNull(ClassStudents.deleted_at),
              ),
            );

          if (activeEnrollment) {
            if (activeEnrollment.classId === parsed.class_id) {
              throw new AppError(
                409,
                "This student is already enrolled in this class section for this semester.",
              );
            }

            throw new AppError(
              409,
              `Cannot enroll: Student is already enrolled in section ${activeEnrollment.programCode} ${activeEnrollment.yearLevel}-${activeEnrollment.section} for this semester. A student can only be enrolled in one class roster per semester.`,
            );
          }

          const [existingDeleted] = await tx
            .select()
            .from(ClassStudents)
            .where(
              and(
                eq(ClassStudents.class_id, parsed.class_id),
                eq(ClassStudents.semester_id, parsed.semester_id),
                eq(ClassStudents.student_account_id, studentAccountId),
                isNotNull(ClassStudents.deleted_at),
              ),
            );

          let enrollmentId: number;

          if (existingDeleted) {
            const [restored] = await tx
              .update(ClassStudents)
              .set({ deleted_at: null })
              .where(eq(ClassStudents.id, existingDeleted.id))
              .returning({ id: ClassStudents.id });

            if (!restored) throw new AppError(500, "Failed to restore enrollment record.");
            enrollmentId = restored.id;
          } else {
            const [created] = await tx
              .insert(ClassStudents)
              .values({
                class_id: parsed.class_id,
                semester_id: parsed.semester_id,
                student_account_id: studentAccountId,
              })
              .returning({ id: ClassStudents.id });

            if (!created) throw new AppError(500, "Failed to enroll student into class.");
            enrollmentId = created.id;
          }

          await this.syncStudentWithClassOfferings(
            studentAccountId,
            parsed.class_id,
            parsed.semester_id,
            tx,
          );

          const fullRecord = await this.getClassStudentById(enrollmentId, tx);
          if (fullRecord.isErr()) throw fullRecord.error;

          await logAuditEvent({
            actor: actorUser,
            req,
            action: "CREATE",
            entity: "class_students",
            entityId: fullRecord.value.id,
            entityName: `${fullRecord.value.student.details.last_name}, ${fullRecord.value.student.details.first_name} in ${fullRecord.value.class.program.initialism} ${fullRecord.value.class.year_level}-${fullRecord.value.class.section}`,
            newRecord: fullRecord.value,
            tx,
          });

          return fullRecord.value;
        });
      },
    );
  }

  updateClassStudent(
    id: number,
    classStudentInfo: IClassStudentUpdate,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetClassStudent, AppError> {
    return ValidateSchema(ClassStudentUpdate, classStudentInfo).asyncAndThen((parsed) => {
      const hasUpdates = Boolean(parsed && Object.keys(parsed).length > 0);
      if (!hasUpdates) {
        return errAsync(new AppError(400, "No update parameters were provided."));
      }

      return WithTransaction(client, async (tx) => {
        const existing = await this.getClassStudentById(id, tx);
        if (existing.isErr()) throw existing.error;
        const current = existing.value;

        await this.assertClassStudentScope(current.class.program.id, actorUser, tx, "write");

        if (parsed.class_id) {
          const classResult = await this.classService.getClassById(parsed.class_id, tx);
          if (classResult.isErr()) throw classResult.error;
          await this.assertClassStudentScope(classResult.value.program.id, actorUser, tx, "write");
        }

        if (parsed.semester_id) await this.validateSemesterOpen(parsed.semester_id, tx);

        if (parsed.student_account_id) {
          const isStudent = await this.userService.hasRole(
            parsed.student_account_id,
            "STUDENT",
            tx,
          );
          if (isStudent.isErr()) throw isStudent.error;
          if (!isStudent.value)
            throw new AppError(400, "The selected account does not have a STUDENT role.");
        }

        const targetStudentId = parsed.student_account_id || current.student.account.id;
        const targetClassId = parsed.class_id || current.class.id;
        const targetSemId = parsed.semester_id || current.semester.id;

        const [conflict] = await tx
          .select({
            id: ClassStudents.id,
            section: Classes.section,
            yearLevel: Classes.year_level,
            programCode: Programs.initialism,
          })
          .from(ClassStudents)
          .innerJoin(Classes, eq(ClassStudents.class_id, Classes.id))
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .where(
            and(
              ne(ClassStudents.id, id),
              eq(ClassStudents.semester_id, targetSemId),
              eq(ClassStudents.student_account_id, targetStudentId),
              isNull(ClassStudents.deleted_at),
            ),
          );

        if (conflict) {
          throw new AppError(
            409,
            `Cannot reassign: Student is already enrolled in section ${conflict.programCode} ${conflict.yearLevel}-${conflict.section} for this semester.`,
          );
        }

        if (parsed.class_id && parsed.class_id !== current.class.id) {
          const oldOfferings = await tx
            .select({ id: CourseOfferings.id })
            .from(CourseOfferings)
            .where(
              and(
                eq(CourseOfferings.class_id, current.class.id),
                eq(CourseOfferings.semester_id, current.semester.id),
              ),
            );

          if (oldOfferings.length > 0) {
            const oldOfferingIds = oldOfferings.map((o) => o.id);

            await tx
              .update(OfferingStudents)
              .set({ deleted_at: new Date(), updated_at: new Date() })
              .where(
                and(
                  eq(OfferingStudents.student_account_id, current.student.account.id),
                  inArray(OfferingStudents.course_offering_id, oldOfferingIds),
                  isNull(OfferingStudents.deleted_at),
                ),
              );
          }
        }

        const [updated] = await tx
          .update(ClassStudents)
          .set(parsed)
          .where(and(eq(ClassStudents.id, id), isNull(ClassStudents.deleted_at)))
          .returning({ id: ClassStudents.id });

        if (!updated) throw new AppError(500, "Failed to update enrollment record.");

        await this.syncStudentWithClassOfferings(targetStudentId, targetClassId, targetSemId, tx);

        const fullRecord = await this.getClassStudentById(id, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "UPDATE",
          entity: "class_students",
          entityId: fullRecord.value.id,
          entityName: `${fullRecord.value.student.details.last_name}, ${fullRecord.value.student.details.first_name}`,
          oldRecord: current,
          newRecord: fullRecord.value,
          tx,
        });

        return fullRecord.value;
      });
    });
  }

  deleteClassStudent(
    id: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getClassStudentById(id, tx);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      await this.assertClassStudentScope(current.class.program.id, actorUser, tx, "write");

      const deleteTime = new Date();

      const [deleted] = await tx
        .update(ClassStudents)
        .set({ deleted_at: deleteTime })
        .where(and(eq(ClassStudents.id, id), isNull(ClassStudents.deleted_at)))
        .returning({ id: ClassStudents.id });

      if (!deleted) {
        throw new AppError(404, "Enrollment record was not found or has already been deleted.");
      }

      const classOfferings = await tx
        .select({ id: CourseOfferings.id })
        .from(CourseOfferings)
        .where(
          and(
            eq(CourseOfferings.class_id, current.class.id),
            eq(CourseOfferings.semester_id, current.semester.id),
          ),
        );

      if (classOfferings.length > 0) {
        const offeringIds = classOfferings.map((o) => o.id);

        await tx
          .update(OfferingStudents)
          .set({ deleted_at: deleteTime })
          .where(
            and(
              eq(OfferingStudents.student_account_id, current.student.account.id),
              inArray(OfferingStudents.course_offering_id, offeringIds),
              isNull(OfferingStudents.deleted_at),
            ),
          );
      }

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "DELETE",
        entity: "class_students",
        entityId: current.id,
        entityName: `${current.student.details.last_name}, ${current.student.details.first_name} from ${current.class.program.initialism} ${current.class.year_level}-${current.class.section}`,
        oldRecord: current,
        tx,
      });

      return undefined;
    });
  }

  restoreClassStudent(
    id: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetClassStudent, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getClassStudentById(id, tx, true);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      await this.assertClassStudentScope(current.class.program.id, actorUser, tx, "write");

      if (!current.deleted_at) {
        throw new AppError(400, "This enrollment record is already active.");
      }

      const classResult = await this.classService.getClassById(current.class.id, tx);
      if (classResult.isErr())
        throw new AppError(400, "Cannot restore: Class is archived or deleted.");

      await this.validateSemesterOpen(current.semester.id, tx);

      const [conflict] = await tx
        .select({
          id: ClassStudents.id,
          section: Classes.section,
          yearLevel: Classes.year_level,
          programCode: Programs.initialism,
        })
        .from(ClassStudents)
        .innerJoin(Classes, eq(ClassStudents.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .where(
          and(
            ne(ClassStudents.id, id),
            eq(ClassStudents.semester_id, current.semester.id),
            eq(ClassStudents.student_account_id, current.student.account.id),
            isNull(ClassStudents.deleted_at),
          ),
        );

      if (conflict)
        throw new AppError(
          409,
          `Cannot restore: Student is already actively enrolled in section ${conflict.programCode} ${conflict.yearLevel}-${conflict.section} for this semester.`,
        );

      const [restored] = await tx
        .update(ClassStudents)
        .set({ deleted_at: null })
        .where(eq(ClassStudents.id, id))
        .returning({ id: ClassStudents.id });

      if (!restored) throw new AppError(500, "Failed to restore enrollment record.");

      await this.syncStudentWithClassOfferings(
        current.student.account.id,
        current.class.id,
        current.semester.id,
        tx,
      );

      const fullRecord = await this.getClassStudentById(id, tx);
      if (fullRecord.isErr()) throw fullRecord.error;

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "RESTORE",
        entity: "class_students",
        entityId: fullRecord.value.id,
        entityName: `${fullRecord.value.student.details.last_name}, ${fullRecord.value.student.details.first_name} to ${fullRecord.value.class.program.initialism} ${fullRecord.value.class.year_level}-${fullRecord.value.class.section}`,
        newRecord: fullRecord.value,
        tx,
      });

      return fullRecord.value;
    });
  }

  async validateSemesterOpen(semesterId: number, tx: PgTransaction): Promise<void> {
    const [semester] = await tx
      .select({
        id: Semesters.id,
        end_date: Semesters.end_date,
        term: Semesters.semester_term,
        sy_start: Semesters.school_year_start,
        sy_end: Semesters.school_year_end,
      })
      .from(Semesters)
      .where(and(eq(Semesters.id, semesterId), isNull(Semesters.deleted_at)));

    if (!semester) throw new AppError(404, "Semester not found or is archived.");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [endYear, endMonth, endDay] = semester.end_date.split("-").map(Number);
    const endDate = new Date(endYear!, endMonth! - 1, endDay!, 23, 59, 59, 999);
    endDate.setHours(23, 59, 59, 999);

    if (today > endDate)
      throw new AppError(
        400,
        `Cannot enroll student: The ${semester.term} Semester (A.Y. ${semester.sy_start}-${semester.sy_end}) has already concluded on ${semester.end_date}.`,
      );
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
    const existingOfferingStudents = await tx
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

    const existingMap = new Map(existingOfferingStudents.map((os) => [os.offeringId, os]));
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
}
