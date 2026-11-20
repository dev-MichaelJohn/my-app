import { http, type ApiError } from "@/lib/api.lib";
import type {
  CreateClassStudentPayload,
  GetClassStudent,
  IClassStudentUpdate,
  PaginatedData,
} from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class ClassStudentAPI {
  getClassStudents(rawQuery: unknown): ResultAsync<PaginatedData<GetClassStudent[]>, ApiError> {
    return http.get<PaginatedData<GetClassStudent[]>>("/class-students", rawQuery);
  }

  getClassStudent(id: number): ResultAsync<GetClassStudent, ApiError> {
    return http.get<GetClassStudent>(`/class-students/${id}`);
  }

  createClassStudent(info: CreateClassStudentPayload): ResultAsync<GetClassStudent, ApiError> {
    return http.post<GetClassStudent>("/class-students", info);
  }

  updateClassStudent(
    id: number,
    info: IClassStudentUpdate,
  ): ResultAsync<GetClassStudent, ApiError> {
    return http.put<GetClassStudent>(`/class-students/${id}`, info);
  }

  deleteClassStudent(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/class-students/${id}`);
  }

  restoreClassStudent(id: number): ResultAsync<GetClassStudent, ApiError> {
    return http.put<GetClassStudent>(`/class-students/${id}/restore`);
  }
}
