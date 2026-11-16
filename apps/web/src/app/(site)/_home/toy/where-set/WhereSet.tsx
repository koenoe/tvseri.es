import type { WherePlace } from '@tvseri.es/schemas';
import Image from 'next/image';
import type { ReactNode } from 'react';
import TitleTreatment, {
  TITLE_LOGO_FIT,
  type TitleTreatmentLook,
} from '@/components/ui/title/TitleTreatment';
import showPath from '@/lib/routing/showPath';

import { MomentFrame } from '../../feature/Moment';
import ShowMeta from '../../feature/ShowMeta';
import { PAGE_COLUMN } from '../../frame';
import { TOY_TITLE } from '../../moments';
import DottedMap from './DottedMap';
import { labelSides, MAP_PX } from './labelSide';
import {
  DETAIL_LOGO,
  DETAIL_META,
  DETAIL_TITLE_TEXT,
  WHERE_CARD,
} from './layout';
import type { MapPlace } from './types';
import WhereSetExplorer from './WhereSetExplorer';
import { MAP_HEIGHT, MAP_WIDTH, projectToMap } from './worldMap';

/** One Where are they set? per page: its hidden heading names the section */
const HEADING_ID = 'where-set-heading';

/** A show's logo in the detail's 200 × 48 box, else its title written */
// Each place keeps its signed-off look (owner, 15 Nov 2026); unify only with his approval.
const DETAIL_TITLE_LOOK: TitleTreatmentLook = {
  box: DETAIL_LOGO,
  logo: TITLE_LOGO_FIT,
  sizes: '200px',
  text: DETAIL_TITLE_TEXT,
};

/**
 * Where are they set? (HMFinal `e2-card e2-mp`): the board's dotted world
 * map with a white pin per place, and the place's show on the right. The map
 * and every show's image, title (its logo when it has one) and facts are
 * rendered here; the explorer island only picks the pin and, with "More set
 * in {place}", the show. The block starts with the card: its title is a
 * visually hidden heading, for headings navigation and the region's name.
 */
export default function WhereSet({
  featured,
  places,
}: Readonly<{ featured: string; places: ReadonlyArray<WherePlace> }>) {
  const images: ReactNode[] = [];
  const metas: ReactNode[] = [];
  const titles: ReactNode[] = [];
  const mapPlaces: Omit<MapPlace, 'label'>[] = [];
  const points: { name: string; point: { x: number; y: number } }[] = [];

  for (const place of places) {
    const point = projectToMap(place.lat, place.lng);
    if (!point) {
      continue;
    }
    points.push({ name: place.name, point });
    const shows = [place.series, ...place.others].map((series) => {
      images.push(
        series.backdropImage ? (
          <Image
            alt=""
            className="object-cover"
            fill
            key={`${place.slug}-${series.id}`}
            sizes="(min-width: 768px) 460px, 100vw"
            src={series.backdropImage}
          />
        ) : null,
      );
      metas.push(
        <ShowMeta
          className={DETAIL_META}
          key={`${place.slug}-${series.id}`}
          series={series}
        />,
      );
      titles.push(
        <TitleTreatment
          key={`${place.slug}-${series.id}`}
          look={DETAIL_TITLE_LOOK}
          src={series.titleTreatmentImage}
          title={series.title}
        />,
      );
      return {
        href: showPath(series.id, series.slug),
        image: images.length - 1,
        title: series.title,
      };
    });
    mapPlaces.push({
      left: `${(point.x / MAP_WIDTH) * 100}%`,
      name: place.name,
      shows,
      slug: place.slug,
      top: `${(point.y / MAP_HEIGHT) * 100}%`,
    });
  }

  if (mapPlaces.length === 0) {
    return null;
  }
  const phone = labelSides(points, MAP_WIDTH, MAP_HEIGHT, MAP_PX.phone);
  const wide = labelSides(points, MAP_WIDTH, MAP_HEIGHT, MAP_PX.wide);
  const pinned: MapPlace[] = mapPlaces.map((place, index) => ({
    ...place,
    label: {
      phone: phone[index] ?? 'right-up',
      wide: wide[index] ?? 'right-up',
    },
  }));
  const start = Math.max(
    0,
    mapPlaces.findIndex((place) => place.slug === featured),
  );

  return (
    <MomentFrame name="toy">
      <div className={PAGE_COLUMN}>
        <h2 className="sr-only" id={HEADING_ID}>
          {TOY_TITLE['where-set']}
        </h2>
        <section aria-labelledby={HEADING_ID} className={WHERE_CARD}>
          <WhereSetExplorer
            images={images}
            map={<DottedMap />}
            metas={metas}
            places={pinned}
            start={start}
            titles={titles}
          />
        </section>
      </div>
    </MomentFrame>
  );
}
