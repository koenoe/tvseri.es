'use client';

import Image from 'next/image';
import type { MouseEvent } from 'react';
import Button from '@/components/ui/button/Button';
import CodeBadge from '@/components/ui/button/CodeBadge';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import { pressMark } from '@/lib/marking/pressGate';
import useMarking from '@/lib/marking/useMarking';
import showPath from '@/lib/routing/showPath';
import type { PausedChoice } from '../../../_lib/marking/setPaused';
import {
  PAUSED_ACTIONS,
  PAUSED_BUTTON,
  PAUSED_META,
  PAUSED_POSTER,
  PAUSED_ROW,
  PAUSED_TITLE,
} from './pausedLayout';

const POSTER = cn('relative block overflow-hidden bg-white/8', PAUSED_POSTER);
const TITLE = cn(PAUSED_TITLE, 'hover:underline');
const HIDE = cn(PAUSED_BUTTON, 'text-white/80');

export type PausedRowView = Readonly<{
  code: string;
  lastWatched: string;
  posterImage: string;
  seriesId: number;
  slug: string;
  title: string;
}>;

/** One show not watched for 3 months: poster, title, code and last day, Keep and Hide */
export default function PausedRow({
  onAnswer,
  row,
}: Readonly<{
  onAnswer: (ids: ReadonlyArray<number>, choice: PausedChoice) => void;
  row: PausedRowView;
}>) {
  const marking = useMarking();
  const href = showPath(row.seriesId, row.slug);
  // The row leaves and the next one's buttons slide under the pointer: one
  // press, one answer (`pressMark`)
  const key = `${row.seriesId}:paused`;
  const keep = (event: MouseEvent<HTMLButtonElement>) => {
    pressMark(key, event, () => onAnswer([row.seriesId], 'keep'));
  };
  // Hide is the core's hide from in progress (the same pref): the row leaves
  // with every list's copy, with the toast and its Undo
  const hide = (event: MouseEvent<HTMLButtonElement>) => {
    pressMark(key, event, () => marking.removeFromInProgress(row.seriesId));
  };
  const keepLabel = `Keep ${row.title}`;
  const hideLabel = `Hide ${row.title}`;
  return (
    <div className={PAUSED_ROW}>
      <TileLink
        aria-label={row.title}
        className="row-span-2 shrink-0"
        href={href}
        tabIndex={-1}
      >
        <span className={POSTER}>
          {row.posterImage ? (
            <Image
              alt=""
              className="object-cover saturate-[0.4] brightness-[0.8]"
              fill
              sizes="40px"
              src={row.posterImage}
            />
          ) : null}
        </span>
      </TileLink>
      <TileLink className={TITLE} href={href} title={row.title}>
        {row.title}
      </TileLink>
      <span className={PAUSED_META}>
        <MetaRow className="h-[22px] flex-1 gap-2.5" fit="drop">
          <CodeBadge code={row.code} size="meta" />
          <span className="min-w-0 truncate" title={row.lastWatched}>
            {row.lastWatched}
          </span>
        </MetaRow>
      </span>
      <span className={PAUSED_ACTIONS}>
        <Button
          aria-label={keepLabel}
          className={PAUSED_BUTTON}
          onClick={keep}
          variant="outline"
        >
          Keep
        </Button>
        <Button
          aria-label={hideLabel}
          className={HIDE}
          onClick={hide}
          variant="outline"
        >
          Hide
        </Button>
      </span>
    </div>
  );
}
