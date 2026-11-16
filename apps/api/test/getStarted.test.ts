import { describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 12, 12);

const status = async () => {
  const response = await request('/me/get-started', { as: USER_ID });
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  return response.json();
};

const watchedListItem = (id: number) => ({
  createdAt: NOW,
  gsi2pk: `LIST#${USER_ID}#WATCHED`,
  gsi2sk: NOW,
  id,
  pk: `USER#${USER_ID}`,
  sk: `LIST#WATCHED#ITEM#${id}`,
});

const plexToken = {
  createdAt: new Date(NOW).toISOString(),
  gsi1pk: `USER#${USER_ID}#TYPE#plex`,
  pk: 'TOKEN#abcdefabcdefabcdefabcdef',
  token: 'abcdefabcdefabcdefabcdef',
  type: 'plex',
  userId: USER_ID,
};

describe('B13 Get started', () => {
  it('starts at 0 of 3 for a new user', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    seedUser({ createdAt: new Date(NOW - DAY).toISOString() });
    expect(await status()).toEqual({
      doneAt: null,
      doneCount: 0,
      hidden: false,
      steps: { alreadySeen: false, history: false, services: false },
    });
  });

  it('counts services, a show marked seen and Plex, and stamps the time once all three are done', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    seedUser({
      createdAt: new Date(NOW - DAY).toISOString(),
      watchProviders: [
        { id: 8, logo: '', logoPath: '/n.png', name: 'Netflix' },
      ],
    });
    db.seed('Lists', [watchedListItem(1)]);
    expect(await status()).toMatchObject({ doneAt: null, doneCount: 2 });

    db.seed('WebhookTokens', [plexToken]);
    expect(await status()).toEqual({
      doneAt: NOW,
      doneCount: 3,
      hidden: false,
      steps: { alreadySeen: true, history: true, services: true },
    });

    // Stamped once: a later read keeps the first time
    vi.setSystemTime(NOW + DAY);
    expect(await status()).toMatchObject({ doneAt: NOW, hidden: false });
  });

  it('counts an import as history', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    seedUser({
      createdAt: new Date(NOW - DAY).toISOString(),
      lastImport: { createdAt: NOW - DAY, importId: 'x', written: 10 },
    });
    expect(await status()).toMatchObject({ steps: { history: true } });
  });

  it('hides the card 3 days after it was done', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    seedUser({
      createdAt: new Date(NOW - 5 * DAY).toISOString(),
      getStartedDoneAt: NOW - 3 * DAY - 1,
    });
    expect(await status()).toMatchObject({ hidden: true });
  });

  it('hides the card 30 days after sign-up, done or not', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    seedUser({ createdAt: new Date(NOW - 31 * DAY).toISOString() });
    expect(await status()).toMatchObject({ doneCount: 0, hidden: true });
  });
});
