import { beforeEach, describe, expect, it, vi } from 'vitest';

import { decryptSecret, encryptSecret } from '@/lib/connections/crypto';
import { getConnection } from '@/lib/db/connections';
import { consumeLinkCode, mintLinkCode } from '@/lib/db/connections/linkCode';

import { db } from './db';
import { fakeKms } from './fakeKms';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

/**
 * The connect flow: mint a code, then the extension's link spends it, reads
 * Netflix once (stubbed fetch) and stores the session encrypted (fake KMS).
 */

const fetchMock = vi.fn();
let encrypted: ReturnType<typeof fakeKms> = [];

const NETFLIX_ID: Readonly<Record<string, unknown>> = {
  domain: '.netflix.com',
  expiresDate: null,
  httpOnly: true,
  name: 'NetflixId',
  path: '/',
  sameSite: 'lax',
  secure: true,
  value: 'session-value',
};

const BROWSE_HTML =
  '<script>window.netflix = {"BUILD_IDENTIFIER":"6.0031.111.01","guid":"TESTPROFILEGUID0000000000A"};</script>';

const ACTIVITY = {
  jsonGraph: {
    aui: {
      viewingActivity: {
        value: {
          profileInfo: { profileName: 'Koen' },
          vhSize: 2542,
          viewedItems: [
            {
              date: 1763000000000,
              episodeTitle: 'Alpha and Omega',
              movieID: 80_100_172,
              seasonDescriptor: 'Season 3',
              series: 80_100_172,
              seriesTitle: 'Dark',
              title: 'Alpha and Omega',
            },
          ],
        },
      },
    },
  },
};

const browseOk = () =>
  fetchMock.mockImplementationOnce(
    async () => new Response(BROWSE_HTML, { status: 200 }),
  );
const activityOk = () =>
  fetchMock.mockImplementationOnce(async () =>
    Response.json(ACTIVITY, { status: 200 }),
  );

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  encrypted = fakeKms();
  return seedUser();
});

