export interface APIResponse<T = unknown> {
  success: boolean;
  status: number;
  message: string;
  data?: T;
  errors?: unknown;
}

export interface PaginatedData<T = unknown> {
  data: T;
  pagination: {
    hasPrev: boolean;
    hasNext: boolean;
    currentPage: number;
    totalPage: number;
    totalItems: number;
  };
}

export interface CreatePaginatedDataArgs<T = unknown> {
  data: T;
  currentPage: number;
  pageSize: number;
  totalItems: number;
}
