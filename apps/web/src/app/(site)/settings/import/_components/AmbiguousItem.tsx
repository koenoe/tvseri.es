import Button from '@/components/ui/button/Button';

import type { SeriesCandidate } from '@/lib/import/contract';
import type { Fix } from '../_lib/importState';
import { type ProblemItem, rowCount } from '../_lib/problems';
import FixDone from './FixDone';
import { ProblemItemFrame } from './ProblemGroup';
import { CHIP, SMALL_BUTTON } from './styles';

const candidateLabel = (candidate: SeriesCandidate) =>
  [candidate.year, candidate.network].filter(Boolean).join(' · ') ||
  candidate.title;

/**
 * A show with several series of its name ("Two shows with this
 * name"): "Which one?" and a chip per series. Picking one sends its rows
 * again with that series; nothing doubtful is ever written by itself.
 */
export default function AmbiguousItem({
  fix,
  item,
  onPick,
  onSkip,
  onUndo,
}: Readonly<{
  fix: Fix | undefined;
  item: ProblemItem;
  onPick: (item: ProblemItem, candidate: SeriesCandidate) => void;
  onSkip: (item: ProblemItem) => void;
  onUndo: (key: string) => void;
}>) {
  const undo = () => onUndo(item.key);
  const skip = () => onSkip(item);
  const count = rowCount(item.indexes.length);
  return (
    <ProblemItemFrame count={count} title={item.title} why={item.why}>
      {fix ? (
        <FixDone fix={fix} onUndo={undo} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-caption text-white/60 max-md:basis-full">
            Which one?
          </span>
          {item.candidates.map((candidate) => {
            const pick = () => onPick(item, candidate);
            return (
              <button
                aria-pressed={false}
                className={CHIP}
                key={candidate.id}
                onClick={pick}
                type="button"
              >
                {candidateLabel(candidate)}
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
