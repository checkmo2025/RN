type ToastListener = (message: string) => void;

const listeners = new Set<ToastListener>();

export function showToast(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return;
  listeners.forEach((listener) => listener(trimmed));
}

export function subscribeToast(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
