'use server';

import {
  CountryCodeSchema,
  type UpdateWatchProvidersForUser,
  UpdateWatchProvidersForUserSchema,
} from '@tvseri.es/schemas';
import { refresh, revalidatePath } from 'next/cache';
import * as v from 'valibot';

import { getViewer } from '@/auth/viewer';
import { apiFailure } from '@/lib/actions/apiFailure';
import { type ActionResult, actionError, okResult } from '@/lib/actions/result';
import { apiFetch } from '@/lib/api/client';

/**
 * `PUT /me { country }`: the region that decides which services and release
 * dates the viewer sees. The new region's services load with the refreshed
 * page.
 */
export async function updateCountry(country: string): Promise<ActionResult> {
  const parsed = v.safeParse(CountryCodeSchema, country);
  if (!parsed.success) {
    return actionError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    await apiFetch('/me', {
      accessToken: viewer.accessToken,
      body: { country: parsed.output },
      method: 'PUT',
    });
  } catch (error) {
    return apiFailure('settings', error);
  }
  refresh();
  return okResult(undefined);
}

/** `PUT /me/watch-providers`: the viewer's whole list of services. */
export async function updateWatchProviders(
  input: UpdateWatchProvidersForUser,
): Promise<ActionResult> {
  const parsed = v.safeParse(UpdateWatchProvidersForUserSchema, input);
  if (!parsed.success) {
    return actionError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    await apiFetch('/me/watch-providers', {
      accessToken: viewer.accessToken,
      body: parsed.output,
      method: 'PUT',
    });
  } catch (error) {
    return apiFailure('settings', error);
  }
  // Not `refresh()`: Get started saves here too, and its tiles keep their
  // own state, so the profile must not re-render on every tap. Settings is
  // the path re-rendered at once.
  revalidatePath('/settings', 'layout');
  return okResult(undefined);
}
