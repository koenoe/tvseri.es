'use server';

import { UpdateWebhookSettingsSchema } from '@tvseri.es/schemas';
import { revalidatePath } from 'next/cache';
import * as v from 'valibot';

import { getViewer } from '@/auth/viewer';
import { apiFailure } from '@/lib/actions/apiFailure';
import { type ActionResult, actionError, okResult } from '@/lib/actions/result';
import { apiFetch } from '@/lib/api/client';
import getBaseUrl from '@/lib/getBaseUrl';

import { webhookUrl } from './_lib/webhookUrl';

/**
 * The Plex card's writes. Each one acts on the signed-in viewer's own
 * link: the only identity it uses is the session's access token, so there is
 * no id or token to pass, and a signed-out caller gets `unauthenticated`
 * without any API call.
 */

const PROVIDER = { type: 'plex' } as const;

/** A 400 is a setting the API refuses */
const STATUSES = { 400: 'invalid' } as const;

/** The nav lines and the card read the same status: refresh every hole. */
const refresh = () => revalidatePath('/settings', 'layout');

/** Create my Plex URL / New URL: the previous URL stops working. */
export async function createPlexUrl(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    await apiFetch('/webhook/type/:type', {
      accessToken: viewer.accessToken,
      method: 'POST',
      params: PROVIDER,
    });
  } catch (error) {
    return apiFailure('plex', error, STATUSES);
  }
  refresh();
  return okResult(undefined);
}

/**
 * Pause scrobbling and whose plays count (`onlyAccountId` is the last
 * scrobble's account, or null for everyone; the API refuses any other id).
 */
export async function updatePlex(input: unknown): Promise<ActionResult> {
  const parsed = v.safeParse(UpdateWebhookSettingsSchema, input);
  if (!parsed.success) {
    return actionError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    await apiFetch('/webhook/type/:type', {
      accessToken: viewer.accessToken,
      body: parsed.output,
      method: 'PATCH',
      params: PROVIDER,
    });
  } catch (error) {
    return apiFailure('plex', error, STATUSES);
  }
  refresh();
  return okResult(undefined);
}

/** Disconnect: the URL stops working; what was marked stays. */
export async function disconnectPlex(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    await apiFetch('/webhook/type/:type', {
      accessToken: viewer.accessToken,
      method: 'DELETE',
      params: PROVIDER,
    });
  } catch (error) {
    return apiFailure('plex', error, STATUSES);
  }
  refresh();
  return okResult(undefined);
}

/**
 * The full webhook URL, only when the viewer asks for it (Show, Copy): the
 * token is a bearer secret, so it is never in the page's HTML or RSC payload.
 * Read fresh from the API with the session's token; never logged.
 */
export async function revealPlexUrl(): Promise<
  ActionResult<Readonly<{ url: string }>>
> {
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    const { token } = await apiFetch<Readonly<{ token: string | null }>>(
      '/webhook/type/:type',
      { accessToken: viewer.accessToken, params: PROVIDER },
    );
    if (!token) {
      return actionError('not-found');
    }
    return okResult({ url: webhookUrl(getBaseUrl(), 'plex', token) });
  } catch (error) {
    return apiFailure('plex', error, STATUSES);
  }
}
