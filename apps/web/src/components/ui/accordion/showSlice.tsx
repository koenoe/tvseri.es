import type { ReactNode } from 'react';

import { LazyShowRemote } from '@/components/remote/LazyRemote';
import TileLink from '@/components/ui/tile/TileLink';
import TitleTreatment from '@/components/ui/title/TitleTreatment';

import {
  type Fact,
  SLICE_TITLE,
  SliceBackdrop,
  SliceCorner,
  SliceFacts,
  SliceFull,
  SliceRing,
  SliceShade,
} from './slice';

/** A slice's two layers: the backdrop stretches with it, the content only moves */
export type SliceParts = Readonly<{ backdrop: ReactNode; content: ReactNode }>;

/**
 * A show as a slice of the accordion (the profile's Favourites, Stats'
 * Finished in the year): its backdrop and shade, the title treatment and
 * facts while open, its name on a closed row below xl, the ring, the link to
 * the show and the show's ⋯. A place with something more (the visitor's
 * relation pill) passes it as `left`, the corner it sits in. Presentational:
 * every value is already loaded and formatted.
 */
export function showSlice({
  backdrop,
  facts,
  href,
  left,
  loading,
  logo,
  seriesId,
  title,
}: Readonly<{
  backdrop: string | null | undefined;
  facts: ReadonlyArray<Fact>;
  /** the show's page */
  href: string;
  left?: ReactNode;
  loading: 'eager' | 'lazy';
  logo: string | null | undefined;
  seriesId: number;
  title: string;
}>): SliceParts {
  return {
    backdrop: (
      <>
        <SliceBackdrop loading={loading} src={backdrop} />
        <SliceShade />
      </>
    ),
    content: (
      <>
        <SliceFull>
          <TitleTreatment look={SLICE_TITLE} src={logo} title={title} />
          <SliceFacts facts={facts} />
        </SliceFull>
        <SliceRing />
        <TileLink
          aria-label={title}
          className="absolute inset-0 z-2 rounded-12"
          href={href}
        />
        {left ? <SliceCorner side="left">{left}</SliceCorner> : null}
        <SliceCorner side="right">
          <LazyShowRemote
            hasAired
            historyHref={`${href}?history`}
            seriesId={seriesId}
            seriesName={title}
            size={32}
          />
        </SliceCorner>
      </>
    ),
  };
}
