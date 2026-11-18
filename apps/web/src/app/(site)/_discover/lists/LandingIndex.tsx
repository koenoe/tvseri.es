import Link from 'next/link';
import type { ReactNode } from 'react';

import { chipStyles } from '@/components/ui/button/buttonStyles';
import ChipLink from '@/components/ui/button/ChipLink';
import type { Glyph } from '@/components/ui/icon/types';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { RowErrorCard } from '@/components/ui/row/RowError';
import { GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import {
  type LandingChip,
  LandingEndCard,
  LandingHero,
  LandingPage,
  LandingSections,
  LandingTitle,
  type PlaceholderLook,
} from '../landing';

/** The landings' ground */
const GROUND = '#121718';

type Props = Readonly<{
  /** the list, or its place while it loads (`LandingIndexChips` in a Suspense) */
  children: ReactNode;
  end: Readonly<{ title: string; line: string }>;
  /** the meta line's item: "60 countries" */
  meta: ReactNode;
  metaGlyph: Glyph;
  title: string;
}>;

const TITLE_ID = 'landing-index-title';

/**
 * `/country`, `/language`, `/network` (the hub's calm tiles link here): the landing template's look, minimal. The crumb back to
 * Discover, the title, one meta line with the count, a chip per landing,
 * the end card.
 */
export default function LandingIndex({
  children,
  end,
  meta,
  metaGlyph,
  title,
}: Props) {
  return (
    <LandingPage ground={GROUND}>
      <LandingHero labelledBy={TITLE_ID}>
        <nav
          aria-label="Breadcrumb"
          className="text-meta text-white/60"
          data-testid="landing-crumb"
        >
          <Link className="transition-colors hover:text-white" href="/discover">
            Discover
          </Link>
        </nav>
        <LandingTitle id={TITLE_ID} name={title}>
          {title}
        </LandingTitle>
        <MetaRow className="mt-2">
          <MetaItem icon={metaGlyph}>{meta}</MetaItem>
        </MetaRow>
        {children}
      </LandingHero>
      <LandingSections>
        <LandingEndCard line={end.line} title={end.title} />
      </LandingSections>
    </LandingPage>
  );
}

/** Every landing as a chip, wrapping (an index is read, not swiped) */
export function LandingIndexChips({
  chips,
}: Readonly<{ chips: ReadonlyArray<LandingChip> }>) {
  return (
    <ul
      className="mt-6 flex flex-wrap gap-2"
      data-slot="landing-index"
      data-testid="landing-index"
    >
      {chips.map((chip) => (
        <li key={chip.href}>
          <ChipLink href={chip.href}>{chip.label}</ChipLink>
        </li>
      ))}
    </ul>
  );
}

/**
 * The chips' place while they load; `failed` when the list is
 * `Unavailable`: dashed chips under the error card (`title`: the page's).
 * One ghost per landing of the kind, in the chips' order and with their
 * label's width (the label is in the chip, invisible), so the list wraps
 * as the loaded one does.
 */
export function LandingIndexSkeleton({
  look = 'loading',
  labels,
  title,
}: Readonly<{
  look?: PlaceholderLook;
  /** the landings' names, in the chips' order */
  labels: ReadonlyArray<string>;
  title: string;
}>) {
  const chip = cn('text-transparent', GHOST_LOOK[look]);
  const chipClass = chipStyles({ className: chip });
  const chips = (
    <span
      aria-hidden
      className="mt-6 flex flex-wrap gap-2"
      data-placeholder="landing-index"
    >
      {labels.map((label) => (
        <span className={chipClass} key={label}>
          {label}
        </span>
      ))}
    </span>
  );
  return look === 'loading' ? (
    chips
  ) : (
    <div className="relative [--row-end:0px] [--row-start:0px]">
      {chips}
      <RowErrorCard state="unavailable" title={title} />
    </div>
  );
}
