'use client';

import { regionName } from '@tvseri.es/utils';
import {
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
} from 'react';
import { checkGlyph, searchGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { focusOnMountInPlace } from '@/lib/a11y/focusOnMount';
import cn from '@/lib/cn';
import { moveSelection } from '@/lib/grid/moveSelection';

import InputShell, { INPUT_CLASS } from '../../_components/InputShell';
import {
  type Country,
  filterCountries,
  listCountries,
} from '../_lib/countries';
import Flag from './Flag';

const COUNTRIES = listCountries(regionName);
const SEARCH_PLACEHOLDER = `Search ${COUNTRIES.length} countries`;

const keepFocus = (event: MouseEvent) => event.preventDefault();

/** Scrolls the keyboard-active option into view as it changes. */
const reveal = (node: HTMLElement | null) => {
  node?.scrollIntoView?.({ block: 'nearest' });
};

type Props = Readonly<{
  /** Id of the dialog, for the Change button's `aria-controls`. */
  id: string;
  onClose: () => void;
  /** The country picked and its flag, so the card can draw it. */
  onPick: (code: string) => void;
  selected: string;
}>;

/**
 * The country list: an ARIA 1.2 combobox. The filter
 * input owns focus; Arrow keys move the active option, Enter picks it,
 * Escape closes. Every country comes from `Intl.DisplayNames`, flags are SVG
 * files loaded as their rows are drawn (this module loads when the list first
 * opens).
 */
export default function CountryCombobox({
  id,
  onClose,
  onPick,
  selected,
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => filterCountries(COUNTRIES, query), [query]);
  // Opens at the top of the list; the saved country
  // carries the check.
  const [cursor, setCursor] = useState(0);
  // Only a keyboard move reveals the active option: on opening it is the
  // first row, and revealing it would scroll the still-folded list
  const [moved, setMoved] = useState(false);
  const active = matches[Math.min(cursor, matches.length - 1)];

  const pick = useCallback(
    (country: Country) => onPick(country.code),
    [onPick],
  );

  const onQuery = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setCursor(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const { key } = event;
    if (
      key === 'ArrowDown' ||
      key === 'ArrowUp' ||
      // plain Home and End move the caret in the field
      ((key === 'Home' || key === 'End') && event.ctrlKey)
    ) {
      event.preventDefault();
      const blocks = [{ columns: 1, size: matches.length }];
      setMoved(true);
      setCursor((current) => moveSelection(blocks, current, key));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (active) {
        pick(active);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };
  const activeId = active ? `${listId}-${active.code}` : undefined;

  return (
    <div
      aria-label="Choose your country"
      className="flex flex-col gap-3 rounded-16 bg-[#141a1b] p-4 shadow-[0_20px_40px_-16px_rgb(0_0_0/0.7),inset_0_0_0_1px_rgb(255_255_255/0.1)]"
      id={id}
      role="dialog"
    >
      <InputShell className="h-10 gap-2.5 px-3 text-white/60">
        <Icon className="size-[15px]" glyph={searchGlyph} size={16} />
        <input
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded="true"
          aria-label="Search countries"
          autoComplete="off"
          className={INPUT_CLASS}
          onChange={onQuery}
          onKeyDown={onKeyDown}
          placeholder={SEARCH_PLACEHOLDER}
          // The list is the whole point of opening it; it is still folding
          // open, so without a scroll
          ref={focusOnMountInPlace}
          role="combobox"
          spellCheck={false}
          type="text"
          value={query}
        />
      </InputShell>
      <div
        aria-label="Countries"
        className="flex max-h-66 flex-col overflow-y-auto [scrollbar-width:thin]"
        id={listId}
        role="listbox"
      >
        {matches.map((country) => {
          const optionId = `${listId}-${country.code}`;
          const isActive = country.code === active?.code;
          const isSelected = country.code === selected;
          return (
            <CountryOption
              country={country}
              id={optionId}
              isActive={isActive}
              isSelected={isSelected}
              key={country.code}
              onPick={pick}
              reveals={moved}
            />
          );
        })}
        {matches.length === 0 ? (
          <p className="rounded-14 bg-white/3 p-[18px] text-meta text-white/60">
            No country matches.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const CountryOption = memo(function CountryOption({
  country,
  id,
  isActive,
  isSelected,
  onPick,
  reveals,
}: Readonly<{
  country: Country;
  id: string;
  isActive: boolean;
  isSelected: boolean;
  onPick: (country: Country) => void;
  /** The keyboard has moved the active option: keep it in view */
  reveals: boolean;
}>) {
  const handleClick = useCallback(() => onPick(country), [country, onPick]);
  const classes = cn(
    'grid h-10 shrink-0 cursor-pointer grid-cols-[28px_minmax(0,1fr)_30px_18px] items-center gap-3 rounded-10 px-3 text-left text-body [contain-intrinsic-size:auto_40px] [content-visibility:auto] hover:bg-white/7',
    isSelected && 'bg-white/10',
    // The keyboard row takes the hover/focus 7%; on the saved country
    // (10%) it needs a step more to stay visible.
    isActive && (isSelected ? 'bg-white/14' : 'bg-white/7'),
  );
  const revealRef = isActive && reveals ? reveal : undefined;
  // `onMouseDown` keeps focus in the filter input, as a click would otherwise
  // move it to the option.
  return (
    <div
      aria-selected={isActive}
      className={classes}
      id={id}
      onClick={handleClick}
      onMouseDown={keepFocus}
      ref={revealRef}
      role="option"
    >
      <Flag className="h-4 w-6" code={country.code} lazy />
      <span className="truncate">{country.name}</span>
      <span className="text-caption text-white/60">{country.code}</span>
      {isSelected ? (
        <span className="flex items-center">
          <Icon glyph={checkGlyph} size={13} />
          <span className="sr-only">current</span>
        </span>
      ) : (
        <span />
      )}
    </div>
  );
});

CountryOption.displayName = 'CountryOption';
