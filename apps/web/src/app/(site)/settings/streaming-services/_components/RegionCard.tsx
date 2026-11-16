import type { Ref } from 'react';

import Button from '@/components/ui/button/Button';
import { searchGlyph } from '@/components/ui/icon/glyphs';

import Flag from './Flag';

/** The card's box: its placeholder takes the same */
export const REGION_CARD_CLASS =
  'flex items-center gap-4 rounded-18 bg-white/4 p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]';

/** The region card: flag, name, where it came from, and Change. */
export default function RegionCard({
  buttonRef,
  controls,
  code,
  line,
  name,
  onPreload,
  onToggle,
  open,
}: Readonly<{
  buttonRef: Ref<HTMLButtonElement>;
  controls: string;
  /** The region's ISO code, for its flag */
  code: string;
  line: string;
  name: string;
  /** Start loading the country list: the pointer is on its way to Change. */
  onPreload: () => void;
  onToggle: () => void;
  open: boolean;
}>) {
  return (
    <div className={REGION_CARD_CLASS}>
      <Flag className="h-[21px] w-8 max-md:h-4 max-md:w-6" code={code} />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <b className="text-title-3">{name}</b>
        <span className="text-meta text-white/60">{line}</span>
      </span>
      <Button
        aria-controls={controls}
        aria-expanded={open}
        className="gap-1.5 px-3 text-body-sm has-[>svg:first-child]:pl-3 [&>svg]:size-[13px]"
        icon={searchGlyph}
        onClick={onToggle}
        onFocus={onPreload}
        onPointerEnter={onPreload}
        ref={buttonRef}
        size="xs"
        variant="tonal"
      >
        Change
      </Button>
    </div>
  );
}
