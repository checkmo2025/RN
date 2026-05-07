declare const __DEV__: boolean;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function emit(level: LogLevel, tag: string, msg: string, args: unknown[]) {
  if (!__DEV__ && level !== 'error') return;
  const prefix = `[${tag}]`;
  switch (level) {
    case 'debug': console.log(prefix, msg, ...args); break;
    case 'info':  console.info(prefix, msg, ...args); break;
    case 'warn':  console.warn(prefix, msg, ...args); break;
    case 'error': console.error(prefix, msg, ...args); break;
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
