import { beforeEach, describe, expect, it, vi } from 'vitest';

import { missingUser } from './missingUser';

const getViewer = vi.fn();
const checkUser = vi.fn();

vi.mock('./viewer', () => ({ getViewer: () => getViewer() }));
vi.mock('./me', () => ({
  checkUser: (accessToken: string) => checkUser(accessToken),
}));

beforeEach(() => {
  getViewer.mockReset();
  checkUser.mockReset();
});

describe('missingUser', () => {
  it('is unauthenticated without a session, asking no account', async () => {
    getViewer.mockResolvedValue(null);
    await expect(missingUser()).resolves.toBe('unauthenticated');
    expect(checkUser).not.toHaveBeenCalled();
  });

  it('is unauthenticated when the account is gone', async () => {
    getViewer.mockResolvedValue({ accessToken: 't', id: 'u', role: 'user' });
    checkUser.mockResolvedValue({ kind: 'gone' });
    await expect(missingUser()).resolves.toBe('unauthenticated');
  });

  it('is failed, never signed out, when a valid session’s account can’t be read', async () => {
    getViewer.mockResolvedValue({ accessToken: 't', id: 'u', role: 'user' });
    checkUser.mockResolvedValue({ kind: 'unknown' });
    await expect(missingUser()).resolves.toBe('failed');
  });
});
