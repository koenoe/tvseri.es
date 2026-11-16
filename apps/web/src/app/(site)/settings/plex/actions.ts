'use server';

import { UpdateWebhookSettingsSchema } from '@tvseri.es/schemas';
import { revalidatePath } from 'next/cache';
import * as v from 'valibot';

import { getViewer } from '@/auth/viewer';
import { ApiError, apiFetch } from '@/lib/api/client';
import getBaseUrl from '@/lib/getBaseUrl';

import { type AppsActionResult, appsError, appsOk } from '../_lib/appsResult';
import { webhookUrl } from './_lib/webhookUrl';

/**
 * The Plex card's writes. Each one acts on the signed-in viewer's own
 * link: the only identity it uses is the session's access token, so there is
 * no id or token to pass, and a signed-out caller gets `unauthenticated`
 * without any API call.
 */

const PROVIDER = { type: 'plex' } as const;

function failed(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return appsError('unauthenticated');
    }
    if (error.status === 404) {
      return appsError('not-found');
    }
    if (error.status === 400) {
      return appsError('invalid');
    }
  }
  console.error('[plex]', error instanceof ApiError ? error.status : error);
  return appsError('failed');
}

/** The nav lines and the card read the same status: refresh every hole. */
const refresh = () => revalidatePath('/settings', 'layout');

/** Create my Plex URL / New URL: the previous URL stops working. */
export async function createPlexUrl(): Promise<AppsActionResult> {
  const viewer = await getViewer();
  if (!viewer) {
    return appsError('unauthenticated');
  }
  try {
    await apiFetch('/webhook/type/:type', {
      accessToken: viewer.accessToken,
      method: 'POST',
      params: PROVIDER,
    });
  } catch (error) {
    return failed(error);
  }
  refresh();
  return appsOk(undefined);
}

/**
 * Pause scrobbling and whose plays count (`onlyAccountId` is the last
 * scrobble's account, or null for everyone; the API refuses any other id).
 */
export async function updatePlex(input: unknown): Promise<AppsActionResult> {
  const parsed = v.safeParse(UpdateWebhookSettingsSchema, input);
  if (!parsed.success) {
    return appsError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return appsError('unauthenticated');
  }
  try {
    await apiFetch('/webhook/type/:type', {
      accessToken: viewer.accessToken,
      body: parsed.output,
      method: 'PATCH',
      params: PROVIDER,
    });
  } catch (error) {
    return failed(error);
  }
  refresh();
  return appsOk(undefined);
}

/** Disconnect: the URL stops working; what was marked stays. */
export async function disconnectPlex(): Promise<AppsActionResult> {
  const viewer = await getViewer();
  if (!viewer) {
    return appsError('unauthenticated');
  }
  try {
    await apiFetch('/webhook/type/:type', {
      accessToken: viewer.accessToken,
      method: 'DELETE',
      params: PROVIDER,
    });
  } catch (error) {
    return failed(error);
  }
  refresh();
  return appsOk(undefined);
}

/**
 * The full webhook URL, only when the viewer asks for it (Show, Copy): the
 * token is a bearer secret, so it is never in the page's HTML or RSC payload.
 * Read fresh from the API with the session's token; never logged.
 */
export async function revealPlexUrl(): Promise<
  AppsActionResult<Readonly<{ url: string }>>
> {
  const viewer = await getViewer();
  if (!viewer) {
    return appsError('unauthenticated');
  }
  try {
    const { token } = await apiFetch<Readonly<{ token: string | null }>>(
      '/webhook/type/:type',
      { accessToken: viewer.accessToken, params: PROVIDER },
    );
    if (!token) {
      return appsError('not-found');
    }
    return appsOk({ url: webhookUrl(getBaseUrl(), 'plex', token) });
  } catch (error) {
    return failed(error);
  }
}
