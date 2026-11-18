import 'server-only';

import { hasEnoughPosters } from '@tvseri.es/constants';
import type { ComponentProps } from 'react';
import RowError from '@/components/ui/row/RowError';
import { isUnavailable } from '@/lib/cache/unavailable';

import LandingShowRow from './LandingShowRow';
import { plannedShows } from './neverRepeat';
import { planRow, type RowLoader } from './planRow';

type Props = Omit<ComponentProps<typeof LandingShowRow>, 'eager' | 'plan'> &
  Readonly<{
    /** this row's index in `loaders` */
    index: number;
    /** every row of the page, top to bottom (see `planRow`) */
    loaders: ReadonlyArray<RowLoader>;
  }>;

/**
 * A streamed poster row that never repeats a show of the rows above it:
 * plans the row on the server (`planRow`), then draws it with
 * `LandingShowRow`. A row (or a switch's tab) with fewer than
 * `MIN_POSTERS` shows after the rows above is left out. Put it in a
 * `LandingRowSlot`. Prerendered with the
 * page; when its data is `Unavailable` it draws the failed row
 * (settled, with a Try again that refreshes the route).
 *
 * @example
 * <LandingRowSlot id="trend" title="Trending in Crime">
 *   <LandingRow id="trend" index={0} loaders={rows} title="Trending in Crime" />
 * </LandingRowSlot>
 */
export default async function LandingRow({
  index,
  loaders,
  tabs,
  ...row
}: Props) {
  const plan = await planRow(loaders, index);
  if (isUnavailable(plan)) {
    return (
      <RowError
        id={row.id}
        state="unavailable"
        subtitle={row.subtitle}
        subtitleGlyph={row.subtitleGlyph}
        title={row.title}
      />
    );
  }
  // under `MIN_POSTERS` the plan has no shows: the row steps aside
  if (!hasEnoughPosters(plannedShows(plan))) {
    return null;
  }
  // a switch keeps the tabs that have enough shows, in their order
  const kept =
    plan.kind === 'tabs' && tabs
      ? tabs.filter((tab) => tab.key in plan.tabs)
      : tabs;
  const eager = index === 0;
  return <LandingShowRow {...row} eager={eager} plan={plan} tabs={kept} />;
}
