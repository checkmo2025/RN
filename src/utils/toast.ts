import { translateActiveLiteral } from '../i18n/translations';

type ToastListener = (message: string) => void;

const listeners = new Set<ToastListener>();
const DUPLICATE_TOAST_WINDOW_MS = 1200;
let lastToastMessage = '';
let lastToastTime = 0;

export function showToast(message: string) {
  const trimmed = translateActiveLiteral(message).trim();
  if (!trimmed) return;
  const now = Date.now();
  if (trimmed === lastToastMessage && now - lastToastTime < DUPLICATE_TOAST_WINDOW_MS) {
    return;
  }
  lastToastMessage = trimmed;
  lastToastTime = now;
  listeners.forEach((listener) => listener(trimmed));
}

export function subscribeToast(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
