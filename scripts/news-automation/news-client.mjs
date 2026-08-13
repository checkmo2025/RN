import {
  authenticatedApiRequest,
  AutomationAuthError,
  publicApiRequest,
} from '../book-story-automation/auth-client.mjs';
import { normalizeComparableText, normalizeComparableUrl } from './draft.mjs';

export async function resolveRequesterEmail() {
  const profilePayload = await authenticatedApiRequest('/members/me', { method: 'GET' });
  const nickname = profilePayload?.result?.nickname;
  if (typeof nickname !== 'string' || !nickname.trim()) {
    throw new AutomationAuthError('로그인 계정의 회원 정보를 확인하지 못했습니다.');
  }

  // 관리자 회원 검색의 keyword는 로그인 ID 또는 이메일 기준이므로 프로필 닉네임을
  // 검색어로 보내지 않는다. 페이지를 순서대로 읽고 동일 닉네임의 회원을 찾는다.
  const matches = [];
  let page = 1;
  let totalPages = 1;
  do {
    const query = new URLSearchParams({ page: String(page) });
    const membersPayload = await authenticatedApiRequest(`/admin/members?${query}`, {
      method: 'GET',
    });
    const result = membersPayload?.result;
    const members = result?.memberList;
    if (!Array.isArray(members)) {
      throw new AutomationAuthError('관리자 회원 검색 결과를 확인하지 못했습니다.');
    }
    matches.push(...members.filter((member) => member?.nickname === nickname));
    totalPages = Number.isSafeInteger(Number(result?.totalPages))
      ? Math.max(1, Number(result.totalPages))
      : 1;
    page += 1;
  } while (page <= totalPages && matches.length === 0);

  if (matches.length !== 1 || typeof matches[0]?.email !== 'string' || !matches[0].email.trim()) {
    throw new AutomationAuthError('로그인 계정과 소식 작성자 이메일을 정확히 연결하지 못했습니다.');
  }
  return matches[0].email.trim();
}

async function adminTitleCandidates(title) {
  const query = new URLSearchParams({ page: '0', keyword: title });
  const payload = await authenticatedApiRequest(`/admin/news?${query}`, { method: 'GET' });
  const items = payload?.result?.basicInfoList;
  if (!Array.isArray(items)) {
    throw new AutomationAuthError('관리자 소식 검색 결과를 확인하지 못했습니다.');
  }
  return items;
}

async function publicCurrentDetails() {
  const details = [];
  let cursor = null;
  do {
    const query = cursor === null ? '' : `?cursorId=${encodeURIComponent(cursor)}`;
    const payload = await publicApiRequest(`/news${query}`, { method: 'GET' });
    const result = payload?.result;
    if (!Array.isArray(result?.basicInfoList)) {
      throw new AutomationAuthError('공개 소식 목록 결과를 확인하지 못했습니다.');
    }
    for (const summary of result.basicInfoList) {
      const newsId = Number(summary?.newsId);
      if (!Number.isSafeInteger(newsId) || newsId <= 0) continue;
      const detailPayload = await publicApiRequest(`/news/${newsId}`, { method: 'GET' });
      if (detailPayload?.result) details.push(detailPayload.result);
    }
    cursor = result.hasNext ? result.nextCursor : null;
  } while (cursor !== null && cursor !== undefined);
  return details;
}

export async function findPotentialDuplicate(item) {
  const expectedTitle = normalizeComparableText(item.title);
  const expectedLink = normalizeComparableUrl(item.originalLink);
  const candidates = await adminTitleCandidates(item.title);
  for (const candidate of candidates) {
    if (normalizeComparableText(candidate?.title ?? '') !== expectedTitle) continue;
    const newsId = Number(candidate.newsId);
    if (!Number.isSafeInteger(newsId) || newsId <= 0) continue;
    const detail = await authenticatedApiRequest(`/admin/news/${newsId}`, { method: 'GET' });
    return { newsId, reason: '같은 제목', detail: detail?.result ?? null };
  }

  const currentDetails = await publicCurrentDetails();
  const sourceMatch = currentDetails.find((detail) => {
    try {
      return normalizeComparableUrl(detail?.originalLink ?? '') === expectedLink;
    } catch {
      return false;
    }
  });
  if (sourceMatch) {
    return { newsId: Number(sourceMatch.newsId), reason: '같은 공식 원문 링크', detail: sourceMatch };
  }
  return null;
}

function assertAdminVerification(item, request, newsId, detail) {
  if (
    Number(detail?.newsId) !== newsId ||
    detail?.title !== item.title ||
    detail?.content !== item.content ||
    detail?.originalLink !== item.originalLink ||
    detail?.thumbnailUrl !== request.thumbnailUrl ||
    detail?.carousel !== item.carousel ||
    detail?.publishStartAt !== item.publishStartAt ||
    detail?.publishEndAt !== item.publishEndAt ||
    JSON.stringify(detail?.imageUrls ?? []) !== JSON.stringify(request.imageUrls)
  ) {
    throw new AutomationAuthError(
      `소식 ${newsId}번이 생성됐지만 관리자 상세 값 검증에 실패했습니다. 재업로드하지 마세요.`,
    );
  }
}

function assertPublicVerification(item, request, newsId, detail) {
  if (
    Number(detail?.newsId) !== newsId ||
    detail?.title !== item.title ||
    detail?.content !== item.content ||
    detail?.originalLink !== item.originalLink ||
    detail?.thumbnailUrl !== request.thumbnailUrl ||
    detail?.carousel !== item.carousel ||
    detail?.publishStartAt !== item.publishStartAt
  ) {
    throw new AutomationAuthError(
      `소식 ${newsId}번이 생성됐지만 공개 상세 검증에 실패했습니다. 재업로드하지 마세요.`,
    );
  }
}

export async function createAndVerifyNews(item, requesterEmail, { thumbnailUrl, imageUrls }) {
  const request = {
    title: item.title,
    requesterEmail,
    content: item.content,
    thumbnailUrl,
    originalLink: item.originalLink,
    publishStartAt: item.publishStartAt,
    publishEndAt: item.publishEndAt,
    carousel: item.carousel,
    imageUrls,
  };
  const payload = await authenticatedApiRequest('/admin/news', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const newsId = Number(payload?.result);
  if (!Number.isSafeInteger(newsId) || newsId <= 0) {
    throw new AutomationAuthError(
      '소식 등록 응답에서 소식 ID를 확인하지 못했습니다. 중복 여부를 확인하기 전 재업로드하지 마세요.',
    );
  }

  const adminPayload = await authenticatedApiRequest(`/admin/news/${newsId}`, { method: 'GET' });
  assertAdminVerification(item, request, newsId, adminPayload?.result);
  const publicPayload = await publicApiRequest(`/news/${newsId}`, { method: 'GET' });
  assertPublicVerification(item, request, newsId, publicPayload?.result);
  return newsId;
}
