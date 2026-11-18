import type {
  PersonAward,
  PersonAwardGroup,
  PersonAwards,
} from '@tvseri.es/schemas';

/**
 * Awards copy from the API's groups
 * (`Emmy`, `Tony`, `Golden Globe`, `SAG`...). The sidebar says "7 Emmys,
 * 2 Tonys, 1 Golden Globe"; the Awards block draws one card per group.
 */

/** The short form for the sidebar line, singular */
const SHORT: Readonly<Record<string, string>> = {
  BAFTA: 'BAFTA',
  "Critics' Choice": "Critics' Choice Award",
  Emmy: 'Emmy',
  'Golden Globe': 'Golden Globe',
  Grammy: 'Grammy',
  Oscar: 'Oscar',
  Peabody: 'Peabody Award',
  SAG: 'Actor Award',
  Saturn: 'Saturn Award',
  Tony: 'Tony',
};

/** The card's name, singular, where it differs from the short form */
const LONG: Readonly<Record<string, string>> = {
  'Laurence Olivier': 'Olivier Award',
  Olivier: 'Olivier Award',
  Tony: 'Tony Award',
};

/**
 * Which families are named. The sidebar line names the headline
 * awards ("7 Emmys, 2 Tonys, 1 Golden Globe", passing over 5
 * Actor Awards); the lane adds the guild and national ones (Actor Award,
 * BAFTA, Olivier) and leaves the rest (Critics' Choice, Gold Derby…) to the
 * full list. Within a tier: most wins, then most nominations.
 */
const HEADLINE = new Set(['Emmy', 'Golden Globe', 'Grammy', 'Oscar', 'Tony']);
const LANE = new Set([
  ...HEADLINE,
  'BAFTA',
  'Laurence Olivier',
  'Olivier',
  'SAG',
]);

const byRecord = (a: PersonAwardGroup, b: PersonAwardGroup) =>
  b.wins - a.wins || b.nominations - a.nominations;

const ranked = (
  groups: ReadonlyArray<PersonAwardGroup>,
  first: ReadonlySet<string>,
) => [
  ...groups.filter((group) => first.has(group.name)).sort(byRecord),
  ...groups.filter((group) => !first.has(group.name)).sort(byRecord),
];

const shortName = (group: string) => SHORT[group] ?? `${group} Award`;

const pluralise = (name: string, count: number) =>
  count === 1 ? name : `${name}s`;

/** "Primetime Emmy Award for Outstanding Lead Actor" → "Primetime Emmy" */
const awardBase = (award: string) =>
  award
    .split(/ for | in /)[0]
    ?.replace(/\s+Awards?$/i, '')
    .trim() ?? award;

/** The category of one award: "Outstanding Supporting Performer" */
const awardCategory = (award: string) => {
  const index = award.indexOf(' for ');
  return index === -1 ? '' : award.slice(index + 5).trim();
};

/**
 * One family's card name: the full name its awards share ("Primetime
 * Emmy", "Children's and Family Emmy"), else the long form.
 */
function cardName(group: string, items: ReadonlyArray<PersonAward>): string {
  const bases = new Set(items.map((item) => awardBase(item.award)));
  const [only] = bases;
  if (group === 'Emmy' && bases.size === 1 && only) {
    return only.replace(' and ', ' & ');
  }
  return LONG[group] ?? shortName(group);
}

/** "7 Emmys, 2 Tonys, 1 Golden Globe", or "1 Emmy nomination" without wins */
export function awardsLine(awards: PersonAwards | null): string | undefined {
  if (!awards || awards.groups.length === 0) {
    return undefined;
  }
  const winners = ranked(
    awards.groups.filter((group) => group.wins > 0),
    HEADLINE,
  );
  if (winners.length > 0) {
    return winners
      .slice(0, 3)
      .map(
        (group) =>
          `${group.wins} ${pluralise(shortName(group.name), group.wins)}`,
      )
      .join(', ');
  }
  const [top] = ranked(awards.groups, LANE);
  if (!top) {
    return undefined;
  }
  const count = top.nominations;
  return `${count} ${shortName(top.name)} ${pluralise('nomination', count)}`;
}

export type AwardCard = Readonly<{
  /** The big number: wins, else nominations */
  count: number;
  /** "Primetime Emmys", "Children's and Family Emmy nomination" */
  label: string;
  /** What it was for: the works, or category and work for a lone award */
  detail: string;
}>;

/** One card per family, most wins first, four at most. */
export function awardCards(
  awards: PersonAwards | null,
  limit = 4,
): ReadonlyArray<AwardCard> {
  if (!awards) {
    return [];
  }
  const cards = ranked(awards.groups, LANE).slice(0, limit);
  const single = cards.length === 1;
  return cards.map((group) => {
    const won = group.wins > 0;
    const counted = awards.items.filter(
      (item) => item.group === group.name && item.won === won,
    );
    const count = won ? group.wins : group.nominations;
    const name = pluralise(cardName(group.name, counted), won ? count : 1);
    const label = won ? name : `${name} ${pluralise('nomination', count)}`;
    const works = [
      ...new Set(counted.map((item) => item.work).filter(Boolean)),
    ] as string[];
    const [lone] = counted;
    // A lone award in a lane of its own says what for; in
    // a full lane every card names its works
    const detail =
      single && counted.length === 1 && lone
        ? [awardCategory(lone.award), lone.work].filter(Boolean).join(', ')
        : works.join(', ');
    return { count, detail, label };
  });
}
