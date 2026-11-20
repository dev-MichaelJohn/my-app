import { http, type ApiError } from "@/lib/api.lib";
import type {
  CreateOfferingStudentPayload,
  GetOfferingStudent,
  IOfferingStudentUpdate,
  PaginatedData,
} from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class OfferingStudentAPI {
  getOfferingStudents(
    rawQuery: unknown,
  ): ResultAsync<PaginatedData<GetOfferingStudent[]>, ApiError> {
    return http.get<PaginatedData<GetOfferingStudent[]>>("/offering-students", rawQuery);
  }

  getOfferingStudent(id: number): ResultAsync<GetOfferingStudent, ApiError> {
    return http.get<GetOfferingStudent>(`/offering-students/${id}`);
  }

  createOfferingStudent(
    info: CreateOfferingStudentPayload,
  ): ResultAsync<GetOfferingStudent, ApiError> {
    return http.post<GetOfferingStudent>("/offering-students", info);
  }

  updateOfferingStudent(
    id: number,
    info: IOfferingStudentUpdate,
  ): ResultAsync<GetOfferingStudent, ApiError> {
    return http.put<GetOfferingStudent>(`/offering-students/${id}`, info);
  }

  deleteOfferingStudent(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/offering-students/${id}`);
  }

  restoreOfferingStudent(id: number): ResultAsync<GetOfferingStudent, ApiError> {
    return http.put<GetOfferingStudent>(`/offering-students/${id}/restore`);
  }
}
