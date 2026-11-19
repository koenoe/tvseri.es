import Button from '@/components/ui/button/Button';

import type { SeriesCandidate } from '@/lib/import/contract';
import FixDone from './FixDone';
import type { Fix } from './fix';
import { ProblemItemFrame } from './ProblemGroup';
import { hasName, type ProblemItem } from './problems';
import { CHIP, SMALL_BUTTON } from './styles';

/**
 * "2019 · Netflix" for a series with the show's name; one with another name
 * (TMDB's closest) leads with its own: "WWII in Colour · 2009 · History".
 * A series with nothing else known is its name alone.
 */
const candidateLabel = (candidate: SeriesCandidate, name: string) =>
  [
    hasName(candidate, name) ? null : candidate.title,
    candidate.year,
    candidate.network,
  ]
    .filter(Boolean)
    .join(' · ') || candidate.title;

/**
 * A show with several series of its name, or TMDB's closest ones ("Which
 * series?"): "Which one?" and a chip per series. Picking one sends its rows
 * again with that series; nothing doubtful is ever written by itself.
 */
export default function AmbiguousItem({
  count,
  fix,
  item,
  onPick,
  onSkip,
  onUndo,
}: Readonly<{
  /** "18 rows", "3 entries" */
  count: string;
  /** What became of it, in a list that keeps settled items (the import) */
  fix?: Fix;
  item: ProblemItem;
  onPick: (item: ProblemItem, candidate: SeriesCandidate) => void;
  onSkip: (item: ProblemItem) => void;
  /** Takes a kept fix back (the import) */
  onUndo?: (key: string) => void;
}>) {
  const undo = () => onUndo?.(item.key);
  const skip = () => onSkip(item);
  return (
    <ProblemItemFrame
      count={count}
      itemKey={item.key}
      title={item.title}
      why={item.why}
    >
      {fix ? (
        <FixDone fix={fix} onUndo={undo} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-caption text-white/60 max-md:basis-full">
            Which one?
          </span>
          {item.candidates.map((candidate) => {
            const pick = () => onPick(item, candidate);
            const label = candidateLabel(candidate, item.query);
            return (
              <button
                aria-pressed={false}
                className={CHIP}
                key={candidate.id}
                onClick={pick}
                type="button"
              >
                {label}
              </button>
            );
          })}
          <Button
            className={SMALL_BUTTON}
            onClick={skip}
            size="xs"
            variant="quiet"
          >
            <span className="text-body-sm">Skip</span>
          </Button>
        </div>
      )}
    </ProblemItemFrame>
  );
}
