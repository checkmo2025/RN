const KST_OFFSET_HOURS = 9;

function normalizeTimezoneSuffix(value: string): string {
  // Convert +0900 -> +09:00 for consistent Date.parse behavior.
  return value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
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
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (kstMatch) {
    const year = Number(kstMatch[1]);
    const month = Number(kstMatch[2]);
    const day = Number(kstMatch[3]);
    const hour = Number(kstMatch[4] ?? '0');
    const minute = Number(kstMatch[5] ?? '0');
    const second = Number(kstMatch[6] ?? '0');

    // Backend datetime is KST; convert to UTC epoch explicitly.
    return Date.UTC(year, month - 1, day, hour - KST_OFFSET_HOURS, minute, second);
  }

  const fallback = Date.parse(normalized);
  if (!Number.isNaN(fallback)) return fallback;

  return null;
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
