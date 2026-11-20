'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { regionName } from '@tvseri.es/utils';
import { AnimatePresence } from 'motion/react';
import {
  type ChangeEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import FoldPresence from '@/components/motion/FoldPresence';
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
 * The strip and the country list sit 8px under the region card. Each folds
 * in and out, taking the column's 24px gap back and drawing its own 8px, so
 * the fold's clip, while it moves, never cuts a negative margin.
 */
const UNDER_CARD_FOLD = '-mt-6';
const UNDER_CARD_GAP = 'pt-2';

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
  // The strip and its button leave: focus goes to the card it belongs to
  const onUseDetected = useCallback(() => {
    if (detected) {
      choose(detected, true);
      changeButton.current?.focus();
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
  // Where the visitor is, while it differs from the chosen country
  const mismatch = detected && hasMismatch(region, detected) ? detected : null;
  const chosenPlace = { code: region, name };
  const detectedPlace = mismatch
    ? { code: mismatch, name: regionName(mismatch) }
    : null;
  // Only while the list is there to point at (not its skeleton)
  const controls = open && CountryCombobox ? comboboxId : undefined;
  // The skeleton hands over to the list in place, at once (no fade): both
  // are 348px
  const picker = CountryCombobox ? (
    <CountryCombobox
      id={comboboxId}
      onClose={close}
      onPick={onPick}
      selected={region}
    />
  ) : (
    <ComboboxSkeleton />
  );
  return (
    <>
      <RegionCard
        buttonRef={changeButton}
        code={region}
        controls={controls}
        line={regionLineText}
        name={name}
        onPreload={combobox.preload}
        onToggle={toggleOpen}
        open={open}
      />
      <AnimatePresence initial={false}>
        {detectedPlace ? (
          <FoldPresence className={UNDER_CARD_FOLD} key="mismatch">
            <div className={UNDER_CARD_GAP}>
              <MismatchLine
                chosen={chosenPlace}
                detected={detectedPlace}
                onUseDetected={onUseDetected}
              />
            </div>
          </FoldPresence>
        ) : null}
        {open ? (
          <FoldPresence className={UNDER_CARD_FOLD} key="picker">
            <div className={UNDER_CARD_GAP}>{picker}</div>
          </FoldPresence>
        ) : null}
      </AnimatePresence>
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
