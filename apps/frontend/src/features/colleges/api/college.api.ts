import { http, type ApiError } from "@/lib/api.lib";
import type { CreateCollege, GetCollege, PaginatedData, UpdateCollege } from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class CollegeAPI {
  getColleges(rawQuery: unknown): ResultAsync<PaginatedData<GetCollege[]>, ApiError> {
    return http.get<PaginatedData<GetCollege[]>>("/colleges", rawQuery);
  }

  getCollege(id: number): ResultAsync<GetCollege, ApiError> {
    return http.get<GetCollege>(`/colleges/${id}`);
  }

  createCollege(info: CreateCollege): ResultAsync<GetCollege, ApiError> {
    return http.post<GetCollege>("/colleges", info);
  }

  updateCollege(id: number, info: UpdateCollege): ResultAsync<GetCollege, ApiError> {
    return http.put<GetCollege>(`/colleges/${id}`, info);
  }

  deleteCollege(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/colleges/${id}`);
  }

  restoreCollege(id: number): ResultAsync<GetCollege, ApiError> {
    return http.put<GetCollege>(`/colleges/${id}/restore`);
  }
}
