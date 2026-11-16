import type { VersusPair, VersusSide } from '@tvseri.es/schemas';
import { formatScore } from '@/lib/format/rating';
import { formatGrouped } from '@/lib/formatCount';

export type Side = 'left' | 'right';

export type CompareRow = Readonly<{
  label: string;
  left: string;
  right: string;
  /** the side drawn emphasised (white, bold); null: neither */
  winner: Side | null;
}>;

/** The rows' labels in order: the placeholder draws them too */
export const ROW_LABELS: ReadonlyArray<string> = [
  'Score',
  'Seasons',
  'Episodes',
  'On air',
];

/** A missing score */
const NO_SCORE = '—';

/** The higher number wins; equal numbers, neither */
const higher = (left: number, right: number): Side | null =>
  left > right ? 'left' : right > left ? 'right' : null;

const score = (side: VersusSide) => formatScore(side.voteAverage) || NO_SCORE;

/**
 * The comparison rows between the posters (HMFinal `e2-vr`): Score (out of
 * ten, `lib/format/rating`), Seasons, Episodes and On air, each side's value
 * with the higher one emphasised. A missing score has no winner, nor does
 * On air: neither run is better.
 */
export function compareRows({ left, right }: VersusPair): CompareRow[] {
  const rated = left.voteAverage > 0 && right.voteAverage > 0;
  return [
    {
      label: 'Score',
      left: score(left),
      right: score(right),
      winner: rated ? higher(left.voteAverage, right.voteAverage) : null,
    },
    {
      label: 'Seasons',
      left: formatGrouped(left.seasons),
      right: formatGrouped(right.seasons),
      winner: higher(left.seasons, right.seasons),
    },
    {
      label: 'Episodes',
      left: formatGrouped(left.episodes),
      right: formatGrouped(right.episodes),
      winner: higher(left.episodes, right.episodes),
    },
    {
      label: 'On air',
      left: left.years,
      right: right.years,
      winner: null,
    },
  ];
}
