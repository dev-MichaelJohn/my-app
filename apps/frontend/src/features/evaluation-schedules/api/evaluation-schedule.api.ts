import { http, type ApiError } from "@/lib/api.lib";
import type { ResultAsync } from "neverthrow";
import type {
  GetStudentSchedule,
  GetSupervisorSchedule,
  IStudentScheduleInsert,
  IStudentScheduleUpdate,
  ISupervisorScheduleInsert,
  ISupervisorScheduleUpdate,
  PaginatedData,
} from "@my-app/shared";

export class EvaluationScheduleAPI {
  // ── Student Evaluation Schedules (SET) ──
  getStudentSchedules(query?: unknown): ResultAsync<PaginatedData<GetStudentSchedule[]>, ApiError> {
    return http.get<PaginatedData<GetStudentSchedule[]>>("/evaluation-schedules/student", query);
  }

  getStudentScheduleById(id: number): ResultAsync<GetStudentSchedule, ApiError> {
    return http.get<GetStudentSchedule>(`/evaluation-schedules/student/${id}`);
  }

  getActiveStudentSchedule(semesterId?: number): ResultAsync<GetStudentSchedule | null, ApiError> {
    return http.get<GetStudentSchedule | null>("/evaluation-schedules/student/active", {
      semester_id: semesterId,
    });
  }

  createStudentSchedule(info: IStudentScheduleInsert): ResultAsync<GetStudentSchedule, ApiError> {
    return http.post<GetStudentSchedule>("/evaluation-schedules/student", info);
  }

  updateStudentSchedule(
    id: number,
    info: IStudentScheduleUpdate,
  ): ResultAsync<GetStudentSchedule, ApiError> {
    return http.put<GetStudentSchedule>(`/evaluation-schedules/student/${id}`, info);
  }

  deleteStudentSchedule(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/evaluation-schedules/student/${id}`);
  }

  restoreStudentSchedule(id: number): ResultAsync<GetStudentSchedule, ApiError> {
    return http.put<GetStudentSchedule>(`/evaluation-schedules/student/${id}/restore`);
  }

  forceStopStudentSchedule(id: number): ResultAsync<GetStudentSchedule, ApiError> {
    return http.put<GetStudentSchedule>(`/evaluation-schedules/student/${id}/force-stop`);
  }

  // ── Supervisor Evaluation Schedules (SEF) ──
  getSupervisorSchedules(
    query?: unknown,
  ): ResultAsync<PaginatedData<GetSupervisorSchedule[]>, ApiError> {
    return http.get<PaginatedData<GetSupervisorSchedule[]>>(
      "/evaluation-schedules/supervisor",
      query,
    );
  }

  getSupervisorScheduleById(id: number): ResultAsync<GetSupervisorSchedule, ApiError> {
    return http.get<GetSupervisorSchedule>(`/evaluation-schedules/supervisor/${id}`);
  }

  getActiveSupervisorSchedule(
    semesterId?: number,
  ): ResultAsync<GetSupervisorSchedule | null, ApiError> {
    return http.get<GetSupervisorSchedule | null>("/evaluation-schedules/supervisor/active", {
      semester_id: semesterId,
    });
  }

  createSupervisorSchedule(
    info: ISupervisorScheduleInsert,
  ): ResultAsync<GetSupervisorSchedule, ApiError> {
    return http.post<GetSupervisorSchedule>("/evaluation-schedules/supervisor", info);
  }

  updateSupervisorSchedule(
    id: number,
    info: ISupervisorScheduleUpdate,
  ): ResultAsync<GetSupervisorSchedule, ApiError> {
    return http.put<GetSupervisorSchedule>(`/evaluation-schedules/supervisor/${id}`, info);
  }

  deleteSupervisorSchedule(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/evaluation-schedules/supervisor/${id}`);
  }

  restoreSupervisorSchedule(id: number): ResultAsync<GetSupervisorSchedule, ApiError> {
    return http.put<GetSupervisorSchedule>(`/evaluation-schedules/supervisor/${id}/restore`);
  }

  forceStopSupervisorSchedule(id: number): ResultAsync<GetSupervisorSchedule, ApiError> {
    return http.put<GetSupervisorSchedule>(`/evaluation-schedules/supervisor/${id}/force-stop`);
  }
}
