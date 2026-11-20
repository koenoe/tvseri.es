'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import { TINT_TIMING } from '@/components/motion/swap';
import Button from '@/components/ui/button/Button';
import { Segmented, SegmentedItem } from '@/components/ui/button/Segmented';
import {
  completeGlyph,
  eyeGlyph,
  linkGlyph,
} from '@/components/ui/icon/glyphs';
import IconSwap from '@/components/ui/icon/IconSwap';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import cn from '@/lib/cn';

import type { CardFormat } from '../../_card/cardRequest';
import { DARK_GROUND } from '../../_card/theme';
import type { ShareState } from './useShareCard';

/** The parts the desktop dialog and the phone sheet share */

type Size = Readonly<{ width: number; height: number }>;

/**
 * The frame's ground follows the theme at colour's pace (`TINT_TIMING`),
 * so a new card's wait reads as the card changing colour
 */
const FRAME = `relative block shrink-0 overflow-hidden rounded-14 bg-ground-deep shadow-[0_24px_48px_-18px_rgb(0_0_0/0.8)] image-rim transition-[background-color] ${TINT_TIMING}`;

/**
 * The card image, sized to the stage. One `<img>` per card
 * (`key`): a changed `src` on the same element keeps drawing the old card,
 * scaled into the new format's frame, until the new one arrives. A new element
 * shows the frame (the target aspect, on the card's own ground) instead:
 * `ground`, the Colour card's #1 show colour, fades in as the theme
 * changes, before its picture lands. The share dialog's lift lands here
 * (`data-share-frame`).
 */
export function CardPreview({
  alt,
  ground,
  path,
  size,
}: Readonly<{
  alt: string;
  /** The Colour theme's ground; none: the dark one */
  ground: string | null;
  path: string;
  size: Size;
}>) {
  const groundStyle = ground ? { backgroundColor: ground } : undefined;
  return (
    <span className={FRAME} data-share-frame="" style={groundStyle}>
      <Image
        alt={alt}
        className="block"
        height={size.height}
        key={path}
        src={path}
        unoptimized
        width={size.width}
      />
    </span>
  );
}

/** The 3px-padded switch; items 34px (dialog) or 32px */
const SEG = 'gap-0.5 self-start bg-black/25 p-[3px]';
const ITEM = {
  dialog: 'h-[34px] px-4',
  sheet: 'h-8 px-3',
} as const;

const FORMAT_LABEL: Readonly<Record<CardFormat, string>> = {
  square: 'Square',
  story: 'Story',
};

export function FormatSwitch({
  order,
  share,
  size,
}: Readonly<{
  order: ReadonlyArray<CardFormat>;
  share: ShareState;
  size: keyof typeof ITEM;
}>) {
  return (
    <Segmented className={SEG} label="Format">
      {order.map((format) => {
        const pressed = share.format === format;
        return (
          <Choice
            className={ITEM[size]}
            key={format}
            onChoose={share.chooseFormat}
            pressed={pressed}
            value={format}
          >
            {FORMAT_LABEL[format]}
          </Choice>
        );
      })}
    </Segmented>
  );
}

export function ThemeSwitch({
  share,
  size,
  swatch,
}: Readonly<{ share: ShareState; size: keyof typeof ITEM; swatch: string }>) {
  const themes = [
    { colour: DARK_GROUND, label: 'Dark', theme: 'dark' },
    { colour: swatch, label: 'Colour', theme: 'colour' },
  ] as const;
  return (
    <Segmented className={SEG} label="Theme">
      {themes.map((item) => {
        const dot = { backgroundColor: item.colour };
        const pressed = share.theme === item.theme;
        return (
          <Choice
            className={ITEM[size]}
            key={item.theme}
            onChoose={share.chooseTheme}
            pressed={pressed}
            value={item.theme}
          >
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.35)]"
              style={dot}
            />
            {item.label}
          </Choice>
        );
      })}
    </Segmented>
  );
}

/** One option of a switch, chosen by value */
function Choice<T extends string>({
  children,
  className,
  onChoose,
  pressed,
  value,
}: Readonly<{
  children: ReactNode;
  className: string;
  onChoose: (value: T) => void;
  pressed: boolean;
  value: T;
}>) {
  const choose = () => onChoose(value);
  return (
    // biome-ignore lint/performance/noJsxPropsBind: `onChoose` is new every render (the share state) and `SegmentedItem` isn't memoised, so `useCallback` would save nothing
    <SegmentedItem className={className} onClick={choose} pressed={pressed}>
      {children}
    </SegmentedItem>
  );
}

/** Copy link → "Link copied" with the cyan check */
export function CopyLinkButton({
  className,
  share,
}: Readonly<{ className?: string; share: ShareState }>) {
  const buttonClass = cn('has-[>svg:first-child]:pl-4', className);
  const glyph = share.copied ? completeGlyph : linkGlyph;
  const tint = share.copied ? 'text-cyan' : undefined;
  return (
    <Button className={buttonClass} onClick={share.copyLink} variant="outline">
      <IconSwap className={tint} glyph={glyph} size={14} />
      <span aria-live="polite">
        {share.copied ? 'Link copied' : 'Copy link'}
      </span>
    </Button>
  );
}

/** "Only what’s on this public page" */
export function PublicNote({ className }: Readonly<{ className?: string }>) {
  return (
    <MetaRow className={className}>
      <MetaItem icon={eyeGlyph}>Only what’s on this public page</MetaItem>
    </MetaRow>
  );
}
