import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { secretFromCookies } from '@/lib/connections/jar';

import { primeReader } from './reader';

// Pacing is tested on its own; here it would make every test seconds long
vi.mock('@/lib/connections/pace', () => ({
  createPacer: () => async () => {},
}));
// The shared quick retry's pause, likewise
vi.mock('@tvseri.es/utils', async (original) => ({
  ...(await original<typeof import('@tvseri.es/utils')>()),
  sleep: async () => {},
}));

const ORIGIN = 'https://www.primevideo.com';
const T = 1_763_000_000_000;
const MIN = 60_000;

const JAR = [
  {
    domain: '.primevideo.com',
    expiresDate: null,
    httpOnly: true,
    name: 'at-main-av',
    path: '/',
    sameSite: null,
    secure: true,
    value: 'session-value',
  },
  {
    domain: '.amazon.co.uk',
    expiresDate: null,
    httpOnly: true,
    name: 'at-acbuk',
    path: '/',
    sameSite: null,
    secure: true,
    value: 'other-site',
  },
];

const gti = (n: number) =>
  `amzn1.dv.gti.0000000${n}-aaaa-bbbb-cccc-dddddddddddd`;
const key = (n: number) => `0000000${n}aaaabbbbccccdddddddddddd`;

const item = (
  titleType: string,
  text: string,
  n: number,
  time: number,
  extra: Record<string, unknown> = {},
) => ({
  gti: gti(n),
  imageSrc: 'https://images.example/x.jpg',
  time,
  title: { href: `/detail/0DETAIL${n}/ref=atv_wh`, text },
  titleType,
  ...extra,
});

const historyPage = (
  titles: ReadonlyArray<unknown>,
  nextToken?: string,
  extra: Record<string, unknown> = {},
) => ({
  __type: 'atv.wps#ActivityHistoryPage',
  widgets: [
    { content: { links: [] }, widgetType: 'header' },
    {
      content: {
        content: {
          strings: {},
          titles: [{ date: 'November 11, 2026', titles }],
          ...(nextToken && { nextToken }),
        },
      },
      widgetType: 'watch-history',
    },
  ],
  ...extra,
});

const PAGE_0 = historyPage(
  [
    item('season', 'The Quiet Line - Season 2', 1, T, {
      children: [
        item('episode', 'Episode 5: Low Tide', 2, T),
        // Older than the film below: the page is read in time order
        item('episode', 'Episode 4: High Water', 3, T - 20 * MIN),
      ],
    }),
    item('movie', 'Untouchable [French Audio]', 4, T - 10 * MIN),
  ],
  'cursor-1',
);

const PAGE_1 = historyPage([
  // A bare season title: the show comes from its detail page
  item('season', 'Season 3', 5, T - 60 * MIN, {
    children: [
      item('episode', 'Episode 1: Arrival', 6, T - 60 * MIN),
      item('episode', 'Episode 0: Official Trailer', 7, T - 61 * MIN),
    ],
  }),
  item('episode', 'Episode 0: Official Trailer', 8, T - 70 * MIN),
]);

/**
 * A season page with its episodes' progress bars (`playback.progress`, 0–1),
 * as Prime Video draws them; `played` episodes at 1 unless given
 */
const withProgress = (
  page: Readonly<Record<string, unknown>>,
  played: Readonly<Record<number, number>>,
) => {
  const body = (page.body ?? {}) as Record<string, unknown>;
  const btf = Object.fromEntries(
    Object.entries(played).map(([n, progress]) => [
      gti(Number(n)),
      {
        primaryActions: [
          { payload: { playback: { progress, resumeTime: 0 } } },
        ],
      },
    ]),
  );
  return { ...page, body: { ...body, btf: { state: { action: { btf } } } } };
};

const DETAIL_1 = withProgress({}, { 2: 1, 3: 1 });

const DETAIL_5 = withProgress(
  {
    body: { atf: { state: { detail: { parentTitle: 'Hollow Creek' } } } },
    globalStore: { seasons: [{ seasonNumber: 3 }] },
  },
  { 6: 1, 9: 1 },
);

type Answer = Response | (() => Response);

let answers: Map<string, Answer>;

