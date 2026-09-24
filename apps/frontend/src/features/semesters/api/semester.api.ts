import { http, type ApiError } from "@/lib/api.lib";
import type {
  ISemesterInsert,
  ISemesterSelect,
  ISemesterUpdate,
  PaginatedData,
} from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class SemesterAPI {
  getSemesters(rawQuery: unknown): ResultAsync<PaginatedData<ISemesterSelect[]>, ApiError> {
    return http.get<PaginatedData<ISemesterSelect[]>>("/semesters", rawQuery);
  }

  getActiveSemester(): ResultAsync<ISemesterSelect, ApiError> {
    return http.get<ISemesterSelect>("/semesters/active");
  }

  getSemester(id: number): ResultAsync<ISemesterSelect, ApiError> {
    return http.get<ISemesterSelect>(`/semesters/${id}`);
  }

  createSemester(info: ISemesterInsert): ResultAsync<ISemesterSelect, ApiError> {
    return http.post<ISemesterSelect>("/semesters", info);
  }

  updateSemester(id: number, info: ISemesterUpdate): ResultAsync<ISemesterSelect, ApiError> {
    return http.put<ISemesterSelect>(`/semesters/${id}`, info);
  }

  deleteSemester(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/semesters/${id}`);
  }

  restoreSemester(id: number): ResultAsync<ISemesterSelect, ApiError> {
    return http.put<ISemesterSelect>(`/semesters/${id}/restore`);
  }

  forceStopSemester(id: number): ResultAsync<ISemesterSelect, ApiError> {
    return http.put<ISemesterSelect>(`/semesters/${id}/force-stop`);
  }
}
