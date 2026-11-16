import { memo } from 'react';

import { arrowRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import type { PageColour as PageColourModel } from '../picker';

const SWATCH =
  'shrink-0 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.25)] transition-[background-color] duration-[450ms]';

function Swatch({
  colour,
  size,
}: Readonly<{ colour: string; size: 'lg' | 'sm' }>) {
  const style = { backgroundColor: colour };
  const className =
    size === 'lg'
      ? `${SWATCH} size-8 rounded-8`
      : `${SWATCH} size-5 rounded-[5px]`;
  return <span className={className} style={style} />;
}

function Entry({
  caption,
  colour,
}: Readonly<{ caption: string; colour: string }>) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Swatch colour={colour} size="lg" />
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="text-body-sm font-medium tabular-nums">{colour}</span>
        <span className="text-caption text-white/60">{caption}</span>
      </span>
    </span>
  );
}

/** The desktop tray's page colour, now and after saving. */
export const PageColourPanel = memo(function PageColourPanel({
  colour,
}: Readonly<{ colour: PageColourModel }>) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-center gap-2">
      <span className="text-overline text-white/60 uppercase">Page colour</span>
      <div className="flex flex-col items-start gap-2">
        {colour.changed ? <Entry caption="Now" colour={colour.now} /> : null}
        <Entry caption={colour.caption} colour={colour.after} />
      </div>
      <span className="text-caption text-white/60">
        From the backdrop you pick, automatically
      </span>
    </div>
  );
});

PageColourPanel.displayName = 'PageColourPanel';

/** The phone sheet's page colour line. */
export const PageColourRow = memo(function PageColourRow({
  colour,
}: Readonly<{ colour: PageColourModel }>) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-12 bg-white/5 px-3 py-2">
      <span className="text-caption text-white/60">Page colour</span>
      <span className="flex items-center gap-2">
        {colour.changed ? (
          <>
            <Swatch colour={colour.now} size="sm" />
            <span className="text-body-sm font-medium text-white/60 tabular-nums">
              {colour.now}
            </span>
            <Icon className="text-white/60" glyph={arrowRightGlyph} size={13} />
          </>
        ) : null}
        <Swatch colour={colour.after} size="sm" />
        <span className="text-body-sm font-medium tabular-nums">
          {colour.after}
        </span>
      </span>
    </div>
  );
});

PageColourRow.displayName = 'PageColourRow';
