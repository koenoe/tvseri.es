'use client';

import Button from '@/components/ui/button/Button';
import { checkGlyph, plusGlyph } from '@/components/ui/icon/glyphs';
import { useListToggle } from '@/lib/marking/toggles';

/** "Add to watchlist" for the card on top of the Popular this week deck, in place of Pick again */
export default function AddCurrent({ id }: Readonly<{ id: number }>) {
  const { isOn, toggle } = useListToggle(id, 'watchlist');
  return (
    <Button
      className="px-4 has-[>svg:first-child]:pl-3"
      icon={isOn ? checkGlyph : plusGlyph}
      onClick={toggle}
      pressed={isOn}
      size="lg"
      variant="primary"
    >
      {isOn ? 'On watchlist' : 'Add to watchlist'}
    </Button>
  );
}