describe('POST /me/connections/link-code', () => {
  it('mints a five-minute, viewer-bound code', async () => {
    const response = await request('/me/connections/link-code', {
      as: USER_ID,
      body: { service: 'netflix' },
      method: 'POST',
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { code: string; expiresAt: number };
    expect(body.code).toMatch(/^\d{4}$/);
    expect(body.expiresAt).toBeGreaterThan(Date.now() + 4 * 60_000);
    const codeItems = db
      .dump('Connections')
      .filter((item) => item.pk === `CODE#${body.code}`) as Array<{
      userId: string;
    }>;
    expect(codeItems[0]?.userId).toBe(USER_ID);
  });

  it('refuses an anonymous caller', async () => {
    const response = await request('/me/connections/link-code', {
      body: { service: 'netflix' },
      method: 'POST',
    });
    expect(response.status).toBe(401);
  });

  it('needs the service the code is for', async () => {
    for (const body of [undefined, {}, { service: 'hulu' }]) {
      const response = await request('/me/connections/link-code', {
        as: USER_ID,
        body,
        method: 'POST',
      });
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
  });
});

describe('a code is bound to its service', () => {
  it('refuses a code minted for another service, as a bad code, and leaves it unspent', async () => {
    const { code } = await mintLinkCode(USER_ID, 'bbc');
    const response = await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: 'bad-code',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(consumeLinkCode(code, 'bbc')).resolves.toBe(USER_ID);
  });
});

describe('failed link attempts', () => {
  const guess = (code: string, address?: string) =>
    request('/connections/netflix/link', {
      body: { address, code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });

  const failureCounters = () =>
    db
      .dump('Connections')
      .filter((item) => String(item.pk).startsWith('LINKFAIL#'));

  /** A code nobody holds: the one after a live code, wrapped */
  const wrongCode = (live: string) =>
    String((Number(live) + 1) % 10_000).padStart(4, '0');

  it('stops an address after 10 failures in the hour, without spending a good code', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await guess(wrongCode(code), '203.0.113.7')).status).toBe(404);
    }
    const limited = await guess(code, '203.0.113.7');
    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toEqual({
      ok: false,
      reason: 'rate-limited',
    });
    expect(fetchMock).not.toHaveBeenCalled();

    // Another address isn't held back, and the code still works
    browseOk();
    activityOk();
    expect((await guess(code, '198.51.100.2')).status).toBe(201);
  });

  it('stops everyone after 100 failures in the hour', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await guess(wrongCode(code), `10.0.${Math.floor(attempt / 10)}.1`);
    }
    expect((await guess(code, '192.0.2.44')).status).toBe(429);
    expect((await guess(code)).status).toBe(429);
    await expect(consumeLinkCode(code, 'netflix')).resolves.toBe(USER_ID);
  });

  it('holds the limit under a parallel burst: no more than 10 codes tried', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    const statuses = await Promise.all(
      Array.from(
        { length: 20 },
        async () => (await guess(wrongCode(code), '203.0.113.7')).status,
      ),
    );
    expect(statuses.filter((status) => status === 404)).toHaveLength(10);
    expect(statuses.filter((status) => status === 429)).toHaveLength(10);
    expect(
      failureCounters()
        .map((item) => item.n)
        .sort(),
    ).toEqual([10, 10]);
  });

  it('gives the address its slot back when the global limit refuses', async () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      await guess('0000');
    }
    expect((await guess('0000', '192.0.2.44')).status).toBe(429);
    const address = failureCounters().filter((item) =>
      String(item.pk).startsWith('LINKFAIL#ADDR#'),
    );
    expect(address).toEqual([expect.objectContaining({ n: 0 })]);
  });

  it('limits an IPv6 /64 as one address', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await guess(wrongCode(code), `2001:db8:0:1::${attempt + 1}`);
    }
    expect((await guess(code, '2001:db8:0:1:ffff::1')).status).toBe(429);
    expect((await guess(wrongCode(code), '2001:db8:0:2::1')).status).toBe(404);
  });

  it('limits an IPv4-mapped address as its IPv4 address', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await guess(wrongCode(code), '203.0.113.7');
    }
    expect((await guess(code, '::ffff:203.0.113.7')).status).toBe(429);
  });

  it('counts a failure without an address globally only', async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      expect((await guess('0000')).status).toBe(404);
    }
    const counters = db
      .dump('Connections')
      .filter((item) => String(item.pk).startsWith('LINKFAIL#'));
    expect(counters).toEqual([
      expect.objectContaining({ n: 12, ttl: expect.any(Number) }),
    ]);
  });

  it('does not count a code that links', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    browseOk();
    activityOk();
    expect((await guess(code, '203.0.113.9')).status).toBe(201);
    expect(failureCounters().map((item) => item.n)).toEqual([0, 0]);
  });
});

describe('POST /connections/:service/link/check', () => {
  const check = (code: string, address?: string, service = 'netflix') =>
    request(`/connections/${service}/link/check`, {
      body: { address, code },
      method: 'POST',
    });

  const wrongCode = (live: string) =>
    String((Number(live) + 1) % 10_000).padStart(4, '0');

  const failureCounters = () =>
    db
      .dump('Connections')
      .filter((item) => String(item.pk).startsWith('LINKFAIL#'));

  it('names the account a live code links to', async () => {
    seedUser({ username: 'jemoeder' });
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    const response = await check(code, '203.0.113.7');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      username: 'jemoeder',
    });
  });

  it('spends nothing and counts nothing for a right code', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    expect((await check(code, '203.0.113.7')).status).toBe(200);
    expect((await check(code, '203.0.113.7')).status).toBe(200);
    expect(failureCounters().map((item) => item.n)).toEqual([0, 0]);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(consumeLinkCode(code, 'netflix')).resolves.toBe(USER_ID);
  });

  it('counts a wrong code as a failed link attempt', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    const response = await check(wrongCode(code), '203.0.113.7');
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: 'bad-code',
    });
    expect(failureCounters()).toEqual([
      expect.objectContaining({ n: 1 }),
      expect.objectContaining({ n: 1 }),
    ]);
  });

  it('holds the limit under a parallel burst', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    const statuses = await Promise.all(
      Array.from(
        { length: 20 },
        async () => (await check(wrongCode(code), '203.0.113.7')).status,
      ),
    );
    expect(statuses.filter((status) => status === 404)).toHaveLength(10);
    expect(statuses.filter((status) => status === 429)).toHaveLength(10);
  });

  it('shares the link’s limit: refused before any code is checked', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await check(wrongCode(code), '203.0.113.7')).status).toBe(404);
    }
    const limited = await check(code, '203.0.113.7');
    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toEqual({
      ok: false,
      reason: 'rate-limited',
    });
    // The link from that address is held back too
    const link = await request('/connections/netflix/link', {
      body: { address: '203.0.113.7', code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    expect(link.status).toBe(429);
    await expect(consumeLinkCode(code, 'netflix')).resolves.toBe(USER_ID);
  });

  it('refuses a code minted for another service, as a bad code', async () => {
    const { code } = await mintLinkCode(USER_ID, 'bbc');
    const response = await check(code, '203.0.113.7', 'netflix');
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: 'bad-code',
    });
    expect((await check(code, '203.0.113.7', 'bbc')).status).toBe(200);
  });

  it('refuses an expired code', async () => {
    const { code } = await mintLinkCode(
      USER_ID,
      'netflix',
      Date.now() - 6 * 60_000,
    );
    expect((await check(code)).status).toBe(404);
  });

  it('is a 404 for a service it can’t connect, and a 400 for a malformed code', async () => {
    expect((await check('1234', undefined, 'hulu')).status).toBe(404);
    expect((await check('12a4')).status).toBe(400);
  });
});

