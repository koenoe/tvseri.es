import type { Feature } from '@tvseri.es/schemas';
import Image from 'next/image';
import Link from 'next/link';

import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import {
  PICTURE_ZOOM,
  PICTURE_ZOOM_GROUP,
} from '@/components/ui/tile/tileHover';
import TitleTreatment, {
  TITLE_LOGO_FIT,
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';
import ShowMeta from '../ShowMeta';
import {
  STILLS_LOGO,
  STILLS_PICTURE,
  STILLS_PICTURE_FACTS,
  STILLS_PICTURE_TEXT,
  STILLS_POSTER,
} from './layout';

type Stills = Extract<Feature, Readonly<{ kind: 'stills' }>>;

/** The shade over the backdrop, in the backdrop's own layer (`PICTURE_LAYER`) */
const SHADE =
  'absolute inset-0 bg-[linear-gradient(0deg,rgb(14_16_17/0.94)_0%,rgb(14_16_17/0.84)_30%,rgb(14_16_17/0.4)_55%,rgb(14_16_17/0)_75%)]';
const POSTER = cn(
  STILLS_POSTER,
  'object-cover shadow-[0_8px_20px_rgb(0_0_0/0.5),0_0_0_1px_rgb(255_255_255/0.12)]',
);
const PICTURE = cn(PICTURE_ZOOM_GROUP, STILLS_PICTURE);
/** The backdrop: zooms on hover like the stills beside it */
const BACKDROP = cn('object-cover object-[center_30%]', PICTURE_ZOOM);
/** Without a poster the logo and facts take its place */
const TEXT_ALONE = cn(STILLS_PICTURE_TEXT, 'left-5 max-md:left-3');

/** A series without a logo: its title, two lines at most */
const TITLE_TEXT = 'line-clamp-2 text-title-3 text-white';

/** The show's logo in the picture's box, else its title written */
// Each place keeps its own look on purpose; don't unify them.
const STILLS_TITLE_LOOK: TitleTreatmentLook = {
  box: STILLS_LOGO,
  logo: TITLE_LOGO_FIT,
  sizes: '180px',
  text: TITLE_TEXT,
};

/**
 * The season picture: the series' backdrop,
 * the season's poster on its bottom left, then the series' logo (or title)
 * and its facts (years, seasons, genre; the season's own facts are in the
 * headline). It opens the season; its backdrop zooms on hover like the
 * stills beside it.
 */
export default function SeasonPicture({
  href,
  season,
  series,
}: Readonly<{
  href: string;
  season: Stills['season'];
  series: Stills['series'];
}>) {
  const label = `${series.title}, season ${season.seasonNumber}`;
  const text = season.posterImage ? STILLS_PICTURE_TEXT : TEXT_ALONE;
  return (
    <Link aria-label={label} className={PICTURE} href={href}>
      <span aria-hidden="true" className={PICTURE_LAYER}>
        {series.backdropImage ? (
          <Image
            alt=""
            className={BACKDROP}
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            src={series.backdropImage}
          />
        ) : null}
        <span className={SHADE} />
      </span>
      {season.posterImage ? (
        <Image
          alt=""
          className={POSTER}
          height={132}
          sizes="88px"
          src={season.posterImage}
          width={88}
        />
      ) : null}
      <span className={text}>
        <TitleTreatment
          look={STILLS_TITLE_LOOK}
          src={series.titleTreatmentImage}
          title={series.title}
        />
        <ShowMeta className={STILLS_PICTURE_FACTS} series={series} />
      </span>
    </Link>
  );
}
