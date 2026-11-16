'use server';

import {
  CountryCodeSchema,
  type UpdateWatchProvidersForUser,
  UpdateWatchProvidersForUserSchema,
} from '@tvseri.es/schemas';
import { revalidatePath } from 'next/cache';
import * as v from 'valibot';

import { getViewer } from '@/auth/viewer';
import { apiFetch } from '@/lib/api/client';

import { failure } from './failure';
import { done, fail, type SettingsActionResult } from './result';

/**
 * `PUT /me { country }`: the region that decides which services and release
 * dates the viewer sees. The new region's services load with the refreshed
 * page.
 */
export async function updateCountry(
  country: string,
): Promise<SettingsActionResult> {
  const parsed = v.safeParse(CountryCodeSchema, country);
  if (!parsed.success) {
    return fail('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return fail('unauthenticated');
  }
  try {
    await apiFetch('/me', {
      accessToken: viewer.accessToken,
      body: { country: parsed.output },
      method: 'PUT',
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath('/settings', 'layout');
  return done(undefined);
}

/** `PUT /me/watch-providers`: the viewer's whole list of services. */
export async function updateWatchProviders(
  input: UpdateWatchProvidersForUser,
): Promise<SettingsActionResult> {
  const parsed = v.safeParse(UpdateWatchProvidersForUserSchema, input);
  if (!parsed.success) {
    return fail('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return fail('unauthenticated');
  }
  try {
    await apiFetch('/me/watch-providers', {
      accessToken: viewer.accessToken,
      body: parsed.output,
      method: 'PUT',
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath('/settings', 'layout');
  return done(undefined);
}
