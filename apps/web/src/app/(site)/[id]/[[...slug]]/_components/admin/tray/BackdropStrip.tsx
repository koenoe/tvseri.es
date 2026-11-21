'use client';

import Image from 'next/image';
import { memo, useCallback, useMemo } from 'react';

import cn from '@/lib/cn';

import type { BackdropChoice } from '../picker';
import Marks, { sameOption } from './Marks';
import Strip from './Strip';

export type StripSize = 'desktop' | 'phone';

const THUMB: Readonly<Record<StripSize, string>> = {
  desktop: 'h-[66px] w-[120px]',
  phone: 'h-[72px] w-32',
};

type OptionProps = Readonly<{
  choice: BackdropChoice;
  locked: boolean;
  onPick: (path: string) => void;
  size: StripSize;
  tabbable: boolean;
}>;

const BackdropOption = memo(function BackdropOption({
  choice,
  locked,
  onPick,
  size,
  tabbable,
}: OptionProps) {
  const pick = useCallback(() => onPick(choice.key), [choice.key, onPick]);
  const className = cn(
    // the rim is a layer over the picture: an inset shadow on the button is painted under it
    'group image-rim relative shrink-0 cursor-pointer overflow-hidden rounded-8 bg-white/6',
    THUMB[size],
    choice.isPicked && 'shadow-[0_0_0_2px_#fff]',
    locked && 'cursor-default',
  );
  const imageClassName = cn(
    'object-cover opacity-88 transition-opacity duration-150 group-hover:opacity-100',
    choice.isPicked && 'opacity-100',
    locked && 'opacity-50 group-hover:opacity-50',
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
      <Image
        alt=""
        className={imageClassName}
        fill
        sizes="128px"
        src={choice.url}
      />
      <Marks
        isAuto={choice.isAuto}
        isPicked={choice.isPicked}
        isSaved={choice.isSaved}
      />
    </button>
  );
}, sameOption);

BackdropOption.displayName = 'BackdropOption';

/** The Backdrop strip, text-free backdrops in TMDB's vote order. */
function BackdropStrip({
  choices,
  className,
  locked,
  onPick,
  picked,
  size,
}: Readonly<{
  choices: ReadonlyArray<BackdropChoice>;
  className?: string;
  locked: boolean;
  onPick: (path: string) => void;
  picked: string | null;
  size: StripSize;
}>) {
  const keys = useMemo(() => choices.map((choice) => choice.key), [choices]);
  const tabbable = keys.includes(picked ?? '') ? picked : keys[0];
  return (
    <Strip
      className={className}
      keys={keys}
      label="Backdrops"
      onPick={onPick}
      picked={picked}
    >
      {choices.map((choice) => {
        const isTabbable = choice.key === tabbable;
        return (
          <BackdropOption
            choice={choice}
            key={choice.key}
            locked={locked}
            onPick={onPick}
            size={size}
            tabbable={isTabbable}
          />
        );
      })}
    </Strip>
  );
}

BackdropStrip.displayName = 'BackdropStrip';

export default memo(BackdropStrip);
