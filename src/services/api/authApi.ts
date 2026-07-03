import { ApiEnvelope, ApiError, fetchApi, requestJson, silentRefreshSession, unwrapResult } from './http';
import {
  deleteStoredRefreshToken,
  getStoredRefreshToken,
  saveStoredRefreshToken,
} from './authTokenStore';

type SignUpResult = {
  email?: string;
  isProfileCompleted?: boolean;
};
type LoginResult = {
  refreshToken?: string;
};
type FindEmailResult = {
  email?: string;
};
type LoginStatus = {
  email?: string;
};
type PublicTermsListResult = {
  terms?: TermsInfo[];
};
type MemberTermsStatusResult = {
  requiresRequiredAgreement?: boolean;
  terms?: MemberTermsInfo[];
};

export type EmailVerificationType = 'SIGN_UP' | 'UPDATE_EMAIL';
export type ImageUploadType = 'PROFILE' | 'CLUB' | 'NOTICE';
export type TermsType =
  | 'SERVICE_TERMS'
  | 'PRIVACY_COLLECTION'
  | 'THIRD_PARTY_PROVISION'
  | 'MARKETING'
  | string;

export type TermsInfo = {
  id: number;
  termsType: TermsType;
  title: string;
  termUrl?: string;
  version: number;
  required: boolean;
};

export type MemberTermsInfo = TermsInfo & {
  agreed: boolean;
};

export type TermsAgreementPayload = {
  termsId: number;
  agreed: boolean;
};

export type MemberTermsStatus = {
  requiresRequiredAgreement: boolean;
  terms: MemberTermsInfo[];
};

export type AdditionalInfoPayload = {
  nickname: string;
  name: string;
  phoneNumber: string;
  description?: string;
  imgUrl?: string;
  categories: string[];
};

type PresignedUrl = {
  presignedUrl?: string;
  imageUrl?: string;
};

type JsonRecord = Record<string, unknown>;

export async function loginByIdentifier(
  identifier: string,
  password: string,
  options?: { suppressErrorToast?: boolean },
): Promise<void> {
  const response = await requestJson<ApiEnvelope<LoginResult>>('/auth/app/login', {
    method: 'POST',
    body: {
      identifier,
      password,
    },
    suppressErrorToast: options?.suppressErrorToast,
  });

  const refreshToken = unwrapResult(response)?.refreshToken;
  if (!refreshToken) {
    throw new ApiError('로그인 토큰을 확인할 수 없습니다.', 500, 'MISSING_REFRESH_TOKEN', response);
  }

  await saveStoredRefreshToken(refreshToken);
  await silentRefreshSession();
}

// Backward-compatible alias for existing callers.
export const loginByEmail = loginByIdentifier;

// 앱 소셜 로그인: 딥링크로 받은 일회용 코드를 refreshToken으로 교환한다.
// 이메일 /auth/app/login과 동일하게 토큰을 응답 바디로 받는 구조. (보안: 토큰을 딥링크 URL에 직접 싣지 않음)
type OAuthExchangeResult = {
  refreshToken?: string;
  profileCompleted?: boolean;
  isProfileCompleted?: boolean;
};

export async function exchangeOAuthCode(
  code: string,
  options?: { suppressErrorToast?: boolean },
): Promise<{ isProfileCompleted: boolean }> {
  const response = await requestJson<ApiEnvelope<OAuthExchangeResult>>('/auth/app/oauth/exchange', {
    method: 'POST',
    body: { code },
    suppressErrorToast: options?.suppressErrorToast,
  });

  const result = unwrapResult(response);
  const refreshToken = result?.refreshToken;
  if (!refreshToken) {
    throw new ApiError('로그인 토큰을 확인할 수 없습니다.', 500, 'MISSING_REFRESH_TOKEN', response);
  }

  await saveStoredRefreshToken(refreshToken);
  await silentRefreshSession();
  // 신규 소셜 가입자는 프로필 미완성 → 프로필 완성 흐름으로 분기. 응답 누락 시 보수적으로 완성 처리.
  return { isProfileCompleted: result?.profileCompleted ?? result?.isProfileCompleted ?? true };
}

export type AppleLoginPayload = {
  identityToken: string;
  rawNonce: string;
  authorizationCode?: string;
};

export async function loginWithApple(
  payload: AppleLoginPayload,
  options?: { suppressErrorToast?: boolean },
): Promise<void> {
  const body: Record<string, string> = {
    identityToken: payload.identityToken,
    rawNonce: payload.rawNonce,
  };

  if (payload.authorizationCode) {
    body.authorizationCode = payload.authorizationCode;
  }

  const response = await requestJson<ApiEnvelope<LoginResult>>('/auth/app/apple/login', {
    method: 'POST',
    body,
    suppressErrorToast: options?.suppressErrorToast,
  });

  const refreshToken = unwrapResult(response)?.refreshToken;
  if (!refreshToken) {
    throw new ApiError('로그인 토큰을 확인할 수 없습니다.', 500, 'MISSING_REFRESH_TOKEN', response);
  }

  await saveStoredRefreshToken(refreshToken);
  await silentRefreshSession();
}

export async function signUpByEmail(
  email: string,
  password: string,
  options?: { suppressErrorToast?: boolean; agreements?: TermsAgreementPayload[] },
): Promise<void> {
  await requestJson<ApiEnvelope<SignUpResult>>('/auth/signup', {
    method: 'POST',
    body: {
      email,
      password,
      agreements: options?.agreements ?? [],
    },
    suppressErrorToast: options?.suppressErrorToast,
  });
}

