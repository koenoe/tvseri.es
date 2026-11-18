// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import { useCallback, useState } from 'react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import LargeDialog from './LargeDialog';

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

/** A tile that is replaced (a new element) while its dialog is open */
const tile = () => document.querySelector<HTMLElement>('[data-tile]');

function Harness() {
  const [open, setOpen] = useState(false);
  const [generation, setGeneration] = useState(0);
  const openDialog = useCallback(() => setOpen(true), []);
  const rerender = useCallback(() => setGeneration((value) => value + 1), []);
  return (
    <>
      <button data-tile key={generation} onClick={openDialog} type="button">
        Open tile {generation}
      </button>
      <button onClick={rerender} type="button">
        Re-render the wall
      </button>
      <LargeDialog
        onOpenChange={setOpen}
        open={open}
        restoreFocus={tile}
        title="S01E02 Pilot"
      >
        <p>Credits</p>
      </LargeDialog>
    </>
  );
}

describe('LargeDialog on a phone', () => {
  it('has no grab handle: it fills the screen and never swipes away', () => {
    const ignore = () => undefined;
    render(
      <LargeDialog onOpenChange={ignore} open title="S01E02 Pilot">
        <p>Credits</p>
      </LargeDialog>,
    );
    expect(
      screen
        .getByRole('dialog', { name: 'S01E02 Pilot' })
        .querySelector('[data-sheet-handle]'),
    ).toBeNull();
  });
});

describe('LargeDialog focus', () => {
  it('returns to the opener, or to restoreFocus when the opener was replaced', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open tile 0' }));
    expect(await screen.findByText('Credits')).toBeTruthy();
    // the wall re-renders under the dialog: the opener is a new element
    await act(async () => {
      screen.getByText('Re-render the wall').click();
    });
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Credits')).toBeNull());
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Open tile 1' }),
    );
  });
});
