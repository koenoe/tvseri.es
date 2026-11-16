import 'server-only';

import type {
  Movie,
  Person,
  PersonCareer,
  PersonCollaborators,
  PersonFamilyAndAwards,
  PersonLinks,
  PersonShows,
  TvSeries,
} from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';
import { sentenceCase } from '@/lib/format/text';
import personPath from '@/lib/routing/personPath';

import { buildCareer, type CareerView } from '../_lib/career';
import { toFractionalYear, yearsBetween } from '../_lib/format';
import { buildKnownFor, type KnownForTile } from '../_lib/knownFor';
import { buildShows, crewWork, type ShowsView } from '../_lib/shows';

/**
 * The person page's cached reads, one entry per person id, trimmed
 * to what the page draws inside the cached scope. Shared content prerenders
 * into the person's static shell: every
 * read goes through `tryApi`, with one `cacheLife` per run, the API's
 * profile or `unavailable` (revalidated after 30 s) when Unavailable.
 * The viewer's watched line is not here: it is private (`WatchedHole`).
 */

const tag = (id: number) => `person:${id}`;

const UNAVAILABLE: Unavailable = { unavailable: true };

export type PersonResult =
  | Readonly<{ status: 'ok'; person: Person }>
  | Readonly<{ status: 'not-found' }>
  | Unavailable;

/** `GET /person/:id`: found, not found (or adult), or Unavailable. */
export async function loadPerson(id: number): Promise<PersonResult> {
  'use cache';
  cacheTag(tag(id));
  const person = await tryApi(() =>
    apiFetch<Person>('/person/:id', { notFound: 'null', params: { id } }),
  );
  if (isUnavailable(person)) {
    cacheLife('unavailable');
    return person;
  }
  cacheLife('medium');
  if (!person || person.isAdult) {
    return { status: 'not-found' };
  }
  // The age from the dates, against this entry's own today (the API's is a
  // week older at worst): "(age 70)", or the age at death
  const until = person.deathdate ?? new Date().toISOString().slice(0, 10);
  const age = person.birthdate
    ? yearsBetween(person.birthdate, until)
    : undefined;
  const { age: _, ...rest } = person;
  return {
    person: age === undefined ? rest : { ...rest, age },
    status: 'ok',
  };
}

/** `GET /person/:id/shows`: merged credits; null for an unknown person. */
export async function loadShows(
  id: number,
): Promise<PersonShows | null | Unavailable> {
  'use cache';
  cacheTag(tag(id));
  const shows = await tryApi(() =>
    apiFetch<PersonShows>('/person/:id/shows', {
      notFound: 'null',
      params: { id },
    }),
  );
  if (isUnavailable(shows)) {
    cacheLife('unavailable');
  } else {
    cacheLife('medium');
  }
  return shows;
}

/** `GET /person/:id/career` (raw: the Shows list takes its years). */
async function loadCareer(
  id: number,
): Promise<PersonCareer | null | Unavailable> {
  'use cache';
  cacheTag(tag(id));
  const career = await tryApi(() =>
    apiFetch<PersonCareer>('/person/:id/career', {
      notFound: 'null',
      params: { id },
    }),
  );
  if (isUnavailable(career)) {
    cacheLife('unavailable');
  } else {
    cacheLife('medium');
  }
  return career;
}

async function loadKnownForItems(
  id: number,
): Promise<ReadonlyArray<TvSeries | Movie> | Unavailable> {
  'use cache';
  cacheTag(tag(id));
  const items = await tryApi(() =>
    apiFetch<(TvSeries | Movie)[]>('/person/:id/known-for', {
      notFound: 'null',
      params: { id },
    }),
  );
  if (isUnavailable(items)) {
    cacheLife('unavailable');
    return items;
  }
  cacheLife('medium');
  return items ?? [];
}

/** Known for: five tiles, his characters and episodes from the credits. */
export async function loadKnownFor(
  id: number,
): Promise<ReadonlyArray<KnownForTile> | Unavailable> {
  'use cache';
  cacheTag(tag(id));
  const [items, shows] = await Promise.all([
    loadKnownForItems(id),
    loadShows(id),
  ]);
  if (isUnavailable(items) || isUnavailable(shows)) {
    cacheLife('unavailable');
    return UNAVAILABLE;
  }
  cacheLife('medium');
  return buildKnownFor(items, shows?.shows ?? []);
}

