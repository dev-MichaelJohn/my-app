import db, { type PgTransaction } from "@/configs/db.config.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { AppError } from "@/libs/error.lib.js";
import {
  Accounts,
  Classes,
  Colleges,
  CourseCurriculums,
  CourseOfferings,
  Courses,
  IndividualFacultyReports,
  PersonalDetails,
  Programs,
  Semesters,
  StudentClasses,
  StudentEvaluations,
  SupervisorEvaluations,
  getConsolidationFormulaById,
  type AnnexCFacultyReport,
  type AnonymousFeedbackComment,
  type ClassConsolidationInput,
} from "@my-app/shared";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { ResultAsync } from "neverthrow";

export class EvaluationReportService {
  /**
   * Generates or recalculates the Annex C Individual Faculty Evaluation Report
   */
  generateFacultyReport(
    facultyAccountId: number,
    semesterId: number,
    formulaId = "ANNEX_C_WEIGHTED",
    client: DbClient = db,
  ): ResultAsync<AnnexCFacultyReport, AppError> {
    return WithTransaction(client, async (tx) => {
      // 1. Fetch Faculty Profile and Assigned Department / College
      const [faculty] = await tx
        .select({
          id: Accounts.id,
          firstName: PersonalDetails.first_name,
          lastName: PersonalDetails.last_name,
          suffix: PersonalDetails.suffix,
        })
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(and(eq(Accounts.id, facultyAccountId), isNull(Accounts.deleted_at)));

      if (!faculty) throw new AppError(404, "Faculty member not found.");

      const [semester] = await tx
        .select()
        .from(Semesters)
        .where(and(eq(Semesters.id, semesterId), isNull(Semesters.deleted_at)));

      if (!semester) throw new AppError(404, "Academic semester not found.");

      // 2. Fetch all offerings taught by this faculty member in this semester
      const offerings = await tx
        .select({
          offeringId: CourseOfferings.id,
          courseCode: Courses.initialism,
          courseName: Courses.name,
          yearLevel: Classes.year_level,
          section: Classes.section,
          programCode: Programs.initialism,
          collegeName: Colleges.name,
        })
        .from(CourseOfferings)
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .innerJoin(Colleges, eq(Programs.college_id, Colleges.id))
        .where(
          and(
            eq(CourseOfferings.faculty_id, facultyAccountId),
            eq(CourseOfferings.semester_id, semesterId),
            isNull(CourseOfferings.deleted_at),
          ),
        );

      if (offerings.length === 0) {
        throw new AppError(
          404,
          "No course offerings found for this faculty in the selected semester.",
        );
      }

      const departmentName = offerings[0]?.collegeName || "Academic Department";

      // ══════════════════════════════════════════════════════════════════
      // 3. ANNEX C SECTION B: Compute Summary of Average SET per Class
      // ══════════════════════════════════════════════════════════════════
      const classBreakdown: ClassConsolidationInput[] = [];
      let totalStudentsEvaluated = 0;
      let totalWeightedScore = 0;
      const allStudentClassIds: number[] = [];

      for (let i = 0; i < offerings.length; i++) {
        const off = offerings[i]!;

        const enrollments = await tx
          .select({ studentClassId: StudentClasses.id })
          .from(StudentClasses)
          .where(
            and(
              eq(StudentClasses.course_offering_id, off.offeringId),
              isNull(StudentClasses.deleted_at),
            ),
          );

        const scIds = enrollments.map((e) => e.studentClassId);
        allStudentClassIds.push(...scIds);

        if (scIds.length === 0) {
          classBreakdown.push({
            seq: i + 1,
            offeringId: off.offeringId,
            courseCode: off.courseCode,
            courseName: off.courseName,
            yearSection: `${off.programCode} ${off.yearLevel}-${off.section}`,
            noOfStudents: 0,
            averageSetRating: 0,
            weightedScore: 0,
          });
          continue;
        }

        const evals = await tx
          .select({ rating: StudentEvaluations.set_rating })
          .from(StudentEvaluations)
          .where(
            and(
              inArray(StudentEvaluations.student_class_id, scIds),
              isNotNull(StudentEvaluations.submitted_at),
            ),
          );

        const noOfStudents = evals.length;
        let averageSetRating = 0;
        let weightedScore = 0;

        if (noOfStudents > 0) {
          const sumRatings = evals.reduce((sum, e) => sum + Number(e.rating || 0), 0);
          averageSetRating = Number((sumRatings / noOfStudents).toFixed(2));
          weightedScore = Number((noOfStudents * averageSetRating).toFixed(2));
        }

        totalStudentsEvaluated += noOfStudents;
        totalWeightedScore += weightedScore;

        classBreakdown.push({
          seq: i + 1,
          offeringId: off.offeringId,
          courseCode: off.courseCode,
          courseName: off.courseName,
          yearSection: `${off.programCode} ${off.yearLevel}-${off.section}`,
          noOfStudents,
          averageSetRating,
          weightedScore,
        });
      }

      // ══════════════════════════════════════════════════════════════════
      // 4. ANNEX C SECTION C: Compute Overall SET using Plug-and-Play Formula
      // ══════════════════════════════════════════════════════════════════
      const formula = getConsolidationFormulaById(formulaId);
      const overallSetRating = formula.calculate({
        classes: classBreakdown,
        totalStudents: totalStudentsEvaluated,
        totalWeightedScore,
      });

      // ══════════════════════════════════════════════════════════════════
      // 5. SEF RATING: Compute Overall Supervisor Rating (Separately)
      // ══════════════════════════════════════════════════════════════════
      const offeringIds = offerings.map((o) => o.offeringId);
      const sefEvals = await tx
        .select({ rating: SupervisorEvaluations.set_rating })
        .from(SupervisorEvaluations)
        .where(
          and(
            inArray(SupervisorEvaluations.course_offering_id, offeringIds),
            isNotNull(SupervisorEvaluations.submitted_at),
          ),
        );

      let overallSefRating: number | null = null;
      if (sefEvals.length > 0) {
        const sumSef = sefEvals.reduce((sum, s) => sum + Number(s.rating || 0), 0);
        overallSefRating = Number((sumSef / sefEvals.length).toFixed(2));
      }

      // ══════════════════════════════════════════════════════════════════
      // 6. TOP 5 ANONYMOUS COMMENTS (2 Positive, 2 Negative, 1 Neutral)
      // ══════════════════════════════════════════════════════════════════
      const topComments = await this.extractTop5Comments(allStudentClassIds, tx);

      // ══════════════════════════════════════════════════════════════════
      // 7. UPSERT INTO DATABASE (Persist calculation)
      // ══════════════════════════════════════════════════════════════════
      const [savedRecord] = await tx
        .insert(IndividualFacultyReports)
        .values({
          faculty_id: facultyAccountId,
          semester_id: semesterId,
          overall_set_rating: String(overallSetRating),
          overall_sef_rating: overallSefRating !== null ? String(overallSefRating) : null,
          total_students_evaluated: totalStudentsEvaluated,
          total_classes: offerings.length,
          total_weighted_score: String(totalWeightedScore),
          calculation_formula: formulaId,
          class_breakdown: classBreakdown,
          top_comments: topComments,
          status: "DRAFT",
        })
        .onConflictDoUpdate({
          target: [IndividualFacultyReports.faculty_id, IndividualFacultyReports.semester_id],
          set: {
            overall_set_rating: String(overallSetRating),
            overall_sef_rating: overallSefRating !== null ? String(overallSefRating) : null,
            total_students_evaluated: totalStudentsEvaluated,
            total_classes: offerings.length,
            total_weighted_score: String(totalWeightedScore),
            calculation_formula: formulaId,
            class_breakdown: classBreakdown,
            top_comments: topComments,
            updated_at: new Date(),
          },
        })
        .returning();

      return {
        id: savedRecord!.id,
        faculty_id: facultyAccountId,
        semester_id: semesterId,
        faculty_name: `${faculty.firstName} ${faculty.lastName} ${faculty.suffix ?? ""}`
          .trim()
          .toUpperCase(),
        faculty_rank: "Faculty Member",
        department_college: departmentName.toUpperCase(),
        semester_term: `${semester.semester_term} Semester`,
        school_year: `${semester.school_year_start}-${semester.school_year_end}`,
        overall_set_rating: Number(savedRecord!.overall_set_rating),
        overall_sef_rating: savedRecord!.overall_sef_rating
          ? Number(savedRecord!.overall_sef_rating)
          : null,
        total_students_evaluated: savedRecord!.total_students_evaluated,
        total_classes: savedRecord!.total_classes,
        total_weighted_score: Number(savedRecord!.total_weighted_score),
        calculation_formula: savedRecord!.calculation_formula,
        class_breakdown: savedRecord!.class_breakdown as ClassConsolidationInput[],
        top_comments: savedRecord!.top_comments as AnonymousFeedbackComment[],
        status: savedRecord!.status,
        created_at: savedRecord!.created_at.toISOString(),
        updated_at: savedRecord!.updated_at.toISOString(),
      };
    });
  }