export async function fetchActiveTerms(): Promise<TermsInfo[]> {
  const response = await requestJson<ApiEnvelope<PublicTermsListResult>>('/terms', {
    method: 'GET',
    retryOnUnauthorized: false,
  });

  return unwrapResult(response)?.terms ?? [];
}

export async function fetchMyTermsStatus(): Promise<MemberTermsStatus> {
  const response = await requestJson<ApiEnvelope<MemberTermsStatusResult>>('/members/me/terms', {
    method: 'GET',
  });
  const result = unwrapResult(response);

  return {
    requiresRequiredAgreement: result?.requiresRequiredAgreement ?? false,
    terms: result?.terms ?? [],
  };
}

export async function updateMyTermsAgreements(
  agreements: TermsAgreementPayload[],
  options?: { suppressErrorToast?: boolean },
): Promise<void> {
  await requestJson<ApiEnvelope<null>>('/members/me/terms', {
    method: 'POST',
    body: { agreements },
    suppressErrorToast: options?.suppressErrorToast,
  });
}

export async function requestEmailVerification(
  email: string,
  type: EmailVerificationType = 'SIGN_UP',
): Promise<void> {
  await requestJson<ApiEnvelope<null>>('/auth/email-verification', {
    method: 'POST',
    query: {
      email,
      type,
    },
  });
}

export async function confirmEmailVerification(
  email: string,
  verificationCode: string,
): Promise<void> {
  await requestJson<ApiEnvelope<null>>('/auth/email-verification/confirm', {
    method: 'POST',
    body: {
      email,
      verificationCode,
    },
  });
}

export async function checkNicknameDuplicate(nickname: string): Promise<boolean> {
  const response = await fetchApi('/members/check-nickname', {
    method: 'POST',
    query: {
      nickname,
    },
  });

  const rawText = await response.text();
  let parsed: JsonRecord = {};
  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as JsonRecord;
    } catch {
      parsed = {};
    }
  }
  const isSuccess = parsed.isSuccess === true;

  if (isSuccess) {
    const result = parsed.result;
    if (typeof result === 'boolean') {
      return result;
    }
    return true;
  }

  const code = typeof parsed.code === 'string' ? parsed.code : undefined;
  const message = typeof parsed.message === 'string' ? parsed.message : '요청에 실패했습니다.';

  // 닉네임을 찾지 못한 경우는 "사용 가능"으로 취급합니다.
  if (code === 'MEMBER_400' && message.includes('찾을 수 없습니다')) {
    return false;
  }

  throw new ApiError(message, response.status || 400, code, parsed);
}

export async function submitAdditionalInfo(payload: AdditionalInfoPayload): Promise<void> {
  await requestJson<ApiEnvelope<null>>('/members/additional-info', {
    method: 'POST',
    body: payload,
  });
}

export async function issueImageUploadUrl(
  type: ImageUploadType,
  originalFileName: string,
  contentType: string,
): Promise<{ presignedUrl: string; imageUrl: string } | null> {
  const response = await requestJson<ApiEnvelope<PresignedUrl>>(`/image/${type}/upload-url`, {
    method: 'POST',
    body: {
      originalFileName,
      contentType,
    },
  });

  const result = unwrapResult(response);
  if (!result?.presignedUrl || !result.imageUrl) return null;
  return {
    presignedUrl: result.presignedUrl,
    imageUrl: result.imageUrl,
  };
}

export async function issueProfileImageUploadUrl(
  originalFileName: string,
  contentType: string,
): Promise<{ presignedUrl: string; imageUrl: string } | null> {
  return issueImageUploadUrl('PROFILE', originalFileName, contentType);
}

export async function findEmailByNamePhone(
  name: string,
  phoneNumber: string,
): Promise<string | null> {
  try {
    const response = await requestJson<ApiEnvelope<FindEmailResult>>('/members/find-email', {
      method: 'POST',
      body: {
        name,
        phoneNumber,
      },
      credentials: 'omit',
      suppressErrorToast: true,
    });
    const result = unwrapResult(response);
    return typeof result?.email === 'string' ? result.email : null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function sendTemporaryPassword(email: string): Promise<void> {
  await requestJson<ApiEnvelope<null>>('/auth/temp-password', {
    method: 'POST',
    query: {
      email,
    },
    credentials: 'omit',
  });
}

export async function fetchLoginStatus(): Promise<LoginStatus | null> {
  return fetchLoginStatusSilently(false);
}

export async function fetchLoginStatusSilently(
  suppressErrorToast = true,
): Promise<LoginStatus | null> {
  const response = await requestJson<ApiEnvelope<LoginStatus>>('/members/me/login-status', {
    method: 'GET',
    suppressErrorToast,
  });
  return unwrapResult(response) ?? null;
}

export async function logoutSession(): Promise<void> {
  const refreshToken = await getStoredRefreshToken();

  try {
    if (refreshToken) {
      await requestJson<ApiEnvelope<null>>('/auth/app/logout', {
        method: 'POST',
        headers: {
          'X-Refresh-Token': refreshToken,
        },
        suppressErrorToast: true,
      });
      return;
    }

    await requestJson<ApiEnvelope<null>>('/auth/logout', {
      method: 'POST',
      suppressErrorToast: true,
    });
  } finally {
    await deleteStoredRefreshToken();
  }
}

export { deleteStoredRefreshToken as clearStoredAuthSession, silentRefreshSession };
