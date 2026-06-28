import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { PUBLIC_ENV } from '../../constants/publicEnv';
import { exchangeOAuthCode } from '../api/authApi';

export type OAuthProvider = 'google' | 'kakao' | 'naver';

// BE 성공 핸들러가 리다이렉트할 앱 딥링크 (BE 이슈 #263 계약). app.json scheme = "checkmo".
const OAUTH_REDIRECT_URL = 'checkmo://oauth-callback';

export type SocialLoginOutcome =
  | { status: 'success'; isProfileCompleted: boolean }
  | { status: 'cancel' }
  | { status: 'error'; message: string };

// API_BASE_URL = https://api.checkmo.co.kr/api/v1 → OAuth2 진입점은 루트(/oauth2/...)라 prefix 제거.
function getApiOrigin(): string {
  return PUBLIC_ENV.API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');
}

function getAuthorizationUrl(provider: OAuthProvider): string {
  // client=app: BE가 앱 요청임을 식별해 쿠키/웹 리다이렉트 대신 checkmo:// 딥링크로 일회용 코드를 돌려준다.
  return `${getApiOrigin()}/oauth2/authorization/${provider}?client=app`;
}

function parseCallback(url: string): { code?: string; error?: string } {
  const queryIndex = url.indexOf('?');
  const query = queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [rawKey, rawValue = ''] = pair.split('=');
    params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
  }
  return { code: params.code || undefined, error: params.error || undefined };
}

/**
 * Android 전용 소셜 로그인 (Option C — AuthSession + 딥링크 + 일회용 코드 교환).
 * 시스템 브라우저로 BE 웹 OAuth 플로우를 열고, checkmo://oauth-callback?code=... 로 돌아온
 * 일회용 코드를 refreshToken으로 교환해 저장한다. (토큰을 딥링크 URL에 직접 싣지 않음 → 하이재킹 방지)
 * iOS는 App Store 4.8(Sign in with Apple 필수) 회피를 위해 호출하지 않는다(호출 시 error 반환).
 */
export async function loginWithSocial(provider: OAuthProvider): Promise<SocialLoginOutcome> {
  if (Platform.OS !== 'android') {
    return { status: 'error', message: '소셜 로그인은 Android에서만 지원됩니다.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(
    getAuthorizationUrl(provider),
    OAUTH_REDIRECT_URL,
  ).catch(() => null);

  if (!result) {
    return { status: 'error', message: '소셜 로그인을 시작하지 못했습니다.' };
  }
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { status: 'cancel' };
  }
  if (result.type !== 'success' || !result.url) {
    return { status: 'error', message: '소셜 로그인에 실패했습니다.' };
  }

  const { code, error } = parseCallback(result.url);
  if (error) {
    return { status: 'error', message: '소셜 로그인이 거부되었습니다.' };
  }
  if (!code) {
    return { status: 'error', message: '로그인 코드를 확인할 수 없습니다.' };
  }

  // 일회용 코드 → refreshToken 교환 (토큰 저장은 exchangeOAuthCode 내부에서 처리)
  try {
    const { isProfileCompleted } = await exchangeOAuthCode(code, { suppressErrorToast: true });
    return { status: 'success', isProfileCompleted };
  } catch {
    return { status: 'error', message: '로그인 처리에 실패했습니다. 다시 시도해 주세요.' };
  }
}
