import type { GetStartedStatus } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';
import Badge from '@/components/ui/button/Badge';
import Dot from '@/components/ui/lane/Dot';
import SectionHead, {
  type SectionHeadLayout,
} from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';
import profilePath from '@/lib/routing/profilePath';

import { PAGE_COLUMN } from '../frame';
import GetStartedStep, { type Step } from './GetStartedStep';

type Props = Readonly<{
  status: GetStartedStatus;
  /** the viewer's profile, where "Shows you've seen" is marked */
  username?: string;
}>;

/** The three steps' copy: static, so the placeholder draws it too */
export const STEP_COPY = {
  alreadySeen: {
    body: 'Mark a few; they get the Watched label and shape the rows below.',
    number: 2,
    title: 'Series you’ve seen',
  },
  history: {
    body: 'Import a CSV, or connect Plex to track by itself.',
    number: 3,
    title: 'Your history',
  },
  services: {
    body: 'Netflix, Prime Video, Apple TV… so home shows what you can actually watch.',
    number: 1,
    title: 'Your services',
  },
} as const;

export const STEP_ORDER = ['services', 'alreadySeen', 'history'] as const;

const steps = (
  status: GetStartedStatus,
  username: string | undefined,
): ReadonlyArray<Step> => [
  {
    ...STEP_COPY.services,
    done: status.steps.services,
    href: '/settings/streaming-services',
  },
  {
    ...STEP_COPY.alreadySeen,
    done: status.steps.alreadySeen,
    href: username ? `${profilePath(username)}#get-started` : '/discover',
  },
  {
    ...STEP_COPY.history,
    done: status.steps.history,
    href: '/settings/import',
  },
];

/** The section and its steps' grid, shared with the placeholder */
export const GET_STARTED_SECTION = cn(PAGE_COLUMN, 'flex flex-col gap-5');
export const GET_STARTED_GRID = 'grid gap-4 md:grid-cols-3';

/** Each place keeps its own look on purpose; don't unify them. */
const HEAD: SectionHeadLayout = {
  row: 'flex items-center gap-3',
  rule: 'h-0.5 flex-1 rounded-2 bg-white/8',
  title: 'text-title-2 whitespace-nowrap text-white',
};

const DOT = <Dot />;

/** The heading line: a dot, the title, the count and a hairline (the placeholder's count is a bar) */
export function GetStartedHead({ count }: Readonly<{ count: ReactNode }>) {
  const shown =
    typeof count === 'string' ? <Badge variant="count">{count}</Badge> : count;
  return (
    <SectionHead
      count={shown}
      id="get-started-title"
      layout={HEAD}
      leading={DOT}
      title="Get started"
    />
  );
}

/**
 * Get started (new users): a dotted heading with "0 of
 * 3" and a hairline, then three step cards. With all three done it is not
 * drawn: the slot is Continue watching's again (`getGetStarted`).
 */
export default function GetStarted({ status, username }: Props) {
  const count = `${status.doneCount} of 3`;
  const items = steps(status, username);
  return (
    <section
      aria-labelledby="get-started-title"
      className={GET_STARTED_SECTION}
      data-slot="get-started"
    >
      <GetStartedHead count={count} />
      <div className={GET_STARTED_GRID}>
        {items.map((step) => (
          <GetStartedStep key={step.number} step={step} />
        ))}
      </div>
    </section>
  );
}
