import { afterEach, describe, expect, it, vi } from 'vitest';

import { isoSeconds, readEpisodes, readProgramme } from './iplayer';

vi.mock('@tvseri.es/utils', async (original) => ({
  ...(await original<typeof import('@tvseri.es/utils')>()),
  sleep: async () => {},
}));

const respond = (status: number, body?: unknown) =>
  vi.fn(async () =>
    body === undefined
      ? new Response(null, { status })
      : Response.json(body, { status }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isoSeconds', () => {
  it('reads iPlayer’s durations', () => {
    expect(isoSeconds('PT1H1M34.04S')).toBeCloseTo(3694.04);
    expect(isoSeconds('PT58M')).toBe(3480);
    expect(isoSeconds('PT')).toBeNull();
    expect(isoSeconds('soon')).toBeNull();
  });
});

describe('readEpisodes', () => {
  it('asks 20 PIDs at a time and reads each episode', async () => {
    const pids = Array.from({ length: 25 }, (_, index) => `p${index}`);
    const fetchMock = vi.fn(async (url: string) => {
      const ids = url.split('/episodes/')[1]?.split(',') ?? [];
      return Response.json({
        episodes: ids.map((id) => ({
          id,
          parent_position: 6,
          subtitle: 'Series 4: 6. The Line',
          title: 'Blue Lights',
          tleo_id: 'b0show',
          versions: [{ duration: { value: 'PT59M' } }],
        })),
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const read = await readEpisodes(pids);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(read.ok && read.episodes.get('p24')).toEqual({
      durationSeconds: 3540,
      id: 'p24',
      parentPosition: 6,
      subtitle: 'Series 4: 6. The Line',
      title: 'Blue Lights',
      tleoId: 'b0show',
    });
  });

  it('asks a failed call once more, then tries the page later', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ episodes: [] }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await readEpisodes(['p1'])).toEqual({
      episodes: new Map(),
      ok: true,
    });
    vi.stubGlobal('fetch', respond(503));
    expect(await readEpisodes(['p1'])).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('never reads a refusal of the public catalogue as the viewer signed out', async () => {
    vi.stubGlobal('fetch', respond(403));
    expect(await readEpisodes(['p1'])).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('leaves out the PIDs of a call it refuses, for /programmes to name', async () => {
    for (const status of [400, 404, 302]) {
      vi.stubGlobal('fetch', respond(status));
      expect(await readEpisodes(['p1']), String(status)).toEqual({
        episodes: new Map(),
        ok: true,
      });
    }
  });
});

describe('readProgramme', () => {
  const programme = (overrides: Record<string, unknown> = {}) => ({
    programme: {
      display_title: { subtitle: 'Series 2, Bar Mitzvah', title: 'Dove' },
      parent: {
        programme: {
          parent: {
            programme: { pid: 'b0brand', title: 'Dove', type: 'brand' },
          },
          pid: 'b0series',
          position: 2,
          title: 'Series 2',
          type: 'series',
        },
      },
      pid: 'p0ep',
      position: 5,
      title: 'Bar Mitzvah',
      type: 'episode',
      versions: [
        { canonical: 1, duration: 1620, pid: 'p0orig' },
        { canonical: 0, duration: 1643, pid: 'p0ad' },
      ],
      ...overrides,
    },
  });

  it('reads an expired episode from /programmes as the catalogue would name it', async () => {
    const fetchMock = respond(200, programme());
    vi.stubGlobal('fetch', fetchMock);
    expect(await readProgramme('p0ep', 'p0ad')).toEqual({
      // The version played, else the canonical one
      durationSeconds: 1643,
      id: 'p0ep',
      parentPosition: 5,
      subtitle: 'Series 2: 5. Bar Mitzvah',
      title: 'Dove',
      tleoId: 'b0brand',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.bbc.co.uk/programmes/p0ep.json',
      expect.anything(),
    );
    expect(await readProgramme('p0ep', null)).toMatchObject({
      durationSeconds: 1620,
    });
  });

  it('names an episode straight under its brand by its title', async () => {
    vi.stubGlobal(
      'fetch',
      respond(
        200,
        programme({
          parent: {
            programme: { pid: 'b0cup', title: 'World Cup 2022', type: 'brand' },
          },
          position: null,
          title: 'England v Iran',
        }),
      ),
    );
    expect(await readProgramme('p0ep', null)).toMatchObject({
      parentPosition: null,
      subtitle: 'England v Iran',
      title: 'World Cup 2022',
    });
  });

  it('says busy when /programmes fails twice, apart from not knowing a PID', async () => {
    const fetchMock = respond(503);
    vi.stubGlobal('fetch', fetchMock);
    expect(await readProgramme('p0ep', null)).toBe('unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.stubGlobal('fetch', respond(404));
    expect(await readProgramme('p0ep', null)).toBe('unknown');
    vi.stubGlobal('fetch', respond(200, { programme: { type: 'clip' } }));
    expect(await readProgramme('p0ep', null)).toBe('unknown');
  });
});
