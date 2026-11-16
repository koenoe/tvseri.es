import type { SeriesImages } from '@tvseri.es/schemas';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { Availability } from './picker';

/**
 * The admin picker's tab-wide state: which show asked for the tray, each
 * show's image choices (loaded once, kept current by saves) and the page
 * colours already known per backdrop path. Tiny and dependency-free, so the
 * Remote's Admin row can import `openAdminImages` without the tray.
 */

export type ImagesLoad =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'error' }>
  | Readonly<{
      availability: Availability;
      images: SeriesImages;
      status: 'ready';
    }>;

type AdminState = Readonly<{
  colours: Readonly<Record<string, string>>;
  images: Readonly<Record<number, ImagesLoad>>;
  /** Bumped per request, so asking twice for the same show opens it again. */
  request: Readonly<{ seriesId: number; serial: number }> | null;
  /** Shows whose admin options were opened: only these load their choices */
  wanted: Readonly<Record<number, true>>;
}>;

export const adminStore = createStore<AdminState>(() => ({
  colours: {},
  images: {},
  request: null,
  wanted: {},
}));

/** The Remote's Admin row is open: load this show's image choices (once). */
export function wantImages(seriesId: number): void {
  if (!adminStore.getState().wanted[seriesId]) {
    adminStore.setState((state) => ({
      wanted: { ...state.wanted, [seriesId]: true },
    }));
  }
}

export function requestTray(seriesId: number): void {
  adminStore.setState((state) => ({
    request: { serial: (state.request?.serial ?? 0) + 1, seriesId },
  }));
}

export function closeTrayRequest(): void {
  adminStore.setState({ request: null });
}

export function setImagesLoad(seriesId: number, load: ImagesLoad): void {
  adminStore.setState((state) => ({
    images: { ...state.images, [seriesId]: load },
  }));
}

export function rememberColours(colours: Readonly<Record<string, string>>) {
  adminStore.setState((state) => ({
    colours: { ...state.colours, ...colours },
  }));
}

export const useAdminState = <T>(selector: (state: AdminState) => T): T =>
  useStore(adminStore, selector);

/**
 * Whether the admin tray is open for this show (from the request until it
 * closes): the hero docks above it. While the tray is mounted,
 * `<html>` also carries `--admin-tray-height` (its height in px).
 */
export const useAdminTrayOpen = (seriesId: number): boolean =>
  useAdminState((state) => state.request?.seriesId === seriesId);
