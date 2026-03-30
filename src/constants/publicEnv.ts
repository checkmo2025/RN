function readPublicEnv(raw: string | undefined, fallback: string): string {
  const value = raw?.trim();
  return value ? value : fallback;
}

export const PUBLIC_ENV = {
  API_BASE_URL: readPublicEnv(
    process.env.EXPO_PUBLIC_API_BASE_URL,
    'https://api.checkmo.co.kr/api',
  ),
  WEB_BASE_URL: readPublicEnv(
    process.env.EXPO_PUBLIC_WEB_BASE_URL,
    'https://checkmo.co.kr',
  ),
  SUPPORT_FORM_URL: readPublicEnv(
    process.env.EXPO_PUBLIC_SUPPORT_FORM_URL,
    'https://forms.gle/qNjhNN7RBTiWNuX99',
  ),
  ALADIN_HOME_URL: readPublicEnv(
    process.env.EXPO_PUBLIC_ALADIN_HOME_URL,
    'https://www.aladin.co.kr/',
  ),
  ALADIN_RANKING_URL: readPublicEnv(
    process.env.EXPO_PUBLIC_ALADIN_RANKING_URL,
    'https://www.aladin.co.kr/shop/common/wbest.aspx?BranchType=1',
  ),
} as const;
