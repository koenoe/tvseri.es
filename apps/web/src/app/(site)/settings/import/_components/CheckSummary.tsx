import { formatGrouped, plural } from '@tvseri.es/utils';
import { AnimatePresence } from 'motion/react';

import FoldPresence from '@/components/motion/FoldPresence';
import { helpGlyph, seasonGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import type { UnmatchedLine } from '../../_components/problems/problems';
import { LINK } from '../../_components/problems/styles';
import { META_ITEM, META_ROW, STEP_FOLD, STEP_FOLD_GAP } from './styles';

const COUNTS_ROW = `${META_ROW} text-white/80 max-md:flex-col max-md:items-start`;

type Props = Readonly<{
  rows: number;
  episodes: number;
  unmatched: number;
  /** The dry run is still answering: the numbers fill in */
  checking: Readonly<{ done: number; of: number }> | null;
  failed: boolean;
  lines: ReadonlyArray<UnmatchedLine>;
  notCounted: string;
  open: boolean;
  onToggle: () => void;
}>;

const matchLine = ({ checking, failed, unmatched }: Props): string => {
  if (failed) {
    return 'Couldn’t check the matches: they’re checked as it imports';
  }
  if (checking) {
    return `Matching ${formatGrouped(checking.done)} of ${formatGrouped(checking.of)}…`;
  }
  return unmatched > 0
    ? `${formatGrouped(unmatched)} couldn’t be matched (we’ll skip these)`
    : 'all matched';
};

/**
 * "2,554 rows · 1,834 episodes · 43 couldn’t be matched (we’ll skip these)",
 * filling in while the dry run answers; "Show" lists the unmatched groups
 * and what isn't counted. Nothing to resolve here.
 */
export default function CheckSummary(props: Props) {
  const { episodes, lines, notCounted, onToggle, open, rows } = props;
  const hasList = lines.length > 0 || notCounted !== '';
  const listId = 'import-unmatched';
  return (
    <>
      <div className="flex flex-wrap items-center gap-4 max-md:flex-col max-md:items-start max-md:gap-3">
        <span className={COUNTS_ROW}>
          <span className={META_ITEM}>
            <Icon glyph={seasonGlyph} size={13} />
            {`${plural(rows, 'row')} · ${plural(episodes, 'episode')}`}
          </span>
          <span aria-live="polite" className={META_ITEM}>
            <Icon glyph={helpGlyph} size={13} />
            {matchLine(props)}
          </span>
        </span>
        {hasList ? (
          <button
            aria-controls={open ? listId : undefined}
            aria-expanded={open}
            className={LINK}
            onClick={onToggle}
            type="button"
          >
            {open ? 'Hide' : 'Show'}
          </button>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {open && hasList ? (
          <FoldPresence className={STEP_FOLD} key="unmatched">
            <div className={STEP_FOLD_GAP}>
              <UnmatchedList
                id={listId}
                lines={lines}
                notCounted={notCounted}
              />
            </div>
          </FoldPresence>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** The unmatched groups, then what isn't counted */
function UnmatchedList({
  id,
  lines,
  notCounted,
}: Readonly<{
  id: string;
  lines: ReadonlyArray<UnmatchedLine>;
  notCounted: string;
}>) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-14 bg-white/3 px-6 pt-2 pb-4"
      id={id}
    >
      {lines.map((line) => (
        <div
          className="grid grid-cols-[minmax(0,1.4fr)_70px_minmax(0,1.2fr)] gap-4 border-white/6 border-b py-3 text-body-sm max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-2.5 max-md:gap-y-0.5"
          key={line.key}
        >
          <b className="font-medium">{line.title}</b>
          <span className="text-white/60">{line.count}</span>
          <span className="text-white/60 max-md:col-span-full max-md:text-caption">
            {line.why}
          </span>
        </div>
      ))}
      {notCounted ? (
        <p className="pt-2.5 text-meta leading-5 text-white/60">{notCounted}</p>
      ) : null}
    </div>
  );
}
