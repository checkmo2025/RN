import { nicknameRegex } from '../constants/validation';

export const NICKNAME_MAX_LENGTH = 20;

export type NicknameValidationResult = {
  isValid: boolean;
  normalized: string;
  message: string;
};

export function normalizeNickname(nickname: string): string {
  return nickname.normalize('NFC');
}

export function getNicknameComparisonKey(nickname: string): string {
  return normalizeNickname(nickname).toLowerCase();
}

export function isSameNicknameIdentity(first: string, second: string): boolean {
  const firstKey = getNicknameComparisonKey(first);
  return firstKey.length > 0 && firstKey === getNicknameComparisonKey(second);
}

export function validateNickname(nickname: string): NicknameValidationResult {
  const normalized = normalizeNickname(nickname);

  if (normalized.length === 0) {
    return {
      isValid: false,
      normalized,
      message: '닉네임을 입력해주세요.',
    };
  }

  if (/\s/u.test(normalized)) {
    return {
      isValid: false,
      normalized,
      message: '닉네임에는 공백을 사용할 수 없습니다.',
    };
  }

  if (Array.from(normalized).length > NICKNAME_MAX_LENGTH) {
    return {
      isValid: false,
      normalized,
      message: `닉네임은 최대 ${NICKNAME_MAX_LENGTH}자까지 가능합니다.`,
    };
  }

  if (!nicknameRegex.test(normalized)) {
    return {
      isValid: false,
      normalized,
      message: '닉네임은 한글, 영문, 숫자, 허용된 특수문자만 사용할 수 있습니다.',
    };
  }

  return { isValid: true, normalized, message: '' };
}

export function encodeNicknamePathSegment(nickname: string): string {
  return encodeURIComponent(normalizeNickname(nickname));
}
