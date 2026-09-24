import { http, type ApiError } from "@/lib/api.lib";
import type { GetClass, IClassInsert, IClassUpdate, PaginatedData } from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class ClassAPI {
  getClasses(rawQuery: unknown): ResultAsync<PaginatedData<GetClass[]>, ApiError> {
    return http.get<PaginatedData<GetClass[]>>("/classes", rawQuery);
  }

  getClass(id: number): ResultAsync<GetClass, ApiError> {
    return http.get<GetClass>(`/classes/${id}`);
  }

  createClass(info: IClassInsert): ResultAsync<GetClass, ApiError> {
    return http.post<GetClass>("/classes", info);
  }

  updateClass(id: number, info: IClassUpdate): ResultAsync<GetClass, ApiError> {
    return http.put<GetClass>(`/classes/${id}`, info);
  }

  deleteClass(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/classes/${id}`);
  }

  restoreClass(id: number): ResultAsync<GetClass, ApiError> {
    return http.post<GetClass>(`/classes/${id}/restore`);
  }
}
