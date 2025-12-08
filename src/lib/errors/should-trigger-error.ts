import type { SearchParams } from '@/types/routes';

const ERROR_FLAGS = ['__throw', 'forceError', 'error', 'fail'];

const isTruthyFlag = (value: string) => value === '1' || value === 'true';

export function shouldTriggerError(searchParams?: SearchParams | null): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  if (!searchParams) {
    return false;
  }

  return ERROR_FLAGS.some((key) => {
    const candidate = searchParams[key];
    if (Array.isArray(candidate)) {
      return candidate.some((value) => isTruthyFlag(value));
    }
    if (typeof candidate === 'string') {
      return isTruthyFlag(candidate);
    }
    return false;
  });
}
