import { API_BASE_URL } from '../services/api/http';

const SUPPORTED_IMAGE_URL_PATTERN =
  /^(https?:\/\/|file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|data:image\/)/i;
const DOMAIN_ONLY_IMAGE_URL_PATTERN = /^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i;
const RELATIVE_IMAGE_PATH_PATTERN =
  /^(?:\.?\/)?[a-z0-9/_-]+\.(?:png|jpe?g|gif|webp|svg|bmp|avif)(?:[?#].*)?$/i;

export function normalizeRemoteImageUrl(url?: string | null): string | undefined {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed || /^blob:/i.test(trimmed)) return undefined;

  if (SUPPORTED_IMAGE_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return new URL(trimmed, API_BASE_URL).toString();
  }

  if (DOMAIN_ONLY_IMAGE_URL_PATTERN.test(trimmed)) {
    return `https://${trimmed}`;
  }

  if (RELATIVE_IMAGE_PATH_PATTERN.test(trimmed)) {
    const origin = new URL(API_BASE_URL).origin;
    const normalizedPath = trimmed.replace(/^\.?\//, '');
    return new URL(normalizedPath, `${origin}/`).toString();
  }

  return undefined;
}
