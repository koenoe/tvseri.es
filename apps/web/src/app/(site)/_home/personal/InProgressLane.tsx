import type { UpNextItem } from '@tvseri.es/schemas';
import RollingCount from '@/components/motion/RollingCount';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { userGlyph } from '@/components/ui/icon/glyphs';
import Dot from '@/components/ui/lane/Dot';
import Lane from '@/components/ui/lane/Lane';
import { HOME_LANE } from '@/components/ui/lane/laneLooks';
import cn from '@/lib/cn';

import {
  LANE_ROW_PHONE_HIDDEN,
  LANE_ROWS,
  LANE_TITLE_TEXT,
  PROFILE_BUTTON_PHONE,
  PROFILE_LABEL,
} from './continueLayout';
import InProgressRow from './InProgressRow';

const DOT = <Dot tone="cyan" />;

/** Its count drops live as shows leave: equal-width digits */
const PROFILE_BUTTON = cn(PROFILE_BUTTON_PHONE, 'tabular-nums');

/**
 * The In progress lane beside the Up next tile: a cyan
 * dot, "In progress" and the count, then the shows after the first (none
 * when marks here left only the first drawn: the count still says how many
 * remain, and the next load draws them). On the
 * phone it is one bare row and a "Your profile · 5 in
 * progress" button instead.
 */
export default function InProgressLane({
  count,
  items,
  profileHref,
}: Readonly<{
  /** every show in progress, the ones not drawn too */
  count: number;
  items: ReadonlyArray<UpNextItem>;
  profileHref: string;
}>) {
  const rows = items.slice(1, 1 + LANE_ROWS);
  // it rolls as marks here move it, as the profile's counts do
  const pill = <RollingCount value={count} />;
  // one string, so the pill truncates it as one label
  const profileLabel = `${PROFILE_LABEL} · ${count} in progress`;
  return (
    <Lane
      count={pill}
      dot={DOT}
      id="in-progress-title"
      look={HOME_LANE}
      slot="continue-lane"
      title={LANE_TITLE_TEXT}
    >
      {rows.map((item, index) => {
        const phoneHidden = index > 0 ? LANE_ROW_PHONE_HIDDEN : undefined;
        return (
          <InProgressRow
            className={phoneHidden}
            item={item}
            key={item.seriesId}
          />
        );
      })}
      <ButtonLink
        className={PROFILE_BUTTON}
        href={profileHref}
        icon={userGlyph}
        size="sm"
      >
        {profileLabel}
      </ButtonLink>
    </Lane>
  );
}
