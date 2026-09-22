import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  Accounts,
  Classes,
  CourseCurriculums,
  CourseOfferings,
  Courses,
  OfferingInsert,
  OfferingQuerySchema,
  OfferingUpdate,
  PersonalDetails,
  Programs,
  Semesters,
  StudentClasses,
  type GetOffering,
  type IOfferingInsert,
  type IOfferingUpdate,
  type PaginatedData,
} from "@my-app/shared";
import { errAsync, type ResultAsync } from "neverthrow";
import { ClassService, type IClassService } from "./class.service.js";
import { CurriculumService, type ICurriculumService } from "./curriculum.service.js";
import { UserService, type IUserService } from "./user.service.js";
import {
  and,
  asc,
  count,
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
import db, { type PgTransaction } from "@/configs/db.config.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import { SemesterService, type ISemesterService } from "./semester.service.js";

export interface IOfferingService {
  getOfferingById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
  ): ResultAsync<GetOffering, AppError>;
  getOfferings(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<GetOffering[]>, AppError>;
  createOffering(info: IOfferingInsert, client?: DbClient): ResultAsync<GetOffering, AppError>;
  updateOffering(
    id: number,
    info: IOfferingUpdate,
    client?: DbClient,
  ): ResultAsync<GetOffering, AppError>;
  deleteOffering(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreOffering(id: number, client?: DbClient): ResultAsync<GetOffering, AppError>;
}

export class OfferingService implements IOfferingService {
  constructor(
    private semesterService: ISemesterService = new SemesterService(),
    private classService: IClassService = new ClassService(),
    private curriculumService: ICurriculumService = new CurriculumService(),
    private userService: IUserService = new UserService(),
  ) {}

  private selectFields = {
    id: CourseOfferings.id,
    created_at: CourseOfferings.created_at,
    updated_at: CourseOfferings.updated_at,
    deleted_at: CourseOfferings.deleted_at,

    course_curriculum: sql<GetOffering["course_curriculum"]>`
      JSON_BUILD_OBJECT(
        'id', ${CourseCurriculums.id},
        'course', JSON_BUILD_OBJECT(
          'id', ${Courses.id},
          'name', ${Courses.name},
          'initialism', ${Courses.initialism}
        )
      )
    `,

    class: sql<GetOffering["class"]>`
      JSON_BUILD_OBJECT(
        'id', ${Classes.id},
        'year_level', ${Classes.year_level},
        'section', ${Classes.section},
        'program', JSON_BUILD_OBJECT(
          'id', ${Programs.id},
          'name', ${Programs.name},
          'initialism', ${Programs.initialism}
        )
      )
    `,

    semester: sql<GetOffering["semester"]>`
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

    faculty: sql<GetOffering["faculty"] | null>`
      CASE
        WHEN ${Accounts.id} IS NULL THEN NULL
        ELSE JSON_BUILD_OBJECT(
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
      END
    `,
  };

  getOfferingById(
    id: number,
    client: DbClient = db,
    includeArchived: boolean = false,
  ): ResultAsync<GetOffering, AppError> {
    return WithTransaction(client, async (tx) => {
      const [offering] = await tx
        .select(this.selectFields)
        .from(CourseOfferings)
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
        .leftJoin(
          Accounts,
          and(eq(CourseOfferings.faculty_id, Accounts.id), isNull(Accounts.deleted_at)),
        )
        .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(
          and(
            eq(CourseOfferings.id, id),
            includeArchived ? undefined : isNull(CourseOfferings.deleted_at),
          ),
        )
        .groupBy(
          CourseOfferings.id,
          CourseCurriculums.id,
          Courses.id,
          Classes.id,
          Programs.id,
          Semesters.id,
          Accounts.id,
          PersonalDetails.id,
        );
      if (!offering) throw new AppError(404, "Course offering record not found.");

      return offering;
    });
  }

  getOfferings(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<GetOffering[]>, AppError> {
    return ValidateSchema(OfferingQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const {
        paginate,
        page,
        limit,
        search,
        course_curriculum_id,
        class_id,
        semester_id,
        faculty_id,
        is_archived,
        sort_by,
        order,
      } = parsed;

      const filters: SQL[] = [
        is_archived ? isNotNull(CourseOfferings.deleted_at) : isNull(CourseOfferings.deleted_at),
        isNull(CourseCurriculums.deleted_at),
        isNull(Courses.deleted_at),
        isNull(Classes.deleted_at),
        isNull(Programs.deleted_at),
        isNull(Semesters.deleted_at),
      ];

      if (search) {
        const term = `%${search}%`;
        filters.push(
          or(
            ilike(Courses.name, term),
            ilike(Courses.initialism, term),
            ilike(Programs.name, term),
            ilike(PersonalDetails.first_name, term),
            ilike(PersonalDetails.last_name, term),
            ilike(PersonalDetails.institutional_id, term),
          )!,
        );
      }

      if (course_curriculum_id !== undefined)
        filters.push(eq(CourseOfferings.course_curriculum_id, course_curriculum_id));
      if (class_id !== undefined) filters.push(eq(CourseOfferings.class_id, class_id));
      if (semester_id !== undefined) filters.push(eq(CourseOfferings.semester_id, semester_id));
      if (faculty_id !== undefined) filters.push(eq(CourseOfferings.faculty_id, faculty_id));

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: CourseOfferings.created_at,
        class_id: CourseOfferings.class_id,
        semester_id: CourseOfferings.semester_id,
        course_curriculum_id: CourseOfferings.course_curriculum_id,
        faculty_id: CourseOfferings.faculty_id,
      };

      const sortColumn =
        sortColumnMap[sort_by as keyof typeof sortColumnMap] ?? CourseOfferings.created_at;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseDataQuery = tx
          .select(this.selectFields)
          .from(CourseOfferings)
          .innerJoin(
            CourseCurriculums,
            eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
          )
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
          .leftJoin(
            Accounts,
            and(eq(CourseOfferings.faculty_id, Accounts.id), isNull(Accounts.deleted_at)),
          )
          .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .where(whereCondition)
          .groupBy(
            CourseOfferings.id,
            CourseCurriculums.id,
            Courses.id,
            Classes.id,
            Programs.id,
            Semesters.id,
            Accounts.id,
            PersonalDetails.id,
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
          .select({ total: countDistinct(CourseOfferings.id) })
          .from(CourseOfferings)
          .innerJoin(
            CourseCurriculums,
            eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
          )
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
          .leftJoin(
            Accounts,
            and(eq(CourseOfferings.faculty_id, Accounts.id), isNull(Accounts.deleted_at)),
          )
          .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
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

  createOffering(info: IOfferingInsert, client: DbClient = db): ResultAsync<GetOffering, AppError> {
    return ValidateSchema(OfferingInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        await this.semesterService.validateSemesterOpen(parsed.semester_id, tx);

        const currResult = await this.curriculumService.getCurriculumById(
          parsed.course_curriculum_id,
          tx,
        );
        if (currResult.isErr()) throw currResult.error;

        const classResult = await this.classService.getClassById(parsed.class_id, tx);
        if (classResult.isErr()) throw classResult.error;

        if (parsed.faculty_id) await this.validateFaculty(parsed.faculty_id, tx);

        const [existing] = await tx
          .select()
          .from(CourseOfferings)
          .where(
            and(
              eq(CourseOfferings.class_id, parsed.class_id),
              eq(CourseOfferings.course_curriculum_id, parsed.course_curriculum_id),
              eq(CourseOfferings.semester_id, parsed.semester_id),
            ),
          );

        let offeringId: number;

        if (existing) {
          if (existing.deleted_at === null) {
            throw new AppError(
              409,
              "This course curriculum is already scheduled for this class in the selected semester.",
            );
          }

          const [restored] = await tx
            .update(CourseOfferings)
            .set({
              faculty_id: parsed.faculty_id ?? null,
              deleted_at: null,
              updated_at: new Date(),
            })
            .where(eq(CourseOfferings.id, existing.id))
            .returning({ id: CourseOfferings.id });

          if (!restored) throw new AppError(500, "Failed to restore course offering.");
          offeringId = restored.id;
        } else {
          const [created] = await tx
            .insert(CourseOfferings)
            .values(parsed)
            .returning({ id: CourseOfferings.id });

          if (!created) throw new AppError(500, "Failed to schedule course offering.");
          offeringId = created.id;
        }

        const fullRecord = await this.getOfferingById(offeringId, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        return fullRecord.value;
      });
    });
  }

  updateOffering(
    id: number,
    info: IOfferingUpdate,
    client: DbClient = db,
  ): ResultAsync<GetOffering, AppError> {
    return ValidateSchema(OfferingUpdate, info).asyncAndThen((parsed) => {
      const hasUpdates = Boolean(parsed && Object.keys(parsed).length > 0);
      if (!hasUpdates) return errAsync(new AppError(400, "No update parameters were provided."));

      return WithTransaction(client, async (tx) => {
        const existing = await this.getOfferingById(id, tx);
        if (existing.isErr()) throw existing.error;

        if (parsed.semester_id)
          await this.semesterService.validateSemesterOpen(parsed.semester_id, tx);

        if (parsed.course_curriculum_id) {
          const currResult = await this.curriculumService.getCurriculumById(
            parsed.course_curriculum_id,
            tx,
          );
          if (currResult.isErr()) throw currResult.error;
        }

        if (parsed.class_id) {
          const classResult = await this.classService.getClassById(parsed.class_id, tx);
          if (classResult.isErr()) throw classResult.error;
        }

        if (parsed.faculty_id) await this.validateFaculty(parsed.faculty_id, tx);

        const [updated] = await tx
          .update(CourseOfferings)
          .set(parsed)
          .where(and(eq(CourseOfferings.id, id), isNull(CourseOfferings.deleted_at)))
          .returning({ id: CourseOfferings.id });

        if (!updated) throw new AppError(500, "Failed to update course offering.");

        const fullRecord = await this.getOfferingById(id, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        return fullRecord.value;
      });
    });
  }

  deleteOffering(id: number, client?: DbClient): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getOfferingById(id, tx);
      if (existing.isErr()) throw existing.error;

      await this.checkOfferingDependencies(id, tx);

      const [deleted] = await tx
        .update(CourseOfferings)
        .set({ deleted_at: new Date() })
        .where(and(eq(CourseOfferings.id, id), isNull(CourseOfferings.deleted_at)))
        .returning({ id: CourseOfferings.id });

      if (!deleted) throw new AppError(404, "Course offering was not found or already deleted.");
    });
  }

  restoreOffering(id: number, client?: DbClient): ResultAsync<GetOffering, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getOfferingById(id, tx, true);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      if (!current.deleted_at) throw new AppError(400, "This course offering is already active.");

      await this.semesterService.validateSemesterOpen(current.semester.id, tx);

      const currResult = await this.curriculumService.getCurriculumById(
        current.course_curriculum.id,
        tx,
      );
      if (currResult.isErr())
        throw new AppError(400, "Cannot restore: Course curriculum is archived.");

      const classResult = await this.classService.getClassById(current.class.id, tx);
      if (classResult.isErr()) throw new AppError(400, "Cannot restore: Class is archived.");

      const [conflict] = await tx
        .select()
        .from(CourseOfferings)
        .where(
          and(
            ne(CourseOfferings.id, id),
            eq(CourseOfferings.class_id, current.class.id),
            eq(CourseOfferings.course_curriculum_id, current.course_curriculum.id),
            eq(CourseOfferings.semester_id, current.semester.id),
            isNull(CourseOfferings.deleted_at),
          ),
        );

      if (conflict)
        throw new AppError(
          409,
          "Cannot restore: An active offering for this curriculum, class, and semester already exists.",
        );

      const [restored] = await tx
        .update(CourseOfferings)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(CourseOfferings.id, id))
        .returning({ id: CourseOfferings.id });

      if (!restored) throw new AppError(500, "Failed to restore course offering.");

      const fullRecord = await this.getOfferingById(id, tx);
      if (fullRecord.isErr()) throw fullRecord.error;

      return fullRecord.value;
    });
  }

  private async validateFaculty(facultyId: number, tx: PgTransaction): Promise<void> {
    const isFaculty = await this.userService.hasRole(facultyId, "FACULTY", tx);
    const isSupervisor = await this.userService.hasRole(facultyId, "SUPERVISOR", tx);

    if ((isFaculty.isOk() && isFaculty.value) || (isSupervisor.isOk() && isSupervisor.value)) {
      return;
    }

    throw new AppError(400, "The assigned user must have a FACULTY or SUPERVISOR role.");
  }

  private async checkOfferingDependencies(offeringId: number, tx: PgTransaction): Promise<void> {
    const [activeStudents] = await tx
      .select({ total: count(StudentClasses.id) })
      .from(StudentClasses)
      .where(
        and(eq(StudentClasses.course_offering_id, offeringId), isNull(StudentClasses.deleted_at)),
      );

    const studentCount = activeStudents?.total ?? 0;
    if (studentCount > 0) {
      throw new AppError(
        409,
        `Cannot delete course offering because ${studentCount} student(s) are currently enrolled in it. Please reassign or unenroll them first.`,
      );
    }
  }
}
