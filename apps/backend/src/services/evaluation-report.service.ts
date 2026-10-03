import {
  Accounts,
  Classes,
  Colleges,
  CourseCurriculums,
  CourseOfferings,
  Courses,
  IndividualFacultyReports,
  PersonalDetails,
  ProgramChairs,
  Programs,
  Semesters,
  StudentClasses,
  StudentEvaluationCategories,
  StudentEvaluationForms,
  StudentEvaluationQuestions,
  StudentEvaluationRatings,
  StudentEvaluations,
  StudentEvaluationSchedules,
  SupervisorEvaluationCategories,
  SupervisorEvaluationMeans,
  SupervisorEvaluationQuestions,
  SupervisorEvaluationRatings,
  SupervisorEvaluations,
  SupervisorEvaluationSchedules,
  type AnnexCFacultyReport,
  type AnonymousFeedbackComment,
  type BatchConsolidationSummary,
  type CategoryAnalytics,
  type ClassConsolidationInput,
  type EvaluationAnalyticsSummary,
  type FedafPlan,
  type GetUser,
  type IndicatorAnalytics,
  type InstitutionalFERReport,
  type PaginatedData,
  type ReportStatus,
  type SupervisorFeedbackComment,
  type UpdateFedafPlan,
} from "@my-app/shared";
import db, { type PgTransaction } from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import { getConsolidationFormulaById } from "@my-app/shared";
import {
  FacultyReportQuerySchema,
  BatchConsolidationSchema,
  UpdateFedafPlanSchema,
  UpdateReportStatusSchema,
} from "@my-app/shared";
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
  type SQL,
  sql,
} from "drizzle-orm";
import { type ResultAsync } from "neverthrow";

export interface IEvaluationReportService {
  getAnnexCReport(
    semesterId: number,
    facultyId: number,
    actorUser: GetUser,
    client?: DbClient,
  ): ResultAsync<AnnexCFacultyReport, AppError>;
  recalculateFacultyReport(
    semesterId: number,
    facultyId: number,
    formulaId?: string,
    client?: DbClient,
  ): ResultAsync<AnnexCFacultyReport, AppError>;
  batchConsolidateSemester(
    semesterId: number,
    formulaId?: string,
    client?: DbClient,
  ): ResultAsync<BatchConsolidationSummary, AppError>;
  updateReportStatus(
    reportId: number,
    status: ReportStatus,
    actorUser: GetUser,
    client?: DbClient,
  ): ResultAsync<AnnexCFacultyReport, AppError>;
  updateFedafPlan(
    reportId: number,
    plan: UpdateFedafPlan,
    actorUser: GetUser,
    client?: DbClient,
  ): ResultAsync<AnnexCFacultyReport, AppError>;
  signFedaf(
    reportId: number,
    signatureRole: "FACULTY" | "SUPERVISOR",
    actorUser: GetUser,
    client?: DbClient,
  ): ResultAsync<AnnexCFacultyReport, AppError>;
  getReportsList(
    rawQuery: unknown,
    actorUser: GetUser,
    client?: DbClient,
  ): ResultAsync<PaginatedData<AnnexCFacultyReport[]>, AppError>;
  getInstitutionalFER(
    semesterId: number,
    actorUser: GetUser,
    client?: DbClient,
  ): ResultAsync<InstitutionalFERReport, AppError>;
}

export class EvaluationReportService implements IEvaluationReportService {
  getAnnexCReport(
    semesterId: number,
    facultyId: number,
    actorUser: GetUser,
    client: DbClient = db,
  ): ResultAsync<AnnexCFacultyReport, AppError> {
    return WithTransaction(client, async (tx) => {
      this.enforceReportReadAccess(facultyId, semesterId, actorUser, tx);

      const actorRoles = actorUser.roles ?? [];
      const isPlainFaculty =
        actorRoles.includes("FACULTY") &&
        !actorRoles.includes("SUPERVISOR") &&
        !actorRoles.includes("ADMIN") &&
        !actorRoles.includes("SYS_ADMIN");

      const [existing] = await tx
        .select()
        .from(IndividualFacultyReports)
        .where(
          and(
            eq(IndividualFacultyReports.semester_id, semesterId),
            eq(IndividualFacultyReports.faculty_id, facultyId),
          ),
        );

      if (existing) {
        // Plain faculty can only see their report once it is PUBLISHED
        if (isPlainFaculty && existing.status !== "PUBLISHED") {
          throw new AppError(
            403,
            "Your evaluation report for this semester is currently under supervisory review and has not yet been published.",
          );
        }

        return this.hydrateReport(existing, tx);
      }

      // Plain faculty cannot trigger auto-computation of draft reports
      if (isPlainFaculty) {
        throw new AppError(
          404,
          "No published evaluation report is currently available for this semester.",
        );
      }

      return this.computeAndUpsertReport(semesterId, facultyId, "ANNEX_C_WEIGHTED", tx);
    });
  }

  recalculateFacultyReport(
    semesterId: number,
    facultyId: number,
    formulaId = "ANNEX_C_WEIGHTED",
    client: DbClient = db,
  ): ResultAsync<AnnexCFacultyReport, AppError> {
    return WithTransaction(client, async (tx) => {
      await this.validateEvaluationWindowsConcluded(semesterId, tx);

      return this.computeAndUpsertReport(semesterId, facultyId, formulaId, tx);
    });
  }

  batchConsolidateSemester(
    semesterId: number,
    formulaId = "ANNEX_C_WEIGHTED",
    client: DbClient = db,
  ): ResultAsync<BatchConsolidationSummary, AppError> {
    return ValidateSchema(BatchConsolidationSchema, {
      semester_id: semesterId,
      formula: formulaId,
    }).asyncAndThen(({ semester_id, formula }) => {
      return WithTransaction(client, async (tx) => {
        const [semester] = await tx
          .select()
          .from(Semesters)
          .where(and(eq(Semesters.id, semester_id), isNull(Semesters.deleted_at)));

        if (!semester) {
          throw new AppError(404, "Academic semester was not found.");
        }

        await this.validateEvaluationWindowsConcluded(semester_id, tx);

        const facultyRows = await tx
          .selectDistinct({ facultyId: CourseOfferings.faculty_id })
          .from(CourseOfferings)
          .where(
            and(
              eq(CourseOfferings.semester_id, semester_id),
              isNotNull(CourseOfferings.faculty_id),
              isNull(CourseOfferings.deleted_at),
            ),
          );

        const facultyIds = facultyRows
          .map((r) => r.facultyId)
          .filter((id): id is number => typeof id === "number");

        let reportsGenerated = 0;
        for (const fid of facultyIds) {
          await this.computeAndUpsertReport(semester_id, fid, formula, tx);
          reportsGenerated++;
        }

        return {
          semester_id,
          semester_term: semester.semester_term,
          school_year: `${semester.school_year_start}-${semester.school_year_end}`,
          total_faculty_processed: facultyIds.length,
          reports_generated: reportsGenerated,
          calculation_formula: formula,
          processed_at: new Date().toISOString(),
          message: `Successfully processed and consolidated ${reportsGenerated} faculty report(s) for the ${semester.semester_term} Semester (A.Y. ${semester.school_year_start}-${semester.school_year_end}).`,
        };
      });
    });
  }

