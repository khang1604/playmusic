import type { JSendResponse } from "../types";

/**
 * Creates a standardized JSend Success response.
 */
export function successResponse<T>(data: T, message?: string): JSendResponse<T> {
  return {
    success: true,
    data,
    ...(message ? { message } : {})
  };
}

/**
 * Creates a standardized JSend Error response.
 */
export function errorResponse<T = never>(
  code: string,
  message: string,
  details?: unknown
): JSendResponse<T> {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    }
  };
}
