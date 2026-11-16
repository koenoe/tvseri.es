'use client';

import Button from '@/components/ui/button/Button';
import { heartGlyph } from '@/components/ui/icon/glyphs';
import { useListToggle } from '@/lib/marking/toggles';

/** "Add to favourites" on a suggested show: the heart, filled once it is one */
export default function AddToFavourites({
  seriesId,
}: Readonly<{ seriesId: number }>) {
  const { isOn, toggle } = useListToggle(seriesId, 'favorites');
  return (
    <Button
      className="pointer-events-none invisible group-data-[open=true]/fv:pointer-events-auto group-data-[open=true]/fv:visible"
      icon={heartGlyph}
      onClick={toggle}
      pressed={isOn}
      size="sm"
      variant="primary"
    >
      {isOn ? 'In your favourites' : 'Add to favourites'}
    </Button>
  );
}
