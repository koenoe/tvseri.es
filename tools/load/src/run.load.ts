/**
 * The TMDB load rig: the Hono API in-process, as N simulated Lambda
 * instances behind a CloudFront model, against a synthetic upstream that
 * never touches TMDB, OMDb, MDBList or Wikidata (global `fetch` is the API
 * tests' fake; AWS SDK clients are mocked or pointed at a dead local port).
 *
 *   pnpm --filter @tvseri.es/load-rig load
 *   LOAD_SCENARIO=outage LOAD_RATE=20 LOAD_SECONDS=60 LOAD_INSTANCES=10 …
 *
 * Scenarios (all start from empty caches, warm up with the same mix on an
 * unlimited upstream with no throttles, then measure with TMDB's ~40 a
 * second limit and 120-250 ms latency):
 * - `warm`: steady traffic on warm caches.
 * - `expiry`: the clock jumps 24 h 5 min past the warm-up, so every Cache
 *   table entry written then has expired, the next UTC day's keys are cold
 *   and CloudFront's `short` copies are inside their stale window.
 * - `outage`: the clock jumps to 35 minutes after the next UTC midnight and
 *   every upstream call answers 429 (`Retry-After: 30`) for the whole run.
 *
 * Output: one JSON line per scenario on stdout, and appended to LOAD_OUT
 * when set.
 */
import { appendFileSync } from 'node:fs';
import { isoWeekOf } from '@tvseri.es/utils';
import { afterAll, describe, it, vi } from 'vitest';

import { db } from '../../../apps/api/test/db';
import {
  callsPerSecond,
  peakRequestsInFlight,
  requestedUrls,
  resetHttp,
  resetRequests,
  setUpstreamConditions,
  type UpstreamConditions,
} from '../../../apps/api/test/fakeHttp';
import { seedLibrary, seedWatched } from '../../../apps/api/test/library';
import { seedUser } from '../../../apps/api/test/seed';
import { type CdnOutcome, createCdn } from './cdn';
import { createFleet } from './fleet';
import {
  type Call,
  createMix,
  createRandom,
  homePage,
  personPage,
  pickShow,
  showPage,
  type Visit,
} from './mix';
import { castOf, installSyntheticUpstream } from './upstream';

const env = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const RATE = env('LOAD_RATE', 20);
const SECONDS = env('LOAD_SECONDS', 60);
const WARM_SECONDS = env('LOAD_WARM_SECONDS', 20);
const PREFILL_SHOWS = env('LOAD_PREFILL_SHOWS', 300);
const INSTANCES = env('LOAD_INSTANCES', 10);
const TMDB_LIMIT = env('LOAD_TMDB_LIMIT', 40);
const USERS = 40;
const SCENARIOS = (process.env.LOAD_SCENARIO ?? 'warm,expiry,outage').split(
  ',',
);

const TMDB = 'api.themoviedb.org';
const DAY_MS = 86_400_000;
const START = Date.parse('2026-11-13T23:20:00Z');

/** TMDB's typical 150-250 ms, with a slow tail */
const LATENCY: UpstreamConditions['latencyMs'] = () =>
  120 + Math.random() * 130 + (Math.random() < 0.02 ? 1200 : 0);

const NORMAL: UpstreamConditions = {
  latencyMs: LATENCY,
  // TMDB's documented ~40 a second, per IP; its Retry-After is not verified
  rateLimit: { perSecond: TMDB_LIMIT },
};

const percentile = (values: ReadonlyArray<number>, p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0
  );
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const userIds = Array.from(
  { length: USERS },
  (_, index) => `01JLOADUSER${String(index).padStart(15, '0')}`,
);

const seedUsers = (random: () => number) => {
  for (const id of userIds) {
    seedUser({ country: 'US', id });
    const inProgress = Array.from({ length: 6 }, () => pickShow(random));
    const watchlist = Array.from({ length: 6 }, () => pickShow(random));
    seedLibrary(id, { IN_PROGRESS: inProgress, WATCHLIST: watchlist });
    for (const seriesId of inProgress) {
      seedWatched(id, seriesId, [
        [1, 1],
        [1, 2],
      ]);
    }
  }
};