const json = (body: unknown, status = 200) => Response.json(body, { status });
const html = (body: string, status = 200) =>
  new Response(body, { headers: { 'content-type': 'text/html' }, status });

const PAGE_URL = `${ORIGIN}/api/getWatchHistorySettingsPage`;
const pageUrl = (token: string) =>
  `${PAGE_URL}?widgetArgs=${encodeURIComponent(JSON.stringify({ nextToken: token }))}`;

const fetchMock = vi.fn(async (url: string) => {
  const answer = answers.get(url);
  if (!answer) {
    return new Response(null, { status: 404 });
  }
  return typeof answer === 'function' ? answer() : answer.clone();
});

const urls = () => fetchMock.mock.calls.map(([url]) => url);

const open = async () => {
  const opened = await primeReader.open(secretFromCookies(JAR), 'default');
  if (!opened.ok) {
    throw new Error('not opened');
  }
  return opened.session;
};

beforeEach(() => {
  answers = new Map<string, Answer>([
    [PAGE_URL, json(PAGE_0)],
    [pageUrl('cursor-1'), json(PAGE_1)],
    [`${ORIGIN}/detail/0DETAIL1`, json(DETAIL_1)],
    [`${ORIGIN}/detail/0DETAIL5`, json(DETAIL_5)],
  ]);
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('primeReader: a page', () => {
  it('reads the first page newest first, episodes as rows, films without', async () => {
    const session = await open();
    expect(await session.readPage(0)).toEqual({
      next: { page: 1, token: 'cursor-1' },
      ok: true,
      page: {
        entries: [
          {
            key: key(2),
            row: {
              episode: 5,
              index: 0,
              season: 2,
              title: 'The Quiet Line',
              watchedAt: T,
              watchProvider: 'Amazon Prime Video',
            },
            watchedAt: T,
          },
          { key: key(4), row: null, watchedAt: T - 10 * MIN },
          {
            key: key(3),
            row: {
              episode: 4,
              index: 2,
              season: 2,
              title: 'The Quiet Line',
              watchedAt: T - 20 * MIN,
              watchProvider: 'Amazon Prime Video',
            },
            watchedAt: T - 20 * MIN,
          },
        ],
        invalid: 0,
        more: true,
      },
    });
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Headers; redirect: string },
    ];
    // The season page too, for its episodes' progress
    expect(urls()).toEqual([PAGE_URL, `${ORIGIN}/detail/0DETAIL1`]);
    expect(init.headers.get('accept')).toBe('application/json');
    // primevideo.com's cookies only
    expect(init.headers.get('cookie')).toBe('at-main-av=session-value');
    expect(init.redirect).toBe('manual');
  });

  it('walks the cursor to a later page, names a bare season from its detail page, drops trailers', async () => {
    const session = await open();
    expect(await session.readPage(1)).toEqual({
      next: null,
      ok: true,
      page: {
        entries: [
          {
            key: key(6),
            row: {
              episode: 1,
              index: 0,
              season: 3,
              title: 'Hollow Creek',
              watchedAt: T - 60 * MIN,
              watchProvider: 'Amazon Prime Video',
            },
            watchedAt: T - 60 * MIN,
          },
        ],
        invalid: 0,
        more: true,
      },
    });
    // Page 0 for its cursor only: no detail lookups for it
    expect(urls()).toEqual([
      PAGE_URL,
      pageUrl('cursor-1'),
      `${ORIGIN}/detail/0DETAIL5`,
    ]);
  });

  it('reads each page once in a run, and ends after the last', async () => {
    const session = await open();
    await session.readPage(0);
    await session.readPage(1);
    expect(await session.readPage(2)).toEqual({
      next: null,
      ok: true,
      page: { entries: [], invalid: 0 },
    });
    expect(urls()).toEqual([
      PAGE_URL,
      `${ORIGIN}/detail/0DETAIL1`,
      pageUrl('cursor-1'),
      `${ORIGIN}/detail/0DETAIL5`,
    ]);
  });

  it('looks a season up once per run', async () => {
    answers.set(
      PAGE_URL,
      json(
        historyPage([
          item('season', 'Season 3', 5, T, {
            children: [item('episode', 'Episode 2: Back', 9, T)],
          }),
          item('season', 'Season 3', 5, T - MIN, {
            children: [item('episode', 'Episode 1: Arrival', 6, T - MIN)],
          }),
        ]),
      ),
    );
    const session = await open();
    const read = await session.readPage(0);
    expect(
      'page' in read && read.page.entries.map((entry) => entry.key),
    ).toEqual([key(9), key(6)]);
    expect(urls().filter((url) => url.includes('/detail/')).length).toBe(1);
  });

  it('reads a season from its own title when its detail page names no show', async () => {
    answers.set(
      `${ORIGIN}/detail/0DETAIL5`,
      json(withProgress({ body: {} }, { 6: 1 })),
    );
    const session = await open();
    const read = await session.readPage(1);
    // Never dropped: the matcher tries "Season 3", the rest goes to review
    expect('page' in read && read.page.invalid).toBe(0);
    expect('page' in read && read.page.entries[0]?.row).toMatchObject({
      episode: 1,
      season: 3,
      title: 'Season 3',
    });
  });

  // A season titled by its show alone: the number comes from its detail page
  const freeForm = historyPage([
    item('season', 'Hollow Creek', 1, T, {
      children: [item('episode', 'Episode 2: Back', 2, T)],
    }),
  ]);

  it('never guesses which of several seasons a detail page means', async () => {
    answers.set(PAGE_URL, json(freeForm));
    answers.set(
      `${ORIGIN}/detail/0DETAIL1`,
      json(
        withProgress(
          {
            body: { parentTitle: 'Hollow Creek' },
            seasons: [
              { seasonNumber: 1 },
              { seasonNumber: 2 },
              { seasonNumber: 3 },
            ],
          },
          { 2: 1 },
        ),
      ),
    );
    const session = await open();
    const read = await session.readPage(0);
    // No guess between the three: the title's own words, no season
    expect('page' in read && read.page.invalid).toBe(0);
    expect('page' in read && read.page.entries[0]?.row).toMatchObject({
      episode: 2,
      season: '',
      title: 'Hollow Creek',
    });
  });

  it('takes the season from the one object naming show and number together', async () => {
    answers.set(PAGE_URL, json(freeForm));
    answers.set(
      `${ORIGIN}/detail/0DETAIL1`,
      json(
        withProgress(
          {
            detail: { parentTitle: 'Hollow Creek', seasonNumber: 3 },
            seasons: [{ seasonNumber: 1 }, { seasonNumber: 3 }],
          },
          { 2: 1 },
        ),
      ),
    );
    const session = await open();
    const read = await session.readPage(0);
    expect('page' in read && read.page.entries[0]?.row).toMatchObject({
      episode: 2,
      season: 3,
      title: 'Hollow Creek',
    });
  });

  it('names a bare season’s show from the object for that season, not a related title', async () => {
    answers.set(
      `${ORIGIN}/detail/0DETAIL5`,
      json(
        withProgress(
          {
            detail: { parentTitle: 'Hollow Creek', seasonNumber: 3 },
            related: [{ parentTitle: 'Something Else', seasonNumber: 1 }],
          },
          { 6: 1 },
        ),
      ),
    );
    const session = await open();
    const read = await session.readPage(1);
    expect('page' in read && read.page.entries[0]?.row).toMatchObject({
      season: 3,
      title: 'Hollow Creek',
    });
  });

  it('counts a season’s episode outside the known shape', async () => {
    answers.set(
      PAGE_URL,
      json(
        historyPage([
          item('season', 'The Quiet Line - Season 2', 1, T, {
            children: [
              item('episode', 'Episode 5: Low Tide', 2, T),
              { title: { text: 'Episode 6: No id' }, titleType: 'episode' },
            ],
          }),
        ]),
      ),
    );
    const session = await open();
    const read = await session.readPage(0);
    expect('page' in read && read.page).toMatchObject({ invalid: 1 });
    expect('page' in read && read.page.entries).toHaveLength(1);
  });

  it('follows a bounce on Prime Video’s own host with the jar', async () => {
    const bounced = `${ORIGIN}/region/eu/api/getWatchHistorySettingsPage`;
    answers.set(
      PAGE_URL,
      () => new Response(null, { headers: { location: bounced }, status: 302 }),
    );
    answers.set(bounced, json(PAGE_0));
    const session = await open();
    const read = await session.readPage(0);
    expect('page' in read && read.page.entries).toHaveLength(3);
    expect(urls()).toEqual([PAGE_URL, bounced, `${ORIGIN}/detail/0DETAIL1`]);
  });

  describe('a detail lookup that fails', () => {
    // Four bare seasons, each named by its own detail page, and a film
    const SEASONS = [1, 2, 3, 4];
    const detailUrl = (n: number) => `${ORIGIN}/detail/0DETAIL${n}`;
    beforeEach(() => {
      answers.set(
        PAGE_URL,
        json(
          historyPage([
            ...SEASONS.map((n) =>
              item('season', 'Season 3', n, T - n * MIN, {
                children: [
                  item('episode', 'Episode 1: Arrival', n + 4, T - n * MIN),
                ],
              }),
            ),
            item('movie', 'A Film', 9, T - 9 * MIN),
          ]),
        ),
      );
      for (const n of SEASONS) {
        answers.set(
          detailUrl(n),
          json(
            withProgress(
              { detail: { parentTitle: `Show ${n}`, seasonNumber: 3 } },
              { [n + 4]: 1 },
            ),
          ),
        );
      }
    });

    const timeout = () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    };

    it.each<readonly [string, Answer]>([
      ['busy twice (503)', () => json({}, 503)],
      ['timing out twice', timeout],
      ['refused as busy (429)', json({}, 429)],
      [
        'withheld (403): a title’s page says nothing of the session',
        json({}, 403),
      ],
      ['gone (404)', json({}, 404)],
      ['answered with another page', html('<html>Prime Video</html>')],
      [
        'answered with a page that links to sign in',
        html('<a href="https://www.amazon.co.uk/ap/signin">Sign in</a>'),
      ],
    ])(
      'reads past that season’s episode unmarked, the rest as usual: %s',
      async (_, answer) => {
        answers.set(detailUrl(2), answer);
        const session = await open();
        const read = await session.readPage(0);
        expect('page' in read && read.page.invalid).toBe(0);
        expect(
          'page' in read && read.page.entries.map((entry) => entry.key),
        ).toEqual([key(5), key(6), key(7), key(8), key(9)]);
        // Without its season page, how far it was played is unknown: never
        // marked on a guess
        const unknown =
          'page' in read
            ? read.page.entries.find((entry) => entry.key === key(6))
            : undefined;
        expect(unknown).toMatchObject({ row: null, unfinished: true });
        const known =
          'page' in read
            ? read.page.entries.find((entry) => entry.key === key(5))
            : undefined;
        expect(known?.row).toMatchObject({ season: 3, title: 'Show 1' });
      },
    );

    it('tries the page later when three lookups are busy or down', async () => {
      for (const n of [1, 2, 3]) {
        answers.set(detailUrl(n), json({}, 503));
      }
      const session = await open();
      expect(await session.readPage(0)).toEqual({
        ok: false,
        reason: 'unavailable',
      });
      // The fourth season isn't asked about once the page is to be read again
      expect(urls()).not.toContain(detailUrl(4));
    });

    it('carries the last lookup’s Retry-After to the loop', async () => {
      for (const n of [1, 2, 3]) {
        answers.set(
          detailUrl(n),
          () =>
            new Response(null, {
              headers: { 'retry-after': '600' },
              status: 429,
            }),
        );
      }
      const session = await open();
      expect(await session.readPage(0)).toEqual({
        ok: false,
        reason: 'unavailable',
        retryAfterSeconds: 600,
      });
    });

    it.each<readonly [string, Answer]>([
      [
        'a redirect to Amazon’s sign-in',
        new Response(null, {
          headers: { location: 'https://www.amazon.co.uk/ap/signin' },
          status: 302,
        }),
      ],
      [
        'the sign-in form',
        html(
          '<form name="signIn" action="https://www.amazon.co.uk/ap/signin">',
        ),
      ],
    ])('fails the page as signed out on %s', async (_, answer) => {
      answers.set(detailUrl(2), answer);
      const session = await open();
      expect(await session.readPage(0)).toEqual({
        ok: false,
        reason: 'signed-out',
      });
    });
  });

  it('marks an episode only once Prime Video’s bar is 90% played', async () => {
    answers.set(
      `${ORIGIN}/detail/0DETAIL1`,
      json(withProgress({}, { 2: 0.27, 3: 0.9 })),
    );
    const session = await open();
    const read = await session.readPage(0);
    const entries = 'page' in read ? read.page.entries : [];
    // E5 stopped at 27%: read past, never marked or reviewed
    expect(entries.find((entry) => entry.key === key(2))).toEqual({
      key: key(2),
      row: null,
      unfinished: true,
      watchedAt: T,
    });
    expect(entries.find((entry) => entry.key === key(3))?.row).toMatchObject({
      episode: 4,
    });
  });

  it('never marks an episode the season page has no progress for', async () => {
    answers.set(`${ORIGIN}/detail/0DETAIL1`, json(withProgress({}, { 3: 1 })));
    const session = await open();
    const read = await session.readPage(0);
    const entries = 'page' in read ? read.page.entries : [];
    expect(entries.find((entry) => entry.key === key(2))).toMatchObject({
      row: null,
      unfinished: true,
    });
  });

  it('keys a title Prime Video ids in another shape by a hash of it', async () => {
    answers.set(
      PAGE_URL,
      json(historyPage([{ ...item('movie', 'Odd', 1, T), gti: 'B0ODD.ID' }])),
    );
    const session = await open();
    const read = await session.readPage(0);
    const [entry] = 'page' in read ? read.page.entries : [];
    expect(entry?.key).toMatch(/^[\w-]{1,64}$/);
  });
});

