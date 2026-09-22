import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  Accounts,
  Classes,
  CourseCurriculums,
  CourseOfferings,
  Courses,
  PersonalDetails,
  Programs,
  Semesters,
  StudentClasses,
  StudentClassInsert,
  StudentClassQuerySchema,
  StudentClassUpdate,
  type GetStudentClass,
  type IStudentClassInsert,
  type IStudentClassUpdate,
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
import db, { type PgTransaction } from "@/configs/db.config.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import { SemesterService, type ISemesterService } from "./semester.service.js";

const StudentAccounts = aliasedTable(Accounts, "student_accounts");
const StudentDetails = aliasedTable(PersonalDetails, "student_details");
const FacultyAccounts = aliasedTable(Accounts, "faculty_accounts");
const FacultyDetails = aliasedTable(PersonalDetails, "faculty_details");

export interface IStudentClassService {
  getStudentClassById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
  ): ResultAsync<GetStudentClass, AppError>;
  getStudentClasses(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<GetStudentClass[]>, AppError>;
  createStudentClass(
    info: IStudentClassInsert,
    client?: DbClient,
  ): ResultAsync<GetStudentClass, AppError>;
  updateStudentClass(
    id: number,
    info: IStudentClassUpdate,
    client?: DbClient,
  ): ResultAsync<GetStudentClass, AppError>;
  deleteStudentClass(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreStudentClass(id: number, client?: DbClient): ResultAsync<GetStudentClass, AppError>;
}

export class StudentClassService implements IStudentClassService {
  constructor(
    private offeringService: IOfferingService = new OfferingService(),
    private userService: IUserService = new UserService(),
    private semesterService: ISemesterService = new SemesterService(),
  ) {}

  private selectFields = {
    id: StudentClasses.id,
    created_at: StudentClasses.created_at,
    updated_at: StudentClasses.updated_at,
    deleted_at: StudentClasses.deleted_at,

    // ── Student JSON ──
    student: sql<GetStudentClass["student"]>`
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

    // ── Offering JSON ──
    offering: sql<GetStudentClass["offering"]>`
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
          WHEN ${FacultyAccounts.id} IS NULL THEN NULL
          ELSE JSON_BUILD_OBJECT(
            'account', JSON_BUILD_OBJECT(
              'id', ${FacultyAccounts.id},
              'personal_details_id', ${FacultyAccounts.personal_details_id},
              'email', ${FacultyAccounts.email},
              'is_verified', ${FacultyAccounts.is_verified}
            ),
            'details', JSON_BUILD_OBJECT(
              'id', ${FacultyDetails.id},
              'institutional_id', ${FacultyDetails.institutional_id},
              'first_name', ${FacultyDetails.first_name},
              'last_name', ${FacultyDetails.last_name},
              'middle_name', ${FacultyDetails.middle_name},
              'suffix', ${FacultyDetails.suffix}
            )
          )
        END
      )
    `,
  };

  getStudentClassById(
    id: number,
    client: DbClient = db,
    includeArchived: boolean = false,
  ): ResultAsync<GetStudentClass, AppError> {
    return WithTransaction(client, async (tx) => {
      const [record] = await tx
        .select(this.selectFields)
        .from(StudentClasses)
        .innerJoin(StudentAccounts, eq(StudentClasses.student_account_id, StudentAccounts.id))
        .innerJoin(StudentDetails, eq(StudentAccounts.personal_details_id, StudentDetails.id))
        .innerJoin(CourseOfferings, eq(StudentClasses.course_offering_id, CourseOfferings.id))
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
        .leftJoin(
          FacultyAccounts,
          and(
            eq(CourseOfferings.faculty_id, FacultyAccounts.id),
            isNull(FacultyAccounts.deleted_at),
          ),
        )
        .leftJoin(FacultyDetails, eq(FacultyAccounts.personal_details_id, FacultyDetails.id))
        .where(
          and(
            eq(StudentClasses.id, id),
            includeArchived ? undefined : isNull(StudentClasses.deleted_at),
          ),
        )
        .groupBy(
          StudentClasses.id,
          StudentAccounts.id,
          StudentDetails.id,
          CourseOfferings.id,
          CourseCurriculums.id,
          Courses.id,
          Classes.id,
          Programs.id,
          Semesters.id,
          FacultyAccounts.id,
          FacultyDetails.id,
        );

      if (!record) throw new AppError(404, "Student course enrollment record not found.");

      return record;
    });
  }

  getStudentClasses(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<GetStudentClass[]>, AppError> {
    return ValidateSchema(StudentClassQuerySchema, rawQuery).asyncAndThen((parsed) => {
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
        is_archived ? isNotNull(StudentClasses.deleted_at) : isNull(StudentClasses.deleted_at),
        isNull(StudentAccounts.deleted_at),
        isNull(CourseOfferings.deleted_at),
        isNull(Courses.deleted_at),
        isNull(Classes.deleted_at),
        isNull(Semesters.deleted_at),
      ];

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
        filters.push(eq(StudentClasses.student_account_id, student_account_id));

      if (course_offering_id !== undefined)
        filters.push(eq(StudentClasses.course_offering_id, course_offering_id));

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: StudentClasses.created_at,
        student_account_id: StudentClasses.student_account_id,
        course_offering_id: StudentClasses.course_offering_id,
      };

      const sortColumn = sortColumnMap[sort_by] ?? StudentClasses.created_at;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseDataQuery = tx
          .select(this.selectFields)
          .from(StudentClasses)
          .innerJoin(StudentAccounts, eq(StudentClasses.student_account_id, StudentAccounts.id))
          .innerJoin(StudentDetails, eq(StudentAccounts.personal_details_id, StudentDetails.id))
          .innerJoin(CourseOfferings, eq(StudentClasses.course_offering_id, CourseOfferings.id))
          .innerJoin(
            CourseCurriculums,
            eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
          )
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
          .leftJoin(
            FacultyAccounts,
            and(
              eq(CourseOfferings.faculty_id, FacultyAccounts.id),
              isNull(FacultyAccounts.deleted_at),
            ),
          )
          .leftJoin(FacultyDetails, eq(FacultyAccounts.personal_details_id, FacultyDetails.id))
          .where(whereCondition)
          .groupBy(
            StudentClasses.id,
            StudentAccounts.id,
            StudentDetails.id,
            CourseOfferings.id,
            CourseCurriculums.id,
            Courses.id,
            Classes.id,
            Programs.id,
            Semesters.id,
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
          .select({ total: countDistinct(StudentClasses.id) })
          .from(StudentClasses)
          .innerJoin(StudentAccounts, eq(StudentClasses.student_account_id, StudentAccounts.id))
          .innerJoin(CourseOfferings, eq(StudentClasses.course_offering_id, CourseOfferings.id))
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

  createStudentClass(
    info: IStudentClassInsert,
    client: DbClient = db,
  ): ResultAsync<GetStudentClass, AppError> {
    return ValidateSchema(StudentClassInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const isStudent = await this.userService.hasRole(parsed.student_account_id, "STUDENT", tx);
        if (isStudent.isErr()) throw isStudent.error;
        if (!isStudent.value)
          throw new AppError(400, "The selected account does not have a STUDENT role.");

        const offeringResult = await this.offeringService.getOfferingById(
          parsed.course_offering_id,
          tx,
        );
        if (offeringResult.isErr()) throw offeringResult.error;

        const offering = offeringResult.value;
        await this.semesterService.validateSemesterOpen(offering.semester.id, tx);

        const [existing] = await tx
          .select()
          .from(StudentClasses)
          .where(
            and(
              eq(StudentClasses.student_account_id, parsed.student_account_id),
              eq(StudentClasses.course_offering_id, parsed.course_offering_id),
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
            .update(StudentClasses)
            .set({ deleted_at: null, updated_at: new Date() })
            .where(eq(StudentClasses.id, existing.id))
            .returning({ id: StudentClasses.id });

          if (!restored) throw new AppError(500, "Failed to restore enrollment record.");
          enrollmentId = restored.id;
        } else {
          const [created] = await tx
            .insert(StudentClasses)
            .values(parsed)
            .returning({ id: StudentClasses.id });

          if (!created) throw new AppError(500, "Failed to enroll student in course offering.");
          enrollmentId = created.id;
        }

        const fullRecord = await this.getStudentClassById(enrollmentId, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        return fullRecord.value;
      });
    });
  }

  updateStudentClass(
    id: number,
    info: IStudentClassUpdate,
    client: DbClient = db,
  ): ResultAsync<GetStudentClass, AppError> {
    return ValidateSchema(StudentClassUpdate, info).asyncAndThen((parsed) => {
      const hasUpdates = Boolean(parsed && Object.keys(parsed).length > 0);
      if (!hasUpdates) {
        return errAsync(new AppError(400, "No update parameters were provided."));
      }

      return WithTransaction(client, async (tx) => {
        const existing = await this.getStudentClassById(id, tx);
        if (existing.isErr()) throw existing.error;

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
          await this.semesterService.validateSemesterOpen(offeringResult.value.semester.id, tx);
        }

        const [updated] = await tx
          .update(StudentClasses)
          .set(parsed)
          .where(and(eq(StudentClasses.id, id), isNull(StudentClasses.deleted_at)))
          .returning({ id: StudentClasses.id });

        if (!updated) throw new AppError(500, "Failed to update enrollment record.");

        const fullRecord = await this.getStudentClassById(id, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        return fullRecord.value;
      });
    });
  }

  deleteStudentClass(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getStudentClassById(id, tx);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      await this.semesterService.validateSemesterOpen(current.offering.semester.id, tx);

      await this.checkStudentClassDependencies(current.student.account.id, current.offering.id, tx);

      const [deleted] = await tx
        .update(StudentClasses)
        .set({ deleted_at: new Date() })
        .where(and(eq(StudentClasses.id, id), isNull(StudentClasses.deleted_at)))
        .returning({ id: StudentClasses.id });

      if (!deleted) throw new AppError(404, "Enrollment record was not found or already deleted.");

      return undefined;
    });
  }

  restoreStudentClass(id: number, client: DbClient = db): ResultAsync<GetStudentClass, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getStudentClassById(id, tx, true);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      if (!current.deleted_at) throw new AppError(400, "This enrollment record is already active.");

      const offeringResult = await this.offeringService.getOfferingById(current.offering.id, tx);
      if (offeringResult.isErr())
        throw new AppError(400, "Cannot restore: Course offering is archived or deleted.");

      await this.semesterService.validateSemesterOpen(offeringResult.value.semester.id, tx);

      const [conflict] = await tx
        .select()
        .from(StudentClasses)
        .where(
          and(
            ne(StudentClasses.id, id),
            eq(StudentClasses.student_account_id, current.student.account.id),
            eq(StudentClasses.course_offering_id, current.offering.id),
            isNull(StudentClasses.deleted_at),
          ),
        );

      if (conflict)
        throw new AppError(
          409,
          "Cannot restore: Student is already actively enrolled in this course offering.",
        );

      const [restored] = await tx
        .update(StudentClasses)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(StudentClasses.id, id))
        .returning({ id: StudentClasses.id });

      if (!restored) throw new AppError(500, "Failed to restore enrollment record.");

      const fullRecord = await this.getStudentClassById(id, tx);
      if (fullRecord.isErr()) throw fullRecord.error;

      return fullRecord.value;
    });
  }

  private async checkStudentClassDependencies(
    studentAccountId: number,
    courseOfferingId: number,
    tx: PgTransaction,
  ): Promise<void> {
    // If you have evaluation submissions (e.g. EvaluationSubmissions table):
    /*
    const [existingEvaluation] = await tx
      .select({ id: EvaluationSubmissions.id })
      .from(EvaluationSubmissions)
      .where(
        and(
          eq(EvaluationSubmissions.student_account_id, studentAccountId),
          eq(EvaluationSubmissions.course_offering_id, courseOfferingId),
          isNull(EvaluationSubmissions.deleted_at)
        )
      );

    if (existingEvaluation) {
      throw new AppError(
        409,
        "Cannot unenroll student: The student has already submitted an evaluation for this course offering."
      );
    }
    */
  }
}
