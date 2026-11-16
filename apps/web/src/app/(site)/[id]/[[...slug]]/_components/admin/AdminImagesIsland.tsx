'use client';

import type { TvSeries } from '@tvseri.es/schemas';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { useBackground } from '@/components/background/BackgroundProvider';
import { createLoader } from '@/lib/lazy/createLoader';
import whenIdle from '@/lib/lazy/whenIdle';

import {
  closeTrayRequest,
  requestTray,
  useAdminState,
  useAdminTrayOpen,
} from './adminStore';
import { ensureImages } from './data';
import { type AdminSeries, createPreview } from './preview';

/**
 * The tray's code loads behind the trigger (and on idle, for admins only),
 * rendered directly once it is in (`createLoader`'s `get`).
 */
const tray = createLoader(() =>
  import('./tray/Tray').then((module) => module.default),
);

export type AdminImagesSeries = Pick<
  TvSeries,
  | 'backdropColor'
  | 'backdropImage'
  | 'backdropPath'
  | 'id'
  | 'title'
  | 'titleTreatmentImage'
>;

type Props = Readonly<{ series: AdminImagesSeries }>;

/** Drops `?images` from the URL once the tray it opened has closed. */
function dropImagesParam() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('images')) {
    url.searchParams.delete('images');
    window.history.replaceState(window.history.state, '', url);
  }
}

const IDLE_PRELOAD = { fallbackDelay: 1500, timeout: 4000 } as const;

/**
 * The admin image tray, opened by the Remote's Admin row
 * (`openAdminImages`, its I key) or `?images`.
 * Mounted by `AdminHole` for admins only, inside the show's `Page` (it drives
 * the page colour) and a Suspense boundary (it reads the URL).
 */
export default function AdminImagesIsland({ series }: Props) {
  const linked = useSearchParams().has('images');
  const open = useAdminTrayOpen(series.id);
  const [, trayLoaded] = useReducer((count: number) => count + 1, 0);
  const setBackground = useBackground((state) => state.setBackground);

  const served: AdminSeries = useMemo(
    () => ({
      backdropColor: series.backdropColor,
      backdropImage: series.backdropImage,
      backdropPath: series.backdropPath,
      id: series.id,
      title: series.title,
      titleTreatmentImage: series.titleTreatmentImage,
    }),
    [series],
  );
  const preview = useMemo(
    () => createPreview(served, setBackground),
    [served, setBackground],
  );

  // `?images` opens the tray from a link (the URL is external state).
  useEffect(() => {
    if (linked) {
      requestTray(series.id);
    }
  }, [linked, series.id]);

  // The tray's code once the page is idle; the choices (for the Remote
  // key's "nothing to choose") only once the admin options are opened or the
  // tray is: a page view sends no request of its own
  useEffect(() => whenIdle(() => tray.preload(), IDLE_PRELOAD), []);
  const wanted = useAdminState((state) => state.wanted[series.id] === true);
  useEffect(() => {
    if (wanted || open) {
      void ensureImages(served);
    }
  }, [open, served, wanted]);

  // Opened before the idle preload: load the tray's code now.
  useEffect(() => {
    if (open && !tray.get()) {
      // a failed chunk leaves it closed; the next open loads it again
      tray.load().then(trayLoaded, () => undefined);
    }
  }, [open]);

  const close = useCallback(() => {
    closeTrayRequest();
    dropImagesParam();
  }, []);

  const Tray = tray.get();
  return open && Tray ? (
    <Tray onClose={close} preview={preview} served={served} />
  ) : null;
}
