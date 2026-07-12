import * as SecureStore from 'expo-secure-store';

export type MarketingAttribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  landingPath: string;
  capturedAt: string;
};

export type StoredMarketingAttribution = {
  firstTouch: MarketingAttribution | null;
  lastTouch: MarketingAttribution | null;
};

const FIRST_TOUCH_KEY = 'checkmo.marketing-attribution.first-touch';
const LAST_TOUCH_KEY = 'checkmo.marketing-attribution.last-touch';
const MAX_PARAM_LENGTH = 200;
const MAX_LANDING_PATH_LENGTH = 500;

function normalizeParam(value: string | null): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, MAX_PARAM_LENGTH);
}

function parseStoredAttribution(value: string | null): MarketingAttribution | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<MarketingAttribution>;
    if (typeof parsed.landingPath !== 'string' || typeof parsed.capturedAt !== 'string') {
      return null;
    }

    return {
      ...(typeof parsed.source === 'string' ? { source: parsed.source } : {}),
      ...(typeof parsed.medium === 'string' ? { medium: parsed.medium } : {}),
      ...(typeof parsed.campaign === 'string' ? { campaign: parsed.campaign } : {}),
      ...(typeof parsed.content === 'string' ? { content: parsed.content } : {}),
      ...(typeof parsed.term === 'string' ? { term: parsed.term } : {}),
      landingPath: parsed.landingPath,
      capturedAt: parsed.capturedAt,
    };
  } catch {
    return null;
  }
}

export function parseMarketingAttribution(rawUrl: string): MarketingAttribution | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const source = normalizeParam(url.searchParams.get('utm_source'));
  const medium = normalizeParam(url.searchParams.get('utm_medium'));
  const campaign = normalizeParam(url.searchParams.get('utm_campaign'));
  const content = normalizeParam(url.searchParams.get('utm_content'));
  const term = normalizeParam(url.searchParams.get('utm_term'));

  if (!source && !medium && !campaign && !content && !term) return null;

  return {
    ...(source ? { source } : {}),
    ...(medium ? { medium } : {}),
    ...(campaign ? { campaign } : {}),
    ...(content ? { content } : {}),
    ...(term ? { term } : {}),
    landingPath: (url.protocol === 'http:' || url.protocol === 'https:'
      ? url.pathname
      : `${url.hostname ? `/${url.hostname}` : ''}${url.pathname}`.replace(/\/+/g, '/')
    ).slice(0, MAX_LANDING_PATH_LENGTH),
    capturedAt: new Date().toISOString(),
  };
}

export async function captureMarketingAttribution(rawUrl: string): Promise<MarketingAttribution | null> {
  const attribution = parseMarketingAttribution(rawUrl);
  if (!attribution) return null;

  const existingFirstTouch = await SecureStore.getItemAsync(FIRST_TOUCH_KEY);
  if (!parseStoredAttribution(existingFirstTouch)) {
    await SecureStore.setItemAsync(FIRST_TOUCH_KEY, JSON.stringify(attribution));
  }

  await SecureStore.setItemAsync(LAST_TOUCH_KEY, JSON.stringify(attribution));
  return attribution;
}

export async function getStoredMarketingAttribution(): Promise<StoredMarketingAttribution> {
  const [firstTouch, lastTouch] = await Promise.all([
    SecureStore.getItemAsync(FIRST_TOUCH_KEY),
    SecureStore.getItemAsync(LAST_TOUCH_KEY),
  ]);

  return {
    firstTouch: parseStoredAttribution(firstTouch),
    lastTouch: parseStoredAttribution(lastTouch),
  };
}

export async function clearStoredMarketingAttribution(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(FIRST_TOUCH_KEY),
    SecureStore.deleteItemAsync(LAST_TOUCH_KEY),
  ]);
}
