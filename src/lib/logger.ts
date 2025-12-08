const REQUEST_ID_HEADER = 'x-request-id';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Logger = {
  requestId: string;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  child: (scope: string) => Logger;
};

type LoggerContext = {
  requestId?: string;
  scope?: string;
};

const LEVEL_TO_CONSOLE: Record<LogLevel, keyof Console> = {
  debug: 'log',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

const FALLBACK_REQUEST_ID = 'req-unknown';

const generateRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

const formatPrefix = (level: LogLevel, requestId: string, scope?: string, timestamp?: string) => {
  const parts = timestamp ? [`[${timestamp}]`] : [];
  parts.push(`[${level.toUpperCase()}]`, `[req:${requestId}]`);
  if (scope) {
    parts.push(`[${scope}]`);
  }
  return parts.join(' ');
};

const REDACT_KEYS = [
  'token',
  'secret',
  'password',
  'authorization',
  'cookie',
  'api_key',
  'apikey',
  'service_role',
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

const sanitizeLogArg = (value: unknown, depth = 0): unknown => {
  if (depth > 3) {
    return '[...]';
  }
  if (value instanceof Error) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogArg(item, depth + 1));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => {
        const shouldRedact = REDACT_KEYS.some((needle) => key.toLowerCase().includes(needle));
        if (shouldRedact) {
          return [key, '[REDACTED]'];
        }
        return [key, sanitizeLogArg(val, depth + 1)];
      }),
    );
  }
  return value;
};

const baseLog =
  (level: LogLevel, context: LoggerContext) =>
  (...args: unknown[]) => {
    const requestId = context.requestId ?? generateRequestId();
    const scope = context.scope;
    const method = LEVEL_TO_CONSOLE[level];
    const timestamp = new Date().toISOString();
    const prefix = formatPrefix(level, requestId, scope, timestamp);
    const consoleMethod = console[method] as (...logArgs: unknown[]) => void;
    const sanitizedArgs = args.map((arg) => sanitizeLogArg(arg));
    consoleMethod(prefix, ...sanitizedArgs);
  };

export function createLogger(context: LoggerContext = {}): Logger {
  const requestId = context.requestId ?? generateRequestId();
  const scope = context.scope;

  const withLevel = (level: LogLevel) => baseLog(level, { requestId, scope });

  return {
    requestId,
    debug: withLevel('debug'),
    info: withLevel('info'),
    warn: withLevel('warn'),
    error: withLevel('error'),
    child: (childScope: string) =>
      createLogger({
        requestId,
        scope: scope ? `${scope}:${childScope}` : childScope,
      }),
  };
}

export function resolveRequestId(
  source?: Request | Headers | { headers?: Headers | HeadersInit } | null,
): string {
  if (!source) {
    return generateRequestId();
  }

  if (source instanceof Request) {
    return source.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();
  }

  if (source instanceof Headers) {
    return source.get(REQUEST_ID_HEADER) ?? generateRequestId();
  }

  const candidate = (source as { headers?: Headers | HeadersInit }).headers;
  if (candidate instanceof Headers) {
    return candidate.get(REQUEST_ID_HEADER) ?? generateRequestId();
  }

  return generateRequestId();
}

export function attachRequestIdHeader<T extends Response>(response: T, requestId: string): T {
  if (!response.headers.has(REQUEST_ID_HEADER)) {
    response.headers.set(REQUEST_ID_HEADER, requestId || FALLBACK_REQUEST_ID);
  }
  return response;
}

export { REQUEST_ID_HEADER };