describe('POST /connections/netflix/link', () => {
  it('reads as the linking browser and keeps its user agent for the syncs', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    browseOk();
    activityOk();
    const userAgent = 'Mozilla/5.0 (Macintosh) Chrome/999.0.0.0 Safari/537.36';

    const response = await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID], userAgent },
      method: 'POST',
    });
    expect(response.status).toBe(201);
    const calls = fetchMock.mock.calls as unknown as Array<
      [string, { headers: Headers }]
    >;
    expect(calls.at(-1)?.[1]?.headers.get('user-agent')).toBe(userAgent);
    expect((await getConnection(USER_ID, 'netflix'))?.userAgent).toBe(
      userAgent,
    );
  });

  it('burns the code, test-reads, and stores the session encrypted', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    browseOk();
    activityOk();

    const response = await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      profile: 'Koen',
    });

    // The read asked Netflix with the session's cookie header
    const calls = fetchMock.mock.calls as unknown as Array<
      [string, { headers: Headers }]
    >;
    const browse = calls.find(
      ([url]) => url === 'https://www.netflix.com/browse',
    );
    expect(browse?.[1]?.headers.get('cookie')).toBe('NetflixId=session-value');

    // The stored secret is the jar, encrypted for exactly this user+service
    expect(encrypted[0]?.context).toEqual({
      service: 'netflix',
      userId: USER_ID,
    });
    const storedItems = db
      .dump('Connections')
      .filter((item) => item.pk === `USER#${USER_ID}`) as Array<{
      profileName: string;
      secret: string;
      via: string;
    }>;
    expect(storedItems).toHaveLength(1);
    const stored = storedItems[0]!;
    expect(stored).toMatchObject({
      profileName: 'Koen',
      via: 'extension',
    });
    // The secret is sealed: no cookie value in the clear, and it opens
    // back into the jar for this user and service only
    expect(stored.secret).toMatch(/^v1\./);
    expect(stored.secret).not.toContain('session-value');
    expect(
      JSON.parse(await decryptSecret(USER_ID, 'netflix', stored.secret)),
    ).toEqual([NETFLIX_ID]);

    // The code is spent
    await expect(consumeLinkCode(code, 'netflix')).resolves.toBeNull();
  });

  it('refuses an unknown code, and a code only links once', async () => {
    const unknown = await request('/connections/netflix/link', {
      body: { code: '0000', cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    expect(unknown.status).toBe(404);

    const { code } = await mintLinkCode(USER_ID, 'netflix');
    browseOk();
    activityOk();
    const first = await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    expect(first.status).toBe(201);

    // Spent, even with a good jar
    browseOk();
    activityOk();
    const second = await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    expect(second.status).toBe(404);
  });

  it('says signed-out for a jar without a NetflixId, storing nothing', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    const response = await request('/connections/netflix/link', {
      body: {
        code,
        cookies: [{ ...NETFLIX_ID, name: 'OptanonConsent' }],
      },
      method: 'POST',
    });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: 'signed-out',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      db.dump('Connections').some((item) => item.pk === `USER#${USER_ID}`),
    ).toBe(false);
  });

  it('refuses a read Netflix does not answer in the page’s own shape', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    fetchMock.mockImplementation(
      async () => new Response('nope', { status: 200 }),
    );

    const response = await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: 'test-read-failed',
    });
    expect(
      db.dump('Connections').some((item) => item.pk === `USER#${USER_ID}`),
    ).toBe(false);
  });
});

