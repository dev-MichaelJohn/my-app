import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  CourseCurriculums,
  CourseInsert,
  CourseOfferings,
  CourseQuerySchema,
  Courses,
  CourseUpdate,
  type ICourseInsert,
  type ICourseSelect,
  type ICourseUpdate,
  type PaginatedData,
} from "@my-app/shared";
import type { ResultAsync } from "neverthrow";
import { ProgramService, type IProgramService } from "./program.service.js";
import db, { type PgTransaction } from "@/configs/db.config.js";
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
  or,
  SQL,
} from "drizzle-orm";
import { ValidateSchema } from "@/libs/result.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";

export interface ICourseService {
  getCourseById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
  ): ResultAsync<ICourseSelect, AppError>;
  getCourses(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<ICourseSelect[]>, AppError>;
  createCourse(courseInfo: ICourseInsert, client?: DbClient): ResultAsync<ICourseSelect, AppError>;
  updateCourse(
    id: number,
    courseInfo: ICourseUpdate,
    client?: DbClient,
  ): ResultAsync<ICourseSelect, AppError>;
  deleteCourse(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreCourse(id: number, client?: DbClient): ResultAsync<ICourseSelect, AppError>;
}

export class CourseService implements ICourseService {
  constructor(private programService: IProgramService = new ProgramService()) {}

  getCourseById(
    id: number,
    client: DbClient = db,
    includeArchived: boolean = false,
  ): ResultAsync<ICourseSelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [course] = await tx
        .select()
        .from(Courses)
        .where(and(eq(Courses.id, id), includeArchived ? undefined : isNull(Courses.deleted_at)));
      if (!course) throw new AppError(404, "No course record found.");

      return course;
    });
  }

  getCourses(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<ICourseSelect[]>, AppError> {
    return ValidateSchema(CourseQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const { paginate, page, limit, search, program_id, is_archived, sort_by, order } = parsed;

      const filters: SQL[] = [
        is_archived ? isNotNull(Courses.deleted_at) : isNull(Courses.deleted_at),
      ];

      if (search) {
        const term = `%${search}%`;
        filters.push(or(ilike(Courses.name, term), ilike(Courses.initialism, term))!);
      }

      if (program_id !== undefined) filters.push(eq(Courses.program_id, program_id));

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: Courses.created_at,
        name: Courses.name,
        initialism: Courses.initialism,
        program_id: Courses.program_id,
      };

      const sortColumn = sortColumnMap[sort_by] ?? Courses.name;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseDataQuery = tx
          .select()
          .from(Courses)
          .where(whereCondition)
          .orderBy(orderByClause);

        if (!paginate) {
          const courses = await baseDataQuery;
          return createPaginatedData({
            data: courses,
            currentPage: 1,
            pageSize: courses.length,
            totalItems: courses.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedDataQuery = baseDataQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(Courses.id) })
          .from(Courses)
          .where(whereCondition);

        const [courses, countResult] = await Promise.all([paginatedDataQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;
        return createPaginatedData({
          data: courses,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  createCourse(
    courseInfo: ICourseInsert,
    client: DbClient = db,
  ): ResultAsync<ICourseSelect, AppError> {
    return ValidateSchema(CourseInsert, courseInfo).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const existingProgram = await this.programService.getProgramById(parsed.program_id, tx);
        if (existingProgram.isErr()) throw existingProgram.error;

        const [courseRecord] = await tx.insert(Courses).values(parsed).returning();
        if (!courseRecord) throw new AppError(500, "Failed to create course record.");

        return courseRecord;
      });
    });
  }

  updateCourse(
    id: number,
    courseInfo: ICourseUpdate,
    client: DbClient = db,
  ): ResultAsync<ICourseSelect, AppError> {
    return ValidateSchema(CourseUpdate, courseInfo).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const hasCourseInfo = Boolean(parsed && Object.keys(parsed).length > 0);
        if (!hasCourseInfo) throw new AppError(400, "No update parameters were provided.");

        if (parsed.program_id) {
          const existingProgram = await this.programService.getProgramById(parsed.program_id, tx);
          if (existingProgram.isErr()) throw existingProgram.error;
        }

        const existingCourse = await this.getCourseById(id, tx);
        if (existingCourse.isErr()) throw existingCourse.error;
        const current = existingCourse.value;

        const [updated] = await tx
          .update(Courses)
          .set(parsed)
          .where(and(eq(Courses.id, current.id), isNull(Courses.deleted_at)))
          .returning();
        if (!updated) throw new AppError(500, "Failed to update course record.");

        return updated;
      });
    });
  }

  deleteCourse(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existingCourse = await this.getCourseById(id, tx);
      if (existingCourse.isErr()) throw existingCourse.error;

      await this.checkCourseDependencies(id, tx);

      const [deletedCourse] = await tx
        .update(Courses)
        .set({ deleted_at: new Date() })
        .where(and(eq(Courses.id, id), isNull(Courses.deleted_at)))
        .returning({ id: Courses.id });

      if (!deletedCourse) {
        throw new AppError(404, "Course was not found or has already been deleted.");
      }
    });
  }

  restoreCourse(id: number, client: DbClient = db): ResultAsync<ICourseSelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const existingCourse = await this.getCourseById(id, tx, true);
      if (existingCourse.isErr()) throw existingCourse.error;
      const current = existingCourse.value;

      if (!current.deleted_at) {
        throw new AppError(400, "This course is already active and not archived.");
      }

      const programResult = await this.programService.getProgramById(current.program_id, tx);
      if (programResult.isErr()) {
        throw new AppError(
          400,
          "Cannot restore course: The parent academic program is archived or deleted.",
        );
      }

      const [conflict] = await tx
        .select()
        .from(Courses)
        .where(
          and(
            eq(Courses.program_id, current.program_id),
            or(eq(Courses.name, current.name), eq(Courses.initialism, current.initialism)),
            isNull(Courses.deleted_at),
          ),
        );

      if (conflict) {
        throw new AppError(
          409,
          `Cannot restore course: An active course with name "${current.name}" or initialism "${current.initialism}" already exists in this program.`,
        );
      }

      const [restoredCourse] = await tx
        .update(Courses)
        .set({ deleted_at: null })
        .where(eq(Courses.id, id))
        .returning();

      if (!restoredCourse) {
        throw new AppError(500, "Failed to restore course.");
      }

      return restoredCourse;
    });
  }

  private async checkCourseDependencies(courseId: number, tx: PgTransaction): Promise<void> {
    const [activeCurriculums, activeOfferings] = await Promise.all([
      tx
        .select({ total: count(CourseCurriculums.id) })
        .from(CourseCurriculums)
        .where(
          and(eq(CourseCurriculums.course_id, courseId), isNull(CourseCurriculums.deleted_at)),
        ),
      tx
        .select({ total: count(CourseOfferings.id) })
        .from(CourseOfferings)
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .where(
          and(
            eq(CourseCurriculums.course_id, courseId),
            isNull(CourseCurriculums.deleted_at),
            isNull(CourseOfferings.deleted_at),
          ),
        ),
    ]);

    const curriculumCount = activeCurriculums[0]?.total ?? 0;
    const offeringCount = activeOfferings[0]?.total ?? 0;

    if (curriculumCount > 0 || offeringCount > 0) {
      const activeDependencies: string[] = [];
      if (curriculumCount > 0) activeDependencies.push(`${curriculumCount} curriculum mapping(s)`);
      if (offeringCount > 0)
        activeDependencies.push(`${offeringCount} scheduled course offering(s)`);

      throw new AppError(
        409,
        `Cannot delete course because it is actively used in: ${activeDependencies.join(
          ", ",
        )}. Please remove or reassign them first.`,
      );
    }
  }
}
