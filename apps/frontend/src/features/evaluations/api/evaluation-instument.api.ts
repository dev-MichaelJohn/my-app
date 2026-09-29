import { http, type ApiError } from "@/lib/api.lib";
import type { ResultAsync } from "neverthrow";
import type {
  GetStudentEvaluationForm,
  GetSupervisorEvaluationForm,
  IStudentEvalFormInsert,
  IStudentEvalFormSelect,
  IStudentEvalFormUpdate,
  ISupervisorEvalFormInsert,
  ISupervisorEvalFormSelect,
  ISupervisorEvalFormUpdate,
  PaginatedData,
} from "@my-app/shared";

export class EvaluationInstrumentAPI {
  // ── Student Forms (SET) ──
  getStudentForms(query?: unknown): ResultAsync<PaginatedData<IStudentEvalFormSelect[]>, ApiError> {
    return http.get<PaginatedData<IStudentEvalFormSelect[]>>(
      "/evaluation-instruments/student",
      query,
    );
  }

  getStudentFormById(id: number): ResultAsync<GetStudentEvaluationForm, ApiError> {
    return http.get<GetStudentEvaluationForm>(`/evaluation-instruments/student/${id}`);
  }

  createStudentForm(info: IStudentEvalFormInsert): ResultAsync<IStudentEvalFormSelect, ApiError> {
    return http.post<IStudentEvalFormSelect>("/evaluation-instruments/student", info);
  }

  updateStudentForm(
    id: number,
    info: IStudentEvalFormUpdate,
  ): ResultAsync<IStudentEvalFormSelect, ApiError> {
    return http.put<IStudentEvalFormSelect>(`/evaluation-instruments/student/${id}`, info);
  }

  deleteStudentForm(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/evaluation-instruments/student/${id}`);
  }

  restoreStudentForm(id: number): ResultAsync<GetStudentEvaluationForm, ApiError> {
    return http.put<GetStudentEvaluationForm>(`/evaluation-instruments/student/${id}/restore`);
  }

  // ── Supervisor Forms (SEF) ──
  getSupervisorForms(
    query?: unknown,
  ): ResultAsync<PaginatedData<ISupervisorEvalFormSelect[]>, ApiError> {
    return http.get<PaginatedData<ISupervisorEvalFormSelect[]>>(
      "/evaluation-instruments/supervisor",
      query,
    );
  }

  getSupervisorFormById(id: number): ResultAsync<GetSupervisorEvaluationForm, ApiError> {
    return http.get<GetSupervisorEvaluationForm>(`/evaluation-instruments/supervisor/${id}`);
  }

  createSupervisorForm(
    info: ISupervisorEvalFormInsert,
  ): ResultAsync<ISupervisorEvalFormSelect, ApiError> {
    return http.post<ISupervisorEvalFormSelect>("/evaluation-instruments/supervisor", info);
  }

  updateSupervisorForm(
    id: number,
    info: ISupervisorEvalFormUpdate,
  ): ResultAsync<ISupervisorEvalFormSelect, ApiError> {
    return http.put<ISupervisorEvalFormSelect>(`/evaluation-instruments/supervisor/${id}`, info);
  }

  deleteSupervisorForm(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/evaluation-instruments/supervisor/${id}`);
  }

  restoreSupervisorForm(id: number): ResultAsync<GetSupervisorEvaluationForm, ApiError> {
    return http.put<GetSupervisorEvaluationForm>(
      `/evaluation-instruments/supervisor/${id}/restore`,
    );
  }
}
