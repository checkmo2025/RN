import { API_BASE_URL, ApiEnvelope, ApiError, requestJson, unwrapResult } from './http';

type ApiResponseString = ApiEnvelope<string>;
type FindEmailResult = {
  email?: string;
};
type LoginStatus = {
  provider?: string;
  email?: string;
};

export type EmailVerificationType = 'SIGN_UP' | 'UPDATE_EMAIL';

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

function buildUrl(path: string, query?: Record<string, string | undefined>) {
  const normalizedPath = path
    .replace(/^\/+/, '')
    .replace(/^api\//, '');
  const url = new URL(normalizedPath, `${API_BASE_URL}/`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (!value) return;
    url.searchParams.set(key, value);
  });
  return url.toString();
}

export async function loginByEmail(email: string, password: string): Promise<void> {
  await requestJson<ApiResponseString>('/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
    },
  });
}

export async function signUpByEmail(email: string, password: string): Promise<void> {
  await requestJson<ApiResponseString>('/auth/signup', {
    method: 'POST',
    body: {
      email,
      password,
    },
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
  const response = await fetch(buildUrl('/members/check-nickname', { nickname }), {
    method: 'POST',
    credentials: 'include',
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

export async function issueProfileImageUploadUrl(
  originalFileName: string,
  contentType: string,
): Promise<{ presignedUrl: string; imageUrl: string } | null> {
  const response = await requestJson<ApiEnvelope<PresignedUrl>>('/image/PROFILE/upload-url', {
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

export async function findEmailByNamePhone(
  name: string,
  phoneNumber: string,
): Promise<string | null> {
  const response = await requestJson<ApiEnvelope<FindEmailResult>>('/members/find-email', {
    method: 'POST',
    body: {
      name,
      phoneNumber,
    },
  });
  const result = unwrapResult(response);
  return typeof result?.email === 'string' ? result.email : null;
}

export async function sendTemporaryPassword(email: string): Promise<void> {
  await requestJson<ApiEnvelope<null>>('/auth/temp-password', {
    method: 'POST',
    query: {
      email,
    },
  });
}

export async function fetchLoginStatus(): Promise<LoginStatus | null> {
  const response = await requestJson<ApiEnvelope<LoginStatus>>('/members/me/login-status', {
    method: 'GET',
  });
  return unwrapResult(response) ?? null;
}

export async function logoutSession(): Promise<void> {
  await requestJson<ApiEnvelope<null>>('/auth/logout', {
    method: 'POST',
  });
}
