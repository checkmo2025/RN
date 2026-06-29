import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { loginWithApple } from '../api/authApi';
import { ApiError } from '../api/http';

const NONCE_CHARSET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
const NONCE_LENGTH = 32;

export type AppleNativeLoginOutcome =
  | { status: 'success' }
  | { status: 'cancel' }
  | { status: 'error'; message: string };

function generateRawNonce(): string {
  const randomBytes = Crypto.getRandomBytes(NONCE_LENGTH);
  return Array.from(randomBytes)
    .map((byte) => NONCE_CHARSET[byte % NONCE_CHARSET.length])
    .join('');
}

async function sha256(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

function isAppleAuthCancel(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = String((error as { code?: unknown }).code ?? '');
  const message = String((error as { message?: unknown }).message ?? '');
  return (
    code === 'ERR_REQUEST_CANCELED' ||
    code === 'ERR_CANCELED' ||
    code === '1001' ||
    message.toLowerCase().includes('cancel')
  );
}

function resolveAppleLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'AUTH_414') {
      return '이미 다른 계정으로 가입된 이메일입니다.';
    }
    if (error.code === 'AUTH_415') {
      return 'Apple 인증 정보가 유효하지 않습니다. 다시 시도해 주세요.';
    }
    if (error.message?.trim()) {
      return error.message.trim();
    }
  }
  return 'Apple 로그인에 실패했습니다. 다시 시도해 주세요.';
}

export async function loginWithAppleNative(): Promise<AppleNativeLoginOutcome> {
  if (Platform.OS !== 'ios') {
    return { status: 'error', message: 'Apple 로그인은 iOS에서만 지원됩니다.' };
  }

  const available = await AppleAuthentication.isAvailableAsync().catch(() => false);
  if (!available) {
    return { status: 'error', message: '이 기기에서는 Apple 로그인을 사용할 수 없습니다.' };
  }

  const rawNonce = generateRawNonce();
  const hashedNonce = await sha256(rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if (isAppleAuthCancel(error)) {
      return { status: 'cancel' };
    }
    return { status: 'error', message: 'Apple 로그인을 시작하지 못했습니다.' };
  }

  if (!credential.identityToken) {
    return { status: 'error', message: 'Apple 인증 토큰을 확인할 수 없습니다.' };
  }

  try {
    await loginWithApple(
      {
        identityToken: credential.identityToken,
        rawNonce,
        authorizationCode: credential.authorizationCode ?? undefined,
      },
      { suppressErrorToast: true },
    );
    return { status: 'success' };
  } catch (error) {
    return { status: 'error', message: resolveAppleLoginErrorMessage(error) };
  }
}
