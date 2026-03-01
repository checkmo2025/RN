const KST_OFFSET_HOURS = 9;
const KST_OFFSET_MINUTES = KST_OFFSET_HOURS * 60;
const KST_OFFSET_MS = KST_OFFSET_MINUTES * 60 * 1000;

function normalizeTimezoneSuffix(value: string): string {
  // Convert +0900 -> +09:00 for consistent Date.parse behavior.
  return value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function getKstPartsFromMillis(millis: number) {
  const date = new Date(millis + KST_OFFSET_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
  };
}

function formatKstApiDateTimeFromMillis(millis: number): string {
  const parts = getKstPartsFromMillis(millis);
  return (
    `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}` +
    `T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}+09:00`
  );
}

export function parseApiDateMillis(value?: string): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = normalizeTimezoneSuffix(trimmed);

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const direct = Date.parse(normalized);
    if (!Number.isNaN(direct)) return direct;
  }

  const kstMatch = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/,
  );

  if (kstMatch) {
    const year = Number(kstMatch[1]);
    const month = Number(kstMatch[2]);
    const day = Number(kstMatch[3]);
    const hour = Number(kstMatch[4] ?? '0');
    const minute = Number(kstMatch[5] ?? '0');
    const second = Number(kstMatch[6] ?? '0');
    const millisecond = Number((kstMatch[7] ?? '0').padEnd(3, '0'));

    // Backend often returns UTC clock time without an explicit timezone suffix.
    return Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  }

  const fallback = Date.parse(normalized);
  if (!Number.isNaN(fallback)) return fallback;

  return null;
}

export function formatKstDateLabel(value?: string, separator = '.'): string {
  if (!value) return '';
  const parsedMillis = parseApiDateMillis(value);
  if (parsedMillis === null) return value;

  const parts = getKstPartsFromMillis(parsedMillis);
  return `${parts.year}${separator}${pad2(parts.month)}${separator}${pad2(parts.day)}`;
}

export function formatKstDateTimeLabel(value?: string): string {
  if (!value) return '';
  const parsedMillis = parseApiDateMillis(value);
  if (parsedMillis === null) return value;

  const parts = getKstPartsFromMillis(parsedMillis);
  return (
    `${parts.year}.${pad2(parts.month)}.${pad2(parts.day)}` +
    ` ${pad2(parts.hour)}:${pad2(parts.minute)}`
  );
}

export function getCurrentKstDateLabel(separator = '.', nowMillis = Date.now()): string {
  const parts = getKstPartsFromMillis(nowMillis);
  return `${parts.year}${separator}${pad2(parts.month)}${separator}${pad2(parts.day)}`;
}

export function getCurrentKstYearMonth(nowMillis = Date.now()): { year: number; month: number } {
  const parts = getKstPartsFromMillis(nowMillis);
  return {
    year: parts.year,
    month: parts.month,
  };
}

export function getCurrentKstApiDateTime(nowMillis = Date.now()): string {
  return formatKstApiDateTimeFromMillis(nowMillis);
}

export function toKstApiDateTime(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const normalized = normalizeTimezoneSuffix(trimmed.replace(/\./g, '-'));

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    const parsed = Date.parse(normalized);
    if (Number.isNaN(parsed)) return undefined;
    return formatKstApiDateTimeFromMillis(parsed);
  }

  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2})(?::(\d{2}))?(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/,
  );
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? '0');
  const minute = Number(match[5] ?? '0');
  const second = Number(match[6] ?? '0');
  const millisecond = Number((match[7] ?? '0').padEnd(3, '0'));

  const dateForValidation = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  if (
    dateForValidation.getUTCFullYear() !== year ||
    dateForValidation.getUTCMonth() + 1 !== month ||
    dateForValidation.getUTCDate() !== day ||
    dateForValidation.getUTCHours() !== hour ||
    dateForValidation.getUTCMinutes() !== minute ||
    dateForValidation.getUTCSeconds() !== second
  ) {
    return undefined;
  }

  return (
    `${year}-${pad2(month)}-${pad2(day)}` +
    `T${pad2(hour)}:${pad2(minute)}:${pad2(second)}+09:00`
  );
}

export function toKstTimeAgoLabel(value?: string, nowMillis = Date.now()): string {
  if (!value) return '방금 전';

  const parsedMillis = parseApiDateMillis(value);
  if (parsedMillis === null) return value;

  const diffMinutes = Math.max(0, Math.floor((nowMillis - parsedMillis) / 60000));
  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간전`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일전`;
}
