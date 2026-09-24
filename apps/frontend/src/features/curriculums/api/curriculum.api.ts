import type {
  GetCurriculum,
  ICurriculumInsert,
  ICurriculumUpdate,
  PaginatedData,
} from "@my-app/shared";
import type { ResultAsync } from "neverthrow";
import { type ApiError, http } from "@/lib/api.lib";

export class CurriculumAPI {
  getCurriculums(rawQuery: unknown): ResultAsync<PaginatedData<GetCurriculum[]>, ApiError> {
    return http.get<PaginatedData<GetCurriculum[]>>("/curriculums", rawQuery);
  }

  getCurriculum(id: number): ResultAsync<GetCurriculum, ApiError> {
    return http.get<GetCurriculum>(`/curriculums/${id}`);
  }

  createCurriculum(info: ICurriculumInsert): ResultAsync<GetCurriculum, ApiError> {
    return http.post<GetCurriculum>("/curriculums", info);
  }

  updateCurriculum(id: number, info: ICurriculumUpdate): ResultAsync<GetCurriculum, ApiError> {
    return http.put<GetCurriculum>(`/curriculums/${id}`, info);
  }

  deleteCurriculum(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/curriculums/${id}`);
  }

  restoreCurriculum(id: number): ResultAsync<GetCurriculum, ApiError> {
    return http.put<GetCurriculum>(`/curriculums/${id}/restore`);
  }
}
