import { http, type ApiError } from "@/lib/api.lib";
import type {
  GetStudentClass,
  IStudentClassInsert,
  IStudentClassUpdate,
  PaginatedData,
} from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class StudentClassAPI {
  getStudentClasses(rawQuery: unknown): ResultAsync<PaginatedData<GetStudentClass[]>, ApiError> {
    return http.get<PaginatedData<GetStudentClass[]>>("/student-class", rawQuery);
  }

  getStudentClass(id: number): ResultAsync<GetStudentClass, ApiError> {
    return http.get<GetStudentClass>(`/student-classes/${id}`);
  }

  createStudentClass(info: IStudentClassInsert): ResultAsync<GetStudentClass, ApiError> {
    return http.post<GetStudentClass>("/student-classes", info);
  }

  updateStudentClass(
    id: number,
    info: IStudentClassUpdate,
  ): ResultAsync<GetStudentClass, ApiError> {
    return http.put<GetStudentClass>(`/student-classes/${id}`, info);
  }

  deleteStudentClass(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/student-classes/${id}`);
  }

  restoreStudentClass(id: number): ResultAsync<GetStudentClass, ApiError> {
    return http.put<GetStudentClass>(`/student-classes/${id}/restore`);
  }
}
