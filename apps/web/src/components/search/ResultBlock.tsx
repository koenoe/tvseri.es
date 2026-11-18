import type { MouseEvent } from 'react';

import cn from '@/lib/cn';
import type { SearchCell, SearchSection } from '@/lib/search/sections';

import PersonOption from './PersonOption';
import RecentOption from './RecentOption';
import { GRID, overlineClasses } from './resultLayout';
import ShowOption from './ShowOption';

/** A block of results, or the recents an empty field shows */
type BlockKind = SearchSection['kind'] | 'recent';

const LABEL: Readonly<Record<BlockKind, string>> = {
  members: 'Members',
  people: 'People',
  recent: 'Recent',
  shows: 'Series',
};

/** A member draws as a recent chip */
const OPTION = {
  members: RecentOption,
  people: PersonOption,
  recent: RecentOption,
  shows: ShowOption,
} as const;

/** The recents wrap as chips, as members do */
const BLOCK_GRID: Readonly<Record<BlockKind, string>> = {
  ...GRID,
  recent: GRID.members,
};

type Props = Readonly<{
  first: boolean;
  markedKey: string | undefined;
  onChoose: (cell: SearchCell, event: MouseEvent<HTMLAnchorElement>) => void;
  section: Readonly<{
    cells: SearchSection['cells'];
    kind: BlockKind;
  }>;
}>;

/**
 * One block of results under its overline (“Series”, “People”, “Members”),
 * or the last four things opened from search (“Recent”).
 */
export default function ResultBlock({
  first,
  markedKey,
  onChoose,
  section,
}: Props) {
  const labelId = `search-label-${section.kind}`;
  const labelClasses = cn(overlineClasses(first), 'text-rk-w64 uppercase');
  const Option = OPTION[section.kind];

  return (
    <div aria-labelledby={labelId} role="group">
      <div className={labelClasses} id={labelId}>
        {LABEL[section.kind]}
      </div>
      <div className={BLOCK_GRID[section.kind]}>
        {section.cells.map((cell) => {
          const marked = cell.key === markedKey;
          return (
            <Option
              cell={cell}
              key={cell.key}
              marked={marked}
              onChoose={onChoose}
            />
          );
        })}
      </div>
    </div>
  );
}
