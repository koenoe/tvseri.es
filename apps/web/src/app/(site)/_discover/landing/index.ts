/**
 * The landing template: what the six Discover landings share.
 * A landing page is
 *
 * ```tsx
 * <LandingPage ground="#1c1916">
 *   <Suspense fallback={<LandingHeroSkeleton crumb={crumb} facts={4} glow={GLOW} />}>
 *     <KindHero params={params} />          // the route's own hero, built from the parts below
 *   </Suspense>
 *   <Suspense fallback={<GenreSectionsSkeleton />}>
 *     <KindSections params={params} />      // <LandingSections> with slots, ending in <LandingEndCard>
 *   </Suspense>
 * </LandingPage>
 *
 * // KindHero: the crumb, the title from the slug and the data blocks, all prerendered
 * <LandingHero labelledBy="kind-title" aside={<Suspense fallback={<SpotlightSkeleton />}><KindTile /></Suspense>}>
 *   <KindCrumb />
 *   <LandingTitle id="kind-title">{titleFromSlug}</LandingTitle>
 *   <Suspense fallback={<LandingHeroDetailsSkeleton facts={4} />}>
 *     <KindHeroDetails slug={slug} />       // its skeleton again for `Unavailable`
 *   </Suspense>
 * </LandingHero>
 * ```
 *
 * Data at build time: the hero and the rows read `use cache`
 * loaders and prerender into the static shell (per slug). Every block that
 * calls the API is its own Server Component in a `<Suspense>` (plus a slot's
 * error boundary) and draws its skeleton when a loader returns `Unavailable`;
 * `LandingRow` does so itself. Import from here in Server Components only
 * (some parts are `server-only`). The per-kind hero lives in its route
 * folder; facts only through `getLandingFacts`.
 */

/** `END_LINE[type]`: the end card's line, "Try another genre next."; `INDEX_END_LINE` on the index pages. */
export { END_LINE, INDEX_END_LINE } from './endLines';
/**
 * Numbers as the landings write them: `formatCount` "10,927",
 * `formatShows` "146 shows", `formatSeasons` "7 seasons" / "9 episodes",
 * `keywordLabel` (a chip or tab: the design's wording for a few keywords).
 */
export {
  formatCount,
  formatSeasons,
  formatShows,
  keywordLabel,
} from './format';
/**
 * `<LandingChipRow id index loaders loadTabs slug switchLabel title>` (async, server):
 * a `LandingRow` with a switch of keyword tabs from the facts' chips (Genre's
 * by kind, Theme's Next door). Put it in `<LandingRowSlot switcher>`.
 */
export { default as LandingChipRow } from './LandingChipRow';
/** `<LandingEndCard title line>`: the end of the page, with only "Back to Discover". */
export { default as LandingEndCard } from './LandingEndCard';
/**
 * The hero's parts. `<LandingHero labelledBy glow? aside?>`: both
 * hero patterns (title-led, or title left + `aside` tile right; under it on
 * a phone); `glow` is a static CSS background that fades out on every side,
 * drawn from the top of the page under the header.
 * `<LandingCrumb label href?>` ("Discover › Genres", static, `data-testid="landing-crumb"`),
 * `<LandingTitle id>` (display h1), `<LandingLine>` (body; body-sm on a phone),
 * `<LandingFacts facts>` (numeral over caption; 2 × 2 on a phone),
 * `<LandingChips chips heading?>` (links to landings, wrapping as a show's keywords do).
 * `<PlainHeroFrame crumb labelledBy>`: the hero of Language and Decade
 * (no tile, no glow), its heading as `children`.
 * `TITLE_SPACE`: the title's phone margins, for a placeholder that draws
 * the title's place itself.
 */
