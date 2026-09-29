import { http, type ApiError } from "@/lib/api.lib";
import type { ResultAsync } from "neverthrow";
import type {
  EvaluableStudentSubject,
  EvaluableSupervisorOffering,
  StudentEvaluationFormView,
  SubmitStudentEvaluation,
  SubmitSupervisorEvaluation,
  SupervisorEvaluationFormView,
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
}
