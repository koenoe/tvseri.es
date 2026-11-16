import { buttonStyles } from '@/components/ui/button/buttonStyles';
import { shareGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import type { StatsUser } from '../../_data/loaders';
import ShareTrigger from './ShareTrigger';
import { getShareCard } from './shareInfo';

/**
 * "Share" (finished years only): the outlined 36px pill beside the year on
 * desktop, the full-width 40px button under the tiles on a
 * phone. Desktop opens the share dialog, the phone the sheet.
 */
const LOOK = {
  header: buttonStyles({
    className: 'px-4 has-[>svg:first-child]:pl-4',
    size: 'sm',
    variant: 'outline',
  }),
  phone: buttonStyles({
    className: 'w-full has-[>svg:first-child]:pl-4',
    variant: 'outline',
  }),
} as const;

export default async function ShareButton({
  user,
  variant,
  year,
}: Readonly<{ user: StatsUser; year: number; variant: 'header' | 'phone' }>) {
  const card = await getShareCard(user, year);
  return (
    <ShareTrigger
      card={card}
      className={LOOK[variant]}
      mode={variant === 'phone' ? 'sheet' : 'dialog'}
    >
      <Icon glyph={shareGlyph} size={14} />
      Share
    </ShareTrigger>
  );
}
