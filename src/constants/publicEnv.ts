function readPublicEnv(raw: string | undefined, fallback: string): string {
  const value = raw?.trim();
  return value ? value : fallback;
}

export const PUBLIC_ENV = {
  API_BASE_URL: readPublicEnv(
    process.env.EXPO_PUBLIC_API_BASE_URL,
    'https://api.checkmo.co.kr/api/v1',
  ),
  WS_BASE_URL: readPublicEnv(
    process.env.EXPO_PUBLIC_WS_BASE_URL,
    'wss://api.checkmo.co.kr/ws-stomp',
  ),
  WEB_BASE_URL: readPublicEnv(
    process.env.EXPO_PUBLIC_WEB_BASE_URL,
    'https://checkmo.co.kr',
  ),
  SUPPORT_FORM_URL: readPublicEnv(
    process.env.EXPO_PUBLIC_SUPPORT_FORM_URL,
    'https://www.checkmo.co.kr/support',
  ),
  YES24_RANKING_URL: readPublicEnv(
    process.env.EXPO_PUBLIC_YES24_RANKING_URL,
    'https://www.yes24.com/Product/Category/BestSeller?categoryNumber=001',
  ),
} as const;