  /**
   * Fetches an existing saved report
   */
  getFacultyReport(
    facultyAccountId: number,
    semesterId: number,
    client: DbClient = db,
  ): ResultAsync<AnnexCFacultyReport, AppError> {
    return WithTransaction(client, async (tx) => {
      const [report] = await tx
        .select()
        .from(IndividualFacultyReports)
        .where(
          and(
            eq(IndividualFacultyReports.faculty_id, facultyAccountId),
            eq(IndividualFacultyReports.semester_id, semesterId),
          ),
        );

      if (!report) {
        // If not generated yet, generate it now
        const genResult = await this.generateFacultyReport(
          facultyAccountId,
          semesterId,
          undefined,
          tx,
        );
        if (genResult.isErr()) throw genResult.error;
        return genResult.value;
      }

      const [faculty] = await tx
        .select({
          firstName: PersonalDetails.first_name,
          lastName: PersonalDetails.last_name,
          suffix: PersonalDetails.suffix,
        })
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(eq(Accounts.id, facultyAccountId));

      const [semester] = await tx.select().from(Semesters).where(eq(Semesters.id, semesterId));

      return {
        id: report.id,
        faculty_id: report.faculty_id,
        semester_id: report.semester_id,
        faculty_name: faculty
          ? `${faculty.firstName} ${faculty.lastName} ${faculty.suffix ?? ""}`.trim().toUpperCase()
          : "FACULTY",
        faculty_rank: "Faculty Member",
        department_college: "COLLEGE DEPARTMENT",
        semester_term: semester ? `${semester.semester_term} Semester` : "Term",
        school_year: semester ? `${semester.school_year_start}-${semester.school_year_end}` : "",
        overall_set_rating: Number(report.overall_set_rating),
        overall_sef_rating: report.overall_sef_rating ? Number(report.overall_sef_rating) : null,
        total_students_evaluated: report.total_students_evaluated,
        total_classes: report.total_classes,
        total_weighted_score: Number(report.total_weighted_score),
        calculation_formula: report.calculation_formula,
        class_breakdown: report.class_breakdown as ClassConsolidationInput[],
        top_comments: report.top_comments as AnonymousFeedbackComment[],
        status: report.status,
        created_at: report.created_at.toISOString(),
        updated_at: report.updated_at.toISOString(),
      };
    });
  }

