import { http, type ApiError } from "@/lib/api.lib";
import type { CreateProgram, GetProgram, PaginatedData, UpdateProgram } from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class ProgramAPI {
  getPrograms(rawQuery: unknown): ResultAsync<PaginatedData<GetProgram[]>, ApiError> {
    return http.get<PaginatedData<GetProgram[]>>("/programs", rawQuery);
  }

  getProgram(id: number): ResultAsync<GetProgram, ApiError> {
    return http.get<GetProgram>(`/programs/${id}`);
  }

  createProgram(info: CreateProgram): ResultAsync<GetProgram, ApiError> {
    return http.post<GetProgram>("/programs", info);
  }

  updateProgram(id: number, info: UpdateProgram): ResultAsync<GetProgram, ApiError> {
    return http.put<GetProgram>(`/programs/${id}`, info);
  }

  deleteProgram(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/programs/${id}`);
  }

  restoreProgram(id: number): ResultAsync<GetProgram, ApiError> {
    return http.put<GetProgram>(`/programs/${id}/restore`);
  }
}
