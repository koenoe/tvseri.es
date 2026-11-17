import { beforeEach, describe, expect, it, vi } from 'vitest';

import auth from '@/auth';
import { setUserDisplayCookie } from '@/auth/sessionCookies';
import { getViewer } from '@/auth/viewer';
import { ApiError, apiFetch } from '@/lib/api/client';
import { revalidateUser } from '@/lib/stats/revalidateUser';

import { checkUsername, updateProfile } from './profile';

vi.mock('@/auth', () => ({ default: vi.fn() }));
vi.mock('@/auth/viewer', () => ({ getViewer: vi.fn() }));
vi.mock('@/auth/sessionCookies', () => ({ setUserDisplayCookie: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/stats/revalidateUser', () => ({ revalidateUser: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch: vi.fn(),
}));

const signedIn = (user: { name?: string; username: string }) =>
  vi.mocked(auth).mockResolvedValue({
    accessToken: 'token-rae',
    expiresAt: 0,
    user: { id: 'u-rae', ...user },
  } as never);

beforeEach(() => {
  vi.mocked(revalidateUser).mockReset();
  vi.mocked(getViewer).mockResolvedValue({
    accessToken: 'token-rae',
    id: 'u-rae',
    role: 'user',
  });
  signedIn({ name: 'Rae Fox', username: 'rae' });
});

describe('updateProfile', () => {
  it('sends only the changed field, with the session token', async () => {
    vi.mocked(apiFetch).mockResolvedValue({});

    const result = await updateProfile({ name: 'Rae F', username: 'rae' });

    expect(result).toMatchObject({
      data: { name: 'Rae F', username: 'rae' },
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledWith('/me', {
      accessToken: 'token-rae',
      body: { name: 'Rae F' },
      method: 'PUT',
    });
    expect(setUserDisplayCookie).not.toHaveBeenCalled();
    // a name stays private: no public page changes
    expect(revalidateUser).not.toHaveBeenCalled();
  });

  it('expires the public pages under the old and the new username on a rename', async () => {
    vi.mocked(apiFetch).mockResolvedValue({});
    await updateProfile({ name: 'Rae Fox', username: 'rae-fox' });
    expect(revalidateUser).toHaveBeenCalledTimes(1);
    expect(revalidateUser).toHaveBeenCalledWith('u-rae', ['rae', 'rae-fox']);
  });

  it('expires nothing when the rename fails', async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(409, 'UsernameAlreadyTaken'),
    );
    await updateProfile({ name: 'Rae Fox', username: 'rae-fox' });
    expect(revalidateUser).not.toHaveBeenCalled();
  });

  it('sends nothing when nothing changed', async () => {
    const result = await updateProfile({ name: 'Rae Fox', username: 'rae' });

    expect(result.ok).toBe(true);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('refreshes the display cookie when the username changes', async () => {
    vi.mocked(apiFetch).mockResolvedValue({});

    await updateProfile({ name: 'Rae Fox', username: 'rae-fox' });

    expect(apiFetch).toHaveBeenCalledWith(
      '/me',
      expect.objectContaining({ body: { username: 'rae-fox' } }),
    );
    expect(setUserDisplayCookie).toHaveBeenCalledWith('rae-fox');
  });

  it('applies the username rule only to a username that changes', async () => {
    signedIn({ name: 'Rae Fox', username: 'Old_Name' });
    vi.mocked(apiFetch).mockResolvedValue({});

    const kept = await updateProfile({ name: 'Rae F', username: 'Old_Name' });
    expect(kept.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith(
      '/me',
      expect.objectContaining({ body: { name: 'Rae F' } }),
    );

    const changed = await updateProfile({
      name: 'Rae Fox',
      username: 'Bad Name',
    });
    expect(changed).toEqual({ error: 'invalid', ok: false });
  });

  it('caps a new username at 30 characters; a longer saved one stays', async () => {
    const tooLong = await updateProfile({
      name: 'Rae Fox',
      username: 'a'.repeat(31),
    });
    expect(tooLong).toEqual({ error: 'invalid', ok: false });
    expect(apiFetch).not.toHaveBeenCalled();

    const legacy = 'a-handle-chosen-before-the-thirty-character-cap';
    signedIn({ name: 'Rae Fox', username: legacy });
    vi.mocked(apiFetch).mockResolvedValue({});
    const kept = await updateProfile({ name: 'Rae F', username: legacy });
    expect(kept.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith(
      '/me',
      expect.objectContaining({ body: { name: 'Rae F' } }),
    );
  });

  it('refuses a reserved name before asking the API', async () => {
    const result = await updateProfile({ name: 'Rae Fox', username: 'admin' });

    expect(result).toEqual({ error: 'invalid', ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('maps a 409 to taken without leaking the API text', async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(409, 'UsernameAlreadyTaken'),
    );

    const result = await updateProfile({ name: 'Rae Fox', username: 'juno' });

    expect(result).toEqual({ error: 'taken', ok: false });
    expect(setUserDisplayCookie).not.toHaveBeenCalled();
  });

  it('maps other failures and 401 to plain answers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(500, 'boom'));
    expect(await updateProfile({ name: 'X', username: 'rae' })).toEqual({
      error: 'failed',
      ok: false,
    });
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(401));
    expect(await updateProfile({ name: 'Y', username: 'rae' })).toEqual({
      error: 'unauthenticated',
      ok: false,
    });
  });

  it('rejects bad input and a signed-out caller before any request', async () => {
    expect(
      await updateProfile({ name: 'x'.repeat(129), username: 'rae' }),
    ).toEqual({ error: 'invalid', ok: false });
    expect(await updateProfile({ username: 'rae' } as never)).toEqual({
      error: 'invalid',
      ok: false,
    });

    vi.mocked(auth).mockResolvedValue({
      accessToken: null,
      expiresAt: null,
      user: null,
    });
    expect(await updateProfile({ name: 'Z', username: 'rae' })).toEqual({
      error: 'unauthenticated',
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('takes no user id: the id never comes from the input', async () => {
    vi.mocked(apiFetch).mockResolvedValue({});

    await updateProfile({
      id: 'u-someone-else',
      name: 'Rae F',
      username: 'rae',
    } as never);

    expect(JSON.stringify(vi.mocked(apiFetch).mock.calls)).not.toContain(
      'u-someone-else',
    );
  });
});

describe('checkUsername', () => {
  it('is available when the lookup finds nobody', async () => {
    vi.mocked(apiFetch).mockResolvedValue(null);

    expect(await checkUsername('rae-fox')).toMatchObject({
      data: 'available',
      ok: true,
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/user/by-username/:username',
      expect.objectContaining({
        notFound: 'null',
        params: { username: 'rae-fox' },
      }),
    );
  });

  it('is taken when somebody else has it, available when it is the viewer', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ id: 'u-margaux' });
    expect(await checkUsername('margaux')).toMatchObject({
      data: 'taken',
      ok: true,
    });

    vi.mocked(apiFetch).mockResolvedValueOnce({ id: 'u-rae' });
    expect(await checkUsername('rae')).toMatchObject({
      data: 'available',
      ok: true,
    });
  });

  it('refuses a username the rule would reject, and signed-out callers', async () => {
    expect(await checkUsername('No Good')).toEqual({
      error: 'invalid',
      ok: false,
    });
    vi.mocked(getViewer).mockResolvedValue(null);
    expect(await checkUsername('rae-fox')).toEqual({
      error: 'unauthenticated',
      ok: false,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
