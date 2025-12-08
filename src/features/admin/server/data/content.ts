import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';

import {
  fetchBioSingleton,
  parseBioSingletonRow,
} from '@/features/terminal/lib/commands/bio.server';
import type { BioSnapshot } from '@/features/terminal/lib/commands/bio.types';
import {
  type CurrentlySnapshot,
  fetchCurrentlySnapshot,
} from '@/features/terminal/lib/commands/currently.server';
import { BIO_FALLBACK_BODY } from '@/lib/fallbacks/bio';
import { CONTACT_FALLBACK } from '@/lib/fallbacks/contact';
import { CURRENTLY_FALLBACK_BODY, CURRENTLY_FALLBACK_SECTIONS } from '@/lib/fallbacks/currently';
import { ONEPAGER_FALLBACK } from '@/lib/fallbacks/onepager';
import { fetchContactInfo } from '@/lib/supabase/contact';
import { fetchOnepager } from '@/lib/supabase/onepager';

import type { AdminContactRecord, AdminOnepagerRecord, SectionState } from '../../types';

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const buildEmptyBioSnapshot = (): BioSnapshot =>
  parseBioSingletonRow({ body_mdx: BIO_FALLBACK_BODY, updated_at: null });

export async function loadBio(): Promise<SectionState<BioSnapshot>> {
  noStore();
  try {
    const snapshot = await fetchBioSingleton();
    return { status: 'ok', data: snapshot };
  } catch (error) {
    return {
      status: 'error',
      data: buildEmptyBioSnapshot(),
      message: toErrorMessage(
        error,
        'Unable to load bio. Using fallback copy; retry after verifying Supabase status.',
      ),
    };
  }
}

export async function loadCurrently(): Promise<SectionState<CurrentlySnapshot>> {
  noStore();
  try {
    const snapshot = await fetchCurrentlySnapshot();
    return { status: 'ok', data: snapshot };
  } catch (error) {
    return {
      status: 'error',
      data: {
        sections: CURRENTLY_FALLBACK_SECTIONS,
        warnings: ['Currently data unavailable. Using fallback copy.'],
        updatedAt: null,
        rawBody: CURRENTLY_FALLBACK_BODY,
      },
      message: toErrorMessage(
        error,
        'Unable to load currently singleton. Using fallback copy; retry after restoring Supabase.',
      ),
    };
  }
}

export async function loadContact(): Promise<SectionState<AdminContactRecord>> {
  noStore();
  try {
    const contact = await fetchContactInfo();
    if (!contact) {
      return {
        status: 'error',
        data: CONTACT_FALLBACK,
        message: 'Contact singleton missing. Showing fallback values.',
      };
    }
    return { status: 'ok', data: contact };
  } catch (error) {
    return {
      status: 'error',
      data: CONTACT_FALLBACK,
      message: toErrorMessage(
        error,
        'Unable to load contact singleton. Using fallback copy; retry after checking Supabase connectivity.',
      ),
    };
  }
}

export async function loadOnepager(): Promise<SectionState<AdminOnepagerRecord>> {
  noStore();
  try {
    const record = await fetchOnepager();
    if (!record) {
      return {
        status: 'error',
        data: { rawBody: ONEPAGER_FALLBACK.bodyMdx, meta: ONEPAGER_FALLBACK.meta },
        message: 'Onepager singleton missing. Showing fallback values.',
      };
    }
    return {
      status: 'ok',
      data: { rawBody: record.bodyMdx, meta: record.meta },
    };
  } catch (error) {
    return {
      status: 'error',
      data: { rawBody: ONEPAGER_FALLBACK.bodyMdx, meta: ONEPAGER_FALLBACK.meta },
      message: toErrorMessage(
        error,
        'Unable to load onepager singleton. Using fallback copy; retry after checking Supabase connectivity.',
      ),
    };
  }
}
