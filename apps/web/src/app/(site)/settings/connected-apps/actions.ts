'use server';

import {
  ConnectionServiceSchema,
  UpdateWebhookSettingsSchema,
} from '@tvseri.es/schemas';
import { refresh } from 'next/cache';
import * as v from 'valibot';

import { getViewer } from '@/auth/viewer';
import { apiFailure } from '@/lib/actions/apiFailure';
import { type ActionResult, actionError, okResult } from '@/lib/actions/result';
import { ApiError, apiFetch } from '@/lib/api/client';
import getBaseUrl from '@/lib/getBaseUrl';

import { webhookUrl } from './_lib/webhookUrl';

/**
 * The app cards' writes. Each acts on the signed-in viewer's own link: the
 * only identity is the session's access token, so a signed-out caller gets
 * `unauthenticated` without an API call.
 */

const PROVIDER = { type: 'plex' } as const;

/** A 400 is a setting the API refuses */
const STATUSES = { 400: 'invalid' } as const;

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
 * The full webhook URL, only on Show or Copy: the token is a bearer secret,
 * so it is never in the page's HTML or RSC payload, and never logged. A
 * read, but a server action on purpose: a POST is never cached or
 * prefetched, so the URL can't land in a browser or shared cache.
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

/**
 * Sync now. Who may is the API's call (`canSyncNow`), so its 403 is
 * `invalid` here. A sync already running (409) is what was asked for, so
 * the refreshed card shows it instead of an error.
 */
export async function syncConnection(input: unknown): Promise<ActionResult> {
  const service = v.safeParse(ConnectionServiceSchema, input);
  if (!service.success) {
    return actionError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    await apiFetch('/me/connections/:service/sync', {
      accessToken: viewer.accessToken,
      method: 'POST',
      params: { service: service.output },
    });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 409)) {
      return apiFailure(service.output, error, { 403: 'invalid' });
    }
  }
  refresh();
  return okResult(undefined);
}

/** Disconnect a service: the stored session goes; synced episodes stay. */
export async function disconnectConnection(
  input: unknown,
): Promise<ActionResult> {
  const service = v.safeParse(ConnectionServiceSchema, input);
  if (!service.success) {
    return actionError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    await apiFetch('/me/connections/:service', {
      accessToken: viewer.accessToken,
      method: 'DELETE',
      params: { service: service.output },
    });
  } catch (error) {
    return apiFailure(service.output, error, STATUSES);
  }
  refresh();
  return okResult(undefined);
}
