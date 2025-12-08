'use client';

const WARMUP_TIMEOUT_MS = 2000;

const WARMUP_ENDPOINTS = [
  '/api/writing',
  '/api/reel',
  '/api/cv',
  '/api/links',
  '/api/projects',
  '/api/currently',
  '/api/investments', // Warm cache only; refresh is handled by Vercel Cron
];

// Non-blocking fetch with abort; ignores errors.
async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = WARMUP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, { ...init, signal: controller.signal });
  } catch {
    // swallow; warmups are best-effort
  } finally {
    window.clearTimeout(timer);
  }
}

async function warmupSupabaseEndpoints() {
  await Promise.allSettled(WARMUP_ENDPOINTS.map((url) => fetchWithTimeout(url)));
}

export async function runBootWarmups() {
  await warmupSupabaseEndpoints();
}
