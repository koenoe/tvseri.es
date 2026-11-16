const DAY_MS = 86_400_000;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// FNV-1a: a small, stable string hash (the same everywhere, unlike Math.random)
const hash = (value: string) => {
  let result = 0x81_1c_9d_c5;
  for (const char of value) {
    result ^= char.codePointAt(0) ?? 0;
    result = Math.imul(result, 0x01_00_01_93) >>> 0;
  }
  return result;
};

/**
 * A date-pure rotation: the same day, count and salt always give the same
 * index, with no clock or randomness involved. Consecutive days never give
 * the same index (when count > 1) and every index comes up once per cycle.
 * The salt decides the step and the start, so two rotations (home's moments,
 * Discover's Essentials...) with different salts don't move in lockstep.
 *
 * @param date `YYYY-MM-DD`
 */
export const rotationIndex = (
  date: string,
  count: number,
  salt: string,
): number => {
  if (count <= 1) {
    return 0;
  }
  const day = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / DAY_MS);
  const seed = hash(salt);
  // A step coprime with count, so the walk visits every index
  let step = 1 + (seed % (count - 1));
  while (gcd(step, count) !== 1) {
    step += 1;
  }
  return (((day * step + (seed >>> 8)) % count) + count) % count;
};

// Home's moments rotate by day too. They live here, with no imports, so the e2e stub API (plain Node) can run the very same pick as the API.

/** The moments Home draws after Hidden gems, in the rotation's order (the API builds them, the web's placeholders follow them) */
export const FEATURE_KINDS = [
  'binge',
  'stills',
  'archive',
  'did-you-know',
] as const;
export type FeatureKind = (typeof FEATURE_KINDS)[number];

/** The toys after Premieres, in the rotation's order */
export const TOY_KINDS = [
  'whats-on',
  'where-set',
  'connected-by',
  'versus',
] as const;
export type ToyKind = (typeof TOY_KINDS)[number];

/**
 * Home's moment rotation: each slot walks its list in order, one step a
 * day, and signed in "If you liked X" takes the toy's slot every other day.
 * Day 0 is the board's first demo day, Mon 9 Nov 2026 (Binge calculator +
 * What's on; Tue 10 = Season in stills + Where are they set? and If you
 * liked X; Wed 11 = From the archive + Connected by). A running day count,
 * not the day of the year, so no kind repeats across New Year.
 */
const MOMENTS_DAY_ZERO = Date.UTC(2026, 10, 9);

/** Days since day 0 (negative before it) */
const momentDay = (date: string) =>
  Math.round(
    (new Date(`${date}T00:00:00Z`).getTime() - MOMENTS_DAY_ZERO) / DAY_MS,
  );

const momentStep = (date: string, count: number) => {
  const day = momentDay(date);
  return ((day % count) + count) % count;
};

/**
 * The day's first pick of each rotation (`YYYY-MM-DD`). Date-pure, so Home
 * knows the size of a moment before its data arrives. The API falls through
 * to the next kind when the pick has nothing to show.
 */
export const featureKindOfDay = (date: string): FeatureKind =>
  FEATURE_KINDS[momentStep(date, FEATURE_KINDS.length)] ?? FEATURE_KINDS[0];

/**
 * The toys walk four days at a time and start each block one kind further
 * on (W S C V, S C V W, C V W S...). A plain 4-day walk would put the same
 * two toys on every odd day, which signed in are If you liked X days: a
 * signed-in viewer would never see them. The shifted walk still shows each
 * toy once in every four days, never one two days running, and keeps the
 * board's demo days (Mon 9, Tue 10, Wed 11, Sat 14).
 */
export const toyKindOfDay = (date: string): ToyKind => {
  const count = TOY_KINDS.length;
  const day = momentDay(date);
  const block = Math.floor(day / count);
  return TOY_KINDS[(((day + block) % count) + count) % count] ?? TOY_KINDS[0];
};

/**
 * The order the API tries a slot's kinds in when the day's pick has nothing
 * (a fall-through): the pick, then the next ones in the walk, and the
 * previous day's kind last, so Home never repeats yesterday's block while
 * another kind can be built. `previous` names yesterday's kind (the toys'
 * walk shifts every four days, so it isn't always the one before the pick);
 * without it, the one before the pick is last.
 */
export const fallThroughOrder = <K extends string>(
  kinds: ReadonlyArray<K>,
  planned: K,
  previous?: K,
): ReadonlyArray<K> => {
  const start = Math.max(0, kinds.indexOf(planned));
  const order = kinds.map((_, i) => kinds[(start + i) % kinds.length]!);
  return previous && previous !== planned && order.includes(previous)
    ? [...order.filter((kind) => kind !== previous), previous]
    : order;
};

/** Signed in, "If you liked X" takes the toy's slot on alternate days */
export const isIfYouLikedDay = (date: string) => momentStep(date, 2) === 1;
