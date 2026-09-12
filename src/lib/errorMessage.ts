import { AxiosError } from 'axios';
import type { ApiFieldError } from '@/types/api';

/**
 * Pulls a usable message out of a failed axios call - for most errors that's the backend's
 * ApiError.message verbatim (e.g. "Razorpay is not configured"), but a bean-validation failure
 * (code VALIDATION_ERROR) carries its real detail in `fieldErrors` instead, with `message` itself
 * just a generic "Request failed validation". Without this, every validation error a user hits -
 * including the phone/coordinate/amount checks added in this pass - would show that same unhelpful
 * generic line no matter which field or why.
 */
export function backendErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data?.error;
    const fieldErrors: ApiFieldError[] | undefined = apiError?.fieldErrors;
    if (fieldErrors && fieldErrors.length > 0) {
      return fieldErrors.map((fe) => (fe.field ? `${fe.field}: ${fe.message}` : fe.message)).join('; ');
    }
    const message = apiError?.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return fallback;
}
