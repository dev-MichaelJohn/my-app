import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  isNotNull,
  isNull,
  lte,
  gte,
  ne,
  type SQL,
} from "drizzle-orm";
import { errAsync, type ResultAsync } from "neverthrow";
import db, { type PgTransaction } from "@/configs/db.config.js";
import { ClassStudents, CourseOfferings, Semesters } from "@my-app/shared";
import { AppError } from "@/libs/error.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import {
  SemesterQuerySchema,
  SemesterInsert,
  SemesterUpdate,
  type ISemesterInsert,
  type ISemesterSelect,
  type ISemesterUpdate,
  type PaginatedData,
} from "@my-app/shared";
import { OfferingService, type IOfferingService } from "./offering.service.js";
import { logger } from "@/libs/logger.lib.js";

export interface ISemesterService {
  getSemesterById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
  ): ResultAsync<ISemesterSelect, AppError>;
  getActiveSemester(client?: DbClient): ResultAsync<ISemesterSelect | null, AppError>;
  getSemesters(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<ISemesterSelect[]>, AppError>;
  createSemester(info: ISemesterInsert, client?: DbClient): ResultAsync<ISemesterSelect, AppError>;
  updateSemester(
    id: number,
    info: ISemesterUpdate,
    client?: DbClient,
  ): ResultAsync<ISemesterSelect, AppError>;
  deleteSemester(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreSemester(id: number, client?: DbClient): ResultAsync<ISemesterSelect, AppError>;
  validateSemesterOpen(semesterId: number, tx: PgTransaction): Promise<void>;
  forceStopSemester(id: number, client?: DbClient): ResultAsync<ISemesterSelect, AppError>;
}

export class SemesterService implements ISemesterService {
  getSemesterById(
    id: number,
    client: DbClient = db,
    includeArchived: boolean = false,
  ): ResultAsync<ISemesterSelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [semester] = await tx
        .select()
        .from(Semesters)
        .where(
          and(eq(Semesters.id, id), includeArchived ? undefined : isNull(Semesters.deleted_at)),
        );

      if (!semester) {
        throw new AppError(404, "Semester record was not found.");
      }

      return semester;
    });
  }

  getActiveSemester(client: DbClient = db): ResultAsync<ISemesterSelect | null, AppError> {
    return WithTransaction(client, async (tx) => {
      const today = new Date().toISOString().slice(0, 10);

      const [activeSemester] = await tx
        .select()
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

      return activeSemester ?? null;
    });
  }

  getSemesters(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<ISemesterSelect[]>, AppError> {
    return ValidateSchema(SemesterQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const {
        paginate,
        page,
        limit,
        semester_term,
        school_year_start,
        is_archived,
        sort_by,
        order,
      } = parsed;

      const filters: SQL[] = [
        is_archived ? isNotNull(Semesters.deleted_at) : isNull(Semesters.deleted_at),
      ];

      if (semester_term) filters.push(eq(Semesters.semester_term, semester_term));
      if (school_year_start !== undefined)
        filters.push(eq(Semesters.school_year_start, school_year_start));

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: Semesters.created_at,
        start_date: Semesters.start_date,
        end_date: Semesters.end_date,
        school_year_start: Semesters.school_year_start,
      };

      const sortColumn =
        sortColumnMap[sort_by as keyof typeof sortColumnMap] ?? Semesters.start_date;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseQuery = tx
          .select()
          .from(Semesters)
          .where(whereCondition)
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const results = await baseQuery;
          return createPaginatedData({
            data: results,
            currentPage: 1,
            pageSize: results.length,
            totalItems: results.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedQuery = baseQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(Semesters.id) })
          .from(Semesters)
          .where(whereCondition);

        const [results, countResult] = await Promise.all([paginatedQuery, countQuery]);
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

  createSemester(
    info: ISemesterInsert,
    client: DbClient = db,
  ): ResultAsync<ISemesterSelect, AppError> {
    return ValidateSchema(SemesterInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [conflict] = await tx
          .select({ id: Semesters.id })
          .from(Semesters)
          .where(
            and(
              eq(Semesters.semester_term, parsed.semester_term),
              eq(Semesters.school_year_start, parsed.school_year_start),
              isNull(Semesters.deleted_at),
            ),
          );

        if (conflict) {
          throw new AppError(
            409,
            `The ${parsed.semester_term} Semester for A.Y. ${parsed.school_year_start}-${parsed.school_year_start + 1} already exists.`,
          );
        }

        const [created] = await tx.insert(Semesters).values(parsed).returning();
        if (!created) {
          throw new AppError(500, "Failed to create semester record.");
        }

        const offeringService: IOfferingService = new OfferingService();
        const generateRes = await offeringService.generateOfferingsForSemester(created.id, tx);
        if (generateRes.isErr())
          logger.warn("Offering auto-generation warning:", generateRes.error.message);

        return created;
      });
    });
  }

  updateSemester(
    id: number,
    info: ISemesterUpdate,
    client: DbClient = db,
  ): ResultAsync<ISemesterSelect, AppError> {
    return ValidateSchema(SemesterUpdate, info).asyncAndThen((parsed) => {
      const hasUpdates = Boolean(parsed && Object.keys(parsed).length > 0);
      if (!hasUpdates) {
        return errAsync(new AppError(400, "No update parameters were provided."));
      }

      return WithTransaction(client, async (tx) => {
        const existing = await this.getSemesterById(id, tx);
        if (existing.isErr()) throw existing.error;
        const current = existing.value;

        const newStart = parsed.start_date || current.start_date;
        const newEnd = parsed.end_date || current.end_date;
        if (new Date(newStart) >= new Date(newEnd)) {
          throw new AppError(400, "Start date must be chronologically before the end date.");
        }

        const [updated] = await tx
          .update(Semesters)
          .set(parsed)
          .where(and(eq(Semesters.id, id), isNull(Semesters.deleted_at)))
          .returning();

        if (!updated) {
          throw new AppError(500, "Failed to update semester record.");
        }

        return updated;
      });
    });
  }

  deleteSemester(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getSemesterById(id, tx);
      if (existing.isErr()) throw existing.error;

      await this.checkSemesterDependencies(id, tx);

      const [deleted] = await tx
        .update(Semesters)
        .set({ deleted_at: new Date() })
        .where(and(eq(Semesters.id, id), isNull(Semesters.deleted_at)))
        .returning({ id: Semesters.id });

      if (!deleted) {
        throw new AppError(404, "Semester record was not found or has already been archived.");
      }

      return undefined;
    });
  }

  restoreSemester(id: number, client: DbClient = db): ResultAsync<ISemesterSelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getSemesterById(id, tx, true);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      if (!current.deleted_at) {
        throw new AppError(400, "This semester is already active and not archived.");
      }

      const [conflict] = await tx
        .select({ id: Semesters.id })
        .from(Semesters)
        .where(
          and(
            ne(Semesters.id, id),
            eq(Semesters.semester_term, current.semester_term),
            eq(Semesters.school_year_start, current.school_year_start),
            isNull(Semesters.deleted_at),
          ),
        );

      if (conflict) {
        throw new AppError(
          409,
          `Cannot restore: An active ${current.semester_term} Semester for A.Y. ${current.school_year_start}-${current.school_year_end} already exists.`,
        );
      }

      const [restored] = await tx
        .update(Semesters)
        .set({ deleted_at: null })
        .where(eq(Semesters.id, id))
        .returning();

      if (!restored) {
        throw new AppError(500, "Failed to restore semester.");
      }

      return restored;
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

  forceStopSemester(id: number, client: DbClient = db): ResultAsync<ISemesterSelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getSemesterById(id, tx);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterday = yesterdayDate.toISOString().slice(0, 10);

      const finalEndDate =
        new Date(current.start_date) > new Date(yesterday) ? current.start_date : yesterday;

      const [updated] = await tx
        .update(Semesters)
        .set({
          end_date: finalEndDate,
          updated_at: new Date(),
        })
        .where(and(eq(Semesters.id, id), isNull(Semesters.deleted_at)))
        .returning();

      if (!updated) {
        throw new AppError(500, "Failed to force stop semester.");
      }

      return updated;
    });
  }

  private async checkSemesterDependencies(semesterId: number, tx: PgTransaction): Promise<void> {
    const [activeOfferings, activeStudents] = await Promise.all([
      tx
        .select({ total: count(CourseOfferings.id) })
        .from(CourseOfferings)
        .where(
          and(eq(CourseOfferings.semester_id, semesterId), isNull(CourseOfferings.deleted_at)),
        ),
      tx
        .select({ total: count(ClassStudents.id) })
        .from(ClassStudents)
        .where(and(eq(ClassStudents.semester_id, semesterId), isNull(ClassStudents.deleted_at))),
    ]);

    const offeringCount = activeOfferings[0]?.total ?? 0;
    const studentCount = activeStudents[0]?.total ?? 0;

    if (offeringCount > 0 || studentCount > 0) {
      const reasons: string[] = [];
      if (offeringCount > 0) reasons.push(`${offeringCount} scheduled course offering(s)`);
      if (studentCount > 0) reasons.push(`${studentCount} student enrollment(s)`);

      throw new AppError(
        409,
        `Cannot archive semester because it has active dependencies: ${reasons.join(", ")}. Please reassign or archive them first.`,
      );
    }
  }
}
