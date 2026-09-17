import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  Classes,
  ClassInsert,
  ClassQuerySchema,
  ClassStudents,
  ClassUpdate,
  CourseOfferings,
  Programs,
  type GetClass,
  type IClassInsert,
  type IClassUpdate,
  type PaginatedData,
} from "@my-app/shared";
import { errAsync, type ResultAsync } from "neverthrow";
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

export interface IClassService {
  getClassById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
  ): ResultAsync<GetClass, AppError>;
  getClasses(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<GetClass[]>, AppError>;
  createClass(classInfo: IClassInsert, client?: DbClient): ResultAsync<GetClass, AppError>;
  updateClass(
    id: number,
    classInfo: IClassUpdate,
    client?: DbClient,
  ): ResultAsync<GetClass, AppError>;
  deleteClass(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreClass(id: number, client?: DbClient): ResultAsync<GetClass, AppError>;
}

export class ClassService implements IClassService {
  constructor(private programService: IProgramService = new ProgramService()) {}

  getClassById(
    id: number,
    client: DbClient = db,
    includeArchived: boolean = false,
  ): ResultAsync<GetClass, AppError> {
    return WithTransaction(client, async (tx) => {
      const [classRecord] = await tx
        .select({
          id: Classes.id,
          year_level: Classes.year_level,
          section: Classes.section,
          created_at: Classes.created_at,
          updated_at: Classes.updated_at,
          deleted_at: Classes.deleted_at,
          program: {
            id: Programs.id,
            name: Programs.name,
            initialism: Programs.initialism,
          },
        })
        .from(Classes)
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .where(and(eq(Classes.id, id), includeArchived ? undefined : isNull(Classes.deleted_at)));
      if (!classRecord) throw new AppError(404, "Class record not found.");

      return classRecord;
    });
  }

  getClasses(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<GetClass[]>, AppError> {
    return ValidateSchema(ClassQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const {
        paginate,
        page,
        limit,
        search,
        program_id,
        year_level,
        section,
        is_archived,
        sort_by,
        order,
      } = parsed;

      const filters: SQL[] = [
        is_archived ? isNotNull(Classes.deleted_at) : isNull(Classes.deleted_at),
        isNull(Programs.deleted_at),
      ];

      if (search) {
        const term = `%${search}%`;
        filters.push(or(ilike(Programs.name, term), ilike(Programs.initialism, term))!);
      }

      if (program_id !== undefined) filters.push(eq(Classes.program_id, program_id));
      if (year_level) filters.push(eq(Classes.year_level, year_level));
      if (section) filters.push(eq(Classes.section, section));

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: Classes.created_at,
        year_level: Classes.year_level,
        section: Classes.section,
        program_id: Classes.program_id,
        deleted_at: Classes.deleted_at,
      };

      const sortColumn = sortColumnMap[sort_by as keyof typeof sortColumnMap] ?? Classes.year_level;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseDataQuery = tx
          .select({
            id: Classes.id,
            year_level: Classes.year_level,
            section: Classes.section,
            created_at: Classes.created_at,
            updated_at: Classes.updated_at,
            deleted_at: Classes.deleted_at,
            program: {
              id: Programs.id,
              name: Programs.name,
              initialism: Programs.initialism,
            },
          })
          .from(Classes)
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .where(whereCondition)
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const classes = await baseDataQuery;
          return createPaginatedData({
            data: classes,
            currentPage: 1,
            pageSize: classes.length,
            totalItems: classes.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedDataQuery = baseDataQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(Classes.id) })
          .from(Classes)
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .where(whereCondition);

        const [classes, countResult] = await Promise.all([paginatedDataQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;

        return createPaginatedData({
          data: classes,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  createClass(classInfo: IClassInsert, client: DbClient = db): ResultAsync<GetClass, AppError> {
    return ValidateSchema(ClassInsert, classInfo).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const programResult = await this.programService.getProgramById(parsed.program_id, tx);
        if (programResult.isErr()) throw programResult.error;

        const [createdClass] = await tx.insert(Classes).values(parsed).returning();

        if (!createdClass) throw new AppError(500, "Failed to create class record.");

        const fullClass = await this.getClassById(createdClass.id, tx);
        if (fullClass.isErr()) throw fullClass.error;

        return fullClass.value;
      });
    });
  }

  updateClass(
    id: number,
    classInfo: IClassUpdate,
    client: DbClient = db,
  ): ResultAsync<GetClass, AppError> {
    return ValidateSchema(ClassUpdate, classInfo).asyncAndThen((parsed) => {
      const hasUpdateData = Boolean(parsed && Object.keys(parsed).length > 0);
      if (!hasUpdateData) {
        return errAsync(new AppError(400, "No update parameters were provided."));
      }

      return WithTransaction(client, async (tx) => {
        const existingClass = await this.getClassById(id, tx);
        if (existingClass.isErr()) throw existingClass.error;

        if (parsed.program_id) {
          const programResult = await this.programService.getProgramById(parsed.program_id, tx);
          if (programResult.isErr()) throw programResult.error;
        }

        const [updated] = await tx
          .update(Classes)
          .set(parsed)
          .where(and(eq(Classes.id, id), isNull(Classes.deleted_at)))
          .returning();

        if (!updated) {
          throw new AppError(500, "Failed to update class record.");
        }

        const fullClass = await this.getClassById(id, tx);
        if (fullClass.isErr()) throw fullClass.error;

        return fullClass.value;
      });
    });
  }

  deleteClass(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existingClass = await this.getClassById(id, tx);
      if (existingClass.isErr()) throw existingClass.error;

      await this.checkClassDependencies(id, tx);

      const [deleted] = await tx
        .update(Classes)
        .set({ deleted_at: new Date() })
        .where(and(eq(Classes.id, id), isNull(Classes.deleted_at)))
        .returning({ id: Classes.id });
      if (!deleted) throw new AppError(404, "Class was not found or has already been archived.");
    });
  }

  restoreClass(id: number, client: DbClient = db): ResultAsync<GetClass, AppError> {
    return WithTransaction(client, async (tx) => {
      const existingClass = await this.getClassById(id, tx, true);
      if (existingClass.isErr()) throw existingClass.error;
      const current = existingClass.value;

      if (!current.deleted_at) {
        throw new AppError(400, "This class is already active and not archived.");
      }

      const programResult = await this.programService.getProgramById(current.program.id, tx);
      if (programResult.isErr()) {
        throw new AppError(400, "Cannot restore class: Parent program is archived.");
      }

      const [conflict] = await tx
        .select()
        .from(Classes)
        .where(
          and(
            eq(Classes.program_id, current.program.id),
            and(eq(Classes.year_level, current.year_level), eq(Classes.section, current.section)),
            isNull(Classes.deleted_at),
          ),
        );

      if (conflict) {
        throw new AppError(
          409,
          `Cannot restore class: An active class with year level "${current.year_level}" and section "${current.section}" already exists in this program.`,
        );
      }

      const [restored] = await tx
        .update(Classes)
        .set({ deleted_at: null })
        .where(eq(Classes.id, id))
        .returning();

      if (!restored) {
        throw new AppError(500, "Failed to restore class.");
      }

      const fullClass = await this.getClassById(id, tx);
      if (fullClass.isErr()) throw fullClass.error;

      return fullClass.value;
    });
  }

  private async checkClassDependencies(classId: number, tx: PgTransaction): Promise<void> {
    const [activeOfferings, activeStudents] = await Promise.all([
      tx
        .select({ total: count(CourseOfferings.id) })
        .from(CourseOfferings)
        .where(and(eq(CourseOfferings.class_id, classId), isNull(CourseOfferings.deleted_at))),
      tx
        .select({ total: count(ClassStudents.id) })
        .from(ClassStudents)
        .where(and(eq(ClassStudents.class_id, classId), isNull(ClassStudents.deleted_at))),
    ]);

    const offeringCount = activeOfferings[0]?.total ?? 0;
    const studentCount = activeStudents[0]?.total ?? 0;

    if (offeringCount > 0 || studentCount > 0) {
      const reasons: string[] = [];
      if (offeringCount > 0) {
        reasons.push(`${offeringCount} scheduled course offering(s)`);
      }
      if (studentCount > 0) {
        reasons.push(`${studentCount} enrolled student(s)`);
      }

      throw new AppError(
        409,
        `Cannot archive class because it still has active dependencies: ${reasons.join(
          ", ",
        )}. Please archive or reassign them first.`,
      );
    }
  }
}
