'use client';

import { useRouter } from 'next/navigation';

import Button from '@/components/ui/button/Button';
import { variantDiceGlyph } from '@/components/ui/icon/glyphs';
import { useNewToViewer } from '@/lib/marking/hooks';
import showPath from '@/lib/routing/showPath';

import type { PickableShow } from './notFoundShow';

/**
 * “Pick one for me”: a random show from the trending pool,
 * new to the viewer (`useNewToViewer`; the whole pool when they have every
 * one), opened straight away.
 */
export default function PickOneButton({
  shows,
}: Readonly<{ shows: ReadonlyArray<PickableShow> }>) {
  const router = useRouter();
  const fresh = useNewToViewer(shows);
  const pool = fresh.length > 0 ? fresh : shows;
  const pick = () => {
    const show = pool[Math.floor(Math.random() * pool.length)];
    if (show) {
      router.push(showPath(show.id, show.slug));
    }
  };
  return (
    <Button icon={variantDiceGlyph} onClick={pick} variant="glass">
      Pick one for me
    </Button>
  );
}
