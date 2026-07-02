import {
  formatKstDateLabel,
  formatKstDateTimeLabel,
  getCurrentKstDateLabel,
  toKstApiDateTime,
  toKstApiLocalDateTime,
} from '../../utils/date';

export function formatDotDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function formatDotDate(value?: string): string {
  return formatKstDateLabel(value);
}

export function formatDotDateTime(value?: string): string {
  return formatKstDateTimeLabel(value);
}

export function toApiDateTime(value: string): string | undefined {
  return toKstApiDateTime(value);
}

/**
 * 투표 시작/마감처럼 백엔드 `LocalDateTime`(오프셋 없는 ISO)로 보내야 하는 값 변환.
 */
export function toApiLocalDateTime(value: string): string | undefined {
  return toKstApiLocalDateTime(value);
}

/** 저장 문자열(점 표기 또는 API 포맷)을 datepicker 초기값용 Date(벽시계 기준)로 변환. */
export function dotDateTimeToDate(value: string): Date | null {
  const api = toKstApiDateTime(value);
  if (!api) return null;
  const match = api.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
}

/** datepicker가 고른 Date를 저장/표시용 점 표기 문자열("YYYY.MM.DD HH:mm")로 변환. */
export function dateToDotDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function toTeamLabel(teamNumber?: number): string {
  if (!teamNumber || teamNumber < 1) return '미배정';
  const alphabetIndex = teamNumber - 1;
  if (alphabetIndex >= 0 && alphabetIndex < 26) {
    return `${String.fromCharCode(65 + alphabetIndex)}조`;
  }
  return `${teamNumber}조`;
}

export function parseGenerationNumber(value?: string): number | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatGenerationLabel(value?: string | number | null): string {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return `${value}기`;
  }
  if (typeof value === 'string') {
    const parsed = parseGenerationNumber(value);
    return parsed ? `${parsed}기` : value;
  }
  return '';
}

export function sanitizeGenerationInput(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 2);
}

export function inferMimeType(fileName?: string, fallback?: string): string {
  if (typeof fallback === 'string' && fallback.startsWith('image/')) return fallback;
  const extension = fileName?.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

export function parseDotDate(value?: string): Date | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function formatCalendarMonthLabel(date: Date, language: 'ko' | 'en' = 'ko'): string {
  if (language === 'en') {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export function buildCalendarDays(monthDate: Date): Array<{
  key: string;
  label: string;
  value: string;
  inCurrentMonth: boolean;
  isToday: boolean;
}> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const calendarStart = new Date(year, month, 1 - monthStart.getDay());
  const todayValue = getCurrentKstDateLabel();

  return Array.from({ length: 42 }).map((_, index) => {
    const current = new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + index);
    const value = formatDotDateValue(current);
    return {
      key: `${value}-${index}`,
      label: String(current.getDate()),
      value,
      inCurrentMonth: current.getMonth() === month,
      isToday: value === todayValue,
    };
  });
}

export function toOpenableContactLink(link: string): string {
  const trimmed = link.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function formatRegularGroupLabel(teamNumber: number): string {
  return `${String.fromCharCode(64 + teamNumber)}조`;
}

export function getTeamManageTargetKey(teamNumber: number | null): string {
  return teamNumber === null ? 'unassigned' : `team-${teamNumber}`;
}

export function toGroupTargets(topic: string): string[] {
  const stripped = topic.replace(/^모임 대상 · /, '').trim();
  if (!stripped || stripped === '정보 없음') return [];
  return stripped
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
