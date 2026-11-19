import * as v from 'valibot';

import { getJson, readFailure } from '@/lib/connections/http';
import type { ReadFailure } from '@/lib/connections/reader';

export const BBC_SITE = 'bbc.co.uk';

/**
 * The BBC's public catalogue names a played episode and gives its length, so
 * a play can be judged watched. iPlayer's knows what's on now; /programmes
 * still knows what left. Public: no cookies go there, and no refusal says
 * anything about the viewer's session.
 */

const CATALOGUE_API = 'https://ibl.api.bbc.co.uk/ibl/v1';
const PROGRAMMES = 'https://www.bbc.co.uk/programmes';

/** The catalogue takes at most 20 PIDs a call (50 is refused) */
const EPISODES_PER_CALL = 20;

/** "PT1H1M34.04S" in seconds */
export const isoSeconds = (value: string): number | null => {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/.exec(value);
  if (!match || value === 'PT') {
    return null;
  }
  const [, hours = '0', minutes = '0', seconds = '0'] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
};

const EpisodeSchema = v.object({
  id: v.string(),
  parent_position: v.fallback(v.nullable(v.number()), null),
  subtitle: v.fallback(v.string(), ''),
  title: v.string(),
  tleo_id: v.fallback(v.nullable(v.string()), null),
  versions: v.fallback(
    v.array(
      v.object({
        duration: v.fallback(v.nullable(v.object({ value: v.string() })), null),
      }),
    ),
    [],
  ),
});

const EpisodesSchema = v.object({ episodes: v.array(v.unknown()) });

export type BbcEpisode = Readonly<{
  durationSeconds: number | null;
  id: string;
  parentPosition: number | null;
  subtitle: string;
  title: string;
  /** The "top level editorial object" */
  tleoId: string | null;
}>;

type PublicAnswer =
  | Readonly<{ ok: true; body: unknown }>
  | Readonly<{
      ok: false;
      reason: 'read-failed' | 'unavailable';
      retryAfterSeconds?: number;
    }>;

/** A public page's refusal never means the viewer signed out */
const getPublic = async (url: string): Promise<PublicAnswer> => {
  const answer = await getJson(
    url,
    {},
    {
      notJson: () => readFailure('unavailable'),
      redirect: () => readFailure('read-failed'),
    },
  );
  if (answer.ok) {
    return answer;
  }
  // A public page's 401/403 is a block on us, never the viewer's session
  return answer.reason === 'read-failed'
    ? { ok: false, reason: 'read-failed' }
    : { ...answer, reason: 'unavailable' };
};

/**
 * A PID iPlayer no longer knows, or a refused call, is left out: /programmes
 * may still know it. Busy or down fails the read: iPlayer is down, not one
 * episode unknown.
 */
export const readEpisodes = async (
  pids: ReadonlyArray<string>,
): Promise<
  | Readonly<{ ok: true; episodes: ReadonlyMap<string, BbcEpisode> }>
  | ReadFailure
> => {
  const episodes = new Map<string, BbcEpisode>();
  for (let start = 0; start < pids.length; start += EPISODES_PER_CALL) {
    const batch = pids.slice(start, start + EPISODES_PER_CALL);
    const answer = await getPublic(
      `${CATALOGUE_API}/episodes/${batch.map(encodeURIComponent).join(',')}`,
    );
    if (!answer.ok) {
      if (answer.reason === 'unavailable') {
        return answer;
      }
      continue;
    }
    const parsed = v.safeParse(EpisodesSchema, answer.body);
    if (!parsed.success) {
      return readFailure('changed');
    }
    for (const item of parsed.output.episodes) {
      const entry = v.safeParse(EpisodeSchema, item);
      if (!entry.success) {
        continue;
      }
      const episode = entry.output;
      const duration = episode.versions.find((version) => version.duration)
        ?.duration?.value;
      episodes.set(episode.id, {
        durationSeconds: duration ? isoSeconds(duration) : null,
        id: episode.id,
        parentPosition: episode.parent_position,
        subtitle: episode.subtitle,
        title: episode.title,
        tleoId: episode.tleo_id,
      });
    }
  }
  return { episodes, ok: true };
};

/** A programme's parent: a series or the brand, each maybe under another */
type Parent = Readonly<{
  parent?: Readonly<{ programme: Parent }> | undefined;
  pid: string;
  title: string;
  type: string;
}>;

const ParentSchema: v.GenericSchema<unknown, Parent> = v.object({
  parent: v.fallback(
    v.optional(v.object({ programme: v.lazy(() => ParentSchema) })),
    undefined,
  ),
  pid: v.string(),
  title: v.fallback(v.string(), ''),
  type: v.string(),
});

const ProgrammeSchema = v.object({
  programme: v.object({
    parent: v.fallback(
      v.optional(v.object({ programme: ParentSchema })),
      undefined,
    ),
    position: v.fallback(v.nullable(v.number()), null),
    title: v.fallback(v.string(), ''),
    type: v.literal('episode'),
    versions: v.fallback(
      v.array(
        v.object({
          canonical: v.fallback(v.optional(v.number()), undefined),
          duration: v.fallback(v.nullable(v.number()), null),
          pid: v.fallback(v.string(), ''),
        }),
      ),
      [],
    ),
  }),
});

/** The outermost programme from `parent` up: the brand */
const topOf = (parent: Parent): Parent =>
  parent.parent ? topOf(parent.parent.programme) : parent;

/** Named as iPlayer would ("Series 2: 5. Bar Mitzvah" under the brand) */
export const readProgramme = async (
  pid: string,
  versionPid: string | null,
): Promise<BbcEpisode | 'unknown' | 'unavailable'> => {
  const answer = await getPublic(
    `${PROGRAMMES}/${encodeURIComponent(pid)}.json`,
  );
  if (!answer.ok) {
    return answer.reason === 'unavailable' ? 'unavailable' : 'unknown';
  }
  const parsed = v.safeParse(ProgrammeSchema, answer.body);
  if (!parsed.success) {
    return 'unknown';
  }
  const { parent, position, title, versions } = parsed.output.programme;
  const version =
    versions.find((entry) => versionPid !== null && entry.pid === versionPid) ??
    versions.find((entry) => entry.canonical === 1) ??
    versions.find((entry) => entry.duration !== null);
  const series = parent?.programme.type === 'series' ? parent.programme : null;
  const numbered = position === null ? title : `${position}. ${title}`;
  const brand = parent ? topOf(parent.programme) : null;
  return {
    durationSeconds: version?.duration ?? null,
    id: pid,
    parentPosition: position,
    subtitle: series ? `${series.title}: ${numbered}` : title,
    title: brand?.title ?? title,
    tleoId: brand?.pid ?? null,
  };
};