  /**
   * Top 5 anonymous comment extractor (2 positive, 2 negative, 1 neutral)
   */
  private async extractTop5Comments(
    studentClassIds: number[],
    tx: PgTransaction,
  ): Promise<AnonymousFeedbackComment[]> {
    if (studentClassIds.length === 0) return [];

    const comments = await tx
      .select({
        comment: StudentEvaluations.comment,
        score: StudentEvaluations.comment_score,
        sentiment: StudentEvaluations.comment_sentiment,
      })
      .from(StudentEvaluations)
      .where(
        and(
          inArray(StudentEvaluations.student_class_id, studentClassIds),
          isNotNull(StudentEvaluations.submitted_at),
          isNotNull(StudentEvaluations.comment),
          sql`TRIM(${StudentEvaluations.comment}) != ''`,
        ),
      );

    const positive: AnonymousFeedbackComment[] = comments
      .filter((c) => c.sentiment === "POSITIVE" && c.comment !== null)
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
      .slice(0, 2)
      .map((c) => ({ comment: c.comment!, sentiment: "POSITIVE", score: Number(c.score ?? 0) }));

    const negative: AnonymousFeedbackComment[] = comments
      .filter((c) => c.sentiment === "NEGATIVE" && c.comment !== null)
      .sort((a, b) => Number(a.score ?? 0) - Number(b.score ?? 0))
      .slice(0, 2)
      .map((c) => ({ comment: c.comment!, sentiment: "NEGATIVE", score: Number(c.score ?? 0) }));

    const neutral: AnonymousFeedbackComment[] = comments
      .filter((c) => c.sentiment === "NEUTRAL" && c.comment !== null)
      .slice(0, 1)
      .map((c) => ({ comment: c.comment!, sentiment: "NEUTRAL", score: Number(c.score ?? 0) }));

    return [...positive, ...negative, ...neutral];
  }
}
