'use client';

import { buttonStyles } from '@/components/ui/button/buttonStyles';
import { infoGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import { openHowItWorksProps } from './HowItWorks';

/** At the end of a card's actions: a quiet text link */
const TEXT =
  'ml-auto inline-flex items-center gap-1.5 whitespace-nowrap py-0.5 font-medium text-meta text-white/80 transition-colors hover:text-white';

/** On its own line (a card where the extension can't run): a small tonal button */
const BUTTON = buttonStyles({
  className: 'h-8 gap-1.5 self-start px-3 has-[>svg:first-child]:pl-3',
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
