import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

const auth = vi.fn();
const apiFetch = vi.fn();
const expireDeletedUser = vi.fn();

vi.mock('@/auth', () => ({ default: () => auth() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

vi.mock('@/lib/stats/revalidateUser', () => ({
  expireDeletedUser: (...args: unknown[]) => expireDeletedUser(...args),
}));

import { deleteAccount } from './actions';

const SESSION = {
  accessToken: 'session-token',
  expiresAt: 0,
  user: { id: 'U1', username: 'rae' },
};

beforeEach(() => {
  auth.mockReset();
  apiFetch.mockReset();
  expireDeletedUser.mockReset();
  auth.mockResolvedValue(SESSION);
  apiFetch.mockResolvedValue({ status: 'queued' });
});

describe('deleteAccount only deletes the signed-in user', () => {
  it('says unauthenticated without any API call when signed out', async () => {
    auth.mockResolvedValue({ accessToken: null, expiresAt: null, user: null });
    expect(await deleteAccount('rae')).toEqual({
      error: 'unauthenticated',
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it.each(['', 'someone-else', 'RAE', 'rae2'])(
    'does not call the API when the typed name is %j',
    async (typed) => {
      expect(await deleteAccount(typed)).toEqual({
        error: 'mismatch',
        ok: false,
      });
      expect(apiFetch).not.toHaveBeenCalled();
    },
  );

  it('rejects a confirmation the schema refuses (too long)', async () => {
    expect(await deleteAccount('x'.repeat(200))).toEqual({
      error: 'invalid',
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('sends the session’s token and username, nothing else', async () => {
    expect(await deleteAccount('  rae ')).toMatchObject({
      data: undefined,
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/me', {
      accessToken: 'session-token',
      body: { confirm: 'rae' },
      method: 'DELETE',
    });
  });
});

describe('the API’s answers', () => {
  it('400 is a mismatch, 401 signed out, the rest failed', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(400));
    expect(await deleteAccount('rae')).toEqual({
      error: 'mismatch',
      ok: false,
    });
    apiFetch.mockRejectedValueOnce(new ApiError(401));
    expect(await deleteAccount('rae')).toEqual({
      error: 'unauthenticated',
      ok: false,
    });
    apiFetch.mockRejectedValueOnce(new ApiError(500));
    expect(await deleteAccount('rae')).toEqual({ error: 'failed', ok: false });
  });
});

describe('deleteAccount and the public pages', () => {
  it('expires the signed-in user’s public pages once the deletion is accepted', async () => {
    expect(await deleteAccount('rae')).toMatchObject({
      data: undefined,
      ok: true,
    });
    expect(expireDeletedUser).toHaveBeenCalledWith('U1', ['rae']);
  });

  it('expires nothing when the deletion is refused (switched off, mismatch)', async () => {
    apiFetch.mockRejectedValue(new ApiError(403));
    await deleteAccount('rae');
    await deleteAccount('someone-else');
    expect(expireDeletedUser).not.toHaveBeenCalled();
  });
});
