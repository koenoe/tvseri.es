import type { PickReason } from '@tvseri.es/schemas';

import { genreNames } from '../../genres';

type Item = Readonly<{
  reason: PickReason;
  series: Readonly<{ genres: ReadonlyArray<Readonly<{ name: string }>> }>;
}>;

const COUNT_WORDS = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
] as const;

type Shared = Readonly<{
  kind: 'keyword' | 'network';
  label: string;
  count: number;
}>;

/**
 * The labelled reason most items share (a theme wins a tie, then the first
 * seen), with how many share it; undefined when none has a label.
 */
const mostShared = (items: ReadonlyArray<Item>): Shared | undefined => {
  const tally = new Map<string, Shared>();
  for (const { reason } of items) {
    const label = reason.label.trim();
    if (!label || reason.kind === 'recommendation') {
      continue;
    }
    const key = `${reason.kind}:${label}`;
    const seen = tally.get(key);
    tally.set(key, {
      count: (seen?.count ?? 0) + 1,
      kind: reason.kind,
      label,
    });
  }
  let best: Shared | undefined;
  for (const shared of tally.values()) {
    if (
      !best ||
      shared.count > best.count ||
      (shared.count === best.count &&
        shared.kind === 'keyword' &&
        best.kind !== 'keyword')
    ) {
      best = shared;
    }
  }
  return best;
};

const countWord = (count: number) => COUNT_WORDS[count] ?? String(count);

/**
 * The card's line under its title. It is never hand-written prose: the API
 * gives a reason per show only, and a TMDB keyword is a tag ("based on novel or book",
 * "interview"), not a noun phrase, so it is never pasted into a sentence
 * that needs it to agree: it is quoted as the theme's name. The line says
 * what most of the shows share with the source and how many share it, never
 * more ("Four series like it, two on the theme “heist”"): a theme, else a
 * network ("Two series like it, from HBO"), else what its fans watch.
 */
export const subline = (items: ReadonlyArray<Item>): string => {
  const count = items.length;
  if (count === 0) {
    return '';
  }
  // the UI noun is "series", singular and plural
  const shows = `${countWord(count)} series`;
  const shared = mostShared(items);
  if (!shared) {
    return `${shows} its fans watch next`;
  }
  const all = shared.count === count;
  const some = countWord(shared.count).toLowerCase();
  if (shared.kind === 'keyword') {
    const theme = `on the theme “${shared.label}”`;
    return all ? `${shows} ${theme}` : `${shows} like it, ${some} ${theme}`;
  }
  return all
    ? `${shows} like it, from ${shared.label}`
    : `${shows} like it, ${some} from ${shared.label}`;
};

export type ReasonLine = Readonly<{
  kind: 'genre' | 'network' | 'theme';
  text: string;
}>;

/**
 * The line under a poster: "Theme: grief" for a shared keyword,
 * the network's name, or for a plain recommendation its first two genres.
 */
export const reasonLine = (item: Item): ReasonLine | undefined => {
  const { kind, label } = item.reason;
  if (kind === 'keyword') {
    return label ? { kind: 'theme', text: `Theme: ${label}` } : undefined;
  }
  if (kind === 'network') {
    return label ? { kind: 'network', text: label } : undefined;
  }
  const genres = genreNames(item.series, 2).join(', ');
  return genres ? { kind: 'genre', text: genres } : undefined;
};
