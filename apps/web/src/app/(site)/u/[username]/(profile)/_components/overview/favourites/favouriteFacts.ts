import type { ListItemFacts } from '@tvseri.es/schemas';
import type { Fact } from '@/components/ui/accordion/slice';
import { formatRuntime } from '@/lib/format/duration';
import { finishedLabel } from '@/lib/format/finished';
import { statusFact as statusOf } from '@/lib/format/status';
import { plural } from '@/lib/format/text';
import { seasonCode } from '@/lib/marking/copy';

/** "Miniseries", else "2 seasons" */
function sizeFact(facts: ListItemFacts): Fact | null {
  if (facts.type === 'Miniseries') {
    return { kind: 'seasons', text: 'Miniseries' };
  }
  return facts.seasonCount > 0
    ? { kind: 'seasons', text: plural(facts.seasonCount, 'season') }
    : null;
}

function statusFact(facts: ListItemFacts): Fact | null {
  return statusOf(facts.status, facts.seasonCount);
}

function runtimeFact(facts: ListItemFacts): Fact | null {
  const text = formatRuntime(facts.totalRuntime);
  return text ? { kind: 'runtime', text } : null;
}

/** The list owner's own state of the show: "Finished Nov 3", "Watching S02", "Up to date" */
function progressFact(facts: ListItemFacts, now: number): Fact | null {
  const { progress } = facts;
  switch (progress.state) {
    case 'finished':
      return {
        kind: 'finished',
        text: finishedLabel(progress.finishedAt, now),
      };
    case 'watching':
      return {
        kind: 'watching',
        text: `Watching ${seasonCode(progress.season)}`,
      };
    case 'up-to-date':
      return { kind: 'up-to-date', text: 'Up to date' };
    default:
      return null;
  }
}

const present = (list: ReadonlyArray<Fact | null>): ReadonlyArray<Fact> =>
  list.filter((fact): fact is Fact => fact !== null);

/**
 * The open tile's line: size, status, hours, and the owner's
 * history ("Miniseries · Ended · 4h · Finished Nov 3"). A visitor gets the
 * three facts about the show and no history ("your history" is
 * owner-only).
 */
export function favouriteFacts(
  facts: ListItemFacts,
  { history, now }: Readonly<{ history: boolean; now: number }>,
): ReadonlyArray<Fact> {
  return present([
    sizeFact(facts),
    statusFact(facts),
    runtimeFact(facts),
    history ? progressFact(facts, now) : null,
  ]);
}

/** A suggestion from the finished list: "Finished Feb 2022 · 4 seasons · 44h" */
export function suggestionFacts(
  facts: ListItemFacts,
  now: number,
): ReadonlyArray<Fact> {
  return present([
    progressFact(facts, now),
    sizeFact(facts),
    runtimeFact(facts),
  ]);
}

// The relation pill's rule lives with the Library's (`_lib/relation.ts`)
export {
  RELATION_LABEL,
  type Relation,
  relationOf,
} from '../../../_lib/relation';
