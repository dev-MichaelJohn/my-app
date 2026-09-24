import { http, type ApiError } from "@/lib/api.lib";
import type { ICourseInsert, ICourseSelect, ICourseUpdate, PaginatedData } from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class CourseAPI {
  getCourses(rawQuery: unknown): ResultAsync<PaginatedData<ICourseSelect[]>, ApiError> {
    return http.get<PaginatedData<ICourseSelect[]>>("/courses", rawQuery);
  }

  getCourse(id: number): ResultAsync<ICourseSelect, ApiError> {
    return http.get<ICourseSelect>(`/courses/${id}`);
  }

  createCourse(info: ICourseInsert): ResultAsync<ICourseSelect, ApiError> {
    return http.post<ICourseSelect>("/courses", info);
  }

  updateCourse(id: number, info: ICourseUpdate): ResultAsync<ICourseSelect, ApiError> {
    return http.put<ICourseSelect>(`/courses/${id}`, info);
  }

  deleteCourse(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/courses/${id}`);
  }

  restoreCourse(id: number): ResultAsync<ICourseSelect, ApiError> {
    return http.put<ICourseSelect>(`/courses/${id}/restore`);
  }
}
