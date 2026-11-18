'use client';

import type { SeriesImages } from '@tvseri.es/schemas';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { useAdminState } from '../adminStore';
import { commit, showErrorToast } from '../commit';
import { colourOf, ensureImages, fetchColours } from '../data';
import {
  baseSelection,
  isChanged,
  type PageColour,
  pageColour,
  type Selection,
  type Status,
  statusOf,
  type TitleKey,
  toPreferredImages,
} from '../picker';
import { type AdminSeries, neighbours, type Preview } from '../preview';
import {
  initialTrayState,
  isLocked,
  type Tab,
  type TrayState,
  trayReducer,
} from './trayState';

export type TrayLoad = 'error' | 'loading' | 'ready';

/** Everything both layouts (desktop tray, phone sheet) draw and do. */
export type TrayModel = Readonly<{
  base: Selection | null;
  canSave: boolean;
  changed: boolean;
  colour: PageColour;
  images: SeriesImages | null;
  load: TrayLoad;
  locked: boolean;
  picked: Selection | null;
  served: AdminSeries;
  state: TrayState;
  status: Status;
  askReset: () => void;
  cancel: () => void;
  discard: () => void;
  keep: () => void;
  pickBackdrop: (path: string) => void;
  pickTitle: (key: TitleKey) => void;
  reset: () => void;
  retry: () => void;
  retryLoad: () => void;
  save: () => void;
  setTab: (tab: Tab) => void;
}>;

export function useTray({
  isDesktop,
  onClose,
  preview,
  served,
}: Readonly<{
  isDesktop: boolean;
  onClose: () => void;
  preview: Preview;
  served: AdminSeries;
}>): TrayModel {
  const [state, dispatch] = useReducer(trayReducer, initialTrayState);
  const load = useAdminState((store) => store.images[served.id]);
  const images = load?.status === 'ready' ? load.images : null;
  const base = useMemo(
    () => (images ? baseSelection(images, served) : null),
    [images, served],
  );
  const picked = state.picked ?? base;
  const nowColour = useAdminState(
    (store) =>
      (base?.backdrop && store.colours[base.backdrop]) || served.backdropColor,
  );
  const afterColour = useAdminState((store) =>
    picked?.backdrop ? store.colours[picked.backdrop] : undefined,
  );
  const changed = !!base && !!picked && isChanged(base, picked);
  const busy = state.busy !== null;

  // The strips' handlers stay the same function across picks, so a pick
  // re-renders only the two options whose state changed.
  const latest = useRef({ base, images, picked, state });
  useLayoutEffect(() => {
    latest.current = { base, images, picked, state };
  });
  const pick = useCallback(
    (next: Readonly<{ backdrop: string } | { title: TitleKey }>) => {
      const current = latest.current;
      if (
        !current.images ||
        !current.base ||
        !current.picked ||
        isLocked(current.state)
      ) {
        return;
      }
      const nextPicked = { ...current.picked, ...next };
      latest.current = { ...current, picked: nextPicked };
      dispatch({ base: current.base, type: 'pick', ...next });
      preview(current.images, nextPicked);
    },
    [preview],
  );
  const pickBackdrop = useCallback(
    (path: string) => {
      pick({ backdrop: path });
      const { images: listed } = latest.current;
      if (listed) {
        fetchColours(served.id, [path, ...neighbours(listed, path)]);
      }
    },
    [pick, served.id],
  );
  const pickTitle = useCallback(
    (key: TitleKey) => pick({ title: key }),
    [pick],
  );
  const setTab = useCallback((tab: Tab) => dispatch({ tab, type: 'tab' }), []);

  const write = useCallback(
    async (kind: 'reset' | 'save') => {
      if (!images || !picked) {
        return;
      }
      const payload =
        kind === 'save'
          ? toPreferredImages(picked, colourOf(picked.backdrop))
          : null;
      if (kind === 'save' && !payload) {
        return;
      }
      dispatch({ type: 'start', write: kind });
      const ok = await commit({ images, preview, served }, payload);
      if (ok) {
        onClose();
        return;
      }
      dispatch({ type: 'fail', write: kind });
      if (isDesktop) {
        showErrorToast(() => {
          write(kind);
        });
      }
    },
    [images, isDesktop, onClose, picked, preview, served],
  );

  return {
    askReset: () => dispatch({ confirm: 'reset', type: 'ask' }),
    base,
    cancel: () => {
      if (busy) {
        return;
      }
      if (changed) {
        dispatch({ confirm: 'discard', type: 'ask' });
        return;
      }
      onClose();
    },
    canSave: changed && !busy && !!afterColour,
    changed,
    colour: pageColour(nowColour, afterColour),
    discard: () => {
      if (images && base) {
        preview(images, base);
      }
      onClose();
    },
    images,
    keep: () => dispatch({ type: 'keep' }),
    load: load?.status ?? 'loading',
    locked: isLocked(state),
    pickBackdrop,
    picked,
    pickTitle,
    reset: () => write('reset'),
    retry: () => write(state.failed ?? 'save'),
    retryLoad: () => {
      ensureImages(served, { retry: true });
    },
    save: () => {
      if (changed && !busy) {
        write('save');
      }
    },
    served,
    setTab,
    state,
    status: statusOf({
      busy,
      changed,
      hasSaved: !!images?.preferred,
    }),
  };
}
