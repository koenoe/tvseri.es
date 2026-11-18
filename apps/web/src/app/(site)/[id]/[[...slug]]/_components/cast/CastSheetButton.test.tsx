// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import CastSheetButton from './CastSheetButton';

vi.mock('../../_lib/ShowProvider', () => ({
  useShow: () => ({ id: 201, title: 'The Bear' }),
}));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  // jsdom has no showModal/close: stand in for the browser's part
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

describe('CastSheetButton', () => {
  it('opens the sheet with everyone, and ✕ closes it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({
          cast: [],
          crew: [
            {
              people: [
                {
                  id: 1,
                  image: '',
                  name: 'Christopher Storer',
                  role: 'Creator',
                  slug: 'christopher-storer',
                },
              ],
              title: 'Created by',
            },
          ],
        }),
        ok: true,
      })),
    );
    render(
      <CastSheetButton className="" label="Cast, 1 person" total={1}>
        faces
      </CastSheetButton>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cast, 1 person' }));

    const sheet = await screen.findByRole('dialog', { name: 'Cast & crew' });
    expect(sheet.textContent).toContain('The Bear · 1 person');
    expect(
      await screen.findByRole('link', { name: 'Christopher Storer, creator' }),
    ).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith('/api/series/201/credits', undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
