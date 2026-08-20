import { API_ORIGIN_URL } from '../services/api/http';

const SUPPORTED_IMAGE_URL_PATTERN =
  /^(https?:\/\/|file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|data:image\/)/i;
const DOMAIN_ONLY_IMAGE_URL_PATTERN = /^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i;
const RELATIVE_IMAGE_PATH_PATTERN =
  /^(?:\.?\/)?[a-z0-9/_-]+\.(?:png|jpe?g|gif|webp|svg|bmp|avif)(?:[?#].*)?$/i;
const BUNDLED_DEFAULT_PROFILE_PATH = '/profile2.svg';
const CHECKMO_IMAGE_HOSTS = new Set(['checkmo.co.kr', 'www.checkmo.co.kr', 'api.checkmo.co.kr']);

function isBundledDefaultProfileImageUrl(url: string): boolean {
  const relativePath = `/${url.replace(/^\.?\//, '').split(/[?#]/, 1)[0]}`.toLowerCase();
  if (!/^https?:\/\//i.test(url)) return relativePath === BUNDLED_DEFAULT_PROFILE_PATH;

  try {
    const parsed = new URL(url);
    return (
      CHECKMO_IMAGE_HOSTS.has(parsed.hostname.toLowerCase()) &&
      parsed.pathname.toLowerCase() === BUNDLED_DEFAULT_PROFILE_PATH
    );
  } catch {
    return false;
  }
}

export function normalizeRemoteImageUrl(url?: string | null): string | undefined {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed || /^blob:/i.test(trimmed)) return undefined;
  if (isBundledDefaultProfileImageUrl(trimmed)) return undefined;

  if (SUPPORTED_IMAGE_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return new URL(trimmed, `${API_ORIGIN_URL}/`).toString();
  }

  if (DOMAIN_ONLY_IMAGE_URL_PATTERN.test(trimmed)) {
    return `https://${trimmed}`;
  }

  if (RELATIVE_IMAGE_PATH_PATTERN.test(trimmed)) {
    const normalizedPath = trimmed.replace(/^\.?\//, '');
    return new URL(normalizedPath, `${API_ORIGIN_URL}/`).toString();
  }

  return undefined;
}

export function normalizeRemoteImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeRemoteImageUrl(typeof item === 'string' ? item : undefined))
    .filter((item): item is string => Boolean(item));
}