describe('linking BBC iPlayer and Prime Video', () => {
  const jarOn = (domain: string) => [
    { ...NETFLIX_ID, domain, name: 'session' },
  ];
  const CASES = [
    {
      answer: () =>
        fetchMock.mockImplementation(async (url: string) => {
          // The activity service's client key comes from a BBC page's
          // bundle (an invented one here)
          if (url === 'https://www.bbc.co.uk/food') {
            return new Response(
              '<script src="https://static.files.bbci.co.uk/core/bundle-website.abc.js"></script>',
            );
          }
          if (url.includes('/core/bundle-website.')) {
            return new Response(
              'const i={test:"FakeTest12345",live:"FakeKey123abc"};l({apiKey:i[p],activityType:r})',
            );
          }
          return url.includes('activity.api.bbc.co.uk')
            ? Response.json({
                items: [
                  {
                    action: 'ended',
                    actionContext: 'urn:bbc:tv:version_offset:p0aaa#10',
                    created: '2026-11-01T18:34:23Z',
                    resourceId: 'm0020aaa',
                  },
                ],
                total: 1,
              })
            : Response.json({ episodes: [] });
        }),
      jar: jarOn('.bbc.co.uk'),
      service: 'bbc',
      total: 1,
    },
    {
      answer: () =>
        fetchMock.mockImplementation(async () =>
          Response.json({
            widgets: [{ content: { content: { titles: [] } } }],
          }),
        ),
      jar: jarOn('.primevideo.com'),
      service: 'prime',
      total: null,
    },
  ] as const;

  for (const { answer, jar, service, total } of CASES) {
    it(`${service}: test-reads, stores the session for that service, and only its card reads connected`, async () => {
      const { code } = await mintLinkCode(USER_ID, service);
      answer();
      const response = await request(`/connections/${service}/link`, {
        body: { code, cookies: jar },
        method: 'POST',
      });
      expect(response.status).toBe(201);
      expect(encrypted[0]?.context).toEqual({ service, userId: USER_ID });

      const card = await request(`/me/connections/${service}`, {
        as: USER_ID,
      });
      await expect(card.json()).resolves.toMatchObject({
        connected: true,
        total,
      });
      const netflix = await request('/me/connections/netflix', {
        as: USER_ID,
      });
      await expect(netflix.json()).resolves.toMatchObject({
        connected: false,
      });
    });
  }
});

describe('every service’s routes', () => {
  for (const service of ['netflix', 'bbc', 'prime']) {
    it(`${service}: the card, its review list and Disconnect each reach their own route`, async () => {
      const card = await request(`/me/connections/${service}`, {
        as: USER_ID,
      });
      await expect(card.json()).resolves.toMatchObject({ connected: false });
      const review = await request(`/me/connections/${service}/unresolved`, {
        as: USER_ID,
      });
      await expect(review.json()).resolves.toEqual({
        items: [],
        nextCursor: null,
      });
      const disconnect = await request(`/me/connections/${service}`, {
        as: USER_ID,
        method: 'DELETE',
      });
      expect(disconnect.ok).toBe(true);
    });
  }
});

