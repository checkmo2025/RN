import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AutomationAuthError } from '../book-story-automation/auth-client.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, '../..');
export const DEFAULT_DRAFT_PATH = path.join(SCRIPT_DIR, 'generated/latest-draft.json');

export const NEWS_CATEGORIES = [
  '작가 북토크',
  '독립서점 행사',
  '출판사 이벤트',
  '도서관 강연',
  '문학관 전시',
  '북페어',
  '독서모임 모집',
  '책 관련 공모전',
];

export const NEWS_PROGRESS_STATUSES = ['모집중', '진행중', '개최예정'];
export const NEWS_WORKFLOW_STATUSES = ['DRAFT', 'PUBLISHED', 'NEEDS_REVIEW'];
const CAROUSEL_TYPES = ['PROMOTION', 'GENERAL'];
const IMAGE_PLANS = ['OFFICIAL', 'GENERATED'];

function countCharacters(value) {
  return Array.from(value).length;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AutomationAuthError(`${label} 값이 비어 있습니다.`);
  }
  return value.trim();
}

function validateDate(value, label) {
  const normalized = requireString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new AutomationAuthError(`${label}은 YYYY-MM-DD 형식이어야 합니다.`);
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new AutomationAuthError(`${label}에 존재하지 않는 날짜가 들어 있습니다.`);
  }
  return normalized;
}

function validateOptionalDate(value, label) {
  if (value === null || value === undefined || value === '') return null;
  return validateDate(value, label);
}

function validateUrl(value, label) {
  const normalized = requireString(value, label);
  let url;
  try {
    url = new URL(normalized);
  } catch {
    throw new AutomationAuthError(`${label}이 올바른 URL이 아닙니다.`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AutomationAuthError(`${label}은 HTTP 또는 HTTPS URL이어야 합니다.`);
  }
  url.hash = '';
  return url.toString();
}

function validateOptionalUrl(value, label) {
  if (value === null || value === undefined || value === '') return null;
  return validateUrl(value, label);
}

function validateThumbnail(value, itemLabel) {
  if (!isPlainObject(value)) {
    throw new AutomationAuthError(`${itemLabel}의 thumbnail 정보가 없습니다.`);
  }
  if (!IMAGE_PLANS.includes(value.plan)) {
    throw new AutomationAuthError(
      `${itemLabel}의 thumbnail.plan은 OFFICIAL 또는 GENERATED여야 합니다.`,
    );
  }
  return {
    plan: value.plan,
    sourceUrl: validateOptionalUrl(value.sourceUrl, `${itemLabel} 대표 이미지 출처 URL`),
    localPath:
      value.localPath === null || value.localPath === undefined || value.localPath === ''
        ? null
        : requireString(value.localPath, `${itemLabel} 대표 이미지 경로`),
    rightsNote: requireString(value.rightsNote, `${itemLabel} 이미지 사용 근거`),
  };
}

function validateImageFiles(value, itemLabel) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new AutomationAuthError(`${itemLabel}의 imageFiles는 배열이어야 합니다.`);
  }
  if (value.length > 5) {
    throw new AutomationAuthError(`${itemLabel}의 상세 이미지는 최대 5개까지 가능합니다.`);
  }
  return value.map((entry, index) =>
    requireString(entry, `${itemLabel} 상세 이미지 ${index + 1} 경로`),
  );
}

function validateSource(value, itemLabel) {
  if (!isPlainObject(value)) {
    throw new AutomationAuthError(`${itemLabel}의 공식 출처 검수 정보가 없습니다.`);
  }
  const checkedAt = requireString(value.checkedAt, `${itemLabel} 출처 확인 시각`);
  if (Number.isNaN(Date.parse(checkedAt))) {
    throw new AutomationAuthError(`${itemLabel}의 출처 확인 시각이 올바르지 않습니다.`);
  }
  return {
    publisher: requireString(value.publisher, `${itemLabel} 공식 게시자`),
    pageUrl: validateUrl(value.pageUrl, `${itemLabel} 공식 출처 페이지`),
    checkedAt,
    evidence: requireString(value.evidence, `${itemLabel} 검수 근거`),
  };
}

export function normalizeComparableUrl(value) {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  }
  url.pathname = url.pathname.replace(/\/$/, '') || '/';
  return url.toString();
}

