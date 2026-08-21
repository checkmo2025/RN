import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AutomationAuthError } from './auth-client.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_QUEUE_PATH = path.resolve(
  SCRIPT_DIR,
  '../../docs/agent/pm/책이야기_자동화_리스트.md',
);

const REQUIRED_COLUMNS = [
  '작성 여부',
  '책 제목',
  '저자',
  '컨셉',
  'ISBN',
  '예정 일시 (KST)',
  '추가 지시',
  '처리 결과',
];

function parseTableLine(line) {
  if (!line.trim().startsWith('|') || !line.trim().endsWith('|')) return null;
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((value) => value.trim());
}

function isSeparatorRow(values) {
  return values.every((value) => /^:?-{3,}:?$/.test(value));
}

function sanitizeCell(value) {
  return String(value).replaceAll('|', '／').replace(/\s+/g, ' ').trim();
}

export function queuePersonaFromArgs(args) {
  const personaIndex = args.indexOf('--persona');
  if (personaIndex < 0) return null;

  const value = args[personaIndex + 1]?.trim().toLowerCase();
  if (value === 'admin') return '관리자';
  if (value === 'emotion') return '감성회원';
  throw new AutomationAuthError('`--persona` 뒤에 `admin` 또는 `emotion`을 입력해 주세요.');
}

export async function readQueue(queuePath = DEFAULT_QUEUE_PATH, desiredPersona = null) {
  let source;
  try {
    source = await readFile(queuePath, 'utf8');
  } catch (error) {
    throw new AutomationAuthError(`자동화 목록을 읽지 못했습니다: ${queuePath}`, { cause: error });
  }

  const lines = source.split(/\r?\n/);
  const headerLineIndex = lines.findIndex((line) => {
    const values = parseTableLine(line);
    return values && REQUIRED_COLUMNS.every((column, index) => values[index] === column);
  });

  if (headerLineIndex < 0) {
    throw new AutomationAuthError('자동화 목록에서 작성 목록 표의 열 제목을 찾지 못했습니다.');
  }

  const items = [];
  for (let lineIndex = headerLineIndex + 1; lineIndex < lines.length; lineIndex += 1) {
    const values = parseTableLine(lines[lineIndex]);
    if (!values) {
      if (items.length > 0) break;
      continue;
    }
    if (isSeparatorRow(values)) continue;
    if (values.length !== REQUIRED_COLUMNS.length) {
      throw new AutomationAuthError(`작성 목록 ${lineIndex + 1}번째 줄의 열 개수가 맞지 않습니다.`);
    }

    items.push({
      rowLineIndex: lineIndex,
      values,
      status: values[0],
      bookTitle: values[1],
      author: values[2],
      persona: values[3],
      isbn: values[4].replaceAll('-', ''),
      scheduledAt: values[5],
      instruction: values[6],
      result: values[7],
    });
  }

  const nextItem = items.find(
    (item) => item.status === '작성전' && (!desiredPersona || item.persona === desiredPersona),
  );
  if (!nextItem) {
    const personaLabel = desiredPersona ? ` + ${desiredPersona}` : '';
    throw new AutomationAuthError(`처리할 \`작성전${personaLabel}\` 항목이 없습니다.`);
  }

  return { queuePath, source, lines, items, nextItem };
}

export async function updateQueueItem(queue, item, { status = item.status, result }) {
  const values = [...item.values];
  values[0] = sanitizeCell(status);
  values[7] = sanitizeCell(result);
  queue.lines[item.rowLineIndex] = `| ${values.join(' | ')} |`;

  const nextSource = queue.lines.join('\n');
  const temporaryPath = `${queue.queuePath}.tmp`;
  await writeFile(temporaryPath, nextSource, 'utf8');
  await rename(temporaryPath, queue.queuePath);
}
