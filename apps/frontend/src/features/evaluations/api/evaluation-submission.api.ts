import { http, type ApiError } from "@/lib/api.lib";
import type { ResultAsync } from "neverthrow";
import type {
  AnnexCFacultyReport,
  BatchConsolidationSummary,
  EvaluableStudentSubject,
  EvaluableSupervisorOffering,
  FacultyTeachingOffering,
  InstitutionalFERReport,
  PaginatedData,
  ReportStatus,
  StudentEvaluationFormView,
  SubmitStudentEvaluation,
  SubmitSupervisorEvaluation,
  SupervisorEvaluationFormView,
  UpdateFedafPlan,
} from "@my-app/shared";

export class EvaluationSubmissionAPI {
  // ── Student (SET) ──
  getStudentSubjects(): ResultAsync<EvaluableStudentSubject[], ApiError> {
    return http.get<EvaluableStudentSubject[]>("/evaluation-submissions/student/subjects");
  }

  getStudentFormView(studentClassId: number): ResultAsync<StudentEvaluationFormView, ApiError> {
    return http.get<StudentEvaluationFormView>(
      `/evaluation-submissions/student/form/${studentClassId}`,
    );
  }

  submitStudentEvaluation(payload: SubmitStudentEvaluation): ResultAsync<
    {
      evaluation_id: number;
      rating: number | null;
      sentiment_score: number | null;
      sentiment_classification: string | null;
    },
    ApiError
  > {
    return http.post("/evaluation-submissions/student/submit", payload);
  }

  // ── Supervisor (SEF) ──
  getSupervisorOfferings(): ResultAsync<EvaluableSupervisorOffering[], ApiError> {
    return http.get<EvaluableSupervisorOffering[]>("/evaluation-submissions/supervisor/offerings");
  }

  getSupervisorFormView(offeringId: number): ResultAsync<SupervisorEvaluationFormView, ApiError> {
    return http.get<SupervisorEvaluationFormView>(
      `/evaluation-submissions/supervisor/form/${offeringId}`,
    );
  }

  submitSupervisorEvaluation(payload: SubmitSupervisorEvaluation): ResultAsync<
    {
      evaluation_id: number;
      rating: number | null;
      sentiment_score: number | null;
      sentiment_classification: string | null;
    },
    ApiError
  > {
    return http.post("/evaluation-submissions/supervisor/submit", payload);
  }

  getFacultyTeachingOfferings(
    semesterId?: number,
  ): ResultAsync<FacultyTeachingOffering[], ApiError> {
    return http.get<FacultyTeachingOffering[]>("/evaluation-submissions/faculty/teaching-classes", {
      semester_id: semesterId,
    });
  }

  // ── Reports & Analytics Suite ──
  getReportsList(query?: unknown): ResultAsync<PaginatedData<AnnexCFacultyReport[]>, ApiError> {
    return http.get<PaginatedData<AnnexCFacultyReport[]>>("/evaluation-reports/list", query);
  }

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

  updateReportStatus(
    reportId: number,
    status: ReportStatus,
  ): ResultAsync<AnnexCFacultyReport, ApiError> {
    return http.put<AnnexCFacultyReport>(`/evaluation-reports/${reportId}/status`, { status });
  }

  updateFedafPlan(
    reportId: number,
    plan: UpdateFedafPlan,
  ): ResultAsync<AnnexCFacultyReport, ApiError> {
    return http.put<AnnexCFacultyReport>(`/evaluation-reports/${reportId}/fedaf`, plan);
  }

  signFedaf(
    reportId: number,
    signatureRole: "FACULTY" | "SUPERVISOR",
  ): ResultAsync<AnnexCFacultyReport, ApiError> {
    return http.post<AnnexCFacultyReport>(`/evaluation-reports/${reportId}/fedaf/sign`, {
      signatureRole,
    });
  }

  getInstitutionalFER(semesterId: number): ResultAsync<InstitutionalFERReport, ApiError> {
    return http.get<InstitutionalFERReport>("/evaluation-reports/institutional-fer", {
      semester_id: semesterId,
    });
  }
}
