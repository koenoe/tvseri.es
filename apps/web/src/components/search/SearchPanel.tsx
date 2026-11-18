import { type Ref, useDeferredValue } from 'react';

import { optionId } from './optionStyles';
import SearchBody from './SearchBody';
import SearchField from './SearchField';
import type { OverlaySearch } from './useOverlaySearch';

type Props = Readonly<{
  inputRef: Ref<HTMLInputElement>;
  onClose: () => void;
  search: OverlaySearch;
}>;

export default function SearchPanel({ inputRef, onClose, search }: Props) {
  const { state } = search;
  // The field updates at once; the results render when the browser has time.
  const view = useDeferredValue(search.view);
  const marked = view.cells[view.selected];
  const activeId = marked ? optionId(marked.key) : undefined;
  // An empty field with no recents yet is the field alone (desktop), until
  // a first query's ghost rows need the body.
  const hasOptions = view.cells.length > 0;
  const hasBody = search.phone || view.mode !== 'recents' || hasOptions;
  const layout = search.phone ? 'phone' : 'desktop';

  return (
    <>
      <SearchField
        activeId={activeId}
        hasOptions={hasOptions}
        inputRef={inputRef}
        onClose={onClose}
        onEnter={search.enter}
        onInput={search.input}
        onMove={search.move}
        phone={search.phone}
        query={state.query}
        ruled={hasBody}
      />
      {hasBody ? (
        <SearchBody
          layout={layout}
          onChoose={search.choose}
          onRetry={search.retry}
          view={view}
        />
      ) : null}
    </>
  );
}
