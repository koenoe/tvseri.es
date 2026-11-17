import type { StatsSeriesRef } from '@tvseri.es/schemas';
import Image from 'next/image';
import { Ghost, TextLine } from '@/components/ui/ghost/ghosts';

import {
  variantBackGlyph,
  variantFirstGlyph,
} from '@/components/ui/icon/glyphs';
import type { Glyph } from '@/components/ui/icon/types';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import cn from '@/lib/cn';

import { getNewOrBack, isUnavailable } from '@/lib/stats/loaders';
import StatsUnavailable from '../../../_components/StatsUnavailable';
import type { SectionProps } from '../types';
import Lane, { LaneGhost } from '../ui/Lane';
import { newBackSummary, type Side, splitLabel } from './model';

/**
 * "New, or back for more" (the phone leaves it out):
 * shows watched for the first time this year against shows seen before, as
 * two counts, a split bar and a stack of five posters under each with the
 * first three titles.
 */
export default async function NewOrBack({ user, year }: SectionProps) {
  const data = await getNewOrBack(user.id, year);
  if (isUnavailable(data)) {
    return (
      <StatsUnavailable
        placeholder={<NewOrBackSkeleton />}
        title={'New, or back for more'}
      />
    );
  }
  const summary = newBackSummary(data);
  if (summary.newCount + summary.backCount === 0) {
    return null;
  }
  return (
    <Lane id="new-or-back-title" title="New, or back for more">
      <div className="grid grid-cols-2 gap-4">
        <Count
          count={summary.newCount}
          glyph={variantFirstGlyph}
          label="First time"
        />
        <Count
          count={summary.backCount}
          dim
          glyph={variantBackGlyph}
          label="Back for more"
        />
      </div>
      <Split backCount={summary.backCount} newCount={summary.newCount} />
      <div className="grid grid-cols-2 gap-4 pt-1">
        <Stack side={summary.new} />
        <Stack side={summary.back} />
      </div>
    </Lane>
  );
}

/** A big number over its icon and label */
function Count({
  count,
  dim,
  glyph,
  label,
}: Readonly<{ count: number; dim?: boolean; glyph: Glyph; label: string }>) {
  const numeralClass = cn('text-numeral', dim && 'text-white/60');
  return (
    <div className="flex flex-col gap-1.5">
      <span className={numeralClass}>{count}</span>
      <MetaRow>
        <MetaItem icon={glyph}>{label}</MetaItem>
      </MetaRow>
    </div>
  );
}

/** The bar split by the two counts: white and white/25, 3px apart */
function Split({
  backCount,
  newCount,
}: Readonly<{ backCount: number; newCount: number }>) {
  const label = splitLabel(newCount, backCount);
  const newStyle = { flex: newCount };
  const backStyle = { flex: backCount };
  return (
    <div aria-label={label} className="flex h-2 gap-[3px]" role="img">
      {newCount > 0 ? (
        <i className="block rounded-4 bg-white" style={newStyle} />
      ) : null}
      {backCount > 0 ? (
        <i className="block rounded-4 bg-white/25" style={backStyle} />
      ) : null}
    </div>
  );
}

/** Up to five overlapping posters and the first three titles */
function Stack({ side }: Readonly<{ side: Side }>) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex pl-3.5">
        {side.stack.map((show) => (
          <Poster key={show.id} show={show} />
        ))}
      </div>
      <span className="text-caption text-white/60">{side.caption}</span>
    </div>
  );
}

const POSTER =
  '-ml-3.5 aspect-2/3 w-11 rounded-6 object-cover shadow-[-6px_0_14px_rgb(0_0_0/0.55)]';
const POSTER_BLANK = cn(POSTER, 'block bg-white/5');

function Poster({ show }: Readonly<{ show: StatsSeriesRef }>) {
  if (!show.posterImage) {
    return <span aria-hidden className={POSTER_BLANK} />;
  }
  return (
    <Image
      alt=""
      className={POSTER}
      height={66}
      loading="lazy"
      sizes="44px"
      src={show.posterImage}
      width={44}
    />
  );
}

/**
 * The lane's height: padding 36, head 24, the numbers block (40 + 6 + 20),
 * the 8px bar and the stacks (4 + 66 + 10 + 20), 16px apart: 282px.
 */
export function NewOrBackSkeleton() {
  return (
    <LaneGhost className="h-[276px]" title="New, or back for more">
      <span className="grid grid-cols-2 gap-4">
        <span className="flex flex-col gap-1">
          <TextLine bar="h-6" className="text-title-1" width="w-12" />
          <TextLine className="text-meta" width="w-20" />
        </span>
        <span className="flex flex-col gap-1">
          <TextLine bar="h-6" className="text-title-1" width="w-12" />
          <TextLine className="text-meta" width="w-24" />
        </span>
      </span>
      <Ghost className="h-1.5 shrink-0 rounded-full" />
      <span className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        <Ghost className="rounded-8" />
        <Ghost className="rounded-8" />
      </span>
    </LaneGhost>
  );
}
