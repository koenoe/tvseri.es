import type { Feature } from '@tvseri.es/schemas';
import Link from 'next/link';

import ButtonLink from '@/components/ui/button/ButtonLink';
import {
  arrowRightGlyph,
  variantFilmStripGlyph,
} from '@/components/ui/icon/glyphs';
import showPath from '@/lib/routing/showPath';
import { PAGE_COLUMN } from '../../frame';
import MomentLabel from '../../MomentLabel';
import { FEATURE_TITLE } from '../../moments';
import { BINGE_HEADLINE_FACTS, BINGE_HEADLINE_LINK } from '../binge/layout';
import { MomentFrame } from '../Moment';
import {
  STILLS_CARD,
  STILLS_CONTENT,
  STILLS_FACTS_DOT,
  STILLS_FACTS_LINE,
  STILLS_GRID,
  STILLS_HEADLINE,
  STILLS_LABEL,
  STILLS_OPEN,
  stillsGridStyles,
} from './layout';
import SeasonPicture from './SeasonPicture';
import StillTile from './StillTile';
import { seasonFacts, stillLabel } from './stillsCopy';
import { STILLS_MAX } from './stillsLayout';

type Stills = Extract<Feature, Readonly<{ kind: 'stills' }>>;

const LABEL_ID = 'stills-label';

const FACTS = `${BINGE_HEADLINE_FACTS} ${STILLS_FACTS_LINE}`;

/**
 * One season in stills: the
 * breaker card with its label, a headline as the Binge calculator's ("The
 * Bear, season 2 in stills · 10 episodes, June 2023") with "Open {series}"
 * at its right end, then the season picture beside six to twelve episode
 * stills, each opening its episode. On a phone the picture, the stills,
 * then the pill. The API only sends a season that passes the quality rule
 * (6 stills ≥ 1280×720 at 16:9, voted; up to 12, laid out by
 * `stillsLayout.ts`), so there is no fallback here.
 */
export default function SeasonInStills({
  feature,
}: Readonly<{ feature: Stills }>) {
  const { season, series } = feature;
  const base = showPath(series.id, series.slug);
  const seasonHref = `${base}?season=${season.seasonNumber}`;
  const facts = seasonFacts(season);
  const open = `Open ${series.title}`;
  const stills = feature.stills.slice(0, STILLS_MAX);
  const grid = stillsGridStyles(stills.length);
  const tiles = stills.map((still, index) => ({
    href: `${seasonHref}&episode=${still.episodeNumber}`,
    label: stillLabel({
      episodeNumber: still.episodeNumber,
      seasonNumber: season.seasonNumber,
      seriesTitle: series.title,
      title: still.title,
    }),
    number: still.episodeNumber,
    src: still.image,
    style: grid.tiles[index],
  }));
  return (
    <MomentFrame name="feature">
      <section aria-labelledby={LABEL_ID} className={PAGE_COLUMN}>
        <div className={STILLS_CARD}>
          <MomentLabel
            className={STILLS_LABEL}
            glyph={variantFilmStripGlyph}
            id={LABEL_ID}
            title={FEATURE_TITLE.stills}
          />
          <h3 className={STILLS_HEADLINE}>
            <Link className={BINGE_HEADLINE_LINK} href={base}>
              {series.title}
            </Link>
            , season {season.seasonNumber} in stills{' '}
            {facts ? (
              <em className={FACTS}>
                <span className={STILLS_FACTS_DOT}>· </span>
                {facts}
              </em>
            ) : null}
          </h3>
          <ButtonLink
            className={STILLS_OPEN}
            href={base}
            icon={arrowRightGlyph}
          >
            {open}
          </ButtonLink>
          <div className={STILLS_CONTENT}>
            <SeasonPicture href={seasonHref} season={season} series={series} />
            <div className={STILLS_GRID} style={grid.grid}>
              {tiles.map((tile) => (
                <StillTile key={tile.number} {...tile} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </MomentFrame>
  );
}
