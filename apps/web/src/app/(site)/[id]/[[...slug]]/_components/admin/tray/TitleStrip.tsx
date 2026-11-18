'use client';

import Image from 'next/image';
import { memo, useCallback, useMemo } from 'react';

import { externalGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import cn from '@/lib/cn';

import { tmdbImagesUrl } from '../openAdminImages';
import type { TitleChoice } from '../picker';
import type { StripSize } from './BackdropStrip';
import Marks, { sameOption } from './Marks';
import Strip from './Strip';

const TILE: Readonly<Record<StripSize, string>> = {
  desktop: 'h-[66px] w-[168px]',
  phone: 'h-[72px] w-40',
};

const LINK_HEIGHT: Readonly<Record<StripSize, string>> = {
  desktop: 'h-[66px]',
  phone: 'h-[72px]',
};

type OptionProps = Readonly<{
  backdrop: string | undefined;
  choice: TitleChoice;
  locked: boolean;
  onPick: (key: string) => void;
  size: StripSize;
  tabbable: boolean;
  title: string;
}>;

/** A logo (or the text title) drawn on the picked backdrop. */
const TitleOption = memo(function TitleOption({
  backdrop,
  choice,
  locked,
  onPick,
  size,
  tabbable,
  title,
}: OptionProps) {
  const pick = useCallback(() => onPick(choice.key), [choice.key, onPick]);
  const className = cn(
    'relative shrink-0 cursor-pointer overflow-hidden rounded-8 bg-page shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]',
    TILE[size],
    choice.isPicked && 'shadow-[0_0_0_2px_#fff]',
    locked && 'cursor-default opacity-60',
  );
  return (
    <button
      aria-checked={choice.isPicked}
      aria-label={choice.label}
      className={className}
      onClick={pick}
      role="radio"
      tabIndex={tabbable ? 0 : -1}
      type="button"
    >
      {/* the backdrop and its fade: one layer, clipped once by the corners */}
      <span className={PICTURE_LAYER}>
        {backdrop ? (
          <Image
            alt=""
            className="absolute top-[-128px] left-[-60px] h-[315px] w-[560px] max-w-none object-cover object-top"
            height={315}
            sizes="560px"
            src={backdrop}
            width={560}
          />
        ) : null}
        <span className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-page)_80%,transparent),color-mix(in_srgb,var(--color-page)_35%,transparent))]" />
      </span>
      {choice.kind === 'logo' ? (
        <span className="absolute inset-x-3 inset-y-2.5">
          {/* The box at 2× instead of `fill`: the loader then gets a real
              width (see Information's network logo). */}
          <Image
            alt=""
            className="absolute inset-0 size-full object-contain object-left"
            height={96}
            sizes="160px"
            src={choice.logo.url}
            width={320}
          />
        </span>
      ) : (
        <span className="absolute inset-y-0 left-3 flex items-center font-display text-[24px] leading-8 font-extrabold tracking-[-0.03em] text-white">
          {title}
        </span>
      )}
      <Marks
        isAuto={choice.isAuto}
        isPicked={choice.isPicked}
        isSaved={choice.isSaved}
      />
    </button>
  );
}, sameOption);

TitleOption.displayName = 'TitleOption';

/** The Title strip, every logo then the text title. */
function TitleStrip({
  backdrop,
  choices,
  className,
  locked,
  onPick,
  picked,
  seriesId,
  size,
  title,
}: Readonly<{
  backdrop: string | undefined;
  choices: ReadonlyArray<TitleChoice>;
  className?: string;
  locked: boolean;
  onPick: (key: string) => void;
  picked: string | null;
  seriesId: number;
  size: StripSize;
  title: string;
}>) {
  const keys = useMemo(() => choices.map((choice) => choice.key), [choices]);
  const tabbable = keys.includes(picked ?? '') ? picked : keys[0];
  const noLogos = choices.every((choice) => choice.kind === 'text');
  const tmdbHref = tmdbImagesUrl(seriesId, 'logos');
  const linkClassName = cn(
    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-8 border border-dashed border-white/20 px-4 text-[13px] leading-5 text-white/80 hover:border-white/40 hover:text-white',
    LINK_HEIGHT[size],
  );
  return (
    <Strip
      className={className}
      keys={keys}
      label="Title treatments"
      onPick={onPick}
      picked={picked}
    >
      {choices.map((choice) => {
        const isTabbable = choice.key === tabbable;
        return (
          <TitleOption
            backdrop={backdrop}
            choice={choice}
            key={choice.key}
            locked={locked}
            onPick={onPick}
            size={size}
            tabbable={isTabbable}
            title={title}
          />
        );
      })}
      {noLogos ? (
        <a
          className={linkClassName}
          href={tmdbHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Icon glyph={externalGlyph} size={16} />
          <span>Add a logo on TMDB</span>
        </a>
      ) : null}
    </Strip>
  );
}

TitleStrip.displayName = 'TitleStrip';

export default memo(TitleStrip);
