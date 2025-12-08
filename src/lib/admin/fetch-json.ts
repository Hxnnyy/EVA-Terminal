type AdminFetchBody = string | FormData | Blob | ArrayBuffer | Record<string, unknown> | undefined;

export type AdminFetchOptions = {
  method?: string;
  body?: AdminFetchBody;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export class AdminApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function adminFetchJson<T>(
  input: string,
  options: AdminFetchOptions = {},
): Promise<T> {
  const { method, body, headers = {}, signal, timeoutMs } = options;

  const controller = timeoutMs ? new AbortController() : null;
  const mergedSignal = mergeSignals(signal, controller?.signal);
  const resolvedBody = normalizeBody(body);
  const isFormData = body instanceof FormData;

  const requestInit: RequestInit = {
    method: method ?? (resolvedBody !== undefined ? 'POST' : 'GET'),
    headers: {
      Accept: 'application/json',
      ...(isFormData || resolvedBody === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: resolvedBody,
    signal: mergedSignal,
    cache: 'no-store',
  };

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (controller && typeof timeoutMs === 'number' && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const response = await fetch(input, requestInit);
    const raw = await response.text();
    const parsed = parseJsonSafely(raw);

    if (!response.ok) {
      const message = extractErrorMessage(parsed, raw, response.statusText);
      throw new AdminApiError(message, response.status, parsed ?? raw ?? null);
    }

    return (parsed as T) ?? (undefined as T);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    if (error instanceof AdminApiError) {
      throw error;
    }
    throw new AdminApiError(error instanceof Error ? error.message : 'Admin request failed.', 0);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export type AdminFetcher = (<T>(input: string, options?: AdminFetchOptions) => Promise<T>) & {
  cancel: () => void;
};

export function createAdminFetcher(defaults?: { timeoutMs?: number }): AdminFetcher {
  let inFlight: AbortController | null = null;

  const fetchJson = (async <T>(input: string, options: AdminFetchOptions = {}): Promise<T> => {
    inFlight?.abort();
    const controller = new AbortController();
    inFlight = controller;
    try {
      return await adminFetchJson<T>(input, {
        ...options,
        timeoutMs: options.timeoutMs ?? defaults?.timeoutMs,
        signal: mergeSignals(options.signal, controller.signal),
      });
    } finally {
      if (inFlight === controller) {
        inFlight = null;
      }
    }
  }) as AdminFetcher;

  fetchJson.cancel = () => {
    inFlight?.abort();
    inFlight = null;
  };

  return fetchJson;
}

function normalizeBody(body: AdminFetchBody): RequestInit['body'] {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }
  return JSON.stringify(body);
}

function parseJsonSafely(value: string | null) {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractErrorMessage(parsed: unknown, raw: string, fallback: string) {
  if (
    parsed &&
    typeof parsed === 'object' &&
    'error' in parsed &&
    typeof (parsed as { error: unknown }).error === 'string'
  ) {
    return (parsed as { error: string }).error;
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    'message' in parsed &&
    typeof (parsed as { message: unknown }).message === 'string'
  ) {
    return (parsed as { message: string }).message;
  }
  if (raw && raw.trim()) {
    return raw.trim();
  }
  return fallback || 'Request failed.';
}

function mergeSignals(...signals: Array<AbortSignal | undefined | null>): AbortSignal | undefined {
  const filtered = signals.filter(Boolean) as AbortSignal[];
  if (!filtered.length) {
    return undefined;
  }
  if (filtered.length === 1) {
    return filtered[0];
  }
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
    return (
      AbortSignal as typeof AbortSignal & { any?: (signals: AbortSignal[]) => AbortSignal }
    ).any?.(filtered);
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  filtered.forEach((signal) => {
    if (signal.aborted) {
      abort();
    } else {
      signal.addEventListener('abort', abort, { once: true });
    }
  });
  return controller.signal;
}
