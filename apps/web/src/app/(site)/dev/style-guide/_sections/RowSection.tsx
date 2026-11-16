import { type ReactNode, Suspense } from 'react';

import { variantBurstGlyph } from '@/components/ui/icon/glyphs';
import Row from '@/components/ui/row/Row';
import RowError from '@/components/ui/row/RowError';
import RowErrorBoundary from '@/components/ui/row/RowErrorBoundary';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import { ROW_IMAGE_SIZES } from '@/components/ui/row/rowLayout';
import BackdropTile from '@/components/ui/tile/BackdropTile';
import PosterTile from '@/components/ui/tile/PosterTile';
import RankedTile from '@/components/ui/tile/RankedTile';
import WatchedLabel from '@/components/ui/tile/WatchedLabel';

import Section from './Section';

const poster = (path: string) =>
  `https://image.tmdb.org/t/p/w300_and_h450_bestv2/${path}`;

/** Real TMDB art; ids are illustrative (the show pages are placeholders). */
export const SHOWS = [
  ['Breaking Bad', 'anFx9aTOOYqgS3v7x3R84Kz67ly.jpg', true],
  ['Severance', 'pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg', true],
  ['Silo', 'r2QXomqKjkKHVtYGGtkf2l2Y7go.jpg', false],
  ['Slow Horses', 'AdYr4DjOgXvDUMwu6vEhZy1Rnxk.jpg', false],
  ['Pluribus', 'z7Nga7Q9IGFWs5OEduY2gGFxnX3.jpg', false],
  ['Dark', 'wiiyc3m6HKaQhFBYeuM7ySCNQsG.jpg', false],
  ['Chernobyl', 'hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg', true],
  ['Shrinking', 'zEFKMNPBKq6JG7uuDkzTQ9WwErn.jpg', false],
  ['The Studio', '2c6ofLTa5CRfeQjVA1bWiYBdxQN.jpg', false],
  ['For All Mankind', 'JP3DItWMbrrLiKR5AYUfpsNf2b.jpg', false],
  ['Dept. Q', '8WdxigrmISyE84bxViHDX2hTI4T.jpg', false],
  ['Adolescence', '20i4nShZZg1g1VFHSB8xpaYM4r7.jpg', false],
].map(([title, path, watched], i) => ({
  id: 1000 + i,
  poster: poster(String(path)),
  slug: String(title)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-'),
  title: String(title),
  watched: watched === true,
}));

const backdrop = (path: string) =>
  `https://image.tmdb.org/t/p/w1920_and_h1080_multi_faces/${path}`;
const logo = (path: string) => `https://image.tmdb.org/t/p/w500/${path}`;

export const BACKDROPS = [
  [
    'Slow Horses',
    'gPQppUnLx9vqPDLz3WwZ2HJsNbt.jpg',
    'peE0Gab2MWjXPlAYhakxjHciNPr.png',
  ],
  [
    'VisionQuest',
    '31o1Ufd7bStD5dGEcpzapOjwaqx.jpg',
    'mQwaoWvWJGiuVY6CT1V6AiuSIqi.png',
  ],
  ['MobLand', 'h0OC7ouop8YLwbAVfS3UUE2Lw4T.jpg', null],
  ['Slow Horses, again', 'gPQppUnLx9vqPDLz3WwZ2HJsNbt.jpg', null],
  [
    'VisionQuest, again',
    '31o1Ufd7bStD5dGEcpzapOjwaqx.jpg',
    'mQwaoWvWJGiuVY6CT1V6AiuSIqi.png',
  ],
].map(([title, image, mark], i) => ({
  backdrop: backdrop(String(image)),
  id: 2000 + i,
  logo: mark ? logo(mark) : null,
  title: String(title),
}));

type Show = (typeof SHOWS)[number];

/** A poster with the Watched label, as a signed-in visitor sees it. */
export function ShowPoster({ show }: Readonly<{ show: Show }>) {
  const overlay = show.watched ? <WatchedLabel /> : null;
  return (
    <PosterTile
      id={show.id}
      overlay={overlay}
      poster={show.poster}
      slug={show.slug}
      title={show.title}
    />
  );
}

const posterTiles = (shows: ReadonlyArray<Show>) =>
  shows.map((show) => <ShowPoster key={show.id} show={show} />);

/** A streamed row whose data always fails, to try the real boundary. */
async function FailingRow(): Promise<ReactNode> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  throw new Error('Style guide: this row always fails');
}

const LIVE_TITLE = 'Live: RowErrorBoundary (press Try again)';