  updateReportStatus(
    reportId: number,
    status: ReportStatus,
    actorUser: GetUser,
    client: DbClient = db,
  ): ResultAsync<AnnexCFacultyReport, AppError> {
    return ValidateSchema(UpdateReportStatusSchema, { status }).asyncAndThen(() => {
      return WithTransaction(client, async (tx) => {
        const [report] = await tx
          .select()
          .from(IndividualFacultyReports)
          .where(eq(IndividualFacultyReports.id, reportId));

        if (!report) {
          throw new AppError(404, "Evaluation report not found.");
        }

        // 🔒 Self-Supervision Rule: Cannot change lifecycle on own report
        if (report.faculty_id === actorUser.account.id) {
          throw new AppError(
            403,
            "You cannot finalize or publish your own teaching evaluation report. This must be performed by your academic supervisor.",
          );
        }

        const actorRoles = actorUser.roles ?? [];
        const isPrivileged =
          actorRoles.includes("SYS_ADMIN") ||
          actorRoles.includes("ADMIN") ||
          actorRoles.includes("SUPERVISOR");

        if (!isPrivileged) {
          throw new AppError(
            403,
            "You do not have permission to change evaluation report statuses.",
          );
        }

        const [updated] = await tx
          .update(IndividualFacultyReports)
          .set({ status, updated_at: new Date() })
          .where(eq(IndividualFacultyReports.id, reportId))
          .returning();

        return this.hydrateReport(updated!, tx);
      });
    });
  }

  updateFedafPlan(
    reportId: number,
    plan: UpdateFedafPlan,
    actorUser: GetUser,
    client: DbClient = db,
  ): ResultAsync<AnnexCFacultyReport, AppError> {
    return ValidateSchema(UpdateFedafPlanSchema, plan).asyncAndThen((validated) => {
      return WithTransaction(client, async (tx) => {
        const [report] = await tx
          .select()
          .from(IndividualFacultyReports)
          .where(eq(IndividualFacultyReports.id, reportId));

        if (!report) throw new AppError(404, "Evaluation report not found.");

        // 🔒 Self-Supervision Rule: A Dean or Chair cannot write their own supervisory plan
        if (report.faculty_id === actorUser.account.id) {
          throw new AppError(
            403,
            "You cannot author the supervisory development plan for your own evaluation report. Your academic supervisor must formulate this plan.",
          );
        }

        const actorRoles = actorUser.roles ?? [];
        const isSupervisorOrAdmin =
          actorRoles.includes("SUPERVISOR") ||
          actorRoles.includes("ADMIN") ||
          actorRoles.includes("SYS_ADMIN");

        if (!isSupervisorOrAdmin) {
          throw new AppError(
            403,
            "Only supervisors and academic leaders can update the supervisory development plan.",
          );
        }

        const existingPlan = (report.fedaf_plan as FedafPlan) || {
          areas_for_improvement: "",
          proposed_activities: "",
          action_plan: "",
          supervisor_name: "",
          supervisor_signed_at: null,
          faculty_signed_at: null,
        };

        const updatedPlan: FedafPlan = {
          ...existingPlan,
          areas_for_improvement: validated.areas_for_improvement,
          proposed_activities: validated.proposed_activities,
          action_plan: validated.action_plan,
        };

        const [updated] = await tx
          .update(IndividualFacultyReports)
          .set({ fedaf_plan: updatedPlan, updated_at: new Date() })
          .where(eq(IndividualFacultyReports.id, reportId))
          .returning();

        return this.hydrateReport(updated!, tx);
      });
    });
  }

  signFedaf(
    reportId: number,
    signatureRole: "FACULTY" | "SUPERVISOR",
    actorUser: GetUser,
    client: DbClient = db,
  ): ResultAsync<AnnexCFacultyReport, AppError> {
    return WithTransaction(client, async (tx) => {
      const [report] = await tx
        .select()
        .from(IndividualFacultyReports)
        .where(eq(IndividualFacultyReports.id, reportId));

      if (!report) throw new AppError(404, "Evaluation report not found.");

      const isOwnReport = report.faculty_id === actorUser.account.id;

      // 🔒 Self-Supervision Rule: Cannot sign as supervisor on own report
      if (isOwnReport && signatureRole === "SUPERVISOR") {
        throw new AppError(
          403,
          "You cannot sign as supervisor on your own evaluation report. Your supervising Program Chair or Dean must sign.",
        );
      }

      const existingPlan = (report.fedaf_plan as FedafPlan) || {
        areas_for_improvement: "",
        proposed_activities: "",
        action_plan: "",
        supervisor_name: "",
        supervisor_signed_at: null,
        faculty_signed_at: null,
      };

      const now = new Date().toISOString();
      let nextStatus = report.status;

      if (signatureRole === "SUPERVISOR") {
        const actorRoles = actorUser.roles ?? [];
        const isSysAdmin = actorRoles.includes("SYS_ADMIN");
        const isAdmin = actorRoles.includes("ADMIN");
        const isSupervisor = actorRoles.includes("SUPERVISOR");

        if (!isSupervisor && !isAdmin && !isSysAdmin) {
          throw new AppError(403, "Only supervisors and academic leaders can sign as supervisor.");
        }

        const deanships = actorUser.offices?.deanships || [];
        const chairships = actorUser.offices?.chairships || [];
        const deanCollegeIds = deanships.map((d) => d.id);
        const chairProgramIds = chairships.map((c) => c.id);

        // Check if the evaluated person is a Program Chair
        const [targetChair] = await tx
          .select({ id: ProgramChairs.id, collegeId: Programs.college_id })
          .from(ProgramChairs)
          .innerJoin(Programs, eq(ProgramChairs.program_id, Programs.id))
          .where(
            and(eq(ProgramChairs.chair_id, report.faculty_id), isNull(ProgramChairs.deleted_at)),
          );

        if (targetChair) {
          // Target IS a Program Chair -> ONLY their College Dean can sign
          const isTheirDean =
            isSysAdmin || isAdmin || deanCollegeIds.includes(targetChair.collegeId);
          if (!isTheirDean) {
            throw new AppError(
              403,
              "Only the College Dean can sign the FEDAF for this Program Chair.",
            );
          }
          existingPlan.supervisor_name = `${actorUser.details.first_name} ${actorUser.details.last_name} (College Dean)`;
        } else {
          // Target is regular faculty -> Program Chair MUST sign (Dean cannot sign regular faculty FEDAF)
          const isTheirChair =
            isSysAdmin ||
            isAdmin ||
            (chairProgramIds.length > 0 &&
              (await (async () => {
                const [match] = await tx
                  .select({ id: CourseOfferings.id })
                  .from(CourseOfferings)
                  .innerJoin(
                    CourseCurriculums,
                    eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
                  )
                  .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
                  .where(
                    and(
                      eq(CourseOfferings.faculty_id, report.faculty_id),
                      eq(CourseOfferings.semester_id, report.semester_id),
                      inArray(Courses.program_id, chairProgramIds),
                      isNull(CourseOfferings.deleted_at),
                    ),
                  )
                  .limit(1);
                return Boolean(match);
              })()));

          if (!isTheirChair) {
            throw new AppError(
              403,
              "College Deans cannot sign the FEDAF of regular faculty. The Program Chair must conduct the feedback conference and sign.",
            );
          }
          existingPlan.supervisor_name = `${actorUser.details.first_name} ${actorUser.details.last_name} (Program Chair)`;
        }

        existingPlan.supervisor_signed_at = now;
        nextStatus = "PUBLISHED";
      } else {
        if (!isOwnReport) {
          throw new AppError(
            403,
            "You can only sign the faculty acknowledgment on your own evaluation report.",
          );
        }
        if (!existingPlan.supervisor_signed_at && report.status !== "PUBLISHED") {
          throw new AppError(
            400,
            "The supervisor must first establish and sign the development plan before you can acknowledge.",
          );
        }
        existingPlan.faculty_signed_at = now;
      }

      const [updated] = await tx
        .update(IndividualFacultyReports)
        .set({
          fedaf_plan: existingPlan,
          status: nextStatus,
          updated_at: new Date(),
        })
        .where(eq(IndividualFacultyReports.id, reportId))
        .returning();

      return this.hydrateReport(updated!, tx);
    });
  }

