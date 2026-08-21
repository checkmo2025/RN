import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AutomationAuthError } from './auth-client.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DRAFT_PATH = path.resolve(
  SCRIPT_DIR,
  '../../docs/agent/pm/책이야기_자동화_초안.md',
);

const FORBIDDEN_PATTERNS = [
  /씨발/u,
  /시발/u,
  /병신/u,
  /개새끼/u,
  /좆/u,
  /지랄/u,
  /엿\s*먹/u,
  /멍청(?:이|한|하다)/u,
  /한심(?:한|하다)/u,
  /열등(?:한|하다)/u,
  /미개(?:한|하다)/u,
  /쓰레기\s*같/u,
];

const PERSONA_LENGTHS = {
  관리자: { min: 1800, max: 2300 },
  감성회원: { min: 800, max: 1200 },
};

function metadataLine(key, value) {
  return `${key}: ${value}`;
}

export async function createDraftTemplate(
  item,
  draftPath = DEFAULT_DRAFT_PATH,
  { overwrite = false } = {},
) {
  const source = [
    '---',
    metadataLine('bookTitle', item.bookTitle),
    metadataLine('author', item.author),
    metadataLine('persona', item.persona),
    metadataLine('isbn', item.isbn),
    '---',
    '# 여기에 게시글 제목을 작성하세요',
    '',
    '여기에 게시글 본문을 작성하세요.',
    '',
  ].join('\n');
  await writeFile(draftPath, source, { encoding: 'utf8', flag: overwrite ? 'w' : 'wx' });
  return draftPath;
}

function parseMetadata(lines) {
  if (lines[0]?.trim() !== '---') {
    throw new AutomationAuthError('초안 첫 줄에 메타데이터 시작 표시(`---`)가 없습니다.');
  }
  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endIndex < 0) {
    throw new AutomationAuthError('초안 메타데이터 종료 표시(`---`)가 없습니다.');
  }

  const metadata = {};
  for (const line of lines.slice(1, endIndex)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 1) continue;
    metadata[line.slice(0, separatorIndex).trim()] = line.slice(separatorIndex + 1).trim();
  }
  return { metadata, endIndex };
}

export async function readDraft(draftPath = DEFAULT_DRAFT_PATH) {
  let source;
  try {
    source = await readFile(draftPath, 'utf8');
  } catch (error) {
    throw new AutomationAuthError(
      `초안 파일을 읽지 못했습니다. 먼저 npm run book-story:prepare를 실행해 주세요: ${draftPath}`,
      { cause: error },
    );
  }

  const lines = source.replaceAll('\r\n', '\n').split('\n');
  const { metadata, endIndex } = parseMetadata(lines);
  const contentLines = lines.slice(endIndex + 1);
  const titleIndex = contentLines.findIndex((line) => line.trim().startsWith('# '));
  if (titleIndex < 0) throw new AutomationAuthError('초안에서 `# 게시글 제목`을 찾지 못했습니다.');

  const title = contentLines[titleIndex].trim().slice(2).trim();
  const description = contentLines.slice(titleIndex + 1).join('\n').trim();
  return { draftPath, metadata, title, description };
}

function countCharacters(value) {
  return Array.from(value).length;
}

function assertDraftBinding(draft, item) {
  const expected = {
    bookTitle: item.bookTitle,
    author: item.author,
    persona: item.persona,
    isbn: item.isbn,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (draft.metadata[key] !== value) {
      throw new AutomationAuthError(`초안의 ${key} 값이 현재 작성전 항목과 일치하지 않습니다.`);
    }
  }
}

function inspectBoundaryEmoji(description) {
  const emoji = String.raw`\p{Extended_Pictographic}\uFE0F?`;
  return {
    startsWithEmoji: new RegExp(`^(?:${emoji}){1,2}`, 'u').test(description),
    endsWithEmoji: new RegExp(`(?:${emoji}){1,2}$`, 'u').test(description),
  };
}

export function validateDraft(draft, item) {
  assertDraftBinding(draft, item);

  if (!PERSONA_LENGTHS[item.persona]) {
    throw new AutomationAuthError('컨셉은 `관리자` 또는 `감성회원`이어야 합니다.');
  }
  if (!draft.title || draft.title.includes('여기에')) {
    throw new AutomationAuthError('게시글 제목을 작성해 주세요.');
  }
  const titleLength = countCharacters(draft.title);
  if (titleLength < 10 || titleLength > 40) {
    throw new AutomationAuthError(`제목은 30자 내외(10~40자)여야 합니다. 현재 ${titleLength}자입니다.`);
  }
  if (!draft.description || draft.description.includes('여기에 게시글 본문')) {
    throw new AutomationAuthError('게시글 본문을 작성해 주세요.');
  }

  const descriptionLength = countCharacters(draft.description);
  const { min, max } = PERSONA_LENGTHS[item.persona];
  if (descriptionLength < min || descriptionLength > max) {
    throw new AutomationAuthError(
      `${item.persona} 본문은 ${min.toLocaleString()}~${max.toLocaleString()}자여야 합니다. 현재 ${descriptionLength.toLocaleString()}자입니다.`,
    );
  }

  const { startsWithEmoji, endsWithEmoji } = inspectBoundaryEmoji(draft.description);
  if (startsWithEmoji) {
    throw new AutomationAuthError('본문 시작에는 이모지를 사용하지 마세요.');
  }
  if (!endsWithEmoji) {
    throw new AutomationAuthError('본문 마지막에 내용과 어울리는 이모지 1~2개를 넣어 주세요.');
  }

  const combined = `${draft.title}\n${draft.description}`;
  const forbiddenPattern = FORBIDDEN_PATTERNS.find((pattern) => pattern.test(combined));
  if (forbiddenPattern) {
    throw new AutomationAuthError('초안에서 금칙어 또는 과도한 비하 표현이 감지되었습니다.');
  }

  return { titleLength, descriptionLength, min, max };
}