describe('GET /me/connections/netflix', () => {
  it('says not connected before a link', async () => {
    const response = await request('/me/connections/netflix', {
      as: USER_ID,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      connected: false,
      lastSyncedAt: null,
      latest: null,
      profileName: null,
      recent: [],
      status: null,
      sync: null,
      total: null,
      unresolvedCount: 0,
      week: [],
    });
  });

  it('carries the overview the card shows once linked', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    browseOk();
    activityOk();
    await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });

    const response = await request('/me/connections/netflix', {
      as: USER_ID,
    });
    await expect(response.json()).resolves.toEqual({
      connected: true,
      lastSyncedAt: null,
      latest: {
        episodeTitle: 'Alpha and Omega',
        title: 'Dark',
        watchedAt: 1763000000000,
      },
      profileName: 'Koen',
      recent: [],
      status: 'ok',
      sync: null,
      total: 2542,
      unresolvedCount: 0,
      week: [],
    });
  });
});

describe('DELETE /me/connections/netflix', () => {
  it('forgets the stored session, so the card reads not connected', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    browseOk();
    activityOk();
    await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });

    const response = await request('/me/connections/netflix', {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(response.status).toBe(204);
    expect(
      db.dump('Connections').some((item) => item.sk === 'SERVICE#netflix'),
    ).toBe(false);
  });

  it('takes the review list with it: open entries, closed markers, the count', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    browseOk();
    activityOk();
    await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    const pk = `USER#${USER_ID}`;
    db.seed('Connections', [
      { kind: 'series-not-found', pk, sk: 'UNRESOLVED#netflix#1' },
      { kind: 'series-not-found', pk, sk: 'UNRESOLVED#netflix#2' },
      { dismissedAt: 1, pk, sk: 'CLOSED#netflix#3' },
      { open: 2, pk, sk: 'UNRESOLVEDCOUNT#netflix' },
      { code: '1234', pk, sk: 'LINKCODE' },
      {
        kind: 'series-not-found',
        pk: 'USER#someone-else',
        sk: 'UNRESOLVED#netflix#1',
      },
    ]);

    await request('/me/connections/netflix', { as: USER_ID, method: 'DELETE' });
    expect(
      db
        .dump('Connections')
        // The link's attempt counter, given back: not the viewer's
        .filter((item) => !String(item.pk).startsWith('LINKFAIL#'))
        .map((item) => `${item.pk} ${item.sk}`)
        .sort(),
    ).toEqual([`${pk} LINKCODE`, 'USER#someone-else UNRESOLVED#netflix#1']);
  });

  it('refuses an anonymous caller', async () => {
    const response = await request('/me/connections/netflix', {
      method: 'DELETE',
    });
    expect(response.status).toBe(401);
  });
});

const linkCodeItems = () =>
  db.dump('Connections').filter((item) => String(item.pk).startsWith('CODE#'));

describe('one live link code per viewer', () => {
  it('a new code revokes the last one', async () => {
    const first = await mintLinkCode(USER_ID, 'netflix');
    const second = await mintLinkCode(USER_ID, 'netflix');
    expect(linkCodeItems().map((item) => item.pk)).toEqual([
      `CODE#${second.code}`,
    ]);
    // A live code is never handed out twice, so the two always differ
    expect(second.code).not.toBe(first.code);
    await expect(consumeLinkCode(first.code, 'netflix')).resolves.toBeNull();
    await expect(consumeLinkCode(second.code, 'netflix')).resolves.toBe(
      USER_ID,
    );
    // A used code takes its pointer with it
    expect(db.dump('Connections').some((item) => item.sk === 'LINKCODE')).toBe(
      false,
    );
  });

  it('an expired code never links', async () => {
    const minted = await mintLinkCode(
      USER_ID,
      'netflix',
      Date.now() - 10 * 60_000,
    );
    await expect(consumeLinkCode(minted.code, 'netflix')).resolves.toBeNull();
  });
});