export function normalizeComparableText(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function validateDraftObject(input) {
  if (!isPlainObject(input) || input.version !== 1) {
    throw new AutomationAuthError('소식 초안 version은 1이어야 합니다.');
  }
  const generatedAt = requireString(input.generatedAt, '초안 생성 시각');
  if (Number.isNaN(Date.parse(generatedAt))) {
    throw new AutomationAuthError('초안 생성 시각이 올바르지 않습니다.');
  }
  const sourceCheckedAt = requireString(input.sourceCheckedAt, '전체 출처 확인 시각');
  if (Number.isNaN(Date.parse(sourceCheckedAt))) {
    throw new AutomationAuthError('전체 출처 확인 시각이 올바르지 않습니다.');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new AutomationAuthError('소식 초안에는 한 개 이상의 항목이 필요합니다.');
  }

  const ids = new Set();
  const titles = new Set();
  const links = new Set();
  const items = input.items.map((raw, index) => {
    const itemLabel = `초안 ${index + 1}번`;
    if (!isPlainObject(raw)) throw new AutomationAuthError(`${itemLabel} 형식이 올바르지 않습니다.`);
    const id = requireString(raw.id, `${itemLabel} ID`);
    if (ids.has(id)) throw new AutomationAuthError(`중복된 초안 ID가 있습니다: ${id}`);
    ids.add(id);

    const title = requireString(raw.title, `${itemLabel} 제목`);
    const titleLength = countCharacters(title);
    if (titleLength > 40) {
      throw new AutomationAuthError(`${itemLabel} 제목은 40자 이하여야 합니다. 현재 ${titleLength}자입니다.`);
    }
    const normalizedTitle = normalizeComparableText(title);
    if (titles.has(normalizedTitle)) throw new AutomationAuthError(`초안에 중복 제목이 있습니다: ${title}`);
    titles.add(normalizedTitle);

    if (!NEWS_CATEGORIES.includes(raw.category)) {
      throw new AutomationAuthError(`${itemLabel} 카테고리가 지정된 8개 분류에 속하지 않습니다.`);
    }
    if (!NEWS_PROGRESS_STATUSES.includes(raw.progressStatus)) {
      throw new AutomationAuthError(`${itemLabel} 진행 상태가 올바르지 않습니다.`);
    }
    const workflowStatus = raw.workflowStatus ?? 'DRAFT';
    if (!NEWS_WORKFLOW_STATUSES.includes(workflowStatus)) {
      throw new AutomationAuthError(`${itemLabel} 작업 상태가 올바르지 않습니다.`);
    }
    if (!CAROUSEL_TYPES.includes(raw.carousel)) {
      throw new AutomationAuthError(`${itemLabel} carousel은 PROMOTION 또는 GENERAL이어야 합니다.`);
    }

    const publishStartAt = validateDate(raw.publishStartAt, `${itemLabel} 게시 시작일`);
    const publishEndAt = validateDate(raw.publishEndAt, `${itemLabel} 게시 종료일`);
    if (publishStartAt > publishEndAt) {
      throw new AutomationAuthError(`${itemLabel} 게시 종료일이 시작일보다 빠릅니다.`);
    }

    const eventStartAt = validateOptionalDate(raw.eventStartAt, `${itemLabel} 행사 시작일`);
    const eventEndAt = validateOptionalDate(raw.eventEndAt, `${itemLabel} 행사 종료일`);
    const applicationDeadline = validateOptionalDate(
      raw.applicationDeadline,
      `${itemLabel} 신청 마감일`,
    );
    if (eventStartAt && eventEndAt && eventStartAt > eventEndAt) {
      throw new AutomationAuthError(`${itemLabel} 행사 종료일이 시작일보다 빠릅니다.`);
    }

    const originalLink = validateUrl(raw.originalLink, `${itemLabel} 원문 링크`);
    const normalizedLink = normalizeComparableUrl(originalLink);
    if (links.has(normalizedLink)) {
      throw new AutomationAuthError(`초안에 중복 원문 링크가 있습니다: ${originalLink}`);
    }
    links.add(normalizedLink);

    const source = validateSource(raw.source, itemLabel);
    if (normalizeComparableUrl(source.pageUrl) !== normalizedLink) {
      throw new AutomationAuthError(`${itemLabel} 원문 링크와 공식 출처 페이지가 다릅니다.`);
    }

    return {
      ...raw,
      id,
      title,
      category: raw.category,
      region: requireString(raw.region, `${itemLabel} 지역`),
      progressStatus: raw.progressStatus,
      content: requireString(raw.content, `${itemLabel} 본문`),
      publishStartAt,
      publishEndAt,
      eventStartAt,
      eventEndAt,
      applicationDeadline,
      originalLink,
      carousel: raw.carousel,
      thumbnail: validateThumbnail(raw.thumbnail, itemLabel),
      imageFiles: validateImageFiles(raw.imageFiles, itemLabel),
      source,
      workflowStatus,
    };
  });

  return { ...input, version: 1, generatedAt, sourceCheckedAt, items };
}

export async function readDraft(draftPath = DEFAULT_DRAFT_PATH) {
  let source;
  try {
    source = await readFile(draftPath, 'utf8');
  } catch (error) {
    throw new AutomationAuthError(`소식 초안 파일을 읽지 못했습니다: ${draftPath}`, {
      cause: error,
    });
  }
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new AutomationAuthError(`소식 초안 JSON 형식이 올바르지 않습니다: ${draftPath}`);
  }
  return { draftPath, draft: validateDraftObject(parsed) };
}

export async function saveDraft(draftPath, draft) {
  const validated = validateDraftObject(draft);
  const temporaryPath = `${draftPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, draftPath);
}

export function resolveWorkspacePath(filePath) {
  const resolved = path.resolve(WORKSPACE_ROOT, filePath);
  const relative = path.relative(WORKSPACE_ROOT, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AutomationAuthError('이미지 파일은 현재 checkmo_rn 프로젝트 안에 있어야 합니다.');
  }
  return resolved;
}