type Recorded = Readonly<{
  kind: string;
  ms: number;
  outcome: CdnOutcome | 'throttled';
  status: number;
}>;

const runScenario = async (scenario: string) => {
  db.reset();
  resetHttp();
  installSyntheticUpstream();
  // Warm-up fills CloudFront and the Cache table as a day of traffic would:
  // no latency, no rate limit, no throttles
  setUpstreamConditions({});
  vi.useFakeTimers({ now: START, shouldAdvanceTime: true, toFake: ['Date'] });

  const random = createRandom(42);
  seedUsers(random);
  const fleet = await createFleet(INSTANCES);
  const cdn = createCdn(fleet.handle, () => Date.now());

  const records: Recorded[] = [];
  const seenFailures = new Set<string>();
  const marks = { attempted: 0, ok: 0 };

  const send = async (call: Call) => {
    const started = performance.now();
    const headers: Record<string, string> = { 'x-api-key': 'test-api-key' };
    if (call.as) headers.authorization = `Bearer test-token:${call.as}`;
    if (call.body !== undefined) headers['content-type'] = 'application/json';
    const answer = await cdn.request(call.path, {
      body: call.body === undefined ? undefined : JSON.stringify(call.body),
      headers,
      method: call.method ?? 'GET',
    });
    if (
      process.env.LOAD_DEBUG &&
      answer.status >= 500 &&
      !seenFailures.has(call.kind)
    ) {
      seenFailures.add(call.kind);
      process.stderr.write(
        `[load] failed ${call.path} ${answer.status} ${answer.body.slice(0, 300)}\n`,
      );
    }
    records.push({
      kind: call.kind,
      ms: performance.now() - started,
      outcome:
        answer.status === 429 && answer.body === ''
          ? 'throttled'
          : answer.outcome,
      status: answer.status,
    });
    return answer;
  };

  const mark = async (seriesId: number, userId: string) => {
    marks.attempted++;
    // The web's episode path: the show and the season through CloudFront,
    // then the batch write (no TMDB call in the API)
    const [series, season] = await Promise.all([
      send({
        kind: 'mark-read',
        path: `/series/${seriesId}?include_images=true`,
      }),
      send({ kind: 'mark-read', path: `/series/${seriesId}/season/1` }),
    ]);
    if (series.status !== 200 || season.status !== 200) return;
    const show = JSON.parse(series.body) as Record<string, unknown>;
    const episodes = (JSON.parse(season.body) as { episodes?: unknown[] })
      .episodes as ReadonlyArray<Record<string, unknown>> | undefined;
    const episode = episodes?.[Math.floor(random() * episodes.length)];
    if (!episode) return;
    const written = await send({
      as: userId,
      body: [
        {
          episode: {
            airDate: String(episode.airDate ?? ''),
            episodeNumber: Number(episode.episodeNumber ?? 1),
            runtime: Number(episode.runtime ?? 45),
            seasonNumber: Number(episode.seasonNumber ?? 1),
            stillPath: (episode.stillPath as string | null) ?? null,
            title: String(episode.title ?? ''),
          },
          tvSeries: {
            id: seriesId,
            posterPath: String(show.posterPath ?? ''),
            slug: String(show.slug ?? 'series'),
            title: String(show.title ?? 'Series'),
          },
          userId,
          watchedAt: Date.now(),
        },
      ],
      kind: 'mark-write',
      method: 'POST',
      path: `/user/${userId}/watched/batch`,
    });
    if (written.status === 201) marks.ok++;
  };

  const today = () => {
    const date = new Date().toISOString().slice(0, 10);
    return { date, week: isoWeekOf(date) };
  };
  const nextVisit = createMix(random, userIds, today);

  const play = async (visit: Visit) => {
    if (visit.kind === 'mark') {
      await mark(visit.seriesId, visit.userId);
      return;
    }
    await Promise.all(visit.calls.map((call) => send(call)));
  };

  /** Starts RATE visits a second for `seconds`; resolves when all settle */
  const drive = async (seconds: number) => {
    const pending: Promise<void>[] = [];
    const total = Math.round(seconds * RATE);
    const startedAt = performance.now();
    for (let index = 0; index < total; index++) {
      const due = startedAt + (index * 1000) / RATE;
      const wait = due - performance.now();
      if (wait > 0) await sleep(wait);
      pending.push(play(nextVisit()).catch(() => undefined));
    }
    await Promise.race([Promise.all(pending), sleep(20_000)]);
  };

  fleet.warming(true);
  // A day of traffic has already rendered the popular head: its show pages
  // and their casts' person pages
  const { date, week } = today();
  await Promise.all(homePage(date, week).map((call) => send(call)));
  for (let rank = 1; rank <= PREFILL_SHOWS; rank += 10) {
    await Promise.all(
      Array.from({ length: 10 }, (_, offset) => rank + offset)
        .flatMap((id) => [
          ...showPage(id),
          ...castOf(id)
            .slice(0, 10)
            .flatMap((personId) => personPage(personId)),
        ])
        .map((call) => send(call)),
    );
  }
  await drive(WARM_SECONDS);
  fleet.warming(false);
  setUpstreamConditions(NORMAL);

  if (scenario === 'expiry') {
    vi.setSystemTime(new Date(Date.now() + DAY_MS + 5 * 60_000));
  }
  if (scenario === 'outage') {
    vi.setSystemTime(new Date('2026-11-14T00:35:00Z'));
    setUpstreamConditions({
      latencyMs: LATENCY,
      outage: { retryAfter: 30, status: 429 },
    });
  }

  records.length = 0;
  marks.attempted = 0;
  marks.ok = 0;
  resetRequests();
  fleet.resetStats();
  const measuredFrom = performance.now();
  await drive(SECONDS);
  const elapsed = (performance.now() - measuredFrom) / 1000;

  const perSecond = callsPerSecond(TMDB);
  const failed = records.filter(
    (record) => record.status >= 500 || record.outcome === 'throttled',
  );
  const home = records.filter((record) => record.kind === 'home');
  const report = {
    commit: process.env.LOAD_LABEL ?? 'unlabelled',
    config: {
      instances: INSTANCES,
      rate: RATE,
      seconds: SECONDS,
      tmdbLimitPerSecond: TMDB_LIMIT,
      warmSeconds: WARM_SECONDS,
    },
    home: {
      failedTiles: home.filter((record) => record.status >= 500).length,
      tiles: home.length,
    },
    lambda: { ...fleet.stats(), elapsedSeconds: Math.round(elapsed) },
    marks: {
      ...marks,
      successRate: marks.attempted ? marks.ok / marks.attempted : 1,
    },
    requests: {
      failed: failed.length,
      failedByKind: Object.fromEntries(
        [...new Set(failed.map((record) => record.kind))].map((kind) => [
          kind,
          failed.filter((record) => record.kind === kind).length,
        ]),
      ),
      failedByStatus: Object.fromEntries(
        [...new Set(failed.map((record) => record.status))].map((status) => [
          status,
          failed.filter((record) => record.status === status).length,
        ]),
      ),
      // Requests that reached a Lambda (CloudFront misses, private reads,
      // writes): the latency the cache doesn't hide
      originP95Ms: Math.round(
        percentile(
          records
            .filter(
              (record) =>
                record.outcome === 'miss' || record.outcome === 'pass',
            )
            .map((record) => record.ms),
          0.95,
        ),
      ),
      p50Ms: Math.round(
        percentile(
          records.map((record) => record.ms),
          0.5,
        ),
      ),
      p95Ms: Math.round(
        percentile(
          records.map((record) => record.ms),
          0.95,
        ),
      ),
      servedStale: records.filter(
        (record) =>
          record.outcome === 'stale' || record.outcome === 'stale-if-error',
      ).length,
      throttled: records.filter((record) => record.outcome === 'throttled')
        .length,
      total: records.length,
    },
    scenario,
    upstream: {
      allUpstreamCalls: requestedUrls().length,
      mdblistCalls: requestedUrls().filter(
        (url) => url.host === 'api.mdblist.com',
      ).length,
      omdbCalls: requestedUrls().filter((url) => url.host === 'www.omdbapi.com')
        .length,
      peakInFlight: peakRequestsInFlight(),
      tmdbCalls: perSecond.reduce((sum, count) => sum + count, 0),
      tmdbPerSecondMax: Math.max(0, ...perSecond),
      tmdbPerSecondP95: percentile(perSecond, 0.95),
    },
  };
  const line = JSON.stringify(report);
  console.log(line);
  if (process.env.LOAD_OUT) {
    appendFileSync(process.env.LOAD_OUT, `${line}\n`);
  }
  vi.useRealTimers();
};

