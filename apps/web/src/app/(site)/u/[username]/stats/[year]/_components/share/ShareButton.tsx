import {
  buttonStyles,
  CIRCLE_ICON_SIZE,
  circleButtonStyles,
} from '@/components/ui/button/buttonStyles';
import { shareGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import type { StatsUser } from '../../_data/loaders';
import ShareTrigger from './ShareTrigger';
import { getShareCard } from './shareInfo';

/**
 * The button is only the press target: each width draws its own look in it
 * (the look fills it, so its hover and press are the button's)
 */
const TRIGGER = 'flex shrink-0 cursor-pointer rounded-full';

/** The phone's 32px icon circle */
const CIRCLE = circleButtonStyles({ className: 'md:hidden' });

/** The outlined 36px "Share" pill from `md` */
const PILL = buttonStyles({
  className: 'px-4 has-[>svg:first-child]:pl-4 max-md:hidden',
  size: 'sm',
  variant: 'outline',
});

/**
 * "Share" (finished years only), beside the year's title at every width:
 * the outlined pill on desktop, the icon circle on a phone (so it fits
 * beside the year at 360). One button: the dialog opens on desktop, the
 * sheet on a phone (`ShareTrigger`).
 */
export default async function ShareButton({
  user,
  year,
}: Readonly<{ user: StatsUser; year: number }>) {
  const card = await getShareCard(user, year);
  const label = `Share ${year}`;
  return (
    <ShareTrigger card={card} className={TRIGGER} label={label}>
      <span aria-hidden className={CIRCLE}>
        <Icon glyph={shareGlyph} size={CIRCLE_ICON_SIZE[32]} />
      </span>
      <span aria-hidden className={PILL}>
        <Icon glyph={shareGlyph} size={14} />
        Share
      </span>
    </ShareTrigger>
  );
}
