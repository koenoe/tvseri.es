import { Suspense } from 'react';

import { variantFilmStripGlyph } from '@/components/ui/icon/glyphs';
import RowError from '@/components/ui/row/RowError';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import { isUnavailable } from '@/lib/cache/unavailable';

import { getLandingFacts } from '../../_discover/data/facts';
import {
  END_LINE,
  LandingEndCard,
  LandingRow,
  LandingRowSlot,
  LandingSections,
} from '../../_discover/landing';
import { SwitchGhost } from '../../_discover/landing/skeletons';
import { bestOf } from '../_data/bestOf';
import { originalsLine } from '../_data/originals';
import { networkRowLoaders } from '../_data/rows';
import type { NetworkEntry } from './NetworkHero';

/** Rows below the tile (`networkRowLoaders` index 0 is the tile's show) */
const ROW = { best: 1, originals: 3, running: 2 } as const;

const titles = (name: string) => ({
  best: `The best of ${name}`,
  originals: `${name} originals`,
  running: 'Still running',
});

/**
 * The rows' place until the facts say which switch and which rows there
 * are. Without the name (the page's shell, before the slug is known) the
 * titles that carry it are bars.
 */
function NetworkRowsSkeleton({ name }: Readonly<{ name?: string }>) {
  const title = name ? titles(name) : undefined;
  const bestTitle = title?.best ?? 'The best';
  const runningTitle = titles('').running;
  const originalsTitle = title?.originals ?? 'Originals';
  const nameGhost = !title;
  return (
    <>
      <RowSkeleton
        id="network-best"
        look="landing"
        switcher={<SwitchGhost />}
        title={bestTitle}
        titleGhost={nameGhost}
      />
      <RowSkeleton id="network-running" look="landing" title={runningTitle} />
      <RowSkeleton
        id="network-originals"
        look="landing"
        title={originalsTitle}
        titleGhost={nameGhost}
      />
    </>
  );
}

/** The whole body before the slug is known (the shell of a network nobody has visited): the rows and the end card */
export function NetworkSectionsSkeleton() {
  return (
    <div className="md:pt-14">
      <LandingSections placeholder start="loose">
        <NetworkRowsSkeleton />
        <LandingEndCard line={END_LINE.network} title="" titleGhost />
      </LandingSections>
    </div>
  );
}

/** The rows when the facts are `Unavailable`: the failed row each */
function NetworkRowsUnavailable({ name }: Readonly<{ name: string }>) {
  const title = titles(name);
  return (
    <>
      <RowError id="network-best" state="unavailable" title={title.best} />
      <RowError
        id="network-running"
        state="unavailable"
        title={title.running}
      />
      <RowError
        id="network-originals"
        state="unavailable"
        title={title.originals}
      />
    </>
  );
}

/**
 * "The best of {network}" with the switch the data picks, "Still running"
 * (minus the row above), "{network} originals" with how many first aired
 * there. A row with fewer than three shows is left out; each streams and fails on its own.
 */
async function NetworkRows({ network }: Readonly<{ network: NetworkEntry }>) {
  const facts = await getLandingFacts('network', network.slug);
  if (isUnavailable(facts)) {
    return <NetworkRowsUnavailable name={network.name} />;
  }
  if (facts?.type !== 'network') {
    return null;
  }
  const best = bestOf(facts.bestBy);
  const loaders = networkRowLoaders(network.id, facts, best);
  const originals = originalsLine(facts.originals, facts.count, network.name);
  const title = titles(network.name);
  const tabs = best.kind === 'tabs' ? best.tabs : undefined;
  const switchLabel = best.kind === 'tabs' ? best.label : undefined;
  const hasSwitch = best.kind === 'tabs';
  return (
    <>
      <LandingRowSlot id="network-best" switcher={hasSwitch} title={title.best}>
        <LandingRow
          id="network-best"
          index={ROW.best}
          loaders={loaders}
          switchLabel={switchLabel}
          tabs={tabs}
          title={title.best}
        />
      </LandingRowSlot>
      <LandingRowSlot id="network-running" title={title.running}>
        <LandingRow
          id="network-running"
          index={ROW.running}
          loaders={loaders}
          title={title.running}
        />
      </LandingRowSlot>
      {originals ? (
        <LandingRowSlot id="network-originals" title={title.originals}>
          <LandingRow
            id="network-originals"
            index={ROW.originals}
            loaders={loaders}
            subtitle={originals}
            subtitleGlyph={variantFilmStripGlyph}
            title={title.originals}
          />
        </LandingRowSlot>
      ) : null}
    </>
  );
}

/**
 * Below the network hero (56 + 64 under the tile): the rows, then the end
 * card, which needs no data and is in the static shell.
 */
export default function NetworkSections({
  network,
}: Readonly<{ network: NetworkEntry }>) {
  const endTitle = `That’s ${network.name}`;
  return (
    <div className="md:pt-14">
      <LandingSections start="loose">
        <Suspense fallback={<NetworkRowsSkeleton name={network.name} />}>
          <NetworkRows network={network} />
        </Suspense>
        <LandingEndCard line={END_LINE.network} title={endTitle} />
      </LandingSections>
    </div>
  );
}
