import type { APIResponse, CreatePaginatedDataArgs, PaginatedData } from "@my-app/shared";

export const createAPIResponse = <T>(
  status: number,
  message: string,
  data: T | null = null,
  errors: unknown = null,
) => {
  const response: APIResponse<T> = {
    success: status >= 200 && status < 300,
    status,
    message,
    ...(data !== null && { data }),
  };

  if (errors !== null) response.errors = errors;

  return response;
};

export const createPaginatedData = <T>({
  data,
  currentPage,
  pageSize,
  totalItems,
}: CreatePaginatedDataArgs<T>): PaginatedData<T> => {
  const totalPage = Math.ceil(totalItems / pageSize);
  return {
    data,
    pagination: {
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPage,
      currentPage,
      totalPage,
      totalItems,
    },
  };
};
