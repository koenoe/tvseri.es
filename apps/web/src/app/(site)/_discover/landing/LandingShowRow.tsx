'use client';

import { hasEnoughPosters } from '@tvseri.es/constants';
import { useMemo } from 'react';
import useTabArrival from '@/components/motion/useTabArrival';
import type { Glyph } from '@/components/ui/icon/types';
import Row from '@/components/ui/row/Row';
import PosterTile from '@/components/ui/tile/PosterTile';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import {
  LandingSwitch,
  ROW_SWITCH_CLASS,
  type SwitchTab,
  usePressedTabs,
} from './LandingSwitch';
import { type PlannedRow, visibleShows } from './neverRepeat';
import PerBreakpoint from './PerBreakpoint';
import SeenNote from './SeenNote';
import type { RowShow } from './types';

/** About a desktop row's worth of posters (1440 px shows five and a half) */
const EAGER_TILES = 6;

type Props = Readonly<{
  /**
   * The page's first row: its posters are above the fold and one is usually
   * the LCP image, so the first ones load eagerly.
   */
  eager?: boolean;
  /** unique on the page (DOM ids, Back restore) */
  id: string;
  /** the title on a phone, where it reads differently ("New from the UK") */
  phoneTitle?: string;
  /** the row's plan from `planRow` (`neverRepeat`) */
  plan: PlannedRow<RowShow>;
  subtitle?: string;
  subtitleGlyph?: Glyph;
  /** a tabs row's switch: its group name and the tab labels, in plan order */
  switchLabel?: string;
  tabs?: ReadonlyArray<SwitchTab>;
  title: string;
}>;

/**
 * A landing's poster row: the shared
 * `Row` and `PosterTile`, the Watched label (`WatchedOverlay`) and the
 * "You’ve seen" line from the viewer's marks, and, for a tabs row, the
 * switch beside the title. Every tab's shows come from the server, so
 * switching swaps the posters in the same frame, and they rise in
 * (`useTabArrival`) as Discover's lens tiles do; a row below a switch drops
 * the pressed tab's shows. It re-renders only for the switches it reads:
 * a mark re-renders only the labels and line it changes.
 */
export default function LandingShowRow({
  eager = false,
  id,
  phoneTitle,
  plan,
  subtitle,
  subtitleGlyph,
  switchLabel,
  tabs,
  title,
}: Props) {
  // the switches this row depends on: its own and those above it whose
  // tabs it drops; a press on any other switch doesn't re-render it
  const switchIds = useMemo(
    () =>
      plan.kind === 'tabs'
        ? [plan.switchId, ...Object.keys(plan.drops)]
        : Object.keys(plan.drops),
    [plan],
  );
  const pressed = usePressedTabs(switchIds);

  const tab =
    plan.kind === 'tabs'
      ? (pressed[plan.switchId] ?? tabs?.[0]?.key ?? '')
      : '';
  const arrival = useTabArrival(tab);
  const swap = plan.kind === 'tabs' ? arrival : undefined;
  const list = plan.kind === 'shows' ? plan.shows : (plan.tabs[tab] ?? []);
  const shows = visibleShows(list, plan.drops, pressed, plan.limit);
  const ids = shows.map((show) => show.id);
  const railId = `${id}-rail`;

  const switcher =
    plan.kind === 'tabs' && tabs && switchLabel ? (
      <LandingSwitch
        className={ROW_SWITCH_CLASS}
        controls={railId}
        label={switchLabel}
        switchId={plan.switchId}
        tabs={tabs}
      />
    ) : undefined;
  if (!hasEnoughPosters(shows.length) && !switcher) {
    // too few left after the rows above: the row steps aside (small
    // themes: 3 posters or more)
    return null;
  }
  const note = <SeenNote ids={ids} />;
  const titleContent = phoneTitle ? (
    <PerBreakpoint desktop={title} phone={phoneTitle} />
  ) : undefined;

  return (
    <Row
      id={id}
      look="landing"
      note={note}
      subtitle={subtitle}
      subtitleGlyph={subtitleGlyph}
      swap={swap}
      switcher={switcher}
      title={title}
      titleContent={titleContent}
    >
      {shows.map((show, index) => {
        const loading = eager && index < EAGER_TILES ? 'eager' : undefined;
        return (
          <PosterTile
            id={show.id}
            key={show.id}
            loading={loading}
            overlay={<WatchedOverlay id={show.id} />}
            poster={show.poster}
            slug={show.slug}
            title={show.title}
          />
        );
      })}
    </Row>
  );
}