/** The Career chart, laid out for today (or the date of death). */
export async function loadCareerView(
  id: number,
  deathdate: string | undefined,
): Promise<CareerView | null | Unavailable> {
  'use cache';
  cacheTag(tag(id));
  const reads = await Promise.all([
    loadCareer(id),
    loadKnownFor(id),
    loadShows(id),
  ]);
  // Every read or none: a degraded chart never gets the long life
  if (reads.some(isUnavailable)) {
    cacheLife('unavailable');
    return UNAVAILABLE;
  }
  const [career, knownFor, shows] = reads as [
    PersonCareer | null,
    ReadonlyArray<KnownForTile>,
    PersonShows | null,
  ];
  cacheLife('medium');
  if (!career) {
    return null;
  }
  // Inside the cached scope: the chart's Today moves with the cache life
  const today = toFractionalYear(new Date().toISOString()) ?? 0;
  // Crew-only credits read as one sentence ("Executive producer"), as in Shows
  const crew = new Map(
    shows
      ? [...shows.shows, ...shows.upcoming]
          .filter((show) => !show.isCast && show.isCrew)
          .map((show) => [show.id, crewWork(show.crewJobs, show.jobs)])
      : [],
  );
  const withRole = <T extends Readonly<{ id: number; role: string }>>(
    row: T,
  ) => ({ ...row, role: crew.get(row.id) ?? row.role });
  const named = {
    ...career,
    rows: career.rows.map(withRole),
    upcoming: career.upcoming.map(withRole),
  };
  return buildCareer(named, {
    deathYear: deathdate ? toFractionalYear(deathdate) : null,
    // Shows only: a film id can equal a show id
    preferIds: knownFor.filter((tile) => tile.href).map((tile) => tile.id),
    today,
    ...(deathdate && { deathdate }),
  });
}

/** The Shows list, with the career's years for each series. */
export async function loadShowsView(
  id: number,
  gender: Person['gender'],
): Promise<ShowsView | null | Unavailable> {
  'use cache';
  cacheTag(tag(id));
  const [shows, career] = await Promise.all([loadShows(id), loadCareer(id)]);
  // Without the career every series would lose its years: all or nothing
  if (isUnavailable(shows) || isUnavailable(career)) {
    cacheLife('unavailable');
    return UNAVAILABLE;
  }
  cacheLife('medium');
  if (!shows) {
    return null;
  }
  return buildShows(shows, career?.rows ?? [], gender);
}

/** `GET /person/:id/external-ids`: IMDb and socials. */
export async function loadLinks(
  id: number,
): Promise<PersonLinks['links'] | Unavailable> {
  'use cache';
  cacheTag(tag(id));
  const links = await tryApi(() =>
    apiFetch<PersonLinks>('/person/:id/external-ids', {
      notFound: 'null',
      params: { id },
    }),
  );
  if (isUnavailable(links)) {
    cacheLife('unavailable');
    return links;
  }
  cacheLife('long');
  return links?.links ?? [];
}

export type CollaboratorView = Readonly<{
  id: number;
  name: string;
  href: string;
  image: string;
  role: string;
  aria: string;
}>;

/** Faces shown */
const COLLABORATORS = 6;

export async function loadCollaborators(
  id: number,
): Promise<ReadonlyArray<CollaboratorView> | Unavailable> {
  'use cache';
  cacheTag(tag(id));
  const response = await tryApi(() =>
    apiFetch<PersonCollaborators>('/person/:id/collaborators', {
      notFound: 'null',
      params: { id },
    }),
  );
  if (isUnavailable(response)) {
    cacheLife('unavailable');
    return response;
  }
  cacheLife('medium');
  return (response?.collaborators ?? [])
    .slice(0, COLLABORATORS)
    .map((person) => ({
      aria: `${person.name}, ${person.role}, ${person.count} series, ${person.episodeCount} episodes`,
      href: personPath(person.id, person.slug),
      id: person.id,
      image: person.image,
      name: person.name,
      role: person.character ?? sentenceCase(person.role),
    }));
}

/**
 * `GET /person/:id/family-and-awards` (Wikidata): Unavailable when Wikidata
 * is down (`degraded`); "nothing known" lives a day, like the API's miss.
 */
export async function loadFamilyAndAwards(
  id: number,
): Promise<PersonFamilyAndAwards | Unavailable> {
  'use cache';
  cacheTag(tag(id));
  const response = await tryApi(() =>
    apiFetch<PersonFamilyAndAwards>('/person/:id/family-and-awards', {
      notFound: 'null',
      params: { id },
    }),
  );
  // `degraded`: Wikidata didn't answer; try again on a visit 30 s on
  if (isUnavailable(response) || response?.degraded) {
    cacheLife('unavailable');
    return UNAVAILABLE;
  }
  const value = response ?? { awards: null, family: null };
  if (value.awards || value.family) {
    cacheLife('medium');
  } else {
    cacheLife('short');
  }
  return value;
}