export {
  type LandingChip,
  LandingChips,
  LandingCrumb,
  LandingFacts,
  LandingHero,
  LandingLine,
  LandingTitle,
  PlainHeroFrame,
  TITLE_SPACE,
} from './LandingHero';
/** `<LandingPage ground>`: the page in the landing's ground hex, no backdrop, with the switch state its rows share. */
export { default as LandingPage, LandingShell } from './LandingPage';
/**
 * `<LandingRow id title index loaders subtitle? subtitleGlyph? switchLabel? tabs?>`
 * (async, server): a poster row on the shared `Row`/`PosterTile` that never
 * repeats the rows above it (`planRow`), with Watched labels, the "You’ve
 * seen" line and, for a tabs source, the row switch (swapped client-side in
 * the same frame). Put it in `<LandingRowSlot id title switcher?>`.
 */
export { default as LandingRow } from './LandingRow';
/**
 * `<LandingSections start?>`: everything below the hero, 64 between sections
 * (48 on a phone); `start="loose"` = 64 under a hero with a tile, else 48.
 * `<LandingRowSlot id title switcher?>`: one streamed poster row with its
 * own error state and skeleton; any other streamed section is a
 * `GuardedSection` (`@/components/ui/row/GuardedSection`) with its skeleton.
 */
export {
  LandingRowSlot,
  LandingSections,
} from './LandingSections';
/**
 * `<LandingShowCount type slug className?>` (async, server): "41,800 shows"
 * from the facts (its skeleton while the API can't answer); wrap it in
 * `<Suspense fallback={<LandingShowCountSkeleton />}>` inside a `MetaRow`.
 */
export {
  default as LandingShowCount,
  LandingShowCountSkeleton,
} from './LandingShowCount';
/**
 * `<LandingStart by value index loaders>` (async, server): Where to start
 * under the rows above it, without the picks they draw. Put it in a
 * `<GuardedSection>` with `<WhereToStartSkeleton>`.
 */
export { default as LandingStart } from './LandingStart';
/**
 * `RowLoader`: `() => Promise<RowSource<RowShow>>`, one per row, top to
 * bottom (`planRow` plans each row against the rows above; rows draw 20
 * unless their source says less).
 */
export type { RowLoader } from './planRow';
/** `<RankedList id title subtitle items>`: "The 50 best", 10 a page with arrows and "1–10 of 50"; 5 more at a time on a phone. */
export { default as RankedList, type RankedShow } from './RankedList';
/** `<Spotlight show kicker meta? reason>`: the recommendation tile (backdrop, kicker, title, meta, reason, Watchlist + Seen it). */
export { default as Spotlight } from './Spotlight';
/**
 * Skeletons: `<LandingHeroSkeleton crumb facts? chips? chipsHeading? line? aside? glow?>`
 * (the whole hero before the slug is known), `<LandingHeroDetailsSkeleton
 * facts? chips? chipsHeading? line?>` (everything under the title while the
 * hero's data loads; `line` the real static line or `true` for a bar),
 * `<SpotlightSkeleton>`, `<PlainHeadingSkeleton id>` (a `PlainHeroFrame`'s
 * heading), `<TitleLineGhost width className? name?>` (one line of a
 * display title: its line box with the bar centred),
 * (each page composes its own whole-body placeholder from these and
 * `RowSkeleton` for the shell of a slug nobody has visited),
 * `<WhereToStartSkeleton title?>`, `<RankedListSkeleton title>`. Poster rows
 * get theirs from `LandingRowSlot`. `look="failed"` (details, tile, Where to
 * start, ranked list, count) is the section's state when its data is
 * `Unavailable` (the failed look, settled, not busy); the default
 * `loading` is for Suspense fallbacks only. `<SectionPlaceholder look title>`
 * frames another section's slots the same way (the title wall).
 */
export {
  LandingHeroDetailsSkeleton,
  LandingHeroSkeleton,
  type PlaceholderLook,
  PlainHeadingSkeleton,
  RankedListSkeleton,
  SectionPlaceholder,
  SpotlightSkeleton,
  TitleLineGhost,
  WhereToStartSkeleton,
} from './skeletons';
/** `toRowShow`: trims a `TileShow` or a pick to what a poster row sends per show (`RowShow`). */
export { toRowShow } from './types';
/** `<WhereToStart id picks second? title?>`: up to three cards (kicker, poster, title, meta, reason); `second="network"` for Country. */
export { default as WhereToStart } from './WhereToStart';
