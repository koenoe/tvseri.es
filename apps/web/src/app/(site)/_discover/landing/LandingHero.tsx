import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import PageName from '@/components/header/PageName';
import ChipLink from '@/components/ui/button/ChipLink';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

type HeroProps = Readonly<{
  /**
   * Beside the title on wide screens, under it on phones: the hero's
   * recommendation tile (`Spotlight`). Without it the hero is title-led.
   */
  aside?: ReactNode;
  children: ReactNode;
  /**
   * A static background layer that fades into the page on every side (no
   * hard edges): a CSS `background` such as the genre glow. It
   * covers the hero from the very top of the page, under the header.
   * Desktop only: phones show the plain ground.
   */
  glow?: string;
  /** the h1's id */
  labelledBy: string;
  /** the hero's placeholder (`data-placeholder`, else this is the content's `data-slot="landing-hero"`) */
  placeholder?: boolean;
}>;

/**
 * The two hero patterns: title-led (Genre, Language, Decade,
 * Country) or title left with a recommendation tile right (Theme, Network).
 * The kind is always the biggest thing. Per-kind heroes compose it from
 * `LandingCrumb`, `LandingTitle`, a meta line, `LandingLine`,
 * `LandingFacts`, `LandingChips` and `Spotlight`.
 *
 * Top space after the header: 56 (title-led) or 72 (with a tile) on desktop,
 * 16 on phones. On a
 * phone the blocks under the title (the chips, the tile) are 40 apart:
 * `CHIPS_LINE` and the tile's margin.
 */
export function LandingHero({
  aside,
  children,
  glow,
  labelledBy,
  placeholder = false,
}: HeroProps) {
  const glowStyle: CSSProperties | undefined = glow
    ? { background: glow }
    : undefined;
  return (
    <section
      aria-labelledby={labelledBy}
      className="relative"
      data-placeholder={placeholder ? 'landing-hero' : undefined}
      data-slot={placeholder ? undefined : 'landing-hero'}
    >
      {glowStyle ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-20 bottom-0 max-md:hidden"
          style={glowStyle}
        />
      ) : null}
      <div
        className={cn(
          'relative mx-auto w-full max-w-page px-gutter pt-4',
          aside
            ? 'md:pt-13 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)] lg:items-end lg:gap-16'
            : 'md:pt-9',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 flex-col items-start',
            // 8 more under the crumb beside a tile
            aside && 'lg:[&>[data-testid=landing-crumb]]:mb-2',
          )}
        >
          {children}
        </div>
        {aside ? <div className="mt-10 md:mt-12 lg:mt-0">{aside}</div> : null}
      </div>
    </section>
  );
}

/**
 * The hero of a landing whose heading needs no `LandingHero` tile or glow
 * (language, decade): 72 under the header on
 * desktop, 16 on a phone, the static crumb, then the heading (`children`).
 */
export function PlainHeroFrame({
  children,
  crumb,
  labelledBy,
}: Readonly<{
  children: ReactNode;
  /** the kind's `LandingCrumb` */
  crumb: ReactNode;
  /** the h1's id */
  labelledBy: string;
}>) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="mx-auto w-full max-w-page px-gutter pt-4 md:pt-13"
    >
      {crumb}
      {children}
    </section>
  );
}

/**
 * "Discover › Genres": a static part of the
 * page, the same for every slug of a kind, so it is in the cached shell.
 */
export function LandingCrumb({
  href,
  label,
}: Readonly<{
  /** where the kind's list lives; plain text without one */
  href?: string;
  /** the kind, plural: "Genres", "Themes", "Networks" */
  label: string;
}>) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-meta text-white/60"
      data-testid="landing-crumb"
    >
      <Link className="transition-colors hover:text-white" href="/discover">
        Discover
      </Link>
      <Icon glyph={chevronRightGlyph} size={13} />
      {href ? (
        <Link className="transition-colors hover:text-white" href={href}>
          {label}
        </Link>
      ) : (
        <span>{label}</span>
      )}
    </nav>
  );
}

/**
 * The title's air on a phone: 8 under the crumb and 12 over the meta line
 * (the network logo's spacing); desktop has none of its own
 */
export const TITLE_SPACE = 'max-md:mt-2 max-md:mb-1';

/** The kind's name, the biggest thing on the page (display, Jakarta 800) */
export function LandingTitle({
  children,
  id,
  name,
}: Readonly<{
  children: ReactNode;
  id: string;
  /** The page's name in the phone header once the title has scrolled away */
  name: string;
}>) {
  return (
    <>
      <h1
        className={cn('font-display text-display text-white', TITLE_SPACE)}
        data-slot="landing-title"
        id={id}
      >
        {children}
      </h1>
      <PageName name={name} />
    </>
  );
}

/** The one plain line under the meta line: body on desktop, body-sm on a phone */
export function LandingLine({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="mt-3 max-w-[600px] text-body-sm text-white/80 md:text-body">
      {children}
    </p>
  );
}

export type LandingFact = Readonly<{ value: string; caption: string }>;

/**
 * The hero's big numbers: numeral over a caption, in a
 * row 48 apart on desktop, 2 × 2 on a phone.
 */
export function LandingFacts({
  facts,
}: Readonly<{ facts: ReadonlyArray<LandingFact> }>) {
  return (
    <dl className="mt-6 grid w-full grid-cols-2 gap-x-6 gap-y-4 md:mt-10 md:flex md:w-auto md:gap-12">
      {facts.map((fact) => (
        <div className="flex flex-col-reverse gap-1" key={fact.caption}>
          <dt className="text-caption text-white/60">{fact.caption}</dt>
          <dd className="text-numeral text-white tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export type LandingChip = Readonly<{ href: string; label: string }>;

/**
 * The chips' line, shared with its placeholder: one swipe line to the
 * screen's edges on a phone, wrapping in the column from md. On a phone 36
 * under the meta line or the facts, whose text sits about 4px inside its
 * line box, so it looks as far from them as the 40 under it.
 */
export const CHIPS_LINE =
  '-mx-gutter mt-9 flex w-[calc(100%+2*var(--page-gutter))] gap-3 px-gutter md:mx-0 md:w-auto md:max-w-full md:flex-wrap md:gap-2 md:px-0';

/**
 * Chips that link to other landings (sub-genres, "Often tagged with"):
 * wrapping on desktop, one swipe line to the screen's edges on a phone.
 * With a `heading` (an overline, desktop only) as on a theme landing.
 */
export function LandingChips({
  chips,
  heading,
}: Readonly<{ chips: ReadonlyArray<LandingChip>; heading?: string }>) {
  if (chips.length === 0) {
    return null;
  }
  return (
    <>
      {heading ? (
        <p className="mt-10 text-overline text-white/60 uppercase max-md:hidden">
          {heading}
        </p>
      ) : null}
      <ul
        aria-label={heading}
        className={cn(
          CHIPS_LINE,
          'overflow-x-auto scrollbar-none md:overflow-visible',
          heading ? 'md:mt-2' : 'md:mt-6',
        )}
      >
        {chips.map((chip) => (
          <li className="shrink-0" key={chip.href}>
            <ChipLink href={chip.href}>{chip.label}</ChipLink>
          </li>
        ))}
      </ul>
    </>
  );
}
