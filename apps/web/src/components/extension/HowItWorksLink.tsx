'use client';

import { buttonStyles } from '@/components/ui/button/buttonStyles';
import { HIT_Y } from '@/components/ui/button/hitArea';
import { infoGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { openHowItWorksProps } from './HowItWorks';

/** At the end of a card's actions: a quiet text link, 40px tall to the pointer */
const TEXT = `relative ml-auto inline-flex items-center gap-1.5 whitespace-nowrap py-0.5 font-medium text-meta text-white/80 transition-[color,scale] duration-150 ease-out hover:text-white active:scale-96 ${HIT_Y[9]}`;

/** On its own line (a card where the extension can't run): a small tonal button */
const BUTTON = buttonStyles({
  className:
    'h-8 gap-1.5 self-start px-3 has-[>svg:first-child]:pl-2.5 after:-inset-y-1',
  size: 'sm',
  variant: 'tonal',
});

/** Opens the dialog over Settings, so reading it never leaves the page */
export default function HowItWorksLink({
  look = 'text',
}: Readonly<{ look?: 'button' | 'text' }>) {
  const classes = look === 'text' ? TEXT : BUTTON;
  return (
    <button className={classes} type="button" {...openHowItWorksProps}>
      <Icon glyph={infoGlyph} size={14} />
      How it works<span className="sr-only"> (the extension)</span>
    </button>
  );
}