/** The real boundary around a streamed row that fails. */
function LiveRowError() {
  const skeleton = <RowSkeleton id="sg-live" title={LIVE_TITLE} />;
  return (
    <RowErrorBoundary id="sg-live" title={LIVE_TITLE}>
      <Suspense fallback={skeleton}>
        <FailingRow />
      </Suspense>
    </RowErrorBoundary>
  );
}

/** A profile-style main column: clipped at the column, bleeding right. */
function ColumnRow() {
  return (
    <div className="md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-16 md:pl-[max(32px,calc((100vw-1280px)/2+32px))]">
      <p className="px-4 pb-6 text-body-sm text-white/60 md:px-0">
        Profile column: the row clips at the column and bleeds right.
      </p>
      <Row
        count={42}
        id="sg-watchlist"
        inset="column"
        seeAllHref="/u/margaux/watchlist"
        tiles="posterCompact"
        title="Watchlist"
      >
        {SHOWS.map((show) => (
          <PosterTile
            id={show.id}
            key={show.id}
            poster={show.poster}
            sizes={ROW_IMAGE_SIZES.posterCompact}
            slug={show.slug}
            title={show.title}
          />
        ))}
      </Row>
    </div>
  );
}

/** Twenty ranks from the twelve shows (ids kept unique) */
const RANKED = Array.from({ length: 20 }, (_, index) => {
  const show = SHOWS[index % SHOWS.length]!;
  return { ...show, id: 3000 + index, rank: index + 1 };
});

/**
 * The numbered row (a numbered top 10, Discover's All-time favourites):
 * the real tile in the real row, then its placeholder.
 */
function RankedRows() {
  const watched = <WatchedLabel />;
  return (
    <>
      <p className="mx-auto w-full max-w-page px-gutter text-body-sm text-white/60">
        Numbered row (V4): only for a list whose order means something (top
        rated, trending). Outlined numerals 240px behind 180px posters at 1024px
        and up, scaled together below; 10 to 20 each condensed to fit left of
        the poster, so every item keeps the pitch and every digit shows. Exactly
        20 on Discover (the variant takes any fixed count); at most one numbered
        row per page.
      </p>
      <Row
        id="sg-ranked"
        look="hubRanked"
        tiles="ranked"
        title="All-time favourites"
      >
        {RANKED.map((show) => (
          <RankedTile
            id={show.id}
            key={show.id}
            overlay={show.watched ? watched : null}
            poster={show.poster}
            rank={show.rank}
            slug={show.slug}
            title={show.title}
          />
        ))}
      </Row>
      <RowSkeleton
        id="sg-ranked-skeleton"
        look="hubRanked"
        tiles="ranked"
        title="Loading (RowSkeleton tiles=ranked)"
      />
    </>
  );
}

/** Rows bleed to the window edges, so they leave the page column. */
function Bleed({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="mt-12 ml-[calc(50%-50vw)] flex w-screen flex-col gap-16">
      {children}
    </div>
  );
}

export default function RowSection() {
  const short = SHOWS.slice(0, 3);
  const reversed = [...SHOWS].reverse();
  return (
    <Section
      id="rows"
      source="HLFinal, HLFinalMobile, HMFinal, ERFinal (resize to 390 and 1440)"
      title="Rows"
    >
      <p className="text-body text-white/80">
        Arrows only with a fine pointer and only when the row overflows. Back
        after scrolling a row restores it.
      </p>
      <Bleed>
        <Row id="sg-top-picks" title="Top Picks for November">
          {posterTiles(SHOWS)}
        </Row>
        <Row
          id="sg-hidden-gems"
          subtitle="Loved by the few who found them"
          subtitleGlyph={variantBurstGlyph}
          title="Hidden gems"
        >
          {posterTiles(reversed)}
        </Row>
        <Row id="sg-more-sci-fi" tiles="backdrop" title="More Sci-Fi & Fantasy">
          {BACKDROPS.map((show) => (
            <BackdropTile key={show.id} {...show}>
              <span className="text-meta text-white/60">Sci-Fi & Fantasy</span>
            </BackdropTile>
          ))}
        </Row>
        <RankedRows />
        <Row id="sg-short" title="A row that fits: no arrows">
          {posterTiles(short)}
        </Row>
        <ColumnRow />
        <RowSkeleton id="sg-skeleton" title="Loading (RowSkeleton)" />
        <RowError
          id="sg-error"
          state="failed"
          subtitle="Loved by the few who found them"
          tiles="posterCompact"
          title="Hidden gems"
        />
        <RowError id="sg-retrying" state="retrying" title="Hidden gems" />
        <LiveRowError />
      </Bleed>
    </Section>
  );
}
