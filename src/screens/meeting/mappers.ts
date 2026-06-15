import type { ClubContact } from '../../services/api/clubApi';
import {
  ApiError,
  PROFILE_INCOMPLETE_MESSAGE,
  isProfileIncompleteApiError,
} from '../../services/api/http';

export function toLabelList(
  values: unknown,
  codeToLabel: Record<string, string>,
): string[] {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => {
      if (typeof value === 'string') {
        return codeToLabel[value] ?? value;
      }

      if (typeof value === 'object' && value !== null) {
        const candidate = value as { code?: unknown; description?: unknown };
        if (typeof candidate.description === 'string' && candidate.description.length > 0) {
          return candidate.description;
        }
        if (typeof candidate.code === 'string') {
          return codeToLabel[candidate.code] ?? candidate.code;
        }
      }

      return null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export function normalizeClubContacts(value: unknown): ClubContact[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const link = item.trim();
        if (!link) return null;
        return { link };
      }

      if (typeof item !== 'object' || item === null) return null;
      const record = item as Record<string, unknown>;
      const linkCandidate = [record.link, record.url, record.href, record.originalLink].find(
        (candidate) => candidate !== null && typeof candidate !== 'undefined',
      );
      const labelCandidate = [record.label, record.text, record.name, record.title].find(
        (candidate) => candidate !== null && typeof candidate !== 'undefined',
      );
      const link = typeof linkCandidate === 'string' ? linkCandidate.trim() : '';
      if (!link) return null;

      return {
        label: typeof labelCandidate === 'string' ? labelCandidate.trim() || undefined : undefined,
        link,
      };
    })
    .filter((item): item is ClubContact => Boolean(item));
}

export function formatContactLabel(contact: ClubContact): string {
  const label = contact.label?.trim();
  if (label) return label;

  return (
    contact.link
      .trim()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/$/, '') || '문의 링크'
  );
}

export function mapClubStatusToApplication(status?: string): string | undefined {
  switch (status) {
    case 'PENDING':
      return '신청 완료되었습니다';
    case 'MEMBER':
    case 'STAFF':
    case 'OWNER':
      return '가입 완료되었습니다';
    default:
      return undefined;
  }
}

export function resolveMeetingSearchErrorMessage(
  error: unknown,
  options?: { recommendation?: boolean },
): string {
  if (!(error instanceof ApiError)) {
    return options?.recommendation ? '추천 모임을 불러오지 못했습니다.' : '모임 검색에 실패했습니다.';
  }

  if (error.status === 401) return '로그인 상태를 확인해 주십시오.';
  if (error.status === 400) return '검색 조건을 다시 확인해야 합니다.';
  if (isProfileIncompleteApiError(error)) return PROFILE_INCOMPLETE_MESSAGE;
  if (error.status === 403) return '접근 권한이 없습니다.';
  if (error.status === 404) return '요청한 모임 정보를 찾을 수 없습니다.';

  const message = error.message?.trim();
  if (message) return message;
  return options?.recommendation ? '추천 모임을 불러오지 못했습니다.' : '모임 검색에 실패했습니다.';
}

export function resolveBookshelfActionErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  if (error.status === 400) return '입력 값을 다시 확인해야 합니다.';
  if (error.status === 401) return '로그인 상태를 확인해 주십시오.';
  if (isProfileIncompleteApiError(error)) return PROFILE_INCOMPLETE_MESSAGE;
  if (error.status === 403) return '권한이 없습니다.';
  if (error.status === 404) return '요청한 책장 정보를 찾을 수 없습니다.';

  const message = error.message?.trim();
  return message || fallback;
}
