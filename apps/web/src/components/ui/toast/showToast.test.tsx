// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import { toast } from 'sonner';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import SideSheet from '@/components/ui/dialog/SideSheet';

import { showToast } from './showToast';
import Toaster from './Toaster';

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  // sonner captures the pointer for swipes; jsdom has no pointer capture.
  Element.prototype.setPointerCapture = () => {};
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
});

const ignore = () => {};

describe('showToast', () => {
  it('updates the toast with the same id instead of stacking a second one', async () => {
    render(<Toaster />);

    act(() => {
      showToast({ id: 'marks', title: 'Marked E5 · Just now' });
    });
    expect(await screen.findByText('Marked E5 · Just now')).toBeTruthy();

    act(() => {
      showToast({ id: 'marks', title: 'Marked S03E05–S03E07 · Just now' });
    });
    expect(
      await screen.findByText('Marked S03E05–S03E07 · Just now'),
    ).toBeTruthy();
    expect(screen.queryByText('Marked E5 · Just now')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('replaces the toast that is showing when a new one comes', async () => {
    render(<Toaster />);

    act(() => {
      showToast({ title: 'Marked Season 2 · Just now' });
    });
    await screen.findByText('Marked Season 2 · Just now');
    act(() => {
      showToast({ title: 'Copied' });
    });

    await screen.findByText('Copied');
    await waitFor(() =>
      expect(screen.queryByText('Marked Season 2 · Just now')).toBeNull(),
    );
  });

  it('calls the action back and closes the toast', async () => {
    const user = userEvent.setup();
    const undo = vi.fn();
    const useReleaseDates = vi.fn();
    render(<Toaster />);

    act(() => {
      showToast({
        action: { label: 'Undo', onClick: undo },
        secondaryAction: {
          label: 'Use release dates',
          onClick: useReleaseDates,
        },
        title: 'Marked Season 2 · Just now',
      });
    });
    await user.click(await screen.findByRole('button', { name: 'Undo' }));

    expect(undo).toHaveBeenCalledTimes(1);
    expect(useReleaseDates).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText('Marked Season 2 · Just now')).toBeNull(),
    );
  });

  it('stays while hovered and closes after its time once the pointer leaves', async () => {
    const user = userEvent.setup();
    render(<Toaster />);

    act(() => {
      showToast({ duration: 100, title: 'Saved' });
    });
    const text = await screen.findByText('Saved');
    await user.hover(text);
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(screen.queryByText('Saved')).not.toBeNull();

    await user.unhover(text);
    await waitFor(() => expect(screen.queryByText('Saved')).toBeNull());
  });

  it('shows inside an open modal dialog, so it is above it and usable', async () => {
    render(
      <>
        <Toaster />
        <SideSheet onOpenChange={ignore} open title="Watch history">
          <p>Season 1</p>
        </SideSheet>
      </>,
    );

    act(() => {
      showToast({ title: 'Marked S03E06–S03E09 · Just now' });
    });
    const text = await screen.findByText('Marked S03E06–S03E09 · Just now');

    expect(screen.getByRole('dialog').contains(text)).toBe(true);
  });
});
