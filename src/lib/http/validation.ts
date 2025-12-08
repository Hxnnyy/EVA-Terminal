import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';

type ValidateOptions = {
  badRequestMessage?: string;
  cacheControl?: string;
  preprocess?: (raw: unknown) => unknown;
};

type ValidationSuccess<T> = { ok: true; data: T };
type ValidationFailure = { ok: false; response: NextResponse };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const DEFAULT_CACHE_CONTROL = 'no-store';

export async function validateJsonBody<T>(
  request: Request,
  schema: ZodSchema<T>,
  options: ValidateOptions = {},
): Promise<ValidationResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: options.badRequestMessage ?? 'Invalid JSON payload.' },
        {
          status: 400,
          headers: { 'Cache-Control': options.cacheControl ?? DEFAULT_CACHE_CONTROL },
        },
      ),
    };
  }

  const candidate = options.preprocess ? options.preprocess(raw) : raw;
  const parsed = schema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message);
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: options.badRequestMessage ?? 'Invalid request payload.',
          details: issues,
        },
        {
          status: 400,
          headers: { 'Cache-Control': options.cacheControl ?? DEFAULT_CACHE_CONTROL },
        },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
