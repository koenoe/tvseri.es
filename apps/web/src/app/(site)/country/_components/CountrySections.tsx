import { Suspense } from 'react';

import { calendarGlyph } from '@/components/ui/icon/glyphs';
import GuardedSection from '@/components/ui/row/GuardedSection';
import RowError from '@/components/ui/row/RowError';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import { isUnavailable } from '@/lib/cache/unavailable';
import type { CountryNames } from '../../_discover/data/countryNames';
import { getLandingFacts } from '../../_discover/data/facts';
import { getWhereToStart } from '../../_discover/data/whereToStart';
import {
  END_LINE,
  LandingEndCard,
  LandingRow,
  LandingRowSlot,
  LandingSections,
  WhereToStart,
  WhereToStartSkeleton,
} from '../../_discover/landing';
import { SwitchGhost } from '../../_discover/landing/skeletons';
import { fillStartSlots } from '../../_discover/landing/startSlots';
import { secondRow } from '../_data/madeFor';
import { countryRowLoaders } from '../_data/rows';

/** Rows of `countryRowLoaders` (0 is Where to start's picks) */
const ROW = { fresh: 2, second: 1 } as const;
/** The country landing words the weekend pick its own way */
const KICKERS = { weekend: 'One weekend' } as const;

const newTitle = (name: string) => `New from ${name}`;

async function CountryStart({ code }: Readonly<{ code: string }>) {
  const picks = await getWhereToStart('country', code);
  if (isUnavailable(picks)) {
    return <WhereToStartSkeleton look="failed" />;
  }
  return (
    <WhereToStart
      id="country-start"
      kickers={KICKERS}
      picks={fillStartSlots(picks, new Set())}
      second="network"
    />
  );
}

/**
 * "Made for" with the broadcaster switch (or "Best from" when fewer than 3
 * networks qualify), then "New from" (the last 3 years, minus the open tab).
 */
async function CountryRows({
  names,
  slug,
}: Readonly<{ names: CountryNames; slug: string }>) {
  const facts = await getLandingFacts('country', slug);
  if (isUnavailable(facts)) {
    return (
      <>
        <RowError id="country-made-for" state="unavailable" title="Made for" />
        <RowError
          id="country-new"
          state="unavailable"
          title={newTitle(names.name)}
        />
      </>
    );
  }
  if (facts?.type !== 'country') {
    return null;
  }
  const second = secondRow(facts.madeFor);
  const loaders = countryRowLoaders(names.code, second);
  const bestTitle = `Best from ${names.name}`;
  return (
    <>
      {second.kind === 'made-for' ? (
        <LandingRowSlot id="country-made-for" switcher title="Made for">
          <LandingRow
            id="country-made-for"
            index={ROW.second}
            loaders={loaders}
            switchLabel="Broadcaster"
            tabs={second.tabs}
            title="Made for"
          />
        </LandingRowSlot>
      ) : (
        <LandingRowSlot id="country-best" title={bestTitle}>
          <LandingRow
            id="country-best"
            index={ROW.second}
            loaders={loaders}
            title={bestTitle}
          />
        </LandingRowSlot>
      )}
      <LandingRowSlot id="country-new" title={newTitle(names.name)}>
        <LandingRow
          id="country-new"
          index={ROW.fresh}
          loaders={loaders}
          phoneTitle={`New from ${names.proseShort}`}
          subtitle="First aired in the last 3 years"
          subtitleGlyph={calendarGlyph}
          title={newTitle(names.name)}
        />
      </LandingRowSlot>
    </>
  );
}

/**
 * The rows' place until the facts say whether there is a broadcaster
 * switch. Without the name (the page's shell) the title that carries it is
 * a bar.
 */
function CountryRowsSkeleton({ name }: Readonly<{ name?: string }>) {
  return (
    <>
      <RowSkeleton
        id="country-made-for"
        look="landing"
        switcher={<SwitchGhost />}
        title="Made for"
      />
      <RowSkeleton
        id="country-new"
        look="landing"
        title={name ? newTitle(name) : 'New'}
        titleGhost={!name}
      />
    </>
  );
}

/** The whole body before the slug is known (the shell of a country nobody has visited) */
export function CountrySectionsSkeleton() {
  return (
    <LandingSections placeholder start="loose">
      <WhereToStartSkeleton title="Where to start" />
      <CountryRowsSkeleton />
      <LandingEndCard line={END_LINE.country} title="" titleGhost />
    </LandingSections>
  );
}

/**
 * Below the country hero: Where to start (favourite, one weekend, the long
 * haul; the network as the middle meta item), the rows, the end card. Each
 * block streams and fails on its own; titles and the end card are static.
 */
export default function CountrySections({
  names,
  slug,
}: Readonly<{ names: CountryNames; slug: string }>) {
  return (
    <LandingSections start="loose">
      <GuardedSection
        fallback={<WhereToStartSkeleton />}
        id="country-start"
        title="Where to start"
      >
        <CountryStart code={names.code} />
      </GuardedSection>
      <Suspense fallback={<CountryRowsSkeleton name={names.name} />}>
        <CountryRows names={names} slug={slug} />
      </Suspense>
      <LandingEndCard
        line={END_LINE.country}
        phoneTitle={`That’s ${names.prose}`}
        title={`That’s ${names.name}`}
      />
    </LandingSections>
  );
}
