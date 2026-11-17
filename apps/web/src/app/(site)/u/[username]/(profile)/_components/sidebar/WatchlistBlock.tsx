import type { ListItem } from '@tvseri.es/schemas';
import Image from 'next/image';
import Link from 'next/link';
import { Ghost, PULSE } from '@/components/ui/ghost/ghosts';
import { bookmarkGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import SectionHead from '@/components/ui/section/SectionHead';
import { apiFetch } from '@/lib/api/client';
import { formatGrouped } from '@/lib/formatCount';
import { readCount } from '@/lib/profile/counts';
import { libraryPath } from '@/lib/routing/profilePath';
import { loadOverview } from '../../_data/overview';
import { type Profile, withToken } from '../../_data/profile';
import { isDayZero } from '../../_lib/dayZero';
import HeadLink from '../blocks/HeadLink';
import { LinkGhost } from '../blocks/LaneGhost';

const SHOWN = 5;

/** The fan: 72px posters, each 18px over the one before */
const FAN = 'flex pl-[18px]';
const TILE = '-ml-[18px] aspect-[2/3] w-[72px] shrink-0 rounded-8';

const GHOST_FAN = `${FAN} ${PULSE}`;

function Fan({ items }: Readonly<{ items: ReadonlyArray<ListItem> }>) {
  return (
    <>
      {items.map((item) => (
        <Image
          alt=""
          className={`${TILE} object-cover shadow-[-6px_0_16px_rgb(0_0_0/0.6)]`}
          height={108}
          key={item.id}
          src={item.posterImage}
          width={72}
        />
      ))}
    </>
  );
}

/** Five dashed ghost tiles where the posters would be */
function Ghosts() {
  return (
    <span aria-hidden="true" className={FAN}>
      {Array.from({ length: SHOWN }, (_, index) => (
        <span
          className={`${TILE} box-border border-2 border-white/12 border-dashed bg-ground`}
          key={index}
        />
      ))}
    </span>
  );
}

function emptyLine(isOwner: boolean, dayZero: boolean) {
  if (!isOwner) {
    return 'Nothing saved yet.';
  }
  return dayZero
    ? 'Series you save land here.'
    : 'All clear. Everything you saved, you’ve started.';
}

/**
 * Watchlist: the five newest saved shows as a fan, with the count
 * linking to the full list. Empty ("all started", or "shows you save
 * land here" on day 0): ghost tiles and one calm line. Public to signed-in viewers.
 */
export default async function WatchlistBlock({
  profile,
}: Readonly<{ profile: Profile }>) {
  const params = { id: profile.user.id, list: 'watchlist' };
  const [page, total] = await Promise.all([
    apiFetch<Readonly<{ items: ReadonlyArray<ListItem> }>>(
      '/user/:id/list/:list',
      { ...withToken(profile), params, query: { limit: SHOWN } },
    ),
    readCount(profile.user.id, 'watchlist'),
  ]);
  const href = libraryPath(profile.user.username, 'watchlist');
  const isOwner = profile.viewer === 'owner';
  const shown = page.items.slice(0, SHOWN);
  if (total === 0 || shown.length === 0) {
    const dayZero = isOwner && isDayZero(await loadOverview(profile));
    const zero = (
      <span className="text-body-sm font-medium text-white/60">0</span>
    );
    return (
      <section aria-labelledby="i-wl" className="flex flex-col gap-4">
        <SectionHead id="i-wl" link={zero} size="side" title="Watchlist" />
        <Ghosts />
        <p className="m-0 flex items-start gap-2 text-body-sm text-white/60">
          <Icon className="mt-[5px] shrink-0" glyph={bookmarkGlyph} size={13} />
          <span>{emptyLine(isOwner, dayZero)}</span>
        </p>
      </section>
    );
  }
  const label = `Watchlist, ${formatGrouped(total)} series`;
  const link = <HeadLink href={href}>{formatGrouped(total)}</HeadLink>;
  return (
    <section aria-labelledby="i-wl" className="flex flex-col gap-4">
      <SectionHead id="i-wl" link={link} size="side" title="Watchlist" />
      <Link aria-label={label} className={FAN} href={href}>
        <Fan items={shown} />
      </Link>
    </section>
  );
}

/** The block while it streams: the real title, the count as a bar, the fan's five posters as ghosts */
export function WatchlistBlockSkeleton() {
  const link = <LinkGhost alone width="w-8" />;
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <SectionHead id="i-wl-sk" link={link} size="side" title="Watchlist" />
      <span className={GHOST_FAN}>
        {Array.from({ length: SHOWN }, (_, index) => (
          <Ghost className={TILE} key={index} />
        ))}
      </span>
    </div>
  );
}
