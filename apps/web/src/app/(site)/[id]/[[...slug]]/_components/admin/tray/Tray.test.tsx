// @vitest-environment jsdom

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import type { SeriesImages } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/components/ui/toast/showToast';
import { fetchJson } from '@/lib/series/useCachedJson';
import { savePreferredImages } from '../actions';

import {
  adminStore,
  closeTrayRequest,
  requestTray,
  setImagesLoad,
  useAdminTrayOpen,
} from '../adminStore';
import { TOASTS } from '../copy';
import { setImages } from '../data';
import type { AdminSeries } from '../preview';
import Tray from './Tray';

vi.mock('@/lib/series/useCachedJson', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/series/useCachedJson')>()),
  fetchJson: vi.fn(),
}));
vi.mock('../actions', () => ({
  resetPreferredImages: vi.fn(),
  savePreferredImages: vi.fn(),
}));

vi.mock('@/components/ui/toast/showToast', () => ({ showToast: vi.fn() }));

const img = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;

const IMAGES: SeriesImages = {
  automatic: { backdropPath: '/b0.jpg', titleTreatmentPath: '/l0.png' },
  backdrops: ['/b0.jpg', '/b1.jpg', '/b2.jpg'].map((path) => ({
    path,
    url: img(path),
  })),
  preferred: null,
  titleTreatment: ['/l0.png', '/l1.png'].map((path) => ({
    height: 100,
    language: 'en',
    path,
    url: img(path),
    width: 400,
  })),
};

const SERVED: AdminSeries = {
  backdropColor: '#29251f',
  backdropImage: img('/b0.jpg'),
  backdropPath: '/b0.jpg',
  id: 136315,
  title: 'The Bear',
  titleTreatmentImage: img('/l0.png'),
};

function renderTray() {
  const onClose = vi.fn();
  const preview = vi.fn();
  render(<Tray onClose={onClose} preview={preview} served={SERVED} />);
  return { onClose, preview };
}

const radio = (name: RegExp) => screen.getByRole('radio', { name });

/** The tray's ResizeObserver callback (jsdom has no ResizeObserver). */
let report: ResizeObserverCallback = () => {};

beforeEach(() => {
  // jsdom has no layout: the strip keeps the picked option in view with it
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        report = callback;
      }
      disconnect() {}
      observe() {}
    },
  );
  adminStore.setState({
    colours: { '/b0.jpg': '#29251f', '/b1.jpg': '#46462d' },
    images: {},
    request: null,
  });
  setImages(IMAGES, SERVED);
  vi.mocked(fetchJson).mockImplementation(async (url) =>
    url.endsWith('/images') ? IMAGES : {},
  );
});

