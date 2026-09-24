import { http, type ApiError } from "@/lib/api.lib";
import type {
  GenerateOfferingsSummary,
  GetOffering,
  IOfferingInsert,
  IOfferingUpdate,
  PaginatedData,
} from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class OfferingAPI {
  getOfferings(rawQuery: unknown): ResultAsync<PaginatedData<GetOffering[]>, ApiError> {
    return http.get<PaginatedData<GetOffering[]>>("/offerings", rawQuery);
  }

  generateOfferings(id: number): ResultAsync<GenerateOfferingsSummary, ApiError> {
    return http.post<GenerateOfferingsSummary>(`/offerings/generate/${id}`);
  }

  getOffering(id: number): ResultAsync<GetOffering, ApiError> {
    return http.get<GetOffering>(`/offerings/${id}`);
  }

  createOffering(info: IOfferingInsert): ResultAsync<GetOffering, ApiError> {
    return http.post<GetOffering>("/offerings", info);
  }

  updateOffering(id: number, info: IOfferingUpdate): ResultAsync<GetOffering, ApiError> {
    return http.put<GetOffering>(`/offerings/${id}`, info);
  }

  deleteOffering(id: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/offerings/${id}`);
  }

  restoreOffering(id: number): ResultAsync<GetOffering, ApiError> {
    return http.delete<GetOffering>(`/offerings/${id}`);
  }
}