/**
 * `stale-reads`: what a personal read costs when every fact it needs is
 * stored but stale (past its soft life, inside its 7-day life). Each of the
 * 40 users has 30 shows of its own in progress; a first overview stores
 * their facts; 31 hours later each user reads the overview once (one a
 * second, on a free instance), against TMDB's usual latency. Reports the
 * p50 and p95 of those reads.
 */
const runStaleReads = async () => {
  db.reset();
  resetHttp();
  installSyntheticUpstream();
  setUpstreamConditions({});
  vi.useFakeTimers({ now: START, shouldAdvanceTime: true, toFake: ['Date'] });
  const fleet = await createFleet(INSTANCES);
  const read = async (userId: string) => {
    const started = performance.now();
    const answer = await fleet.handle('/me/overview', {
      headers: {
        authorization: `Bearer test-token:${userId}`,
        'x-api-key': 'test-api-key',
      },
    });
    return { ms: performance.now() - started, status: answer.status };
  };
  for (const [index, id] of userIds.entries()) {
    seedUser({ country: 'US', id });
    const shows = Array.from({ length: 30 }, (_, n) => 1000 + index * 30 + n);
    seedLibrary(id, { IN_PROGRESS: shows });
    for (const seriesId of shows) {
      seedWatched(id, seriesId, [[1, 1]]);
    }
  }
  fleet.warming(true);
  for (const id of userIds) {
    await read(id);
  }
  fleet.warming(false);
  setUpstreamConditions(NORMAL);
  vi.setSystemTime(new Date(Date.now() + 31 * 3_600_000));
  resetRequests();
  const timings: number[] = [];
  let failed = 0;
  for (const id of userIds) {
    const { ms, status } = await read(id);
    timings.push(ms);
    if (status >= 500) failed++;
    await sleep(1000);
  }
  const report = {
    commit: process.env.LOAD_LABEL ?? 'unlabelled',
    failed,
    p50Ms: Math.round(percentile(timings, 0.5)),
    p95Ms: Math.round(percentile(timings, 0.95)),
    reads: timings.length,
    scenario: 'stale-reads',
    tmdbCalls: requestedUrls().filter((url) => url.host === TMDB).length,
  };
  const line = JSON.stringify(report);
  console.log(line);
  if (process.env.LOAD_OUT) {
    appendFileSync(process.env.LOAD_OUT, `${line}\n`);
  }
  vi.useRealTimers();
};

describe('TMDB load rig', () => {
  afterAll(() => {
    vi.useRealTimers();
  });

  for (const scenario of SCENARIOS) {
    it(
      scenario,
      async () => {
        await (scenario === 'stale-reads'
          ? runStaleReads()
          : runScenario(scenario));
      },
      // The prefill of the popular head takes minutes on a busy laptop
      (WARM_SECONDS + SECONDS + 600) * 1000,
    );
  }
});
