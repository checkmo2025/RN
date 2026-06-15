import {
  ApiError,
  PROFILE_INCOMPLETE_MESSAGE,
  isProfileIncompleteApiError,
} from '../services/api/http';

export function resolveApiError(
  error: unknown,
  overrides: Partial<Record<number, string>>,
  fallback: string,
): string {
  if (!(error instanceof ApiError)) return fallback;
  if (isProfileIncompleteApiError(error)) return PROFILE_INCOMPLETE_MESSAGE;
  const msg = overrides[error.status];
  if (msg) return msg;
  const normalized = error.message?.trim();
  return normalized || fallback;
}
