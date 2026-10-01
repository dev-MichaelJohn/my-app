import { http, type ApiError } from "@/lib/api.lib";
import type { ResultAsync } from "neverthrow";
import type {
  AnnexCFacultyReport,
  BatchConsolidationSummary,
  InstitutionalFERReport,
  PaginatedData,
  ReportStatus,
  UpdateFedafPlan,
} from "@my-app/shared";

export class EvaluationReportAPI {
  getAnnexCReport(
    semesterId: number,
    facultyId?: number,
  ): ResultAsync<AnnexCFacultyReport, ApiError> {
    return http.get<AnnexCFacultyReport>("/evaluation-reports/annex-c", {
      semester_id: semesterId,
      faculty_id: facultyId,
    });
  }

  recalculateAnnexCReport(payload: {
    semester_id: number;
    faculty_id?: number;
    formula?: string;
  }): ResultAsync<AnnexCFacultyReport, ApiError> {
    return http.post<AnnexCFacultyReport>("/evaluation-reports/annex-c/calculate", payload);
  }

  batchConsolidateReports(payload: {
    semester_id: number;
    formula?: string;
  }): ResultAsync<BatchConsolidationSummary, ApiError> {
    return http.post<BatchConsolidationSummary>("/evaluation-reports/batch-consolidate", payload);
  }

  getReportsList(query?: unknown): ResultAsync<PaginatedData<AnnexCFacultyReport[]>, ApiError> {
    return http.get<PaginatedData<AnnexCFacultyReport[]>>("/evaluation-reports", query);
  }

  getInstitutionalFER(semesterId: number): ResultAsync<InstitutionalFERReport, ApiError> {
    return http.get<InstitutionalFERReport>("/evaluation-reports/institutional-fer", {
      semester_id: semesterId,
    });
  }

  updateReportStatus(
    reportId: number,
    status: ReportStatus,
  ): ResultAsync<AnnexCFacultyReport, ApiError> {
    return http.patch<AnnexCFacultyReport>(`/evaluation-reports/${reportId}/status`, { status });
  }

  updateFedafPlan(
    reportId: number,
    plan: UpdateFedafPlan,
  ): ResultAsync<AnnexCFacultyReport, ApiError> {
    return http.put<AnnexCFacultyReport>(`/evaluation-reports/${reportId}/fedaf-plan`, plan);
  }

  signFedaf(
    reportId: number,
    signatureRole: "FACULTY" | "SUPERVISOR",
  ): ResultAsync<AnnexCFacultyReport, ApiError> {
    return http.post<AnnexCFacultyReport>(`/evaluation-reports/${reportId}/sign-fedaf`, {
      signatureRole,
    });
  }
}

export const evaluationReportApi = new EvaluationReportAPI();
