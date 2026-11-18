import Image from 'next/image';
import { PillSwitchGhost } from '@/components/ui/button/PillSwitch';

import {
  Ghost,
  ghostCircle,
  PULSE,
  TextLine,
} from '@/components/ui/ghost/ghosts';
import { usersGlyph } from '@/components/ui/icon/glyphs';
import MetaRow from '@/components/ui/meta/MetaRow';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';
import profilePath from '@/lib/routing/profilePath';
import { loadCircle } from '../../_data/circle';
import { loadOverview } from '../../_data/overview';
import type { Profile } from '../../_data/profile';
import { isDayZero } from '../../_lib/dayZero';
import EmptyState from '../blocks/EmptyState';
import HeadLink from '../blocks/HeadLink';
import { LinkGhost } from '../blocks/LaneGhost';
import FindPeople from './circle/FindPeople';
import { loadPicks } from './circle/loadCircle';
import PickCard, { PICK_CONTENT } from './circle/PickCard';
import PickStage from './circle/PickStage';

const FRAME =
  'Series you haven’t seen yet, picked from the people whose taste matches yours.';

/**
 * From your circle: the one quiet door to something new, opened
 * by the people you follow. Three picks on one 400px card, switched with the
 * pill. Yours only: a visitor's page has no circle.
 */
export default async function FromYourCircle({
  profile,
}: Readonly<{ profile: Profile }>) {
  if (profile.viewer !== 'owner') {
    return null;
  }
  const circle = await loadCircle(profile);
  const picks = await loadPicks(circle.picks);
  if (picks.length === 0) {
    const dayZero =
      circle.followingCount === 0 && isDayZero(await loadOverview(profile));
    return (
      <Frame>
        <EmptyCircle dayZero={dayZero} following={circle.followingCount} />
      </Frame>
    );
  }
  const stage = picks.map((loaded, index) => {
    const eager = index === 0;
    return {
      ambient: loaded.series.backdropImage ? (
        <Image
          alt=""
          className="object-cover object-top"
          fill
          sizes="160px"
          src={loaded.series.backdropImage}
        />
      ) : null,
      card: <PickCard eager={eager} loaded={loaded} />,
      id: loaded.series.id,
      title: loaded.series.title,
    };
  });
  const circleHref = profilePath(profile.user.username, 'circle');
  return (
    <Frame link={<HeadLink href={circleHref}>More picks</HeadLink>}>
      <PickStage picks={stage} />
    </Frame>
  );
}

const TITLE = 'From your circle';
const FRAME_CLASS = 'flex flex-col gap-5';
const HEAD_CLASS = 'flex flex-col gap-3';
const LINE_CLASS = 'm-0 text-body-sm text-white/60';

/** The card's box: a flat panel that pulses as one layer */
const CARD = cn(
  'relative h-[400px] overflow-hidden rounded-14 bg-black/22',
  PULSE,
);
/** The switcher's place: top left on a phone, bottom right from xl */
const SWITCHER =
  'absolute top-4 left-4 xl:top-auto xl:right-5 xl:bottom-[30px] xl:left-auto';
const REMOTE = ghostCircle('absolute top-4 right-4');

function Frame({
  children,
  link,
}: Readonly<{ children: React.ReactNode; link?: React.ReactNode }>) {
  return (
    <section aria-labelledby="from-your-circle" className={FRAME_CLASS}>
      <div className={HEAD_CLASS}>
        <SectionHead id="from-your-circle" link={link} title={TITLE} />
        <p className={LINE_CLASS}>{FRAME}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyCircle({
  dayZero,
  following,
}: Readonly<{ dayZero: boolean; following: number }>) {
  if (following > 0) {
    return (
      <EmptyState
        glyph={usersGlyph}
        sub="Series the people you follow love, and you haven’t seen, land here."
        title="No picks right now"
      />
    );
  }
  // The one quiet action: search finds a member by their exact handle
  return (
    <EmptyState
      action={<FindPeople />}
      glyph={usersGlyph}
      sub={
        dayZero
          ? 'Picks start with the first person you follow.'
          : 'Follow someone whose taste you trust.'
      }
      title={dayZero ? 'Nobody followed yet' : 'Nobody in your circle yet'}
    />
  );
}

/** The switcher's three picks (the card shows up to three) */
const PICKS = 3;

/**
 * The block while it streams: the real head and line, then the card's box
 * with its words as ghosts (logo, facts, the reason, two people) and the
 * switcher and ⋯ as flat shapes.
 */
export function FromYourCircleSkeleton() {
  const link = <LinkGhost alone width="w-24" />;
  return (
    <div aria-hidden="true" className={FRAME_CLASS}>
      <div className={HEAD_CLASS}>
        <SectionHead id="from-your-circle-sk" link={link} title={TITLE} />
        <p className={LINE_CLASS}>{FRAME}</p>
      </div>
      <div className={CARD}>
        <div className={PICK_CONTENT}>
          <Ghost className="h-[72px] w-[300px] max-w-full rounded-8" />
          <MetaRow className="mt-5 xl:mt-[22px]" fit="drop">
            <TextLine className="text-meta" width="w-40" />
          </MetaRow>
          <TextLine className="mt-[18px] text-body" width="w-64" />
          <span className="mt-3.5 flex gap-2">
            <Ghost className="h-8 w-36 rounded-full" />
            <Ghost className="h-8 w-28 rounded-full" />
          </span>
        </div>
        <PillSwitchGhost className={SWITCHER} count={PICKS} />
        <span className={REMOTE} />
      </div>
    </div>
  );
}
