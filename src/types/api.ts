// Mirrors backend/common/.../web/ApiResponse.java and ApiError.java - every endpoint replies in this envelope.
export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors: ApiFieldError[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
  timestamp: string;
}

// Mirrors backend/common/.../web/PageResponse.java - the `data` payload of a paginated endpoint's ApiResponse.
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
