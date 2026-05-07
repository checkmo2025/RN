declare const __DEV__: boolean;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function serializeError(e: unknown): string {
  if (e instanceof Error) {
    return __DEV__ && e.stack ? e.stack : `${e.name}: ${e.message}`;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function emit(level: LogLevel, tag: string, msg: string, args: unknown[]) {
  if (!__DEV__ && level !== 'error') return;
  const prefix = `[${tag}]`;
  const serialized = args.map((a) =>
    a instanceof Error ? serializeError(a) : a,
  );
  switch (level) {
    case 'debug': console.log(prefix, msg, ...serialized); break;
    case 'info':  console.info(prefix, msg, ...serialized); break;
    case 'warn':  console.warn(prefix, msg, ...serialized); break;
    case 'error': console.error(prefix, msg, ...serialized); break;
  }
}

export function createLogger(domain: string) {
  return {
    debug: (msg: string, ...args: unknown[]) => emit('debug', domain, msg, args),
    info:  (msg: string, ...args: unknown[]) => emit('info',  domain, msg, args),
    warn:  (msg: string, ...args: unknown[]) => emit('warn',  domain, msg, args),
    error: (msg: string, ...args: unknown[]) => emit('error', domain, msg, args),
  };
}
