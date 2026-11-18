import type { UpNextItem } from '@tvseri.es/schemas';
import ButtonLink from '@/components/ui/button/ButtonLink';
import { userGlyph } from '@/components/ui/icon/glyphs';
import Dot from '@/components/ui/lane/Dot';
import Lane from '@/components/ui/lane/Lane';
import { HOME_LANE } from '@/components/ui/lane/laneLooks';

import {
  LANE_ROW_PHONE_HIDDEN,
  LANE_ROWS,
  LANE_TITLE_TEXT,
  PROFILE_BUTTON_PHONE,
  PROFILE_LABEL,
} from './continueLayout';
import InProgressRow from './InProgressRow';

const DOT = <Dot tone="cyan" />;

/**
 * The In progress lane beside the Up next tile: a cyan
 * dot, "In progress" and the count, then the shows after the first. On the
 * phone (`hx-mlane`) it is one bare row and a "Your profile · 5 in
 * progress" button instead.
 */
export default function InProgressLane({
  items,
  profileHref,
}: Readonly<{ items: ReadonlyArray<UpNextItem>; profileHref: string }>) {
  const rows = items.slice(1, 1 + LANE_ROWS);
  const count = items.length;
  return (
    <Lane
      count={count}
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
        className={PROFILE_BUTTON_PHONE}
        href={profileHref}
        icon={userGlyph}
        size="sm"
      >
        {PROFILE_LABEL} · {count} in progress
      </ButtonLink>
    </Lane>
  );
}
