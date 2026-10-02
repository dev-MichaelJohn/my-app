import db, { type PgTransaction } from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  IndividualFacultyReports,
  Semesters,
  Colleges,
  Programs,
  Accounts,
  PersonalDetails,
  type AnalyticsQuery,
  type ComprehensiveAnalyticsReport,
  type LongitudinalPoint,
  type DomainCompetencyMetric,
  type IndicatorDiagnosis,
  type EntityComparisonRow,
  type AnalyticsScope,
  type GetUser,
  type CategoryAnalytics,
  type IndicatorAnalytics,
} from "@my-app/shared";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { type ResultAsync } from "neverthrow";

interface ResolvedScope {
  validatedScope: AnalyticsScope;
  resolvedEntityId?: number | undefined;
  scopeEntityName?: string | undefined;
}

export interface IAnalyticsService {
  getAnalytics(
    query: AnalyticsQuery,
    actorUser: GetUser,
    client?: DbClient,
  ): ResultAsync<ComprehensiveAnalyticsReport, AppError>;
}

export class AnalyticsService implements IAnalyticsService {
  getAnalytics(
    query: AnalyticsQuery,
    actorUser: GetUser,
    client: DbClient = db,
  ): ResultAsync<ComprehensiveAnalyticsReport, AppError> {
    return WithTransaction(client, async (tx): Promise<ComprehensiveAnalyticsReport> => {
      // 1. Enforce RBAC and resolve entity scope
      const { validatedScope, resolvedEntityId, scopeEntityName } = await this.enforceRbacScope(
        actorUser,
        query.scope,
        query.entityId,
        tx,
      );

      // 2. Resolve Active Semester
      const activeSemester = await this.resolveSemester(query.semesterId, tx);
      if (!activeSemester) {
        throw new AppError(404, "No active or historical semester records found.");
      }

      // 3. Fetch past 5 semesters for longitudinal progression
      const recentSemesters = await tx
        .select()
        .from(Semesters)
        .where(sql`${Semesters.id} <= ${activeSemester.id}`)
        .orderBy(desc(Semesters.id))
        .limit(5);

      const semesterIds = recentSemesters.map((s) => s.id);

      // 4. Fetch all finalized/published reports across these semesters
      const allReports = await tx
        .select()
        .from(IndividualFacultyReports)
        .where(
          and(
            inArray(IndividualFacultyReports.semester_id, semesterIds),
            eq(IndividualFacultyReports.status, "PUBLISHED"),
            sql`${IndividualFacultyReports.total_classes} > 0`,
          ),
        );

      // Current semester reports
      const institutionalCurrentSemesterReports = allReports.filter(
        (r) => r.semester_id === activeSemester.id,
      );

      const scopedCurrentSemesterReports = institutionalCurrentSemesterReports.filter((r) =>
        this.matchesScope(r, validatedScope, resolvedEntityId),
      );

      // 5. Compute Longitudinal Trend (historical line data)
      const historicalTrends = this.computeHistoricalTrends(
        recentSemesters,
        allReports,
        validatedScope,
        resolvedEntityId,
      );

      // 6. Compute KPIs
      const kpis = this.computeKpis(
        scopedCurrentSemesterReports,
        historicalTrends,
        activeSemester.id,
      );

      // 7. Compute Domain Competencies (Category Radars & Benchmarks)
      const domainCompetencies = this.computeDomainCompetencies(
        scopedCurrentSemesterReports,
        institutionalCurrentSemesterReports,
      );

      // 8. Compute Diagnostics (Top 3 Strengths & Lowest 3 Growth Areas)
      const diagnostics = this.computeDiagnostics(
        scopedCurrentSemesterReports,
        institutionalCurrentSemesterReports,
      );

      // 9. Compute Entity Breakdown (Colleges for Institution, Programs for College)
      const breakdown = await this.computeBreakdown(
        validatedScope,
        scopedCurrentSemesterReports,
        tx,
      );

      return {
        scope: validatedScope,
        scopeEntityId: resolvedEntityId ?? null,
        ...(scopeEntityName !== undefined ? { scopeEntityName } : {}), // 👈 Conditionally spreads if present
        activeSemester: {
          id: activeSemester.id,
          term: `${activeSemester.semester_term} Semester`,
          schoolYear: `A.Y. ${activeSemester.school_year_start}-${activeSemester.school_year_end}`,
        },
        kpis,
        historicalTrends,
        domainCompetencies,
        diagnostics,
        breakdown,
      };
    });
  }

