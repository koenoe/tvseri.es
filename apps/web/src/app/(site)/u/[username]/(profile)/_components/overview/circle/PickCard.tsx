import { isHexColor } from '@tvseri.es/schemas';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { TEXT_ARRIVAL } from '@/components/motion/textArrival';
import { LazyShowRemote } from '@/components/remote/LazyRemote';
import { calendarGlyph, seasonGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import TileLink from '@/components/ui/tile/TileLink';
import {
  TITLE_LOGO_FIT,
  TitleTreatmentLogo,
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import showPath from '@/lib/routing/showPath';
import { pickReason, seasonsAndEpisodes } from '../../../_lib/circleCopy';
import type { LoadedPick } from './loadCircle';
import PersonChip from './PersonChip';

const DEFAULT_INK = '#111a1d';

/** The backdrop colour as a card tint; anything that is not a hex colour falls back */
const inkOf = (backdropColor: string | undefined) =>
  isHexColor(backdropColor) ? backdropColor : DEFAULT_INK;

const tint = (ink: string, percent: number) =>
  `color-mix(in srgb, ${ink} ${percent}%, transparent)`;

/** Where the card's words sit (its ghost uses the same) */
export const PICK_CONTENT =
  'absolute inset-y-0 left-0 z-3 flex w-full flex-col items-start justify-end px-5 pt-7 pb-6 xl:w-[540px] xl:pr-0 xl:pb-[30px] xl:pl-9';

/** The words arrive behind the picture when the pick changes (`PickStage`) */
const CONTENT = `pointer-events-none ${PICK_CONTENT} ${TEXT_ARRIVAL}`;

/**
 * One pick of From your circle: the backdrop fading in from the right, the
 * title treatment, the meta line, why it is here and who picked it. The
 * whole card is one link; the ⋯ (the show's Remote) sits above it.
 */
export default function PickCard({
  eager,
  loaded,
}: Readonly<{ eager: boolean; loaded: LoadedPick }>) {
  const { pick, series } = loaded;
  const href = showPath(series.id, series.slug);
  const ink = inkOf(series.backdropColor);
  const year = series.firstAirDate.slice(0, 4);
  const size = seasonsAndEpisodes(
    series.numberOfSeasons,
    series.numberOfEpisodes,
  );
  const shade: CSSProperties = {
    background: `linear-gradient(0deg, rgb(10 13 14 / 0.3) 0, transparent 186px), linear-gradient(270deg, ${tint(ink, 0)} 0%, ${tint(ink, 63)} 60%, ${tint(ink, 70)} 100%), radial-gradient(${tint(ink, 0)} 0%, ${tint(ink, 70)} 100%)`,
  };
  const tinted: CSSProperties = { backgroundColor: ink };
  const historyHref = `${href}?history`;
  return (
    <article
      aria-label={series.title}
      className="absolute inset-0"
      style={tinted}
    >
      {/* the backdrop and its tint: one layer, clipped once by the stage's
          corners */}
      <span aria-hidden="true" className={PICTURE_LAYER}>
        {series.backdropImage ? (
          <span className="absolute inset-y-0 right-0 left-0 xl:left-[22%]">
            <Image
              alt=""
              className="object-cover object-top [mask-image:linear-gradient(90deg,transparent_0,#000_35%)]"
              fill
              loading={eager ? 'eager' : 'lazy'}
              sizes="(min-width: 1280px) 664px, 100vw"
              src={series.backdropImage}
            />
          </span>
        ) : null}
        <span className="absolute inset-0" style={shade} />
      </span>
      <TileLink
        aria-label={series.title}
        className="absolute inset-0 z-1"
        href={href}
      />
      <div className={CONTENT}>
        <PickTitle logo={series.titleTreatmentImage} title={series.title} />
        <MetaRow className="mt-5 max-w-full gap-3.5 xl:mt-[22px]" fit="drop">
          <MetaItem icon={calendarGlyph}>{year}</MetaItem>
          <MetaItem icon={seasonGlyph}>{size}</MetaItem>
        </MetaRow>
        <p className="mt-[18px] mb-0 text-body text-white/80">
          {pickReason(pick)}
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {pick.people.map((person) => (
            <PersonChip key={person.id} person={person} />
          ))}
        </div>
      </div>
      <div className="absolute top-4 right-4 z-4">
        <LazyShowRemote
          hasAired
          historyHref={historyHref}
          seriesId={series.id}
          seriesName={series.title}
          size={32}
        />
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-6 rounded-14 shadow-[var(--shadow-image-rim),inset_0_0_90px_rgb(0_0_0/0.3)]"
        data-hairline
      />
    </article>
  );
}

/** The pick's logo in a 300 × 72 box, else its title in two lines at most */
// Each place keeps its own look on purpose; don't unify them.
const PICK_TITLE: TitleTreatmentLook = {
  box: 'relative m-0 block h-[72px] w-[300px] max-w-full',
  logo: `${TITLE_LOGO_FIT} drop-shadow-[0_2px_14px_rgb(0_0_0/0.5)]`,
  sizes: '300px',
  text: 'm-0 line-clamp-2 max-w-full font-display text-title-1 drop-shadow-[0_2px_14px_rgb(0_0_0/0.5)] [overflow-wrap:anywhere]',
};

function PickTitle({
  logo,
  title,
}: Readonly<{ logo?: string; title: string }>) {
  if (!logo) {
    return (
      // two lines at most (the logo's 72px box holds less), then an ellipsis;
      // the full title on hover
      <h3 className={PICK_TITLE.text} title={title}>
        {title}
      </h3>
    );
  }
  return (
    <TitleTreatmentLogo as="h3" look={PICK_TITLE} src={logo} title={title} />
  );
}
