'use client';

import { formatRuntime } from '@tvseri.es/utils';
import * as m from 'motion/react-m';
import { useState } from 'react';

import { useMotionLive } from '@/components/motion/ArmedMaxMotion';
import CodeBadge from '@/components/ui/button/CodeBadge';
import TileLink from '@/components/ui/tile/TileLink';

import type { DiaryRow } from '@/lib/profile/diary';
import { episodeHref } from './episodeHref';

const INITIAL = { opacity: 0, y: -8 } as const;
const SHOWN = { opacity: 1, y: 0 } as const;
const TRANSITION = { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] } as const;

/**
 * An open row's episodes: code, title, runtime, each opening its episode.
 * They fade in from 8px up (200ms) when the month's Motion is live; without it (`domMax` still loading, or failed)
 * they appear at once instead of sitting at their hidden start.
 * Decided once, at mount: a renderer arriving later doesn't replay it.
 */
export default function DiaryEpisodes({
  id,
  row,
}: Readonly<{ id: string; row: DiaryRow }>) {
  const live = useMotionLive();
  const [initial] = useState(() => (live ? INITIAL : false));
  return (
    <m.ul
      animate={SHOWN}
      className="relative flex flex-col pr-4 pb-2 pl-[90px] max-md:pr-3 max-md:pb-1.5 max-md:pl-16"
      id={id}
      initial={initial}
      transition={TRANSITION}
    >
      {row.episodes.map((episode) => {
        const href = episodeHref(row, episode.season, episode.episode);
        return (
          <li key={episode.key}>
            <TileLink
              className="flex h-9 items-center gap-2 border-t border-white/8 text-[14px] leading-5 text-white/85 max-md:text-[13px] max-md:leading-[18px]"
              href={href}
              prefetchOn="intent"
            >
              <CodeBadge code={episode.code} size="meta" />
              <span className="min-w-0 truncate">{episode.title}</span>
              <span className="ml-auto shrink-0 whitespace-nowrap text-[13px] leading-[18px] tabular-nums text-white/60">
                {formatRuntime(episode.runtime)}
              </span>
            </TileLink>
          </li>
        );
      })}
    </m.ul>
  );
}