describe('DELETE /me/connections/link-code', () => {
  it('revokes the live code at once', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    const response = await request('/me/connections/link-code', {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(response.status).toBe(204);
    expect(db.dump('Connections')).toEqual([]);
    await expect(consumeLinkCode(code, 'netflix')).resolves.toBeNull();
  });

  it('is a no-op without a live code', async () => {
    const response = await request('/me/connections/link-code', {
      as: USER_ID,
      method: 'DELETE',
    });
    expect(response.status).toBe(204);
  });

  it('refuses an anonymous caller', async () => {
    const response = await request('/me/connections/link-code', {
      method: 'DELETE',
    });
    expect(response.status).toBe(401);
  });
});

describe('the link request', () => {
  it('refuses a jar past the cookie cap, or a cookie past its length cap', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    const tooMany = await request('/connections/netflix/link', {
      body: { code, cookies: Array.from({ length: 101 }, () => NETFLIX_ID) },
      method: 'POST',
    });
    expect(tooMany.status).toBe(400);
    const tooLong = await request('/connections/netflix/link', {
      body: { code, cookies: [{ ...NETFLIX_ID, value: 'x'.repeat(4097) }] },
      method: 'POST',
    });
    expect(tooLong.status).toBe(400);
    // Refused before the code was looked at: it still works
    await expect(consumeLinkCode(code, 'netflix')).resolves.toBe(USER_ID);
  });

  it('says signed-out when the viewing activity answers 401', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    browseOk();
    fetchMock.mockImplementationOnce(
      async () => new Response('', { status: 401 }),
    );
    const response = await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: 'signed-out',
    });
  });

  it('skips a newest entry without a date rather than dating it 1970', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    browseOk();
    const value = ACTIVITY.jsonGraph.aui.viewingActivity.value;
    fetchMock.mockImplementationOnce(async () =>
      Response.json({
        jsonGraph: {
          aui: {
            viewingActivity: {
              value: {
                ...value,
                viewedItems: [
                  { episodeTitle: 'Undated', movieID: 1, title: 'Dark' },
                  { date: 1762000000000, movieID: 2, title: 'Roma' },
                ],
              },
            },
          },
        },
      }),
    );
    await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    const response = await request('/me/connections/netflix', {
      as: USER_ID,
    });
    const status = (await response.json()) as { latest: unknown };
    expect(status.latest).toEqual({
      episodeTitle: null,
      title: 'Roma',
      watchedAt: 1762000000000,
    });
  });
});

describe('an unknown service', () => {
  it('is a 404 on every route, the code left unspent', async () => {
    const { code } = await mintLinkCode(USER_ID, 'netflix');
    const link = await request('/connections/hulu/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    expect(link.status).toBe(404);
    for (const [method, path] of [
      ['GET', '/me/connections/hulu'],
      ['GET', '/me/connections/hulu/unresolved'],
      ['POST', '/me/connections/hulu/sync'],
      ['POST', '/me/connections/hulu/unresolved/dismiss'],
      ['POST', '/me/connections/hulu/unresolved/resolve'],
      ['DELETE', '/me/connections/hulu'],
    ] as const) {
      const response = await request(path, {
        as: USER_ID,
        body: method === 'POST' ? { keys: ['1'] } : undefined,
        method,
      });
      expect(response.status, `${method} ${path}`).toBe(404);
    }
    // The code still links the real service
    browseOk();
    activityOk();
    const real = await request('/connections/netflix/link', {
      body: { code, cookies: [NETFLIX_ID] },
      method: 'POST',
    });
    expect(real.status).toBe(201);
  });
});

describe('the stored secret', () => {
  it('seals a jar past KMS Encrypt’s 4 KB cap, and opens for its owner only', async () => {
    const jar = JSON.stringify(
      Array.from({ length: 20 }, (_, index) => ({
        ...NETFLIX_ID,
        name: `c${index}`,
        value: 'v'.repeat(400),
      })),
    );
    expect(jar.length).toBeGreaterThan(4096);
    const secret = await encryptSecret(USER_ID, 'netflix', jar);
    await expect(decryptSecret(USER_ID, 'netflix', secret)).resolves.toBe(jar);
    await expect(
      decryptSecret('01OTHERUSER0000000000000000', 'netflix', secret),
    ).rejects.toThrow();
  });

  it('refuses a tampered or malformed secret', async () => {
    const secret = await encryptSecret(USER_ID, 'netflix', 'jar');
    const parts = secret.split('.');
    const ciphertext = Buffer.from(parts[4]!, 'base64url');
    ciphertext[0] = (ciphertext[0] ?? 0) ^ 1;
    parts[4] = ciphertext.toString('base64url');
    await expect(
      decryptSecret(USER_ID, 'netflix', parts.join('.')),
    ).rejects.toThrow();
    await expect(decryptSecret(USER_ID, 'netflix', 'v0.a.b')).rejects.toThrow(
      'not a v1 secret',
    );
  });
});
