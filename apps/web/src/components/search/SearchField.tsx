import type { ChangeEvent, KeyboardEvent, Ref } from 'react';

import { HIT_ALL } from '@/components/ui/button/hitArea';
import { closeGlyph, searchGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import type { ArrowKey } from '@/lib/grid/moveSelection';
import { MAX_QUERY_LENGTH } from '@/lib/search/searchKey';

import { LISTBOX_ID } from './optionStyles';

const ARROWS = new Set<string>([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
]);

type Props = Readonly<{
  activeId: string | undefined;
  hasOptions: boolean;
  inputRef: Ref<HTMLInputElement>;
  onClose: () => void;
  onEnter: () => void;
  onInput: (query: string) => void;
  onMove: (key: ArrowKey) => void;
  phone: boolean;
  query: string;
  ruled: boolean;
}>;

/**
 * The field: search icon, the input (a combobox; focus never
 * leaves it) and the cross once there is text (always on a phone, the only
 * way out of the full-screen sheet). Nothing here shows loading: a slow
 * answer fades what is stale in the body instead.
 */
export default function SearchField(props: Props) {
  const { activeId, hasOptions, onEnter, onInput, onMove, query } = props;
  const change = (event: ChangeEvent<HTMLInputElement>) =>
    onInput(event.target.value);
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (ARROWS.has(event.key) && hasOptions) {
      event.preventDefault();
      onMove(event.key as ArrowKey);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onEnter();
    }
  };
  const rowClasses = cn(
    'flex h-16 shrink-0 items-center gap-4 px-gutter md:px-4',
    props.ruled && 'border-b border-black/10',
  );
  // a 44px target (10px past the 24px cross): the thumb's way out of the
  // phone's sheet, clear of the field across the 16px gap
  const crossClasses = cn(
    'relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-6 text-rk-text transition-[background-color,scale] duration-150 ease-out hover:bg-black/5 active:scale-96 focus-visible:shadow-[0_0_0_2px_var(--rk-mark)] focus-visible:outline-hidden',
    HIT_ALL[10],
    !query && 'md:hidden',
  );

  return (
    <div className={rowClasses}>
      <Icon className="shrink-0" glyph={searchGlyph} size={24} />
      <input
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        aria-controls={LISTBOX_ID}
        aria-expanded={hasOptions}
        aria-label="Search series and people"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        className="h-10 min-w-0 flex-1 bg-transparent text-body text-rk-text caret-rk-text outline-hidden [font-feature-settings:'calt'_0] placeholder:text-rk-w40"
        data-1p-ignore=""
        enterKeyHint="search"
        maxLength={MAX_QUERY_LENGTH}
        onChange={change}
        onKeyDown={keyDown}
        placeholder={
          props.phone ? 'Series and people' : 'Search series and people'
        }
        ref={props.inputRef}
        role="combobox"
        spellCheck={false}
        type="text"
        value={query}
      />
      <button
        aria-label="Close search"
        className={crossClasses}
        onClick={props.onClose}
        type="button"
      >
        <Icon glyph={closeGlyph} size={24} />
      </button>
    </div>
  );
}
