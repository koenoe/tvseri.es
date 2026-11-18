import type {
  PersonAward,
  PersonAwardGroup,
  PersonAwards,
  PersonChild,
  PersonFamilyAndAwards,
  PersonSpouse,
} from '@tvseri.es/schemas';
import { toSlug } from '@tvseri.es/utils';

type Binding = Readonly<Record<string, Readonly<{ value: string }>>>;

/** SPARQL JSON results (`results.bindings`) of `buildPersonQuery` */
export type WikidataResults = Readonly<{
  results?: Readonly<{ bindings?: ReadonlyArray<Binding> }>;
}>;

const FEMALE = 'Q6581072';
const MALE = 'Q6581097';

/**
 * One query for the whole person: spouse (P26, with start/end), child (P40,
 * with sex), both with their TMDB id (P4985), awards received (P166) and
 * nominated for (P1411), matched on the IMDb id (P345). `imdbId` must be validated (`nm` + digits).
 */
export const buildPersonQuery = (imdbId: string) => `
SELECT ?kind ?item ?itemLabel ?start ?end ?sex ?tmdb ?year ?workLabel WHERE {
  ?person wdt:P345 "${imdbId}".
  {
    ?person p:P26 ?st. ?st ps:P26 ?item.
    OPTIONAL { ?st pq:P580 ?start. }
    OPTIONAL { ?st pq:P582 ?end. }
    OPTIONAL { ?item wdt:P4985 ?tmdb. }
    BIND("spouse" AS ?kind)
  } UNION {
    ?person wdt:P40 ?item.
    OPTIONAL { ?item wdt:P21 ?sex. }
    OPTIONAL { ?item wdt:P4985 ?tmdb. }
    BIND("child" AS ?kind)
  } UNION {
    ?person p:P166 ?st. ?st ps:P166 ?item.
    OPTIONAL { ?st pq:P585 ?year. }
    OPTIONAL { ?st pq:P1686 ?work. }
    BIND("won" AS ?kind)
  } UNION {
    ?person p:P1411 ?st. ?st ps:P1411 ?item.
    OPTIONAL { ?st pq:P585 ?year. }
    OPTIONAL { ?st pq:P2453 ?work. }
    BIND("nominated" AS ?kind)
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 2000`;

const FAMILIES: ReadonlyArray<readonly [RegExp, string]> = [
  [/Emmy/i, 'Emmy'],
  [/\bTony\b/i, 'Tony'],
  [/Golden Globe/i, 'Golden Globe'],
  [/Academy Award|Oscar/i, 'Oscar'],
  [/BAFTA/i, 'BAFTA'],
  [/Screen Actors Guild|\bSAG\b/i, 'SAG'],
  [/Critics.? Choice/i, "Critics' Choice"],
  [/Grammy/i, 'Grammy'],
  [/Saturn/i, 'Saturn'],
  [/Peabody/i, 'Peabody'],
];

/** "Primetime Emmy Award for Outstanding Guest Actor" counts as "Emmy" */
const awardGroup = (label: string) => {
  const known = FAMILIES.find(([pattern]) => pattern.test(label));
  if (known) {
    return known[1];
  }
  const base = label.split(/ for | in /)[0] ?? label;
  return base.replace(/\s+Awards?$/i, '').trim() || label;
};

const year = (value?: string) => {
  const parsed = Number(value?.slice(0, 4));
  return parsed > 0 ? parsed : undefined;
};

const qid = (uri?: string) => uri?.split('/').pop() ?? '';

const numericId = (value?: string) =>
  value && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : undefined;

// No English label: the service falls back to the Q-id; never show that
const isLabelled = (label?: string) => !!label && !/^Q\d+$/.test(label);

/**
 * Several P4985 values give several rows per person: keep the first numeric
 * one. The route swaps the slug for TMDB's own.
 */
const tmdbLink = (name: string, known: number | undefined, row: Binding) => {
  const tmdbId = known ?? numericId(row.tmdb?.value);
  return tmdbId ? { slug: toSlug(name), tmdbId } : undefined;
};

const toFamily = (rows: ReadonlyArray<Binding>) => {
  const spouses = new Map<string, PersonSpouse>();
  const children = new Map<string, PersonChild>();

  for (const row of rows) {
    const id = qid(row.item?.value);
    const name = row.itemLabel?.value;
    if (!id || !isLabelled(name)) continue;

    if (row.kind?.value === 'spouse') {
      const startYear = year(row.start?.value);
      const endYear = year(row.end?.value);
      spouses.set(id, {
        id,
        name: name as string,
        ...(startYear && { startYear }),
        ...(endYear && { endYear }),
        ...tmdbLink(name as string, spouses.get(id)?.tmdbId, row),
      });
    } else if (row.kind?.value === 'child') {
      const sex = qid(row.sex?.value);
      children.set(id, {
        id,
        name: name as string,
        relation: sex === FEMALE ? 'daughter' : sex === MALE ? 'son' : 'child',
        ...tmdbLink(name as string, children.get(id)?.tmdbId, row),
      });
    }
  }

  if (spouses.size === 0 && children.size === 0) {
    return null;
  }

  return {
    children: [...children.values()],
    spouses: [...spouses.values()].sort(
      (a, b) => (a.startYear ?? 9999) - (b.startYear ?? 9999),
    ),
  };
};

const toAwards = (rows: ReadonlyArray<Binding>): PersonAwards | null => {
  const items = new Map<string, PersonAward>();
  const add = (won: boolean) => {
    for (const row of rows) {
      if (row.kind?.value !== (won ? 'won' : 'nominated')) continue;
      const award = row.itemLabel?.value;
      if (!isLabelled(award)) continue;
      const awardYear = year(row.year?.value);
      const work = isLabelled(row.workLabel?.value)
        ? row.workLabel?.value
        : undefined;
      const key = `${qid(row.item?.value)}|${awardYear ?? ''}|${work ?? ''}`;
      // A nomination that became a win is one win, not two entries
      if (!won && items.has(key)) continue;
      items.set(key, {
        award: award as string,
        group: awardGroup(award as string),
        won,
        ...(awardYear && { year: awardYear }),
        ...(work && { work }),
      });
    }
  };
  add(true);
  add(false);

  if (items.size === 0) {
    return null;
  }

  const all = [...items.values()].sort(
    (a, b) =>
      Number(b.won) - Number(a.won) ||
      (b.year ?? 0) - (a.year ?? 0) ||
      a.award.localeCompare(b.award),
  );
  const groups = new Map<string, { wins: number; nominations: number }>();
  for (const item of all) {
    const group = groups.get(item.group) ?? { nominations: 0, wins: 0 };
    group[item.won ? 'wins' : 'nominations']++;
    groups.set(item.group, group);
  }
  const wins = all.filter((item) => item.won).length;

  return {
    groups: [...groups]
      .map(([name, counts]): PersonAwardGroup => ({ name, ...counts }))
      .sort(
        (a, b) =>
          b.wins - a.wins ||
          b.nominations - a.nominations ||
          a.name.localeCompare(b.name),
      ),
    items: all,
    nominations: all.length - wins,
    total: all.length,
    wins,
  };
};

/**
 * `null` when Wikidata knows nothing worth showing (no item, or no family and
 * no awards). Each half is `null` on its own when empty.
 */
export const toPersonFamilyAndAwards = (
  results: WikidataResults,
): PersonFamilyAndAwards | null => {
  const rows = results.results?.bindings ?? [];
  const family = toFamily(rows);
  const awards = toAwards(rows);

  return family || awards ? { awards, family } : null;
};
