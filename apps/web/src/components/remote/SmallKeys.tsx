'use client';

import { useCallback } from 'react';

import {
  bookmarkGlyph,
  heartGlyph,
  historyGlyph,
  skippedGlyph,
} from '@/components/ui/icon/glyphs';

import KeyButton from './KeyButton';
import KeyRow from './KeyRow';
import type { SmallKeyModel } from './keys';
import type { RemoteMarking } from './marking';

/** icons_final: history; heart and bookmark (filled when latched); the remote's eye-off for Hide. */
const ICONS = {
  favorites: heartGlyph,
  hide: skippedGlyph,
  history: historyGlyph,
  watchlist: bookmarkGlyph,
} as const;

export type HistoryAction = Readonly<{
  /** The link (a tile; any page without the sheet). */
  historyHref: string;
  /** On the show page: opens the sheet in place (`openHistory()`); wins over the link. */
  onEditHistory?: () => void;
}>;

type ModelKeyProps = HistoryAction &
  Readonly<{
    marking: RemoteMarking;
    model: SmallKeyModel;
    onHide?: () => void;
  }>;

function ModelKey({
  historyHref,
  marking,
  model,
  onEditHistory,
  onHide,
}: ModelKeyProps) {
  const { id } = model;
  const common = {
    icon: ICONS[id],
    id,
    label: model.label,
    letter: model.shortcut,
  };
  const latched = model.checked === true;
  // H on a hidden show (latched) brings it back; either way it leaves the tile's list
  const hide = useCallback(() => {
    if (latched) {
      marking.restore?.();
    } else {
      marking.hide();
    }
    onHide?.();
  }, [latched, marking, onHide]);
  const toggle = useCallback(() => {
    if (id === 'favorites' || id === 'watchlist') {
      marking.toggleList(id);
    }
  }, [id, marking]);
  if (id === 'history') {
    return onEditHistory ? (
      <KeyButton {...common} onSelect={onEditHistory} />
    ) : (
      <KeyButton {...common} href={historyHref} />
    );
  }
  if (id === 'hide') {
    return (
      <KeyButton
        {...common}
        checked={latched ? true : undefined}
        onSelect={hide}
      />
    );
  }
  // the list keys flip at once and the remote stays open
  return (
    <KeyButton
      {...common}
      checked={model.checked}
      keepOpen
      onSelect={toggle}
      pending={marking.listPending[id]}
    />
  );
}

/** The row of small keys for a variant's key models. */
export default function SmallKeys({
  models,
  ...rest
}: Omit<ModelKeyProps, 'model'> &
  Readonly<{ models: ReadonlyArray<SmallKeyModel> }>) {
  return (
    <KeyRow>
      {models.map((model) => (
        <ModelKey key={model.id} model={model} {...rest} />
      ))}
    </KeyRow>
  );
}
