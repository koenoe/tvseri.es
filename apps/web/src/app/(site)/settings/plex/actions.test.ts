import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

const getViewer = vi.fn();
const apiFetch = vi.fn();
const revalidatePath = vi.fn();

vi.mock('@/auth/viewer', () => ({ getViewer: () => getViewer() }));
vi.mock('next/cache', () => ({
  revalidatePath: (...a: unknown[]) => revalidatePath(...a),
}));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

import {
  createPlexUrl,
  disconnectPlex,
  revealPlexUrl,
  updatePlex,
} from './actions';

const VIEWER = { accessToken: 'session-token', id: 'U1', role: 'user' };

beforeEach(() => {
  getViewer.mockReset();
  apiFetch.mockReset();
  revalidatePath.mockReset();
  getViewer.mockResolvedValue(VIEWER);
  apiFetch.mockResolvedValue({ message: 'OK' });
});

describe('signed out', () => {
  it.each([
    ['createPlexUrl', () => createPlexUrl()],
    ['updatePlex', () => updatePlex({ paused: true })],
    ['disconnectPlex', () => disconnectPlex()],
    ['revealPlexUrl', () => revealPlexUrl()],
  ])('%s says unauthenticated and never calls the API', async (_n, run) => {
    getViewer.mockResolvedValue(null);
    expect(await run()).toEqual({ error: 'unauthenticated', ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('destructive actions act only on the signed-in viewer', () => {
  it('New URL posts with the session token and nothing else', async () => {
    await createPlexUrl();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/webhook/type/:type', {
      accessToken: 'session-token',
      method: 'POST',
      params: { type: 'plex' },
    });
  });

  it('Disconnect deletes with the session token and nothing else', async () => {
    await disconnectPlex();
    expect(apiFetch).toHaveBeenCalledWith('/webhook/type/:type', {
      accessToken: 'session-token',
      method: 'DELETE',
      params: { type: 'plex' },
    });
  });

  it('takes no arguments from the caller', () => {
    expect(createPlexUrl.length).toBe(0);
    expect(disconnectPlex.length).toBe(0);
  });
});

describe('updatePlex', () => {
  it('sends only the validated fields with the session token', async () => {
    const result = await updatePlex({ onlyAccountId: null, paused: false });
    expect(result.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith('/webhook/type/:type', {
      accessToken: 'session-token',
      body: { onlyAccountId: null, paused: false },
      method: 'PATCH',
      params: { type: 'plex' },
    });
  });

  it.each([{}, { paused: 'yes' }, { paused: true, userId: 'U2' }, null])(
    'rejects %j without calling the API',
    async (input) => {
      expect(await updatePlex(input)).toEqual({ error: 'invalid', ok: false });
      expect(apiFetch).not.toHaveBeenCalled();
    },
  );

  it('maps the API errors without leaking their text', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(400, 'secret detail'));
    expect(await updatePlex({ onlyAccountId: 9 })).toEqual({
      error: 'invalid',
      ok: false,
    });
    apiFetch.mockRejectedValueOnce(new ApiError(404));
    expect(await updatePlex({ paused: true })).toEqual({
      error: 'not-found',
      ok: false,
    });
    apiFetch.mockRejectedValueOnce(new ApiError(500));
    expect(await updatePlex({ paused: true })).toEqual({
      error: 'failed',
      ok: false,
    });
  });

  it('refreshes the settings holes after a write', async () => {
    await updatePlex({ paused: true });
    expect(revalidatePath).toHaveBeenCalledWith('/settings', 'layout');
  });
});

describe('revealPlexUrl', () => {
  it('reads the token with the session token and returns the full URL', async () => {
    vi.stubEnv('SITE_URL', 'https://www.example.com');
    vi.stubEnv('NODE_ENV', 'production');
    apiFetch.mockResolvedValue({ token: 'a1b2c3d4e5f6a1b2c3d4e5f6' });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await revealPlexUrl()).toMatchObject({
      data: {
        url: 'https://www.example.com/api/webhooks/scrobble/plex?token=a1b2c3d4e5f6a1b2c3d4e5f6',
      },
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledWith('/webhook/type/:type', {
      accessToken: 'session-token',
      params: { type: 'plex' },
    });
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
    vi.unstubAllEnvs();
  });

  it('says not-found when no URL was created', async () => {
    apiFetch.mockResolvedValue({ token: null });
    expect(await revealPlexUrl()).toEqual({ error: 'not-found', ok: false });
  });

  it('never revalidates (a read)', async () => {
    apiFetch.mockResolvedValue({ token: 'a1b2c3d4e5f6a1b2c3d4e5f6' });
    await revealPlexUrl();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