describe('the admin tray (phone sheet in jsdom)', () => {
  it('starts on what visitors see, marked Auto', () => {
    renderTray();
    expect(
      radio(/^Backdrop 1 of 3, automatic/).getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getByText('Automatic')).toBeTruthy();
  });

  it('previews a pick on the live page and shows the page colour after saving', () => {
    const { preview } = renderTray();
    fireEvent.click(radio(/^Backdrop 2 of 3/));
    expect(preview).toHaveBeenCalledWith(IMAGES, {
      backdrop: '/b1.jpg',
      title: '/l0.png',
    });
    expect(screen.getByText('Unsaved')).toBeTruthy();
    // as the API serves it (readable under white text)
    expect(screen.getByText('#46462d')).toBeTruthy();
  });

  it('tells the hero when the tray is open and how tall it is', () => {
    const { result } = renderHook(() => useAdminTrayOpen(SERVED.id));
    expect(result.current).toBe(false);
    act(() => requestTray(SERVED.id));
    expect(result.current).toBe(true);
    act(() => closeTrayRequest());
    expect(result.current).toBe(false);

    const root = document.documentElement;
    const { unmount } = render(
      <Tray onClose={vi.fn()} preview={vi.fn()} served={SERVED} />,
    );
    act(() =>
      report(
        [{ borderBoxSize: [{ blockSize: 239.6 }] } as never],
        {} as ResizeObserver,
      ),
    );
    expect(root.style.getPropertyValue('--admin-tray-height')).toBe('240px');
    unmount();
    expect(root.style.getPropertyValue('--admin-tray-height')).toBe('');
  });

  it('has phone tabs that follow the ARIA tabs pattern', () => {
    renderTray();
    const backdrop = screen.getByRole('tab', { name: 'Backdrop · 3' });
    const title = screen.getByRole('tab', { name: 'Title · 2' });
    const panel = screen.getByRole('tabpanel');
    expect(backdrop.getAttribute('aria-controls')).toBe(panel.id);
    expect(title.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(backdrop.id);
    // Roving focus: only the selected tab is in the Tab order
    expect(backdrop.tabIndex).toBe(0);
    expect(title.tabIndex).toBe(-1);

    fireEvent.keyDown(backdrop, { key: 'ArrowRight' });
    expect(title.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(title);
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
    expect(screen.getByRole('radiogroup', { name: /title/i })).toBeTruthy();

    fireEvent.keyDown(title, { key: 'ArrowRight' });
    expect(backdrop.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(backdrop, { key: 'End' });
    expect(title.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(title, { key: 'Home' });
    expect(document.activeElement).toBe(backdrop);
  });

  it('steps through a strip with the arrow keys', () => {
    renderTray();
    const strip = screen.getByRole('radiogroup', { name: 'Backdrops' });
    fireEvent.keyDown(strip, { key: 'ArrowRight' });
    fireEvent.keyDown(strip, { key: 'ArrowRight' });
    expect(radio(/^Backdrop 3 of 3/).getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(strip, { key: 'ArrowRight' });
    expect(radio(/^Backdrop 3 of 3/).getAttribute('aria-checked')).toBe('true');
  });

  it('asks before Cancel throws away a pick, and Esc keeps editing', () => {
    const { onClose, preview } = renderTray();
    fireEvent.click(radio(/^Backdrop 2 of 3/));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.getByRole('alertdialog', { name: 'Discard your changes?' }),
    ).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(preview).toHaveBeenLastCalledWith(IMAGES, {
      backdrop: '/b0.jpg',
      title: '/l0.png',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes at once with nothing picked', () => {
    const { onClose } = renderTray();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('saves the pick with its colour and closes', async () => {
    vi.mocked(savePreferredImages).mockResolvedValue({
      data: undefined,
      ok: true,
    });
    const { onClose } = renderTray();
    fireEvent.click(radio(/^Backdrop 2 of 3/));
    fireEvent.click(screen.getByRole('tab', { name: 'Title · 2' }));
    fireEvent.click(radio(/^Text title/));
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Save for everyone' }),
      );
    });
    expect(savePreferredImages).toHaveBeenCalledWith({
      preferred: {
        backdropColor: '#46462d',
        backdropImagePath: '/b1.jpg',
        titleTreatment: 'text',
      },
      seriesId: 136315,
    });
    expect(onClose).toHaveBeenCalled();
    const load = adminStore.getState().images[136315];
    expect(load?.status === 'ready' && load.images.preferred).toMatchObject({
      backdropImagePath: '/b1.jpg',
    });
  });

  it('tells the admin the save is for everyone, with Undo', async () => {
    vi.mocked(savePreferredImages).mockResolvedValue({
      data: undefined,
      ok: true,
    });
    renderTray();
    fireEvent.click(radio(/^Backdrop 2 of 3/));
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Save for everyone' }),
      );
    });
    expect(showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Undo' }),
        title: TOASTS.saved,
      }),
    );
  });

  it('keeps the pick and says so when the save fails (no silent failure)', async () => {
    vi.mocked(savePreferredImages).mockResolvedValue({
      error: 'failed',
      ok: false,
    });
    const { onClose } = renderTray();
    fireEvent.click(radio(/^Backdrop 2 of 3/));
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Save for everyone' }),
      );
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain(
      'Couldn’t save. Visitors still see the old images.',
    );
    expect(radio(/^Backdrop 2 of 3/).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Unsaved')).toBeTruthy();
  });

  it('shows the loading state until TMDB answers', () => {
    setImagesLoad(SERVED.id, { status: 'loading' });
    vi.mocked(fetchJson).mockReturnValue(new Promise(() => {}));
    renderTray();
    expect(screen.getByRole('status').textContent).toContain(
      'Loading from TMDB…',
    );
    expect(
      screen
        .getByRole('button', { name: 'Save for everyone' })
        .getAttribute('aria-disabled'),
    ).toBe('true');
  });
});