  // ==========================================
  // RBAC SCOPE ENFORCEMENT
  // ==========================================
  private async enforceRbacScope(
    actorUser: GetUser,
    requestedScope: AnalyticsScope,
    requestedEntityId: number | undefined,
    tx: PgTransaction,
  ): Promise<ResolvedScope> {
    const roles = actorUser.roles ?? [];
    const isSysAdmin = roles.includes("SYS_ADMIN");
    const isAdmin = roles.includes("ADMIN");
    const isSupervisor = roles.includes("SUPERVISOR");
    const isFaculty = roles.includes("FACULTY");

    const deanships = actorUser.offices?.deanships || [];
    const chairships = actorUser.offices?.chairships || [];
    const isDean = deanships.length > 0;
    const isChair = chairships.length > 0;

    // Faculty only has access to SELF
    if (isFaculty && !isSupervisor && !isAdmin && !isSysAdmin) {
      const name = `${actorUser.details.first_name} ${actorUser.details.last_name}`;
      return {
        validatedScope: "SELF",
        resolvedEntityId: actorUser.account.id,
        scopeEntityName: name,
      };
    }

    // Program Chair is locked to their PROGRAM or SELF
    if (isChair && !isDean && !isSysAdmin && !isAdmin) {
      if (requestedScope === "SELF") {
        return {
          validatedScope: "SELF",
          resolvedEntityId: actorUser.account.id,
          scopeEntityName: `${actorUser.details.first_name} ${actorUser.details.last_name}`,
        };
      }
      const myProgram = chairships[0]!;
      return {
        validatedScope: "PROGRAM",
        resolvedEntityId: myProgram.id,
        scopeEntityName: myProgram.name,
      };
    }

    // College Dean is locked to their COLLEGE, PROGRAMs within their college, or SELF
    if (isDean && !isSysAdmin && !isAdmin) {
      if (requestedScope === "SELF") {
        return {
          validatedScope: "SELF",
          resolvedEntityId: actorUser.account.id,
          scopeEntityName: `${actorUser.details.first_name} ${actorUser.details.last_name}`,
        };
      }

      const myCollege = deanships[0]!;
      if (requestedScope === "PROGRAM" && requestedEntityId) {
        const [prog] = await tx
          .select()
          .from(Programs)
          .where(
            and(
              eq(Programs.id, requestedEntityId),
              eq(Programs.college_id, myCollege.id),
              isNull(Programs.deleted_at),
            ),
          );
        if (!prog) {
          throw new AppError(403, "You can only view programs belonging to your college.");
        }
        return {
          validatedScope: "PROGRAM",
          resolvedEntityId: prog.id,
          scopeEntityName: prog.name,
        };
      }

      return {
        validatedScope: "COLLEGE",
        resolvedEntityId: myCollege.id,
        scopeEntityName: myCollege.name,
      };
    }

    // SYS_ADMIN and ADMIN have full access
    let entityName: string | undefined = undefined;

    if (requestedScope === "COLLEGE" && requestedEntityId) {
      const [col] = await tx.select().from(Colleges).where(eq(Colleges.id, requestedEntityId));
      entityName = col?.name;
    } else if (requestedScope === "PROGRAM" && requestedEntityId) {
      const [prog] = await tx.select().from(Programs).where(eq(Programs.id, requestedEntityId));
      entityName = prog?.name;
    } else if (requestedScope === "SELF") {
      const targetId = requestedEntityId || actorUser.account.id;
      const [pers] = await tx
        .select()
        .from(PersonalDetails)
        .innerJoin(Accounts, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(eq(Accounts.id, targetId));
      entityName = pers
        ? `${pers.personal_details.first_name} ${pers.personal_details.last_name}`
        : "Faculty";
    }

    return {
      validatedScope: requestedScope,
      resolvedEntityId:
        requestedEntityId ?? (requestedScope === "SELF" ? actorUser.account.id : undefined),
      scopeEntityName:
        entityName ?? (requestedScope === "INSTITUTION" ? "Institution-Wide" : undefined),
    };
  }

  // ==========================================
  // HELPERS & COMPUTATIONS
  // ==========================================
  private matchesScope(
    report: typeof IndividualFacultyReports.$inferSelect,
    scope: AnalyticsScope,
    entityId?: number,
  ): boolean {
    if (scope === "INSTITUTION") return true;
    if (scope === "SELF" && entityId) return report.faculty_id === entityId;

    const breakdown = (report.class_breakdown as any[]) || [];
    if (scope === "COLLEGE" && entityId) {
      return breakdown.some((c) => c.collegeId === entityId);
    }
    if (scope === "PROGRAM" && entityId) {
      return breakdown.some((c) => c.programId === entityId);
    }
    return true;
  }

  private async resolveSemester(semesterId: number | undefined, tx: PgTransaction) {
    if (semesterId) {
      const [sem] = await tx.select().from(Semesters).where(eq(Semesters.id, semesterId));
      if (sem) return sem;
    }
    const [latest] = await tx
      .select()
      .from(Semesters)
      .where(isNull(Semesters.deleted_at))
      .orderBy(desc(Semesters.id))
      .limit(1);
    return latest;
  }

  private computeHistoricalTrends(
    semesters: (typeof Semesters.$inferSelect)[],
    allReports: (typeof IndividualFacultyReports.$inferSelect)[],
    scope: AnalyticsScope,
    entityId?: number,
  ): LongitudinalPoint[] {
    const chronologicalSemesters = [...semesters].sort((a, b) => a.id - b.id);

    return chronologicalSemesters.map((sem) => {
      const inSem = allReports.filter((r) => r.semester_id === sem.id);
      const scopedInSem = inSem.filter((r) => this.matchesScope(r, scope, entityId));

      const avgInstSet = inSem.length
        ? inSem.reduce((sum, r) => sum + Number(r.overall_set_rating), 0) / inSem.length
        : 0;

      const avgScopedSet = scopedInSem.length
        ? scopedInSem.reduce((sum, r) => sum + Number(r.overall_set_rating), 0) / scopedInSem.length
        : 0;

      const sefReports = scopedInSem.filter((r) => r.overall_sef_rating !== null);
      const avgScopedSef = sefReports.length
        ? sefReports.reduce((sum, r) => sum + Number(r.overall_sef_rating), 0) / sefReports.length
        : null;

      const totalRespondents = scopedInSem.reduce(
        (sum, r) => sum + (r.total_students_evaluated || 0),
        0,
      );

      return {
        semesterId: sem.id,
        semesterTerm: `${sem.semester_term} Sem`,
        schoolYear: `AY ${String(sem.school_year_start).slice(-2)}-${String(sem.school_year_end).slice(-2)}`,
        setRating: Number(avgScopedSet.toFixed(2)),
        sefRating: avgScopedSef !== null ? Number(avgScopedSef.toFixed(2)) : null,
        benchmarkSetRating: Number(avgInstSet.toFixed(2)),
        totalRespondents,
      };
    });
  }

  private computeKpis(
    scopedReports: (typeof IndividualFacultyReports.$inferSelect)[],
    historicalTrends: LongitudinalPoint[],
    activeSemesterId: number,
  ) {
    if (scopedReports.length === 0) {
      return {
        overallSet: 0,
        overallSef: null,
        sefSetVariance: null,
        setChangePercentage: 0,
        totalEvaluations: 0,
        totalFacultyEvaluated: 0,
        satisfactionRate: 0,
      };
    }

    const setTotal = scopedReports.reduce((sum, r) => sum + Number(r.overall_set_rating), 0);
    const overallSet = Number((setTotal / scopedReports.length).toFixed(2));

    const sefReports = scopedReports.filter((r) => r.overall_sef_rating !== null);
    const overallSef = sefReports.length
      ? Number(
          (
            sefReports.reduce((sum, r) => sum + Number(r.overall_sef_rating), 0) / sefReports.length
          ).toFixed(2),
        )
      : null;

    const sefSetVariance =
      overallSef !== null ? Number((overallSef - overallSet).toFixed(2)) : null;

    const currentIdx = historicalTrends.findIndex((t) => t.semesterId === activeSemesterId);
    let setChangePercentage = 0;
    if (currentIdx > 0) {
      const prevRating = historicalTrends[currentIdx - 1]?.setRating ?? 0;
      if (prevRating > 0) {
        setChangePercentage = Number((((overallSet - prevRating) / prevRating) * 100).toFixed(1));
      }
    }

    const totalEvaluations = scopedReports.reduce(
      (sum, r) => sum + (r.total_students_evaluated || 0),
      0,
    );
    const uniqueFaculty = new Set(scopedReports.map((r) => r.faculty_id)).size;

    const satisfactory = scopedReports.filter((r) => Number(r.overall_set_rating) >= 3.5).length;
    const satisfactionRate = Number(((satisfactory / scopedReports.length) * 100).toFixed(1));

    return {
      overallSet,
      overallSef,
      sefSetVariance,
      setChangePercentage,
      totalEvaluations,
      totalFacultyEvaluated: uniqueFaculty,
      satisfactionRate,
    };
  }

  private computeDomainCompetencies(
    scopedReports: (typeof IndividualFacultyReports.$inferSelect)[],
    institutionalReports: (typeof IndividualFacultyReports.$inferSelect)[],
  ): DomainCompetencyMetric[] {
    const aggregateCategories = (reports: (typeof IndividualFacultyReports.$inferSelect)[]) => {
      const map: Record<string, { sum: number; count: number }> = {};
      for (const rep of reports) {
        const catAnalytics = (rep.set_category_analytics as CategoryAnalytics[]) || [];
        for (const cat of catAnalytics) {
          const entry = map[cat.categoryName] ?? { sum: 0, count: 0 };
          entry.sum += Number(cat.averageRating);
          entry.count += 1;
          map[cat.categoryName] = entry;
        }
      }
      return map;
    };

    const scopedMap = aggregateCategories(scopedReports);
    const instMap = aggregateCategories(institutionalReports);

    return Object.keys(scopedMap).map((categoryName) => {
      const scopedItem = scopedMap[categoryName] ?? { sum: 0, count: 0 };
      const scopedAvg = scopedItem.count ? scopedItem.sum / scopedItem.count : 0;
      const instItem = instMap[categoryName];
      const instAvg = instItem && instItem.count ? instItem.sum / instItem.count : scopedAvg;

      return {
        categoryName,
        score: Number(scopedAvg.toFixed(2)),
        institutionBenchmark: Number(instAvg.toFixed(2)),
        deltaFromBenchmark: Number((scopedAvg - instAvg).toFixed(2)),
      };
    });
  }

  private computeDiagnostics(
    scopedReports: (typeof IndividualFacultyReports.$inferSelect)[],
    institutionalReports: (typeof IndividualFacultyReports.$inferSelect)[],
  ): { topIndicators: IndicatorDiagnosis[]; lowestIndicators: IndicatorDiagnosis[] } {
    const aggregateIndicators = (reports: (typeof IndividualFacultyReports.$inferSelect)[]) => {
      const map = new Map<
        number,
        { code: string; text: string; category: string; sum: number; count: number }
      >();
      for (const rep of reports) {
        const indicators = (rep.set_indicator_analytics as IndicatorAnalytics[]) || [];
        for (const ind of indicators) {
          if (!map.has(ind.questionId)) {
            map.set(ind.questionId, {
              code: `IND-${ind.questionId}`,
              text: ind.indicatorText,
              category: ind.categoryName || "General",
              sum: 0,
              count: 0,
            });
          }
          const item = map.get(ind.questionId)!;
          item.sum += Number(ind.averageRating);
          item.count += 1;
        }
      }
      return map;
    };

    const scopedMap = aggregateIndicators(scopedReports);
    const instMap = aggregateIndicators(institutionalReports);

    const diagnostics: IndicatorDiagnosis[] = [];

    for (const [id, data] of scopedMap.entries()) {
      const avg = data.count ? data.sum / data.count : 0;
      const instData = instMap.get(id);
      const instAvg = instData && instData.count ? instData.sum / instData.count : avg;

      diagnostics.push({
        indicatorId: id,
        indicatorCode: data.code,
        questionText: data.text,
        categoryName: data.category,
        averageRating: Number(avg.toFixed(2)),
        benchmarkRating: Number(instAvg.toFixed(2)),
        delta: Number((avg - instAvg).toFixed(2)),
      });
    }

    diagnostics.sort((a, b) => b.averageRating - a.averageRating);

    return {
      topIndicators: diagnostics.slice(0, 3),
      lowestIndicators: [...diagnostics].reverse().slice(0, 3),
    };
  }

  private async computeBreakdown(
    scope: AnalyticsScope,
    scopedReports: (typeof IndividualFacultyReports.$inferSelect)[],
    tx: PgTransaction,
  ): Promise<EntityComparisonRow[]> {
    if (scope === "INSTITUTION") {
      const colleges = await tx.select().from(Colleges).where(isNull(Colleges.deleted_at));
      return colleges.map((col) => {
        const matching = scopedReports.filter((r) => {
          const breakdown = (r.class_breakdown as any[]) || [];
          return breakdown.some((c) => c.collegeId === col.id);
        });
        return this.formatEntityRow(col.id, col.name, col.initialism, matching);
      });
    }

    if (scope === "COLLEGE") {
      const programs = await tx.select().from(Programs).where(isNull(Programs.deleted_at));
      return programs.map((prog) => {
        const matching = scopedReports.filter((r) => {
          const breakdown = (r.class_breakdown as any[]) || [];
          return breakdown.some((c) => c.programId === prog.id);
        });
        return this.formatEntityRow(prog.id, prog.name, prog.initialism, matching);
      });
    }

    return [];
  }

  private formatEntityRow(
    id: number,
    name: string,
    code: string,
    reports: (typeof IndividualFacultyReports.$inferSelect)[],
  ): EntityComparisonRow {
    const totalSet = reports.reduce((sum, r) => sum + Number(r.overall_set_rating), 0);
    const setRating = reports.length ? Number((totalSet / reports.length).toFixed(2)) : 0;

    const sefReports = reports.filter((r) => r.overall_sef_rating !== null);
    const sefRating = sefReports.length
      ? Number(
          (
            sefReports.reduce((sum, r) => sum + Number(r.overall_sef_rating), 0) / sefReports.length
          ).toFixed(2),
        )
      : null;

    const variance = sefRating !== null ? Number((sefRating - setRating).toFixed(2)) : 0;
    const totalEvaluations = reports.reduce((sum, r) => sum + (r.total_students_evaluated || 0), 0);

    return {
      entityId: id,
      entityName: name,
      entityCode: code,
      setRating,
      sefRating,
      totalFaculty: new Set(reports.map((r) => r.faculty_id)).size,
      totalEvaluations,
      variance,
      ratingDistribution: {
        outstanding: reports.filter((r) => Number(r.overall_set_rating) >= 4.5).length,
        verySatisfactory: reports.filter(
          (r) => Number(r.overall_set_rating) >= 3.5 && Number(r.overall_set_rating) < 4.5,
        ).length,
        satisfactory: reports.filter(
          (r) => Number(r.overall_set_rating) >= 2.5 && Number(r.overall_set_rating) < 3.5,
        ).length,
        fair: reports.filter(
          (r) => Number(r.overall_set_rating) >= 1.5 && Number(r.overall_set_rating) < 2.5,
        ).length,
        poor: reports.filter((r) => Number(r.overall_set_rating) < 1.5).length,
      },
    };
  }
}
