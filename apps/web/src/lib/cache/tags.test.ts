import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { tags } from './tags';

const SRC = path.resolve(import.meta.dirname, '../..');

const sources = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sources(full);
    }
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')
      ? [full]
      : [];
  });

/** The arguments of a call, split on its top-level commas */
const splitArgs = (args: string): ReadonlyArray<string> => {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of args) {
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    if ('([{'.includes(char)) depth += 1;
    if (')]}'.includes(char)) depth -= 1;
    current += char;
  }
  return [...parts, current.trim()].filter(Boolean);
};

type Call = Readonly<{
  args: ReadonlyArray<string>;
  file: string;
  kind: 'read' | 'invalidate';
  source: string;
}>;

const CALL = /\b(cacheTag|updateTag|revalidateTag)\(((?:[^()]|\([^()]*\))*)\)/g;

/** Every cacheTag/updateTag/revalidateTag call outside comments, with the arguments that are tags */
const calls: ReadonlyArray<Call> = sources(SRC).flatMap((file) => {
  const source = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  return [...source.matchAll(CALL)].map(([, fn, args = '']) => {
    const all = splitArgs(args);
    return {
      // revalidateTag's second argument is a profile, not a tag
      args: fn === 'cacheTag' ? all : all.slice(0, 1),
      file: path.relative(SRC, file),
      kind: fn === 'cacheTag' ? 'read' : 'invalidate',
      source,
    };
  });
});

const builders = (text: string) =>
  [...text.matchAll(/\btags\.(\w+)/g)].map(([, name]) => name);

/** The builders a call uses; an identifier argument (a loop over tags) counts the file's */
const buildersOf = (call: Call) =>
  call.args.flatMap((arg) =>
    arg.startsWith('tags.') ? builders(arg) : builders(call.source),
  );

describe('cache tags', () => {
  it('keep their strings, so no cached entry is orphaned', () => {
    expect({
      countryNew: tags.countryNew('kr'),
      discover: tags.discover,
      duration: tags.duration,
      genreBest: tags.genreBest('drama'),
      genreNew: tags.genreNew('drama'),
      goDeeper: tags.goDeeper,
      home: tags.home,
      homeMonth: tags.homeMonth('2026-11'),
      landing: tags.landing('genre', 'drama'),
      landingCounts: tags.landingCounts('theme'),
      landingDecade: tags.landing('decade', '1990s'),
      landingIndex: tags.landingIndex('country'),
      landingLanguage: tags.landing('language', 'ko'),
      network: tags.network(213),
      networkSpotlight: tags.networkSpotlight(213),
      person: tags.person(17419),
      popular: tags.popular(2026),
      romanizedTitles: tags.romanizedTitles,
      series: tags.series(1396),
      seriesSummaries: tags.seriesSummaries,
      stats: tags.stats('u1'),
      themeSpotlight: tags.themeSpotlight('heist'),
      user: tags.user('u1'),
      username: tags.username('koen'),
      whereToStart: tags.whereToStart('genre', 'drama'),
    }).toEqual({
      countryNew: 'country-new:kr',
      discover: 'discover',
      duration: 'duration',
      genreBest: 'genre:drama:best',
      genreNew: 'genre:drama:new',
      goDeeper: 'go-deeper',
      home: 'home',
      homeMonth: 'home:month:2026-11',
      landing: 'landing:genre:drama',
      landingCounts: 'landing-counts:theme',
      landingDecade: 'landing:decade:1990s',
      landingIndex: 'landing-index:country',
      landingLanguage: 'landing:language:ko',
      network: 'network:213',
      networkSpotlight: 'network-spotlight:213',
      person: 'person:17419',
      popular: 'popular:2026',
      romanizedTitles: 'romanized-titles',
      series: 'series:1396',
      seriesSummaries: 'series-summaries',
      stats: 'stats:u1',
      themeSpotlight: 'theme:heist:spotlight',
      user: 'user:u1',
      username: 'username:koen',
      whereToStart: 'where-to-start:genre:drama',
    });
  });

  it('are found in the source', () => {
    expect(calls.filter((call) => call.kind === 'read').length).toBeGreaterThan(
      50,
    );
    expect(calls.some((call) => call.kind === 'invalidate')).toBe(true);
  });

  it('are always built by `tags`, never written by hand', () => {
    const handWritten = calls.flatMap((call) =>
      call.args
        .filter((arg) => !arg.startsWith('tags.') && !/^\w+$/.test(arg))
        .map((arg) => `${call.file}: ${arg}`),
    );
    // an identifier argument is a loop over tags the file builds
    const unbuilt = calls
      .filter((call) => buildersOf(call).length === 0)
      .map((call) => call.file);
    expect(unbuilt).toEqual([]);
    expect(handWritten).toEqual([]);
  });

  it('are invalidated only where a reader sets them', () => {
    const read = new Set(
      calls.filter((call) => call.kind === 'read').flatMap(buildersOf),
    );
    const invalidated = calls
      .filter((call) => call.kind === 'invalidate')
      .flatMap(buildersOf);
    expect(invalidated.length).toBeGreaterThan(0);
    expect(invalidated.filter((name) => !read.has(name))).toEqual([]);
  });

  it('has no builder that nothing reads', () => {
    const read = new Set(
      calls.filter((call) => call.kind === 'read').flatMap(buildersOf),
    );
    expect(Object.keys(tags).filter((name) => !read.has(name))).toEqual([]);
  });
});
