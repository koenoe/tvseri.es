'use client';

import Image from 'next/image';
import { createContext, useContext } from 'react';

import { ArtPlaceholder } from '@/components/ui/tile/PosterArt';
import { EPISODE_STILL_ZOOM } from '@/components/ui/tile/tileHover';
import cn from '@/lib/cn';
import { useShow } from '../../_lib/ShowProvider';

/**
 * May the show's backdrop stand in for a missing still? The wall says no
 * when more than one of its episodes has none (an unreleased season), so
 * one picture never repeats across it.
 */
export const StillBackdrop = createContext(true);

/**
 * An episode still filling its box: the wall's tiles, the compact thumbs,
 * the stack's fan, the modal. Without one (an episode TMDB has no still for
 * yet, often an announced one) the show's backdrop stands in, under the
 * same filters (the upcoming tile's dark still); without a backdrop either,
 * the site's placeholder for missing art, never a bare black box. In an
 * episode tile it zooms 3% on hover (`tileHover`), inside its frame.
 */
export default function Still({
  className,
  loading,
  sizes,
  src,
}: Readonly<{
  className?: string;
  loading?: 'eager' | 'lazy';
  sizes: string;
  src: string;
}>) {
  const { backdrop } = useShow();
  const standIn = useContext(StillBackdrop);
  const image = src || (standIn ? backdrop : '');
  const imageClass = cn('object-cover', EPISODE_STILL_ZOOM, className);
  return image ? (
    <Image
      alt=""
      className={imageClass}
      fill
      loading={loading}
      sizes={sizes}
      src={image}
    />
  ) : (
    <ArtPlaceholder />
  );
}
