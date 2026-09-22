import type { PgTransaction } from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { Semesters } from "@my-app/shared";
import { and, eq, isNull } from "drizzle-orm";

export interface ISemesterService {
  validateSemesterOpen(semesterId: number, tx: PgTransaction): Promise<void>;
}

export class SemesterService implements ISemesterService {
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
}