describe('primeReader: resuming at a later page', () => {
  const PAGE_2 = historyPage([
    item('movie', 'Older Film', 20, T - 3 * 60 * MIN),
  ]);
  const withThirdPage = () => {
    answers.set(
      pageUrl('cursor-1'),
      json(
        historyPage(
          [item('movie', 'Middle Film', 21, T - 2 * 60 * MIN)],
          'cursor-2',
        ),
      ),
    );
    answers.set(pageUrl('cursor-2'), json(PAGE_2));
  };
  const always = () => true;

  it('hands back the next page’s cursor with each page, and none after the last', async () => {
    const session = await open();
    const first = await session.readPage(0, { hasTime: always });
    expect('page' in first && first.next).toEqual({
      page: 1,
      token: 'cursor-1',
    });
    const last = await session.readPage(1, { hasTime: always });
    expect('page' in last && last.next).toBeNull();
  });

  it('reads a page from its stored cursor, without walking from the first', async () => {
    const session = await open();
    const read = await session.readPage(1, {
      from: { page: 1, token: 'cursor-1' },
      hasTime: always,
    });
    expect('page' in read && read.page.entries).toHaveLength(1);
    expect(urls()).toEqual([pageUrl('cursor-1'), `${ORIGIN}/detail/0DETAIL5`]);
  });

  it('walks from the first page when Prime Video refuses the stored cursor', async () => {
    answers.set(pageUrl('stale'), json({ message: 'bad token' }, 400));
    const session = await open();
    const read = await session.readPage(1, {
      from: { page: 1, token: 'stale' },
      hasTime: always,
    });
    expect('page' in read && read.page.entries).toHaveLength(1);
    expect(urls().slice(0, 3)).toEqual([
      pageUrl('stale'),
      PAGE_URL,
      pageUrl('cursor-1'),
    ]);
  });

  it('walks from the first page when the stored cursor’s read fails any other way', async () => {
    answers.set(pageUrl('odd'), json({}, 503));
    const session = await open();
    const read = await session.readPage(1, {
      from: { page: 1, token: 'odd' },
      hasTime: always,
    });
    expect('page' in read && read.page.entries).toHaveLength(1);
    expect(urls()).toContain(PAGE_URL);
  });

  it('passes the first page’s answer on when that fails too', async () => {
    answers.set(pageUrl('odd'), json({}, 503));
    answers.set(PAGE_URL, json({}, 503));
    const session = await open();
    const read = await session.readPage(1, {
      from: { page: 1, token: 'odd' },
      hasTime: always,
    });
    expect(read).toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it('stops a walk that runs out of time, saying how far it got, and carries on from there', async () => {
    withThirdPage();
    const session = await open();
    expect(await session.readPage(2, { hasTime: () => false })).toEqual({
      ok: true,
      walking: { page: 1, token: 'cursor-1' },
    });
    expect(urls()).toEqual([PAGE_URL]);

    fetchMock.mockClear();
    const next = await open();
    const read = await next.readPage(2, {
      from: { page: 1, token: 'cursor-1' },
      hasTime: always,
    });
    expect('page' in read && read.page.entries).toHaveLength(1);
    expect(urls()).toEqual([pageUrl('cursor-1'), pageUrl('cursor-2')]);
  });

  it('knows a history read to its end without asking', async () => {
    const session = await open();
    expect(await session.readPage(2, { from: null, hasTime: always })).toEqual({
      next: null,
      ok: true,
      page: { entries: [], invalid: 0 },
    });
    expect(urls()).toEqual([]);
  });
});

describe('primeReader: refusals', () => {
  const cases: ReadonlyArray<readonly [string, Answer, string]> = [
    ['403', json({}, 403), 'signed-out'],
    [
      'a redirect to sign in',
      new Response(null, {
        headers: { location: 'https://www.amazon.co.uk/ap/signin' },
        status: 302,
      }),
      'signed-out',
    ],
    [
      'a redirect off Prime Video (the jar never follows)',
      new Response(null, {
        headers: { location: 'https://example.com/elsewhere' },
        status: 302,
      }),
      'changed',
    ],
    ['429', json({}, 429), 'unavailable'],
    ['500', json({}, 500), 'unavailable'],
    [
      'a Robot Check page',
      html('<html><title>Robot Check</title></html>'),
      'unavailable',
    ],
    [
      'a sign-in page',
      html('<form name="signIn" action="https://www.amazon.co.uk/ap/signin">'),
      'signed-out',
    ],
    ['another page', html('<html>Prime Video</html>'), 'changed'],
    [
      'another page that links to sign in',
      html('<a href="https://www.amazon.co.uk/ap/signin">Sign in</a>'),
      'changed',
    ],
    [
      'a redirect to a sign-in path off Amazon',
      new Response(null, {
        headers: { location: 'https://example.com/ap/signin' },
        status: 302,
      }),
      'changed',
    ],
    [
      'garbled JSON',
      new Response('{"widgets":[', {
        headers: { 'content-type': 'application/json' },
      }),
      'changed',
    ],
    ['JSON without the history', json({ widgets: [] }), 'changed'],
    [
      'JSON flagged robotic',
      json({ customerState: { isRobotic: true }, widgets: [] }),
      'unavailable',
    ],
  ];

  for (const [name, answer, reason] of cases) {
    it(`reads ${name} as ${reason}`, async () => {
      answers.set(PAGE_URL, answer);
      const session = await open();
      expect(await session.readPage(0)).toEqual({ ok: false, reason });
    });
  }

  it('counts an entry outside the known shape', async () => {
    answers.set(
      PAGE_URL,
      json(
        historyPage([
          item('movie', 'Fine', 1, T),
          { title: { text: 'No id or time' }, titleType: 'movie' },
        ]),
      ),
    );
    const session = await open();
    const read = await session.readPage(0);
    expect('page' in read && read.page.invalid).toBe(1);
  });

  it.each([
    [
      'entries without an id or time',
      [{ title: { text: 'No id' }, titleType: 'movie' }],
    ],
    ['titles of a type it doesn’t know', [item('podcast', 'A Show', 1, T)]],
    [
      'seasons whose episodes are all out of shape',
      [
        item('season', 'A Show - Season 1', 1, T, {
          children: [{ text: 'x' }],
        }),
      ],
    ],
  ])(
    'says the page changed when nothing on it is in the known shape: %s',
    async (_, titles) => {
      answers.set(PAGE_URL, json(historyPage(titles)));
      const session = await open();
      expect(await session.readPage(0)).toEqual({
        ok: false,
        reason: 'changed',
      });
    },
  );

  it('reads a timeout twice as busy, never signed out', async () => {
    answers.set(PAGE_URL, () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    });
    const session = await open();
    expect(await session.readPage(0)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('carries a 429’s Retry-After to the loop', async () => {
    answers.set(
      PAGE_URL,
      () =>
        new Response(null, { headers: { 'retry-after': '300' }, status: 429 }),
    );
    const session = await open();
    expect(await session.readPage(0)).toEqual({
      ok: false,
      reason: 'unavailable',
      retryAfterSeconds: 300,
    });
  });

  it.each<readonly [string, () => Response]>([
    ['a 503', () => json({}, 503)],
    ['a 504', () => json({}, 504)],
    [
      'a dropped connection',
      () => {
        throw new TypeError('fetch failed');
      },
    ],
  ])('asks the history page once more after %s', async (_, first) => {
    let calls = 0;
    answers.set(PAGE_URL, () => {
      calls += 1;
      return calls === 1 ? first() : json(PAGE_0);
    });
    const session = await open();
    const read = await session.readPage(0);
    expect('page' in read && read.page.entries).toHaveLength(3);
    expect(calls).toBe(2);
  });
});

describe('primeReader.link', () => {
  it('reads the first page, keeps the jar, and names the profile when the answer does', async () => {
    answers.set(
      PAGE_URL,
      json({
        ...PAGE_0,
        profiles: { activeProfile: { id: 'amzn1.p', name: 'Koen' } },
      }),
    );
    expect(await primeReader.link(JAR)).toEqual({
      latest: {
        episodeTitle: 'Episode 5: Low Tide',
        title: 'The Quiet Line',
        watchedAt: T,
      },
      ok: true,
      profileId: 'default',
      profileName: 'Koen',
      secret: secretFromCookies(JAR),
      total: null,
    });
  });

  it('opens no season pages: progress is the sync’s, and the link’s read has seconds', async () => {
    await primeReader.link(JAR);
    expect(urls().filter((url) => url.includes('/detail/'))).toEqual([]);
  });

  it('names a film as the latest without an episode', async () => {
    answers.set(PAGE_URL, json(historyPage([item('movie', 'Heat', 1, T)])));
    expect(await primeReader.link(JAR)).toMatchObject({
      latest: { episodeTitle: null, title: 'Heat', watchedAt: T },
      profileName: null,
    });
  });

  it('passes a refusal on', async () => {
    answers.set(PAGE_URL, json({}, 401));
    expect(await primeReader.link(JAR)).toEqual({
      ok: false,
      reason: 'signed-out',
    });
  });
});

describe('the linked profile', () => {
  const PROFILE_PAGE = `${ORIGIN}/settings/watch-history`;
  const profilePage = (id: string, name: string) =>
    html(
      `<html><a href="/ap/signin">Switch accounts</a><script type="application/json">${JSON.stringify(
        { nav: { profiles: { activeProfile: { id, name } } } },
      )}</script></html>`,
    );

  it('is read from the history page at link time', async () => {
    answers.set(PAGE_URL, json(PAGE_0));
    answers.set(PROFILE_PAGE, profilePage('amzn1.p2', ' Koen '));
    expect(await primeReader.link(JAR)).toMatchObject({
      ok: true,
      profileId: 'amzn1.p2',
      profileName: 'Koen',
    });
  });

  it('stops a sync whose session is on another profile now', async () => {
    answers.set(PROFILE_PAGE, profilePage('amzn1.p3', 'Kids'));
    expect(await primeReader.open(secretFromCookies(JAR), 'amzn1.p2')).toEqual({
      ok: false,
      reason: 'profile-changed',
    });
  });

  it('lets a sync on the linked profile read on', async () => {
    answers.set(PROFILE_PAGE, profilePage('amzn1.p2', 'Koen'));
    const opened = await primeReader.open(secretFromCookies(JAR), 'amzn1.p2');
    expect(opened.ok).toBe(true);
  });

  it('is signed out when the page is the sign-in form', async () => {
    answers.set(PROFILE_PAGE, html('<form name="signIn"></form>'));
    expect(await primeReader.open(secretFromCookies(JAR), 'amzn1.p2')).toEqual({
      ok: false,
      reason: 'signed-out',
    });
  });
});