  getReportsList(
    rawQuery: unknown,
    actorUser: GetUser,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<AnnexCFacultyReport[]>, AppError> {
    return ValidateSchema(FacultyReportQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const {
        paginate,
        page,
        limit,
        search,
        semester_id,
        faculty_id,
        college_id,
        program_id,
        status,
      } = parsed;

      const actorRoles = actorUser.roles ?? [];
      const isSysAdmin = actorRoles.includes("SYS_ADMIN");
      const isAdmin = actorRoles.includes("ADMIN");
      const isSupervisor = actorRoles.includes("SUPERVISOR");

      const deanships = actorUser.offices?.deanships || [];
      const chairships = actorUser.offices?.chairships || [];
      const deanCollegeIds = deanships.map((d) => d.id);
      const chairProgramIds = chairships.map((c) => c.id);

      return WithTransaction(client, async (tx) => {
        // 🧹 Clean up any orphaned 0-class reports
        await tx
          .delete(IndividualFacultyReports)
          .where(eq(IndividualFacultyReports.total_classes, 0));

        const filters: SQL[] = [
          // 🔒 Only show faculty with actual teaching assignments (> 0 classes)
          sql`${IndividualFacultyReports.total_classes} > 0`,
        ];

        // ── 1. Strict Hierarchy Scoping per CHED CMO 19 s. 2025 Sec 9.2 ──
        if (isSysAdmin || isAdmin) {
          // Administrators see all reports
          if (faculty_id) filters.push(eq(IndividualFacultyReports.faculty_id, faculty_id));
        } else if (isSupervisor) {
          const supervisorScopeFilters: SQL[] = [];

          // ── A. COLLEGE DEAN: Supervises ONLY Program Chairs under their college ──
          if (deanCollegeIds.length > 0) {
            const chairRecords = await tx
              .select({ chairId: ProgramChairs.chair_id })
              .from(ProgramChairs)
              .innerJoin(Programs, eq(ProgramChairs.program_id, Programs.id))
              .where(
                and(
                  inArray(Programs.college_id, deanCollegeIds),
                  isNull(ProgramChairs.deleted_at),
                  isNull(Programs.deleted_at),
                ),
              );

            const chairsUnderDean = chairRecords
              .map((c) => c.chairId)
              .filter((id): id is number => typeof id === "number");

            if (chairsUnderDean.length > 0) {
              supervisorScopeFilters.push(
                inArray(IndividualFacultyReports.faculty_id, chairsUnderDean),
              );
            }
          }

          // ── B. PROGRAM CHAIR: Supervises regular faculty teaching in their program (their underlings) ──
          if (chairProgramIds.length > 0) {
            // Find all chairs to exclude other department heads
            const allChairs = await tx
              .select({ chairId: ProgramChairs.chair_id })
              .from(ProgramChairs)
              .where(isNull(ProgramChairs.deleted_at));
            const allChairIds = allChairs.map((c) => c.chairId);

            supervisorScopeFilters.push(
              and(
                sql`EXISTS (
                  SELECT 1 FROM ${CourseOfferings}
                  INNER JOIN ${CourseCurriculums} ON ${CourseOfferings.course_curriculum_id} = ${CourseCurriculums.id}
                  INNER JOIN ${Courses} ON ${CourseCurriculums.course_id} = ${Courses.id}
                  WHERE ${CourseOfferings.faculty_id} = ${IndividualFacultyReports.faculty_id}
                    AND ${CourseOfferings.semester_id} = ${IndividualFacultyReports.semester_id}
                    AND ${Courses.program_id} IN ${chairProgramIds}
                    AND ${CourseOfferings.deleted_at} IS NULL
                )`,
                // Program Chair evaluates regular faculty, not fellow Chairs
                allChairIds.length > 0
                  ? sql`${IndividualFacultyReports.faculty_id} NOT IN ${allChairIds}`
                  : undefined,
              )!,
            );
          }

          if (supervisorScopeFilters.length > 0) {
            filters.push(or(...supervisorScopeFilters)!);
          } else {
            // If Dean has no Program Chairs appointed yet, show 0 reports
            return createPaginatedData({
              data: [],
              currentPage: 1,
              pageSize: limit,
              totalItems: 0,
            });
          }

          // 🔒 A supervisor NEVER supervises/evaluates themselves in their supervisory list
          filters.push(ne(IndividualFacultyReports.faculty_id, actorUser.account.id));

          if (faculty_id) {
            filters.push(eq(IndividualFacultyReports.faculty_id, faculty_id));
          }
        } else {
          // Pure Faculty: Only own reports that are published
          filters.push(eq(IndividualFacultyReports.faculty_id, actorUser.account.id));
          filters.push(eq(IndividualFacultyReports.status, "PUBLISHED"));
        }

        // ── 2. Standard Filters ──
        if (semester_id) filters.push(eq(IndividualFacultyReports.semester_id, semester_id));
        if (status) filters.push(eq(IndividualFacultyReports.status, status));

        if (search) {
          const term = `%${search}%`;
          filters.push(
            or(
              ilike(PersonalDetails.first_name, term),
              ilike(PersonalDetails.last_name, term),
              ilike(PersonalDetails.institutional_id, term),
              ilike(Accounts.email, term),
            )!,
          );
        }

        if (program_id) {
          filters.push(
            sql`EXISTS (
              SELECT 1 FROM ${CourseOfferings}
              INNER JOIN ${CourseCurriculums} ON ${CourseOfferings.course_curriculum_id} = ${CourseCurriculums.id}
              INNER JOIN ${Courses} ON ${CourseCurriculums.course_id} = ${Courses.id}
              WHERE ${CourseOfferings.faculty_id} = ${IndividualFacultyReports.faculty_id}
                AND ${CourseOfferings.semester_id} = ${IndividualFacultyReports.semester_id}
                AND ${Courses.program_id} = ${program_id}
                AND ${CourseOfferings.deleted_at} IS NULL
            )`,
          );
        } else if (college_id) {
          filters.push(
            sql`EXISTS (
              SELECT 1 FROM ${CourseOfferings}
              INNER JOIN ${CourseCurriculums} ON ${CourseOfferings.course_curriculum_id} = ${CourseCurriculums.id}
              INNER JOIN ${Courses} ON ${CourseCurriculums.course_id} = ${Courses.id}
              INNER JOIN ${Programs} ON ${Courses.program_id} = ${Programs.id}
              WHERE ${CourseOfferings.faculty_id} = ${IndividualFacultyReports.faculty_id}
                AND ${CourseOfferings.semester_id} = ${IndividualFacultyReports.semester_id}
                AND ${Programs.college_id} = ${college_id}
                AND ${CourseOfferings.deleted_at} IS NULL
            )`,
          );
        }

        const whereCondition = filters.length > 0 ? and(...filters) : undefined;

        const baseQuery = tx
          .select({
            report: IndividualFacultyReports,
          })
          .from(IndividualFacultyReports)
          .innerJoin(Accounts, eq(IndividualFacultyReports.faculty_id, Accounts.id))
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .where(whereCondition)
          .orderBy(desc(IndividualFacultyReports.created_at))
          .$dynamic();

        if (!paginate) {
          const rows = await baseQuery;
          const hydrated = await Promise.all(rows.map((r) => this.hydrateReport(r.report, tx)));
          return createPaginatedData({
            data: hydrated,
            currentPage: 1,
            pageSize: hydrated.length,
            totalItems: hydrated.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedQuery = baseQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(IndividualFacultyReports.id) })
          .from(IndividualFacultyReports)
          .innerJoin(Accounts, eq(IndividualFacultyReports.faculty_id, Accounts.id))
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .where(whereCondition);

        const [rows, countRes] = await Promise.all([paginatedQuery, countQuery]);
        const totalItems = countRes[0]?.total ?? 0;
        const hydrated = await Promise.all(rows.map((r) => this.hydrateReport(r.report, tx)));

        return createPaginatedData({
          data: hydrated,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  getInstitutionalFER(
    semesterId: number,
    actorUser: GetUser,
    client: DbClient = db,
  ): ResultAsync<InstitutionalFERReport, AppError> {
    return WithTransaction(client, async (tx) => {
      const actorRoles = actorUser.roles ?? [];
      const isPrivileged =
        actorRoles.includes("SYS_ADMIN") ||
        actorRoles.includes("ADMIN") ||
        actorRoles.includes("SUPERVISOR");

      if (!isPrivileged) {
        throw new AppError(403, "Access restricted to academic leaders and administrators.");
      }

      const [semester] = await tx.select().from(Semesters).where(eq(Semesters.id, semesterId));

      if (!semester) throw new AppError(404, "Semester not found.");

      const reports = await tx
        .select()
        .from(IndividualFacultyReports)
        .where(eq(IndividualFacultyReports.semester_id, semesterId));

      const totalFaculty = reports.length;
      let totalSet = 0;
      let totalSef = 0;
      let sefCount = 0;

      const distribution = {
        outstanding: 0,
        very_satisfactory: 0,
        satisfactory: 0,
        fair: 0,
        poor: 0,
      };

      for (const r of reports) {
        const setVal = Number(r.overall_set_rating);
        totalSet += setVal;

        if (r.overall_sef_rating !== null) {
          totalSef += Number(r.overall_sef_rating);
          sefCount++;
        }

        if (setVal >= 91) distribution.outstanding++;
        else if (setVal >= 81) distribution.very_satisfactory++;
        else if (setVal >= 71) distribution.satisfactory++;
        else if (setVal >= 61) distribution.fair++;
        else distribution.poor++;
      }

      const avgSet = totalFaculty > 0 ? Number((totalSet / totalFaculty).toFixed(2)) : 0;
      const avgSef = sefCount > 0 ? Number((totalSef / sefCount).toFixed(2)) : 0;

      const colleges = await tx.select().from(Colleges).where(isNull(Colleges.deleted_at));

      return {
        semester_id: semesterId,
        semester_term: semester.semester_term,
        school_year: `${semester.school_year_start}-${semester.school_year_end}`,
        total_faculty_evaluated: totalFaculty,
        average_institution_set: avgSet,
        average_institution_sef: avgSef,
        college_breakdown: colleges.map((c) => ({
          college_id: c.id,
          college_name: c.name,
          college_code: c.initialism,
          total_faculty: 0,
          average_set: 0,
          average_sef: 0,
        })),
        rating_distribution: distribution,
      };
    });
  }

  private async computeAndUpsertReport(
    semesterId: number,
    facultyId: number,
    formulaId: string,
    tx: PgTransaction,
  ): Promise<AnnexCFacultyReport> {
    const [semester] = await tx
      .select()
      .from(Semesters)
      .where(and(eq(Semesters.id, semesterId), isNull(Semesters.deleted_at)));
    if (!semester) throw new AppError(404, "Academic semester was not found.");

    const [faculty] = await tx
      .select({
        id: Accounts.id,
        email: Accounts.email,
        details: PersonalDetails,
      })
      .from(Accounts)
      .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
      .where(and(eq(Accounts.id, facultyId), isNull(Accounts.deleted_at)));

    if (!faculty) throw new AppError(404, "Faculty member was not found.");

    // Dynamic scale bounds from active templates
    const [setTemplate] = await tx
      .select({
        min_rating: StudentEvaluationForms.min_rating,
        max_rating: StudentEvaluationForms.max_rating,
      })
      .from(StudentEvaluationForms)
      .where(isNull(StudentEvaluationForms.deleted_at))
      .limit(1);

    const minRating = setTemplate?.min_rating ?? 1;
    const maxRating = setTemplate?.max_rating ?? 5;

    // Offerings anchored: CourseOffering -> CourseCurriculum -> Course -> Program -> College
    const offerings = await tx
      .select({
        offeringId: CourseOfferings.id,
        courseId: Courses.id,
        courseName: Courses.name,
        courseCode: Courses.initialism,
        yearLevel: Classes.year_level,
        section: Classes.section,
        programId: Programs.id,
        programName: Programs.name,
        programCode: Programs.initialism,
        collegeId: Colleges.id,
        collegeName: Colleges.name,
        collegeCode: Colleges.initialism,
      })
      .from(CourseOfferings)
      .innerJoin(CourseCurriculums, eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id))
      .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
      .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
      .innerJoin(Programs, eq(Courses.program_id, Programs.id))
      .innerJoin(Colleges, eq(Programs.college_id, Colleges.id))
      .where(
        and(
          eq(CourseOfferings.semester_id, semesterId),
          eq(CourseOfferings.faculty_id, facultyId),
          isNull(CourseOfferings.deleted_at),
        ),
      );

    // 🔒 Guard: Do not generate an evaluation report if the user has 0 assigned teaching classes
    if (offerings.length === 0) {
      await tx
        .delete(IndividualFacultyReports)
        .where(
          and(
            eq(IndividualFacultyReports.semester_id, semesterId),
            eq(IndividualFacultyReports.faculty_id, facultyId),
          ),
        );

      throw new AppError(
        400,
        "Cannot generate report: This user has no assigned teaching course offerings for this semester.",
      );
    }

    const classBreakdown: ClassConsolidationInput[] = [];
    let grandTotalStudents = 0;
    let grandTotalWeightedScore = 0;
    const allCollectedStudentComments: AnonymousFeedbackComment[] = [];
    const allStudentEvaluationIds: number[] = [];

    for (let i = 0; i < offerings.length; i++) {
      const off = offerings[i]!;

      const enrolled = await tx
        .select({ id: StudentClasses.id })
        .from(StudentClasses)
        .where(
          and(
            eq(StudentClasses.course_offering_id, off.offeringId),
            isNull(StudentClasses.deleted_at),
          ),
        );

      const enrolledIds = enrolled.map((e) => e.id);

      let classEvaluatedStudents = 0;
      let averageSetRating = 0;
      let weightedScore = 0;

      if (enrolledIds.length > 0) {
        const submissions = await tx
          .select({
            id: StudentEvaluations.id,
            setRating: StudentEvaluations.set_rating,
            comment: StudentEvaluations.comment,
            commentScore: StudentEvaluations.comment_score,
            commentSentiment: StudentEvaluations.comment_sentiment,
          })
          .from(StudentEvaluations)
          .where(
            and(
              inArray(StudentEvaluations.student_class_id, enrolledIds),
              isNotNull(StudentEvaluations.submitted_at),
            ),
          );

        classEvaluatedStudents = submissions.length;

        if (classEvaluatedStudents > 0) {
          submissions.forEach((s) => allStudentEvaluationIds.push(s.id));

          const ratingSum = submissions.reduce(
            (acc, curr) => acc + (curr.setRating ? Number(curr.setRating) : 0),
            0,
          );
          averageSetRating = Number((ratingSum / classEvaluatedStudents).toFixed(2));
          weightedScore = Number((classEvaluatedStudents * averageSetRating).toFixed(2));

          for (const sub of submissions) {
            if (sub.comment && sub.comment.trim().length > 3) {
              allCollectedStudentComments.push({
                comment: sub.comment.trim(),
                sentiment: sub.commentSentiment || "NEUTRAL",
                score: sub.commentScore ? Number(sub.commentScore) : 0,
              });
            }
          }
        }
      }

      grandTotalStudents += classEvaluatedStudents;
      grandTotalWeightedScore += weightedScore;

      // ── MASKED COURSE AND SECTION (Hides real course code and section for ALL ROLES) ──
      classBreakdown.push({
        seq: i + 1,
        offeringId: off.offeringId,
        courseCode: `Subject #${i + 1}`,
        courseName: `Subject #${i + 1}`,
        yearSection: `Class #${i + 1}`,
        noOfStudents: classEvaluatedStudents,
        averageSetRating,
        weightedScore,
      });
    }

    grandTotalWeightedScore = Number(grandTotalWeightedScore.toFixed(2));

    const consolidationFormula = getConsolidationFormulaById(formulaId);
    const overallSetRating = consolidationFormula.calculate({
      classes: classBreakdown,
      totalStudents: grandTotalStudents,
      totalWeightedScore: grandTotalWeightedScore,
    });

    const offeringIds = offerings.map((o) => o.offeringId);
    let overallSefRating: number | null = null;
    const supervisorCommentsList: SupervisorFeedbackComment[] = [];
    const allSupervisorEvaluationIds: number[] = [];

    if (offeringIds.length > 0) {
      const sefSubmissions = await tx
        .select({
          id: SupervisorEvaluations.id,
          setRating: SupervisorEvaluations.set_rating,
          comment: SupervisorEvaluations.comment,
          submittedAt: SupervisorEvaluations.submitted_at,
          evaluatorFirst: PersonalDetails.first_name,
          evaluatorLast: PersonalDetails.last_name,
        })
        .from(SupervisorEvaluations)
        .innerJoin(Accounts, eq(SupervisorEvaluations.evaluator_id, Accounts.id))
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(
          and(
            inArray(SupervisorEvaluations.course_offering_id, offeringIds),
            isNotNull(SupervisorEvaluations.submitted_at),
          ),
        );

      if (sefSubmissions.length > 0) {
        sefSubmissions.forEach((s) => allSupervisorEvaluationIds.push(s.id));

        const sum = sefSubmissions.reduce(
          (acc, curr) => acc + (curr.setRating ? Number(curr.setRating) : 0),
          0,
        );
        overallSefRating = Number((sum / sefSubmissions.length).toFixed(2));

        for (const sef of sefSubmissions) {
          if (sef.comment && sef.comment.trim().length > 3) {
            supervisorCommentsList.push({
              evaluator_name: `${sef.evaluatorFirst} ${sef.evaluatorLast}`,
              evaluator_role: "Academic Supervisor",
              comment: sef.comment.trim(),
              submitted_at: sef.submittedAt
                ? new Date(sef.submittedAt).toISOString()
                : new Date().toISOString(),
            });
          }
        }
      }
    }

    // ── Compute Granular Analytics (SET and SEF per-category and per-indicator) dynamically ──
    const { setCategories, setIndicators } = await this.computeSetAnalytics(
      allStudentEvaluationIds,
      minRating,
      maxRating,
      tx,
    );
    const { sefCategories, sefIndicators } = await this.computeSefAnalytics(
      allSupervisorEvaluationIds,
      minRating,
      maxRating,
      tx,
    );
    const analyticsSummary = this.computeAnalyticsSummary(
      setIndicators,
      sefIndicators,
      setCategories,
      sefCategories,
    );

    const top5StudentComments = this.curateTop5Comments(allCollectedStudentComments);
    const primaryOffering = offerings[0];
    const primaryCollegeName = primaryOffering?.collegeName || "Academic Affairs";

    const [existingReport] = await tx
      .select()
      .from(IndividualFacultyReports)
      .where(
        and(
          eq(IndividualFacultyReports.semester_id, semesterId),
          eq(IndividualFacultyReports.faculty_id, facultyId),
        ),
      );

    const defaultFedafPlan: FedafPlan = {
      areas_for_improvement: "",
      proposed_activities: "",
      action_plan: "",
      supervisor_name: "",
      supervisor_signed_at: null,
      faculty_signed_at: null,
    };

    let reportRecord;

    if (existingReport) {
      const [updated] = await tx
        .update(IndividualFacultyReports)
        .set({
          overall_set_rating: String(overallSetRating),
          overall_sef_rating: overallSefRating !== null ? String(overallSefRating) : null,
          total_students_evaluated: grandTotalStudents,
          total_classes: offerings.length,
          total_weighted_score: String(grandTotalWeightedScore),
          calculation_formula: formulaId,
          class_breakdown: classBreakdown,
          student_comments: top5StudentComments,
          supervisor_comments: supervisorCommentsList,
          set_category_analytics: setCategories,
          set_indicator_analytics: setIndicators,
          sef_category_analytics: sefCategories,
          sef_indicator_analytics: sefIndicators,
          analytics_summary: analyticsSummary,
          updated_at: new Date(),
        })
        .where(eq(IndividualFacultyReports.id, existingReport.id))
        .returning();

      reportRecord = updated!;
    } else {
      const [inserted] = await tx
        .insert(IndividualFacultyReports)
        .values({
          faculty_id: facultyId,
          semester_id: semesterId,
          overall_set_rating: String(overallSetRating),
          overall_sef_rating: overallSefRating !== null ? String(overallSefRating) : null,
          total_students_evaluated: grandTotalStudents,
          total_classes: offerings.length,
          total_weighted_score: String(grandTotalWeightedScore),
          calculation_formula: formulaId,
          class_breakdown: classBreakdown,
          student_comments: top5StudentComments,
          supervisor_comments: supervisorCommentsList,
          set_category_analytics: setCategories,
          set_indicator_analytics: setIndicators,
          sef_category_analytics: sefCategories,
          sef_indicator_analytics: sefIndicators,
          analytics_summary: analyticsSummary,
          fedaf_plan: defaultFedafPlan,
          status: "DRAFT",
        })
        .returning();

      reportRecord = inserted!;
    }

    return this.formatReportData(
      reportRecord,
      faculty.details,
      semester,
      primaryCollegeName,
      minRating,
      maxRating,
      primaryOffering?.collegeId ?? null,
      primaryOffering?.collegeCode ?? null,
      primaryOffering?.programId ?? null,
      primaryOffering?.programName ?? null,
      primaryOffering?.programCode ?? null,
    );
  }

  private async hydrateReport(
    report: typeof IndividualFacultyReports.$inferSelect,
    tx: PgTransaction,
  ): Promise<AnnexCFacultyReport> {
    const [semester] = await tx
      .select()
      .from(Semesters)
      .where(eq(Semesters.id, report.semester_id));

    const [faculty] = await tx
      .select({
        details: PersonalDetails,
      })
      .from(Accounts)
      .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
      .where(eq(Accounts.id, report.faculty_id));

    const [primaryOffering] = await tx
      .select({
        collegeId: Colleges.id,
        collegeName: Colleges.name,
        collegeCode: Colleges.initialism,
        programId: Programs.id,
        programName: Programs.name,
        programCode: Programs.initialism,
      })
      .from(CourseOfferings)
      .innerJoin(CourseCurriculums, eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id))
      .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
      .innerJoin(Programs, eq(Courses.program_id, Programs.id))
      .innerJoin(Colleges, eq(Programs.college_id, Colleges.id))
      .where(
        and(
          eq(CourseOfferings.semester_id, report.semester_id),
          eq(CourseOfferings.faculty_id, report.faculty_id),
          isNull(CourseOfferings.deleted_at),
        ),
      )
      .limit(1);

    const [setTemplate] = await tx
      .select({
        min_rating: StudentEvaluationForms.min_rating,
        max_rating: StudentEvaluationForms.max_rating,
      })
      .from(StudentEvaluationForms)
      .where(isNull(StudentEvaluationForms.deleted_at))
      .limit(1);

    const minRating = setTemplate?.min_rating ?? 1;
    const maxRating = setTemplate?.max_rating ?? 5;
    const departmentCollege = primaryOffering?.collegeName || "Academic Affairs";

    return this.formatReportData(
      report,
      faculty?.details,
      semester!,
      departmentCollege,
      minRating,
      maxRating,
      primaryOffering?.collegeId ?? null,
      primaryOffering?.collegeCode ?? null,
      primaryOffering?.programId ?? null,
      primaryOffering?.programName ?? null,
      primaryOffering?.programCode ?? null,
    );
  }

  // ── Dynamic SET Analytics Aggregation ──
  private async computeSetAnalytics(
    studentEvalIds: number[],
    minRating: number,
    maxRating: number,
    tx: PgTransaction,
  ): Promise<{ setCategories: CategoryAnalytics[]; setIndicators: IndicatorAnalytics[] }> {
    if (studentEvalIds.length === 0) {
      return { setCategories: [], setIndicators: [] };
    }

    const ratingRecords = await tx
      .select({
        rating: StudentEvaluationRatings.rating,
        questionId: StudentEvaluationQuestions.id,
        questionText: StudentEvaluationQuestions.question,
        questionOrder: StudentEvaluationQuestions.order,
        questionMaxRating: StudentEvaluationQuestions.max_rating,
        categoryId: StudentEvaluationCategories.id,
        categoryName: StudentEvaluationCategories.name,
        categoryOrder: StudentEvaluationCategories.order,
      })
      .from(StudentEvaluationRatings)
      .innerJoin(
        StudentEvaluationQuestions,
        eq(StudentEvaluationRatings.question_id, StudentEvaluationQuestions.id),
      )
      .innerJoin(
        StudentEvaluationCategories,
        eq(StudentEvaluationQuestions.category_id, StudentEvaluationCategories.id),
      )
      .where(inArray(StudentEvaluationRatings.evaluation_id, studentEvalIds));

    const questionMap = new Map<
      number,
      {
        questionId: number;
        categoryId: number;
        categoryName: string;
        order: number;
        indicatorText: string;
        maxRating: number;
        ratings: number[];
        dist: Record<number, number>;
      }
    >();

    const categoryMap = new Map<
      number,
      {
        categoryId: number;
        categoryName: string;
        order: number;
        ratings: number[];
        maxRating: number;
      }
    >();

    const createDistributionMap = (min: number, max: number) => {
      const d: Record<number, number> = {};
      for (let i = min; i <= max; i++) d[i] = 0;
      return d;
    };

    for (const r of ratingRecords) {
      const qMax = r.questionMaxRating || maxRating;

      if (!questionMap.has(r.questionId)) {
        questionMap.set(r.questionId, {
          questionId: r.questionId,
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          order: r.questionOrder,
          indicatorText: r.questionText,
          maxRating: qMax,
          ratings: [],
          dist: createDistributionMap(minRating, qMax),
        });
      }
      const qData = questionMap.get(r.questionId)!;
      qData.ratings.push(r.rating);
      qData.dist[r.rating] = (qData.dist[r.rating] || 0) + 1;

      if (!categoryMap.has(r.categoryId)) {
        categoryMap.set(r.categoryId, {
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          order: r.categoryOrder,
          maxRating: qMax,
          ratings: [],
        });
      }
      categoryMap.get(r.categoryId)!.ratings.push(r.rating);
    }

    const setIndicators: IndicatorAnalytics[] = Array.from(questionMap.values())
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const avg =
          q.ratings.length > 0
            ? Number((q.ratings.reduce((s, v) => s + v, 0) / q.ratings.length).toFixed(2))
            : 0;
        return {
          questionId: q.questionId,
          categoryId: q.categoryId,
          categoryName: q.categoryName,
          order: q.order,
          indicatorText: q.indicatorText,
          averageRating: avg,
          totalResponses: q.ratings.length,
          ratingDistribution: q.dist,
          minRating,
          maxRating: q.maxRating,
          qualitativeInterpretation: this.getQualitativeInterpretation(avg, minRating, q.maxRating),
        };
      });

    const setCategories: CategoryAnalytics[] = Array.from(categoryMap.values())
      .sort((a, b) => a.order - b.order)
      .map((c) => {
        const avg =
          c.ratings.length > 0
            ? Number((c.ratings.reduce((s, v) => s + v, 0) / c.ratings.length).toFixed(2))
            : 0;
        const percentage = c.maxRating > 0 ? Number(((avg / c.maxRating) * 100).toFixed(2)) : 0;
        return {
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          order: c.order,
          averageRating: avg,
          totalResponses: c.ratings.length,
          percentageScore: percentage,
          maxRating: c.maxRating,
          qualitativeInterpretation: this.getQualitativeInterpretation(avg, minRating, c.maxRating),
        };
      });

    return { setCategories, setIndicators };
  }

  // ── Dynamic SEF Analytics Aggregation ──
  private async computeSefAnalytics(
    supervisorEvalIds: number[],
    minRating: number,
    maxRating: number,
    tx: PgTransaction,
  ): Promise<{ sefCategories: CategoryAnalytics[]; sefIndicators: IndicatorAnalytics[] }> {
    if (supervisorEvalIds.length === 0) {
      return { sefCategories: [], sefIndicators: [] };
    }

    const ratingRecords = await tx
      .select({
        rating: SupervisorEvaluationRatings.rating,
        questionId: SupervisorEvaluationQuestions.id,
        questionText: SupervisorEvaluationQuestions.question,
        questionOrder: SupervisorEvaluationQuestions.order,
        questionMaxRating: SupervisorEvaluationQuestions.max_rating,
        categoryId: SupervisorEvaluationCategories.id,
        categoryName: SupervisorEvaluationCategories.name,
        categoryOrder: SupervisorEvaluationCategories.order,
      })
      .from(SupervisorEvaluationRatings)
      .innerJoin(
        SupervisorEvaluationQuestions,
        eq(SupervisorEvaluationRatings.question_id, SupervisorEvaluationQuestions.id),
      )
      .innerJoin(
        SupervisorEvaluationCategories,
        eq(SupervisorEvaluationQuestions.category_id, SupervisorEvaluationCategories.id),
      )
      .where(inArray(SupervisorEvaluationRatings.evaluation_id, supervisorEvalIds));

    const questionIds = Array.from(new Set(ratingRecords.map((r) => r.questionId)));

    const meansRows =
      questionIds.length > 0
        ? await tx
            .select({
              questionId: SupervisorEvaluationMeans.question_id,
              descriptor: SupervisorEvaluationMeans.descriptor,
            })
            .from(SupervisorEvaluationMeans)
            .where(
              and(
                inArray(SupervisorEvaluationMeans.question_id, questionIds),
                isNull(SupervisorEvaluationMeans.deleted_at),
              ),
            )
            .orderBy(asc(SupervisorEvaluationMeans.order))
        : [];

    const meansMap = new Map<number, string[]>();
    for (const m of meansRows) {
      if (!meansMap.has(m.questionId)) meansMap.set(m.questionId, []);
      meansMap.get(m.questionId)!.push(m.descriptor);
    }

    const createDistributionMap = (min: number, max: number) => {
      const d: Record<number, number> = {};
      for (let i = min; i <= max; i++) d[i] = 0;
      return d;
    };

    const questionMap = new Map<
      number,
      {
        questionId: number;
        categoryId: number;
        categoryName: string;
        order: number;
        indicatorText: string;
        maxRating: number;
        ratings: number[];
        dist: Record<number, number>;
      }
    >();

    const categoryMap = new Map<
      number,
      {
        categoryId: number;
        categoryName: string;
        order: number;
        maxRating: number;
        ratings: number[];
      }
    >();

    for (const r of ratingRecords) {
      const qMax = r.questionMaxRating || maxRating;

      if (!questionMap.has(r.questionId)) {
        questionMap.set(r.questionId, {
          questionId: r.questionId,
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          order: r.questionOrder,
          indicatorText: r.questionText,
          maxRating: qMax,
          ratings: [],
          dist: createDistributionMap(minRating, qMax),
        });
      }
      const qData = questionMap.get(r.questionId)!;
      qData.ratings.push(r.rating);
      qData.dist[r.rating] = (qData.dist[r.rating] || 0) + 1;

      if (!categoryMap.has(r.categoryId)) {
        categoryMap.set(r.categoryId, {
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          order: r.categoryOrder,
          maxRating: qMax,
          ratings: [],
        });
      }
      categoryMap.get(r.categoryId)!.ratings.push(r.rating);
    }

    const sefIndicators: IndicatorAnalytics[] = Array.from(questionMap.values())
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const avg =
          q.ratings.length > 0
            ? Number((q.ratings.reduce((s, v) => s + v, 0) / q.ratings.length).toFixed(2))
            : 0;
        const meansList = meansMap.get(q.questionId);
        return {
          questionId: q.questionId,
          categoryId: q.categoryId,
          categoryName: q.categoryName,
          order: q.order,
          indicatorText: q.indicatorText,
          averageRating: avg,
          totalResponses: q.ratings.length,
          ratingDistribution: q.dist,
          minRating,
          maxRating: q.maxRating,
          qualitativeInterpretation: this.getQualitativeInterpretation(avg, minRating, q.maxRating),
          ...(meansList && meansList.length > 0 ? { means: meansList } : {}),
        };
      });

    const sefCategories: CategoryAnalytics[] = Array.from(categoryMap.values())
      .sort((a, b) => a.order - b.order)
      .map((c) => {
        const avg =
          c.ratings.length > 0
            ? Number((c.ratings.reduce((s, v) => s + v, 0) / c.ratings.length).toFixed(2))
            : 0;
        const percentage = c.maxRating > 0 ? Number(((avg / c.maxRating) * 100).toFixed(2)) : 0;
        return {
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          order: c.order,
          averageRating: avg,
          totalResponses: c.ratings.length,
          percentageScore: percentage,
          maxRating: c.maxRating,
          qualitativeInterpretation: this.getQualitativeInterpretation(avg, minRating, c.maxRating),
        };
      });

    return { sefCategories, sefIndicators };
  }

  // ── Synthesized Analytics Summary ──
  private computeAnalyticsSummary(
    setIndicators: IndicatorAnalytics[],
    sefIndicators: IndicatorAnalytics[],
    setCategories: CategoryAnalytics[],
    sefCategories: CategoryAnalytics[],
  ): EvaluationAnalyticsSummary {
    const combinedIndicators: {
      questionId: number;
      indicatorText: string;
      categoryName: string;
      type: "SET" | "SEF";
      averageRating: number;
    }[] = [
      ...setIndicators.map((i) => ({
        questionId: i.questionId,
        indicatorText: i.indicatorText,
        categoryName: i.categoryName,
        type: "SET" as const,
        averageRating: i.averageRating,
      })),
      ...sefIndicators.map((i) => ({
        questionId: i.questionId,
        indicatorText: i.indicatorText,
        categoryName: i.categoryName,
        type: "SEF" as const,
        averageRating: i.averageRating,
      })),
    ];

    const sorted = [...combinedIndicators].sort((a, b) => b.averageRating - a.averageRating);
    const highestIndicators = sorted.slice(0, 3);
    const lowestIndicators = [...sorted].reverse().slice(0, 3);

    const catMap = new Map<string, { setAverage: number | null; sefAverage: number | null }>();

    setCategories.forEach((c) => {
      catMap.set(c.categoryName, { setAverage: c.averageRating, sefAverage: null });
    });

    sefCategories.forEach((c) => {
      if (!catMap.has(c.categoryName)) {
        catMap.set(c.categoryName, { setAverage: null, sefAverage: c.averageRating });
      } else {
        catMap.get(c.categoryName)!.sefAverage = c.averageRating;
      }
    });

    const categoryComparison = Array.from(catMap.entries()).map(([categoryName, data]) => ({
      categoryName,
      setAverage: data.setAverage,
      sefAverage: data.sefAverage,
      gap:
        data.setAverage !== null && data.sefAverage !== null
          ? Number((data.sefAverage - data.setAverage).toFixed(2))
          : null,
    }));

    return {
      highestIndicators,
      lowestIndicators,
      categoryComparison,
    };
  }

  // ── Dynamic Rating Qualitative Interpretation ──
  private getQualitativeInterpretation(rating: number, minRating = 1, maxRating = 5): string {
    const range = maxRating - minRating;
    if (range <= 0) return `Score: ${rating.toFixed(2)}`;

    const ratio = (rating - minRating) / range;

    if (ratio >= 0.85) return "Always Manifested (Outstanding)";
    if (ratio >= 0.65) return "Often Manifested (Very Satisfactory)";
    if (ratio >= 0.45) return "Sometimes Manifested (Satisfactory)";
    if (ratio >= 0.25) return "Seldom Manifested (Fair)";
    return "Never/Rarely Manifested (Poor)";
  }

  private formatReportData(
    report: typeof IndividualFacultyReports.$inferSelect,
    details: typeof PersonalDetails.$inferSelect | undefined,
    semester: typeof Semesters.$inferSelect,
    departmentCollege: string,
    minRating = 1,
    maxRating = 5,
    collegeId?: number | null,
    collegeCode?: string | null,
    programId?: number | null,
    programName?: string | null,
    programCode?: string | null,
    actorUserId?: number,
  ): AnnexCFacultyReport {
    const facultyName = details
      ? `${details.first_name} ${details.middle_name ? `${details.middle_name} ` : ""}${details.last_name}${details.suffix ? ` ${details.suffix}` : ""}`
      : "Faculty Member";

    const rawPlan = (report.fedaf_plan as FedafPlan) || {
      areas_for_improvement: "",
      proposed_activities: "",
      action_plan: "",
      supervisor_name: "",
      supervisor_signed_at: null,
      faculty_signed_at: null,
    };

    const isOwnReport = actorUserId === report.faculty_id;
    const isPublished = report.status === "PUBLISHED" || Boolean(rawPlan.supervisor_signed_at);

    const sanitizedPlan: FedafPlan = {
      ...rawPlan,
      areas_for_improvement: isOwnReport && !isPublished ? "" : rawPlan.areas_for_improvement,
      proposed_activities: isOwnReport && !isPublished ? "" : rawPlan.proposed_activities,
      action_plan: isOwnReport && !isPublished ? "" : rawPlan.action_plan,
    };

    const rawClassBreakdown = (report.class_breakdown as ClassConsolidationInput[]) || [];
    const sanitizedClassBreakdown: ClassConsolidationInput[] = rawClassBreakdown.map((c) => ({
      ...c,
      noOfStudents: null as any,
    }));

    return {
      id: report.id,
      faculty_id: report.faculty_id,
      semester_id: report.semester_id,
      faculty_name: facultyName,
      faculty_rank: "Instructor / Faculty Member",
      department_college: departmentCollege,
      min_rating: minRating,
      max_rating: maxRating,
      ...(collegeId !== undefined && collegeId !== null ? { college_id: collegeId } : {}),
      ...(departmentCollege ? { college_name: departmentCollege } : {}),
      ...(collegeCode !== undefined && collegeCode !== null ? { college_code: collegeCode } : {}),
      ...(programId !== undefined && programId !== null ? { program_id: programId } : {}),
      ...(programName !== undefined && programName !== null ? { program_name: programName } : {}),
      ...(programCode !== undefined && programCode !== null ? { program_code: programCode } : {}),
      semester_term: `${semester.semester_term} Semester`,
      school_year: `A.Y. ${semester.school_year_start}-${semester.school_year_end}`,
      overall_set_rating: Number(report.overall_set_rating),
      overall_sef_rating:
        report.overall_sef_rating !== null ? Number(report.overall_sef_rating) : null,
      total_students_evaluated: report.total_students_evaluated,
      total_classes: report.total_classes,
      total_weighted_score: Number(report.total_weighted_score),
      calculation_formula: report.calculation_formula,
      class_breakdown: sanitizedClassBreakdown,
      student_comments: (report.student_comments as AnonymousFeedbackComment[]) || [],
      supervisor_comments: (report.supervisor_comments as SupervisorFeedbackComment[]) || [],
      set_category_analytics: (report.set_category_analytics as CategoryAnalytics[]) || [],
      set_indicator_analytics: (report.set_indicator_analytics as IndicatorAnalytics[]) || [],
      sef_category_analytics: (report.sef_category_analytics as CategoryAnalytics[]) || [],
      sef_indicator_analytics: (report.sef_indicator_analytics as IndicatorAnalytics[]) || [],
      analytics_summary: (report.analytics_summary as EvaluationAnalyticsSummary) || {
        highestIndicators: [],
        lowestIndicators: [],
        categoryComparison: [],
      },
      fedaf_plan: sanitizedPlan,
      status: report.status as ReportStatus,
      created_at: report.created_at.toISOString(),
      updated_at: report.updated_at.toISOString(),
    };
  }

  private curateTop5Comments(comments: AnonymousFeedbackComment[]): AnonymousFeedbackComment[] {
    if (comments.length <= 5) return comments;

    const positive = comments
      .filter((c) => c.sentiment === "POSITIVE")
      .sort((a, b) => b.score - a.score);
    const negative = comments
      .filter((c) => c.sentiment === "NEGATIVE")
      .sort((a, b) => a.score - b.score);
    const neutral = comments.filter((c) => c.sentiment === "NEUTRAL" || c.sentiment === "MIXED");

    const curated: AnonymousFeedbackComment[] = [];

    if (positive[0]) curated.push(positive[0]);
    if (positive[1]) curated.push(positive[1]);
    if (negative[0]) curated.push(negative[0]);
    if (negative[1]) curated.push(negative[1]);
    if (neutral[0]) curated.push(neutral[0]);

    for (const c of comments) {
      if (curated.length >= 5) break;
      if (!curated.includes(c)) curated.push(c);
    }

    return curated;
  }

  private async enforceReportReadAccess(
    facultyId: number,
    semesterId: number,
    actorUser: GetUser,
    tx: PgTransaction,
  ): Promise<void> {
    const actorRoles = actorUser.roles ?? [];
    const isSelf = actorUser.account.id === facultyId;
    const isSysAdmin = actorRoles.includes("SYS_ADMIN");
    const isAdmin = actorRoles.includes("ADMIN");
    const isSupervisor = actorRoles.includes("SUPERVISOR");

    if (isSelf || isSysAdmin || isAdmin) return;

    if (!isSupervisor) {
      throw new AppError(
        403,
        "You do not have permission to view other faculty evaluation reports.",
      );
    }

    const deanships = actorUser.offices?.deanships || [];
    const chairships = actorUser.offices?.chairships || [];
    const deanCollegeIds = deanships.map((d) => d.id);
    const chairProgramIds = chairships.map((c) => c.id);

    let inScope = false;

    // 1. If Dean, is the target a Program Chair under their college?
    if (deanCollegeIds.length > 0) {
      const [chairMatch] = await tx
        .select({ id: ProgramChairs.id })
        .from(ProgramChairs)
        .innerJoin(Programs, eq(ProgramChairs.program_id, Programs.id))
        .where(
          and(
            eq(ProgramChairs.chair_id, facultyId),
            inArray(Programs.college_id, deanCollegeIds),
            isNull(ProgramChairs.deleted_at),
            isNull(Programs.deleted_at),
          ),
        );

      if (chairMatch) inScope = true;

      // Or is target teaching in a program with vacant chairship?
      if (!inScope) {
        const [vacantMatch] = await tx
          .select({ id: CourseOfferings.id })
          .from(CourseOfferings)
          .innerJoin(
            CourseCurriculums,
            eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
          )
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Programs, eq(Courses.program_id, Programs.id))
          .leftJoin(
            ProgramChairs,
            and(eq(Programs.id, ProgramChairs.program_id), isNull(ProgramChairs.deleted_at)),
          )
          .where(
            and(
              eq(CourseOfferings.faculty_id, facultyId),
              eq(CourseOfferings.semester_id, semesterId),
              inArray(Programs.college_id, deanCollegeIds),
              isNull(ProgramChairs.id),
              isNull(CourseOfferings.deleted_at),
            ),
          )
          .limit(1);

        if (vacantMatch) inScope = true;
      }
    }

    // 2. If Chair, is target teaching courses in their program?
    if (!inScope && chairProgramIds.length > 0) {
      const [teachingMatch] = await tx
        .select({ id: CourseOfferings.id })
        .from(CourseOfferings)
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .where(
          and(
            eq(CourseOfferings.faculty_id, facultyId),
            eq(CourseOfferings.semester_id, semesterId),
            inArray(Courses.program_id, chairProgramIds),
            isNull(CourseOfferings.deleted_at),
          ),
        )
        .limit(1);

      if (teachingMatch) inScope = true;
    }

    if (!inScope) {
      throw new AppError(
        403,
        "Access denied: This faculty member is outside your direct supervisory scope.",
      );
    }
  }

  private async validateEvaluationWindowsConcluded(
    semesterId: number,
    tx: PgTransaction,
  ): Promise<void> {
    const now = new Date();

    // 1. Fetch the latest SET schedule for this semester
    const [setSchedule] = await tx
      .select({
        id: StudentEvaluationSchedules.id,
        open_at: StudentEvaluationSchedules.open_at,
        close_at: StudentEvaluationSchedules.close_at,
      })
      .from(StudentEvaluationSchedules)
      .where(
        and(
          eq(StudentEvaluationSchedules.semester_id, semesterId),
          isNull(StudentEvaluationSchedules.deleted_at),
        ),
      )
      .orderBy(desc(StudentEvaluationSchedules.open_at))
      .limit(1);

    // 2. Fetch the latest SEF schedule for this semester
    const [sefSchedule] = await tx
      .select({
        id: SupervisorEvaluationSchedules.id,
        open_at: SupervisorEvaluationSchedules.open_at,
        close_at: SupervisorEvaluationSchedules.close_at,
      })
      .from(SupervisorEvaluationSchedules)
      .where(
        and(
          eq(SupervisorEvaluationSchedules.semester_id, semesterId),
          isNull(SupervisorEvaluationSchedules.deleted_at),
        ),
      )
      .orderBy(desc(SupervisorEvaluationSchedules.open_at))
      .limit(1);

    // If neither window was even configured yet
    if (!setSchedule && !sefSchedule) {
      throw new AppError(
        400,
        "Cannot generate reports: Evaluation schedules for this semester have not been created yet.",
      );
    }

    const blockingReasons: string[] = [];

    // Check SET Window
    if (setSchedule) {
      const openTime = new Date(setSchedule.open_at);
      const closeTime = new Date(setSchedule.close_at);
      if (now >= openTime && now <= closeTime) {
        blockingReasons.push(
          `Student Evaluation (SET) is currently ongoing until ${closeTime.toLocaleString()}.`,
        );
      } else if (now < openTime) {
        blockingReasons.push(
          `Student Evaluation (SET) has not started yet (opens ${openTime.toLocaleString()}).`,
        );
      }
    }

    // Check SEF Window
    if (sefSchedule) {
      const openTime = new Date(sefSchedule.open_at);
      const closeTime = new Date(sefSchedule.close_at);
      if (now >= openTime && now <= closeTime) {
        blockingReasons.push(
          `Supervisor Evaluation (SEF) is currently ongoing until ${closeTime.toLocaleString()}.`,
        );
      } else if (now < openTime) {
        blockingReasons.push(
          `Supervisor Evaluation (SEF) has not started yet (opens ${openTime.toLocaleString()}).`,
        );
      }
    }

    if (blockingReasons.length > 0) {
      throw new AppError(
        400,
        `Cannot consolidate reports while evaluation periods are active:\n• ${blockingReasons.join(
          "\n• ",
        )}\n\nBoth evaluation windows must conclude (or be force-stopped) before official reports can be generated.`,
      );
    }
  }
}
