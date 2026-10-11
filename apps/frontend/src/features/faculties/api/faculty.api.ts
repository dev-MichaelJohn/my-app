import { http, type ApiError } from "@/lib/api.lib";
import type { GetFaculty, IFacultyInsert, IFacultyUpdate, PaginatedData } from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class FacultyAPI {
  getFaculties(rawQuery?: unknown): ResultAsync<PaginatedData<GetFaculty[]>, ApiError> {
    return http.get<PaginatedData<GetFaculty[]>>("/faculties", rawQuery);
  }

  getFacultyById(id: number): ResultAsync<GetFaculty, ApiError> {
    return http.get<GetFaculty>(`/faculties/${id}`);
  }

  createFaculty(info: IFacultyInsert): ResultAsync<GetFaculty, ApiError> {
    return http.post<GetFaculty>("/faculties", info);
  }

  updateFaculty(id: number, info: IFacultyUpdate): ResultAsync<GetFaculty, ApiError> {
    return http.put<GetFaculty>(`/faculties/${id}`, info);
  }

  deleteFaculty(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/faculties/${id}`);
  }

  restoreFaculty(id: number): ResultAsync<GetFaculty, ApiError> {
    return http.put<GetFaculty>(`/faculties/${id}/restore`);
  }
}
