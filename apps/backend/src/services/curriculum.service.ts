import db from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  CourseCurriculums,
  CourseOfferings,
  Courses,
  CurriculumInsert,
  CurriculumQuerySchema,
  CurriculumUpdate,
  Programs,
  type GetCurriculum,
  type ICurriculumInsert,
  type ICurriculumUpdate,
  type PaginatedData,
} from "@my-app/shared";
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
  type SQL,
} from "drizzle-orm";
import { errAsync, type ResultAsync } from "neverthrow";
import { CourseService, type ICourseService } from "./course.service.js";
import { ProgramService, type IProgramService } from "./program.service.js";

export interface ICurriculumService {
  getCurriculumById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
  ): ResultAsync<GetCurriculum, AppError>;
  getCurriculums(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<GetCurriculum[]>, AppError>;
  createCurriculum(
    info: ICurriculumInsert,
    client?: DbClient,
  ): ResultAsync<GetCurriculum, AppError>;
  updateCurriculum(
    id: number,
    info: ICurriculumUpdate,
    client?: DbClient,
  ): ResultAsync<GetCurriculum, AppError>;
  deleteCurriculum(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreCurriculum(id: number, client?: DbClient): ResultAsync<GetCurriculum, AppError>;
}

export class CurriculumService implements ICurriculumService {
  constructor(
    private programService: IProgramService = new ProgramService(),
    private courseService: ICourseService = new CourseService(),
  ) {}

  getCurriculumById(
    id: number,
    client: DbClient = db,
    includeArchived = false,
  ): ResultAsync<GetCurriculum, AppError> {
    return WithTransaction(client, async (tx) => {
      const [curriculum] = await tx
        .select({
          id: CourseCurriculums.id,
          year_level: CourseCurriculums.year_level,
          semester_term: CourseCurriculums.semester_term,
          created_at: CourseCurriculums.created_at,
          updated_at: CourseCurriculums.updated_at,
          deleted_at: CourseCurriculums.deleted_at,
          course: {
            id: Courses.id,
            name: Courses.name,
            initialism: Courses.initialism,
          },
          program: {
            id: Programs.id,
            name: Programs.name,
            initialism: Programs.initialism,
          },
        })
        .from(CourseCurriculums)
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Programs, eq(CourseCurriculums.program_id, Programs.id))
        .where(
          and(
            eq(CourseCurriculums.id, id),
            includeArchived ? undefined : isNull(CourseCurriculums.deleted_at),
          ),
        );

      if (!curriculum) {
        throw new AppError(404, "Curriculum mapping record not found.");
      }

      return curriculum;
    });
  }

  getCurriculums(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<GetCurriculum[]>, AppError> {
    return ValidateSchema(CurriculumQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const {
        paginate,
        page,
        limit,
        search,
        program_id,
        course_id,
        year_level,
        semester_term,
        is_archived,
        sort_by,
        order,
      } = parsed;

      const filters: SQL[] = [
        is_archived
          ? isNotNull(CourseCurriculums.deleted_at)
          : isNull(CourseCurriculums.deleted_at),
        isNull(Courses.deleted_at),
        isNull(Programs.deleted_at),
      ];

      if (search) {
        const term = `%${search}%`;
        filters.push(
          or(
            ilike(Courses.name, term),
            ilike(Courses.initialism, term),
            ilike(Programs.name, term),
            ilike(Programs.initialism, term),
          )!,
        );
      }

      if (program_id !== undefined) filters.push(eq(CourseCurriculums.program_id, program_id));
      if (course_id !== undefined) filters.push(eq(CourseCurriculums.course_id, course_id));
      if (year_level) filters.push(eq(CourseCurriculums.year_level, year_level));
      if (semester_term) filters.push(eq(CourseCurriculums.semester_term, semester_term));

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: CourseCurriculums.created_at,
        year_level: CourseCurriculums.year_level,
        semester_term: CourseCurriculums.semester_term,
        program_id: CourseCurriculums.program_id,
        course_id: CourseCurriculums.course_id,
      };

      const sortColumn = sortColumnMap[sort_by] ?? CourseCurriculums.year_level;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseDataQuery = tx
          .select({
            id: CourseCurriculums.id,
            year_level: CourseCurriculums.year_level,
            semester_term: CourseCurriculums.semester_term,
            created_at: CourseCurriculums.created_at,
            updated_at: CourseCurriculums.updated_at,
            deleted_at: CourseCurriculums.deleted_at,
            course: {
              id: Courses.id,
              name: Courses.name,
              initialism: Courses.initialism,
            },
            program: {
              id: Programs.id,
              name: Programs.name,
              initialism: Programs.initialism,
            },
          })
          .from(CourseCurriculums)
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Programs, eq(CourseCurriculums.program_id, Programs.id))
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
          .select({ total: countDistinct(CourseCurriculums.id) })
          .from(CourseCurriculums)
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Programs, eq(CourseCurriculums.program_id, Programs.id))
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

  createCurriculum(
    info: ICurriculumInsert,
    client: DbClient = db,
  ): ResultAsync<GetCurriculum, AppError> {
    return ValidateSchema(CurriculumInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const programResult = await this.programService.getProgramById(parsed.program_id, tx);
        if (programResult.isErr()) throw programResult.error;

        const courseResult = await this.courseService.getCourseById(parsed.course_id, tx);
        if (courseResult.isErr()) throw courseResult.error;

        const [existing] = await tx
          .select()
          .from(CourseCurriculums)
          .where(
            and(
              eq(CourseCurriculums.course_id, parsed.course_id),
              eq(CourseCurriculums.program_id, parsed.program_id),
              eq(CourseCurriculums.year_level, parsed.year_level),
              eq(CourseCurriculums.semester_term, parsed.semester_term),
            ),
          );

        let curriculumId: number;

        if (existing) {
          if (existing.deleted_at === null) {
            throw new AppError(
              409,
              "This course is already mapped to this program for the selected year level and term.",
            );
          }

          const [restored] = await tx
            .update(CourseCurriculums)
            .set({ deleted_at: null, updated_at: new Date() })
            .where(eq(CourseCurriculums.id, existing.id))
            .returning({ id: CourseCurriculums.id });

          if (!restored) throw new AppError(500, "Failed to restore existing curriculum mapping.");
          curriculumId = restored.id;
        } else {
          const [created] = await tx
            .insert(CourseCurriculums)
            .values(parsed)
            .returning({ id: CourseCurriculums.id });

          if (!created) throw new AppError(500, "Failed to create curriculum mapping.");
          curriculumId = created.id;
        }

        const fullRecord = await this.getCurriculumById(curriculumId, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        return fullRecord.value;
      });
    });
  }

  updateCurriculum(
    id: number,
    info: ICurriculumUpdate,
    client: DbClient = db,
  ): ResultAsync<GetCurriculum, AppError> {
    return ValidateSchema(CurriculumUpdate, info).asyncAndThen((parsed) => {
      const hasUpdates = Boolean(parsed && Object.keys(parsed).length > 0);
      if (!hasUpdates) {
        return errAsync(new AppError(400, "No update parameters were provided."));
      }

      return WithTransaction(client, async (tx) => {
        const existing = await this.getCurriculumById(id, tx);
        if (existing.isErr()) throw existing.error;

        if (parsed.course_id) {
          const courseResult = await this.courseService.getCourseById(parsed.course_id, tx);
          if (courseResult.isErr()) throw courseResult.error;
        }

        if (parsed.program_id) {
          const programResult = await this.programService.getProgramById(parsed.program_id, tx);
          if (programResult.isErr()) throw programResult.error;
        }

        const [updated] = await tx
          .update(CourseCurriculums)
          .set(parsed)
          .where(and(eq(CourseCurriculums.id, id), isNull(CourseCurriculums.deleted_at)))
          .returning({ id: CourseCurriculums.id });

        if (!updated) {
          throw new AppError(500, "Failed to update curriculum mapping.");
        }

        const fullRecord = await this.getCurriculumById(id, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        return fullRecord.value;
      });
    });
  }

  deleteCurriculum(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getCurriculumById(id, tx);
      if (existing.isErr()) throw existing.error;

      const [activeOfferings] = await tx
        .select({ total: count(CourseOfferings.id) })
        .from(CourseOfferings)
        .where(
          and(eq(CourseOfferings.course_curriculum_id, id), isNull(CourseOfferings.deleted_at)),
        );

      const offeringCount = activeOfferings?.total ?? 0;
      if (offeringCount > 0) {
        throw new AppError(
          409,
          `Cannot delete curriculum mapping because it is actively used in ${offeringCount} scheduled course offering(s). Please remove or reassign them first.`,
        );
      }

      const [deleted] = await tx
        .update(CourseCurriculums)
        .set({ deleted_at: new Date() })
        .where(and(eq(CourseCurriculums.id, id), isNull(CourseCurriculums.deleted_at)))
        .returning({ id: CourseCurriculums.id });

      if (!deleted) {
        throw new AppError(404, "Curriculum mapping record was not found or already deleted.");
      }

      return undefined;
    });
  }

  restoreCurriculum(id: number, client: DbClient = db): ResultAsync<GetCurriculum, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getCurriculumById(id, tx, true);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      if (!current.deleted_at)
        throw new AppError(400, "This curriculum mapping is already active.");

      const programResult = await this.programService.getProgramById(current.program.id, tx);
      if (programResult.isErr())
        throw new AppError(
          400,
          "Cannot restore curriculum: Parent program is archived or deleted.",
        );

      const courseResult = await this.courseService.getCourseById(current.course.id, tx);
      if (courseResult.isErr())
        throw new AppError(400, "Cannot restore curriculum: Parent course is archived or deleted.");

      const [restored] = await tx
        .update(CourseCurriculums)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(CourseCurriculums.id, id))
        .returning({ id: CourseCurriculums.id });

      if (!restored) {
        throw new AppError(500, "Failed to restore curriculum mapping.");
      }

      const fullRecord = await this.getCurriculumById(id, tx);
      if (fullRecord.isErr()) throw fullRecord.error;

      return fullRecord.value;
    });
  }
}
