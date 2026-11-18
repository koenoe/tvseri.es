import { landingSlugForId } from '@tvseri.es/constants';
import type { TvSeries } from '@tvseri.es/schemas';
import Link from 'next/link';
import { Fragment, type ReactNode, Suspense } from 'react';

import { TEXT_LINK_HOVER } from '@/components/header/headerIconButton';
import { PULSE } from '@/components/ui/ghost/ghosts';
import { externalGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import NetworkWordmark from '@/components/ui/network/NetworkWordmark';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';
import { statusLabel } from '@/lib/format/status';
import externalHref from '@/lib/routing/externalHref';
import landingPath, { landingPathFor } from '@/lib/routing/landingPath';

import { loadRuntimes } from '@/lib/series/loaders';
import { INFORMATION_GRID } from '../frames';
import { airedRange, episodesFact, runtimeRange } from './infoFacts';

function Item({
  children,
  label,
  logo,
}: Readonly<{ children: ReactNode; label: string; logo?: boolean }>) {
  return (
    <div
      className={
        logo
          ? 'flex flex-col gap-3 text-body-sm'
          : 'flex flex-col gap-1 text-body-sm'
      }
    >
      <span className="text-white/60">{label}</span>
      <div>{children}</div>
    </div>
  );
}

/** A link in the block: the header's text links' slight dim on hover, no underline */
const link = TEXT_LINK_HOVER;
/** An outside link: its label, then the footer's external-link icon */
const outside = `inline-flex items-center gap-1.5 ${TEXT_LINK_HOVER}`;

async function RuntimeRange({
  series,
}: Readonly<{ series: Pick<TvSeries, 'id' | 'seasons'> }>) {
  const runtimes = await loadRuntimes(series.id);
  const range = isUnavailable(runtimes) ? '' : runtimeRange(runtimes);
  return range ? ` · ${range}` : null;
}

const RUNTIME_GHOST = `ml-2 inline-block h-3 w-20 rounded-4 align-middle ${GHOST_FILL} ${PULSE}`;

/** " · 45–60 min" while the runtimes load: a bar on the line, nothing to wrap. */
function RuntimeSkeleton() {
  return <span aria-hidden="true" className={RUNTIME_GHOST} />;
}

function Network({
  network,
}: Readonly<{ network: NonNullable<TvSeries['network']> }>) {
  const slug = landingSlugForId('network', network.id);
  // false only when the API found the logo can't be whitened (a filled block)
  const silhouette = network.logoSilhouette !== false;
  const content = network.logo ? (
    // A fixed 96 × 32 box (a chip hugs the logo instead): the logo's own
    // shape is unknown until it loads. The intrinsic size is the box at 2×,
    // so the TMDB loader picks a real width.
    <NetworkWordmark
      alt={network.name}
      className="h-8 w-24 max-w-24 object-left"
      height={64}
      silhouette={silhouette}
      sizes="96px"
      src={network.logo}
      width={192}
    />
  ) : (
    network.name
  );
  return slug ? (
    <Link className={link} href={landingPath('network', slug)}>
      {content}
    </Link>
  ) : (
    content
  );
}

function Links({ series }: Readonly<{ series: TvSeries }>) {
  const imdbId = series.externalIds?.imdbId;
  const website = externalHref(series.website);
  const links = [
    imdbId
      ? { href: `https://www.imdb.com/title/${imdbId}/`, label: 'IMDb' }
      : null,
    { href: `https://www.themoviedb.org/tv/${series.id}`, label: 'TMDB' },
    website ? { href: website, label: 'Official site' } : null,
  ].filter((item) => item !== null);
  // a row with gaps, no dots: each link ends in its own icon
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {links.map((item) => (
        <a
          className={outside}
          href={item.href}
          key={item.label}
          rel="noopener noreferrer"
          target="_blank"
        >
          {item.label}
          {/* contrast-exempt: the external-link icon */}
          <Icon className="text-white/40" glyph={externalGlyph} size={13} />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </span>
  );
}

/**
 * The Information block: three columns of facts,
 * links to the country, language and network landings and to IMDb, TMDB and
 * the official site. One column on phones.
 */
export default function Information({
  series,
}: Readonly<{ series: TvSeries }>) {
  const aired = airedRange(series);
  const country = series.originCountry;
  const countryHref = country
    ? landingPathFor('country', country.code)
    : undefined;
  return (
    <>
      <h2 className="mb-6 text-title-2">Information</h2>
      <div className={INFORMATION_GRID} data-slot="information">
        <div className="flex flex-col gap-6">
          {series.originalTitle ? (
            <Item label="Original title">{series.originalTitle}</Item>
          ) : null}
          <Item label="Status">
            {statusLabel(series.status, series.numberOfSeasons)}
          </Item>
          {series.type ? <Item label="Type">{series.type}</Item> : null}
          {aired ? <Item label="Aired">{aired}</Item> : null}
        </div>
        <div className="flex flex-col gap-6">
          {country ? (
            <Item label="Country of origin">
              {countryHref ? (
                <Link className={link} href={countryHref}>
                  {country.name}
                </Link>
              ) : (
                country.name
              )}
            </Item>
          ) : null}
          {series.languages.length > 0 ? (
            <Item label="Spoken languages">
              {series.languages.map((language, index) => {
                const href = `/language/${language.code}`;
                return (
                  <Fragment key={language.code}>
                    {index > 0 ? ', ' : null}
                    <Link className={link} href={href}>
                      {language.englishName}
                    </Link>
                  </Fragment>
                );
              })}
            </Item>
          ) : null}
          <Item label="Episodes">
            {episodesFact(series)}
            <Suspense fallback={<RuntimeSkeleton />}>
              <RuntimeRange series={series} />
            </Suspense>
          </Item>
        </div>
        <div className="flex flex-col gap-6">
          {series.network ? (
            <Item label="Network" logo={Boolean(series.network.logo)}>
              <Network network={series.network} />
            </Item>
          ) : null}
          <Item label="Links">
            <Links series={series} />
          </Item>
        </div>
      </div>
    </>
  );
}
