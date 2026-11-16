// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { adminStore, setImagesLoad } from './adminStore';
import { setTitleDraft, useHeroTitleDraft } from './heroDraft';
import { openAdminImages, useAdminImagesKey } from './openAdminImages';

beforeEach(() => {
  adminStore.setState({ colours: {}, images: {}, request: null });
  setTitleDraft(1, undefined);
});

describe('openAdminImages and the Remote key', () => {
  it('asks for the tray, again each time', () => {
    openAdminImages(1);
    const first = adminStore.getState().request;
    openAdminImages(1);
    expect(adminStore.getState().request).toMatchObject({ seriesId: 1 });
    expect(adminStore.getState().request?.serial).toBe(
      (first?.serial ?? 0) + 1,
    );
  });

  it('is enabled until the images say there is nothing to choose', () => {
    const { result } = renderHook(() => useAdminImagesKey(1));
    expect(result.current).toEqual({ disabled: false });
    act(() => {
      setImagesLoad(1, {
        availability: {
          canChoose: false,
          why: '1 backdrop, no logos: nothing to choose',
        },
        images: {
          automatic: { backdropPath: '/b.jpg', titleTreatmentPath: null },
          backdrops: [{ path: '/b.jpg', url: 'https://x/b.jpg' }],
          preferred: null,
          titleTreatment: [],
        },
        status: 'ready',
      });
    });
    expect(result.current).toEqual({
      disabled: true,
      meta: '1 backdrop, no logos: nothing to choose',
    });
  });
});

describe('useHeroTitleDraft: the hero shows the pick, not its served logo', () => {
  it('is the picked logo while it differs from what the hero serves', () => {
    const { result } = renderHook(() =>
      useHeroTitleDraft(1, 'https://x/served.png'),
    );
    expect(result.current).toBeUndefined();
    act(() => {
      setTitleDraft(1, {
        height: 100,
        kind: 'logo',
        url: 'https://x/picked.png',
        width: 400,
      });
    });
    expect(result.current).toMatchObject({ url: 'https://x/picked.png' });
  });

  it('is the text title, and stops once the page serves the same', () => {
    const { rerender, result } = renderHook(
      ({ served }: { served: string | undefined }) =>
        useHeroTitleDraft(1, served),
      {
        initialProps: { served: 'https://x/served.png' as string | undefined },
      },
    );
    act(() => {
      setTitleDraft(1, { kind: 'text' });
    });
    expect(result.current).toEqual({ kind: 'text' });
    rerender({ served: undefined });
    expect(result.current).toBeUndefined();
  });
});
