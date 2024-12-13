'use client';

import { useCallback } from 'react';

import { cx } from 'class-variance-authority';

import SkeletonEpisode from './SkeletonEpisode';
import SkeletonGenre from './SkeletonGenre';
import SkeletonPoster from './SkeletonPoster';
import {
  type HeaderVariantProps,
  headerVariants,
  innerStylesWithModuleStyles,
} from '../List/List';

type Props = Readonly<{
  className?: string;
  numberOfItems?: number;
  hasTitle?: boolean;
  variant?: 'poster' | 'genre' | 'episode';
  style?: React.CSSProperties;
}>;

export default function SkeletonList({
  className,
  hasTitle = true,
  numberOfItems = 10,
  titleAlignment,
  variant = 'poster',
  style,
}: Props & HeaderVariantProps) {
  const renderVariant = useCallback(
    (index: number) => {
      switch (variant) {
        case 'genre':
          return <SkeletonGenre key={index} />;
        case 'episode':
          return <SkeletonEpisode key={index} />;
        case 'poster':
        default:
          return <SkeletonPoster key={index} />;
      }
    },
    [variant],
  );

  return (
    <div style={style} className={cx('relative w-full', className)}>
      {hasTitle && (
        <div className={headerVariants({ titleAlignment })}>
          <div className="h-9 w-80 bg-white/20" />
          <div className="hidden h-2 flex-grow rounded-2xl bg-white/15 md:flex" />
        </div>
      )}
      <div className={innerStylesWithModuleStyles()}>
        {[...Array(numberOfItems)].map((_, index) => renderVariant(index))}
      </div>
    </div>
  );
}
