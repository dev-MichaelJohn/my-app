import type {
  ChangePassword,
  CreateUser,
  GetUser,
  PaginatedData,
  SystemRole,
  UpdateUser,
} from "@my-app/shared";
import type { ResultAsync } from "neverthrow";
import { http, type ApiError } from "@/lib/api.lib";

export class UserAPI {
  getUsers(rawQuery?: unknown): ResultAsync<PaginatedData<GetUser[]>, ApiError> {
    return http.get<PaginatedData<GetUser[]>>("/users", rawQuery);
  }

  getUser(id: number): ResultAsync<GetUser, ApiError> {
    return http.get<GetUser>(`/users/${id}`);
  }

  createUser(info: CreateUser): ResultAsync<GetUser, ApiError> {
    return http.post<GetUser>("/users", info);
  }

  updateUser(id: number, info: UpdateUser): ResultAsync<GetUser, ApiError> {
    return http.put<GetUser>(`/users/${id}`, info);
  }

  deleteUser(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/users/${id}`);
  }

  restoreUser(id: number): ResultAsync<GetUser, ApiError> {
    return http.put<GetUser>(`/users/${id}/restore`);
  }

  manageRoles(id: number, roles: SystemRole[]): ResultAsync<GetUser, ApiError> {
    return http.put<GetUser>(`/users/${id}/roles`, { roles });
  }

  resetPassword(id: number): ResultAsync<{ temporaryPassword: string }, ApiError> {
    return http.put<{ temporaryPassword: string }>(`/users/${id}/reset-password`);
  }

  changePassword(id: number, payload: ChangePassword): ResultAsync<void, ApiError> {
    return http.put<void>(`/users/${id}/change-password`, payload);
  }

  resendWelcomeEmail(id: number): ResultAsync<void, ApiError> {
    return http.post<void>(`/users/${id}/resend-welcome`);
  }
}

export const userApi = new UserAPI();
