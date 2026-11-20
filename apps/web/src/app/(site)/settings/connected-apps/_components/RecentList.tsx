'use client';

import { episodeCode, type RecentScrobble } from '@tvseri.es/schemas';
import * as m from 'motion/react-m';

import { SWAP_FROM, SWAP_IN } from '@/components/motion/swap';

import CodeBadge from '@/components/ui/button/CodeBadge';
import { eyeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import cn from '@/lib/cn';

import LocalMoment from '../../_components/LocalMoment';
import { type AppBrand, brandOf } from '../../_lib/services';

/** Rows rise in as a swap does, 40ms apart; the fifth on with the fourth */
const RISE_STEP = 0.04;
const RISE_CAP = 4;
const riseAt = (index: number) =>
  ({
    ...SWAP_IN,
    transition: {
      ...SWAP_IN.transition,
      delay: Math.min(index, RISE_CAP) * RISE_STEP,
    },
  }) as const;

/**
 * The Recent list: an app's marks, newest first (the latest, or one day's).
 * `rise`: the list replaced another (a day pressed or let go), so its rows
 * rise in one after another; never on the first paint.
 */
export default function RecentList({
  brand,
  label,
  recent,
  rise = false,
}: Readonly<{
  brand: AppBrand;
  /** What the list holds ("Latest Plex marks") */
  label: string;
  recent: ReadonlyArray<RecentScrobble>;
  rise?: boolean;
}>) {
  const from = rise ? SWAP_FROM : false;
  const rowClass = cn(
    'grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-t py-3 text-body-sm text-white/80 first:border-t-0',
    brandOf(brand).hairline,
  );
  return (
    <ul aria-label={label} className="flex flex-col">
      {recent.map((scrobble, index) => {
        const scrobbleId = `${scrobble.seriesId}-${scrobble.seasonNumber}-${scrobble.episodeNumber}-${scrobble.watchedAt}`;
        const code = episodeCode(scrobble);
        const risen = riseAt(index);
        return (
          <m.li
            animate={risen}
            className={rowClass}
            initial={from}
            key={scrobbleId}
          >
            <Icon
              active
              className="size-3.5 text-white/60"
              glyph={eyeGlyph}
              size={16}
            />
            <span className="flex min-w-0 items-center gap-2.5">
              <b className="min-w-0 truncate font-medium">{scrobble.title}</b>
              <CodeBadge code={code} size="lane" />
            </span>
            <span className="whitespace-nowrap text-white/60">
              <LocalMoment at={scrobble.watchedAt} style="day-first" />
            </span>
          </m.li>
        );
      })}
    </ul>
  );
}
