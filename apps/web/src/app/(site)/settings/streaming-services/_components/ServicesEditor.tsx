'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { regionName } from '@tvseri.es/utils';
import {
  type ChangeEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createLoader } from '@/lib/lazy/createLoader';
import { useLoader } from '@/lib/lazy/useLoader';
import { useSelectedServices } from '@/lib/watchProviders/useSelectedServices';
import { popularLabel, restOf } from '../_lib/popular';
import { hasMismatch, regionLine } from '../_lib/region';
import { useRegion } from '../_lib/useRegion';
import ComboboxSkeleton from './ComboboxSkeleton';
import MismatchLine from './MismatchLine';
import PopularCard from './PopularCard';
import RegionCard from './RegionCard';
import ServicesShelf from './ServicesShelf';

// The list loads the first time it opens (or when the pointer reaches
// Change); its flags load as their rows are drawn. A plain loader, not
// `next/dynamic`: a chunk that failed to load is tried again on the next open.
const combobox = createLoader(() =>
  import('./CountryCombobox').then((module) => module.default),
);

/**
 * Region and services: one client island so the region card, the "Popular in
 * …" title and the tiles move together. Everything saves at once with a toast.
 */
export default function ServicesEditor({
  detected,
  initialRegion,
  initialSelected,
  providers,
}: Readonly<{
  /** The visitor's country from the geo header; null when there is none. */
  detected: string | null;
  initialRegion: string;
  initialSelected: ReadonlyArray<WatchProvider>;
  /** The region's services, in TMDB order. */
  providers: ReadonlyArray<WatchProvider>;
}>) {
  const { choose, region } = useRegion(initialRegion);
  const { reorder, selected, toggle } = useSelectedServices(initialSelected);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const changeButton = useRef<HTMLButtonElement>(null);
  const comboboxId = useId();
  // a failed chunk keeps the skeleton; the next open loads it again
  const [CountryCombobox] = useLoader(combobox, open);

  const rest = useMemo(
    () => restOf({ providers, query, selected, showAll }),
    [providers, query, selected, showAll],
  );

  const toggleOpen = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => {
    setOpen(false);
    changeButton.current?.focus();
  }, []);
  const onPick = useCallback(
    (code: string) => {
      choose(code, true);
      close();
    },
    [choose, close],
  );
  const onUseDetected = useCallback(() => {
    if (detected) {
      choose(detected, true);
    }
  }, [choose, detected]);
  const onQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);
  const toggleAll = useCallback(() => setShowAll((value) => !value), []);

  const name = regionName(region);
  const regionLineText = regionLine(region, detected);
  const popular = popularLabel(name, query);
  const popularTitle = popularLabel(name, '');
  return (
    <>
      <RegionCard
        buttonRef={changeButton}
        code={region}
        controls={comboboxId}
        line={regionLineText}
        name={name}
        onPreload={combobox.preload}
        onToggle={toggleOpen}
        open={open}
      />
      {detected && hasMismatch(region, detected) ? (
        <MismatchLine
          chosen={{ code: region, name }}
          detected={{ code: detected, name: regionName(detected) }}
          onUseDetected={onUseDetected}
        />
      ) : null}
      {open && CountryCombobox ? (
        <CountryCombobox
          id={comboboxId}
          onClose={close}
          onPick={onPick}
          selected={region}
        />
      ) : null}
      {open && !CountryCombobox ? <ComboboxSkeleton /> : null}
      <ServicesShelf
        onReorder={reorder}
        onToggle={toggle}
        popularTitle={popularTitle}
        selected={selected}
      />
      <PopularCard
        label={popular}
        onQuery={onQuery}
        onToggle={toggle}
        onToggleAll={toggleAll}
        query={query}
        rest={rest}
        showAll={showAll}
      />
    </>
  );
}
