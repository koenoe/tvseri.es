'use client';

import * as m from 'motion/react-m';
import { useState } from 'react';
import { useMotionLive } from '@/components/motion/ArmedMaxMotion';
import CodeBadge from '@/components/ui/button/CodeBadge';
import TileLink from '@/components/ui/tile/TileLink';
import { formatRuntime } from '@/lib/format/duration';
import type { DiaryRow } from '../_lib/diary';
import { episodeHref } from './episodeHref';

const INITIAL = { opacity: 0, y: -8 } as const;
const SHOWN = { opacity: 1, y: 0 } as const;
const TRANSITION = { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] } as const;

/**
 * An open row's episodes (`.spr`): code, title, runtime, each opening its
 * episode. They fade in from 8px up (200ms) when the
 * month's Motion is live; without it (`domMax` still loading, or failed)
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
      className="flex flex-col pr-2.5 pb-2 pl-16 max-md:pr-2 max-md:pl-[52px]"
      id={id}
      initial={initial}
      transition={TRANSITION}
    >
      {row.episodes.map((episode) => (
        <li key={episode.key}>
          <TileLink
            className="grid h-9 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 border-t border-white/6 text-meta text-white/80 max-md:grid-cols-[64px_minmax(0,1fr)_auto]"
            href={episodeHref(row, episode.season, episode.episode)}
            prefetchOn="intent"
          >
            <span className="justify-self-start">
              <CodeBadge code={episode.code} size="meta" />
            </span>
            <span className="truncate">{episode.title}</span>
            <span className="text-caption tabular-nums text-white/60">
              {formatRuntime(episode.runtime)}
            </span>
          </TileLink>
        </li>
      ))}
    </m.ul>
  );
}
