// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import { type ReactNode, useCallback, useState } from 'react';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { Dialog, DialogClose } from './Dialog';
import SideSheet from './SideSheet';

// jsdom 31 has HTMLDialogElement but no showModal/close; stand in for the
// browser's part (the `open` attribute, the close event).
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
});

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  showModal.mockClear();
  close.mockClear();
});

const ignore = () => {};

function Harness({
  children,
  onOpenChange,
}: Readonly<{
  children?: ReactNode;
  onOpenChange?: (open: boolean) => void;
}>) {
  const [open, setOpen] = useState(false);
  const change = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      setOpen(next);
    },
    [onOpenChange],
  );
  const openDialog = useCallback(() => setOpen(true), []);
  return (
    <>
      <button onClick={openDialog} type="button">
        Open
      </button>
      <Dialog
        description="Marks everything up to it"
        onOpenChange={change}
        open={open}
        title="Which episode did you watch last?"
      >
        {children}
        <DialogClose>Cancel</DialogClose>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('opens as a modal when open becomes true, named by its title', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(showModal).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole('dialog', {
      name: 'Which episode did you watch last?',
    });
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('takes the first focus itself, so no button shows a focus ring on open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(document.activeElement).toBe(
      screen.getByRole('dialog', { name: 'Which episode did you watch last?' }),
    );
  });

  it('asks to close on Escape (the cancel event) and keeps itself open for the exit', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('dialog'), cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes from its close button and from a click on the backdrop', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    onOpenChange.mockClear();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const backdrop = screen
      .getByRole('dialog')
      .querySelector('[data-dialog-backdrop]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('returns focus to the opener after closing', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });

    await user.click(opener);
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    cancelButton.focus();
    await user.click(cancelButton);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it('locks the page scroll while open', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(document.documentElement.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.documentElement.style.overflow).toBe('');
  });
});

describe('SideSheet', () => {
  it('opens already open (a URL-driven sheet) and is named by its title', () => {
    render(
      <SideSheet onOpenChange={ignore} open title="Watch history">
        <p>Season 1</p>
      </SideSheet>,
    );
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('dialog', { name: 'Watch history' }).textContent,
    ).toContain('Season 1');
  });
});

describe('a dialog opened over a sheet', () => {
  it('closes only itself on Escape and on its backdrop', async () => {
    const user = userEvent.setup();
    const closeSheet = vi.fn();
    const closePicker = vi.fn();
    render(
      <SideSheet onOpenChange={closeSheet} open title="Watch history">
        <Dialog onOpenChange={closePicker} open title="When did you watch it?">
          <p>Pick a day</p>
        </Dialog>
      </SideSheet>,
    );
    const picker = screen.getByRole('dialog', {
      name: 'When did you watch it?',
    });

    fireEvent(picker, new Event('cancel', { cancelable: true }));
    expect(closePicker).toHaveBeenCalledWith(false);
    expect(closeSheet).not.toHaveBeenCalled();

    const backdrop = picker.querySelector('[data-dialog-backdrop]');
    await user.click(backdrop as Element);
    expect(closePicker).toHaveBeenCalledTimes(2);
    expect(closeSheet).not.toHaveBeenCalled();
  });
});

describe('the grab handle', () => {
  const handleOf = (name: string) =>
    screen.getByRole('dialog', { name }).querySelector('[data-sheet-handle]');

  it('tops the dialog where it is a bottom sheet (phones only), hidden from assistive tech', () => {
    render(
      <Dialog onOpenChange={ignore} open title="Jump to">
        <p>Body</p>
      </Dialog>,
    );
    const handle = handleOf('Jump to');
    expect(handle?.getAttribute('aria-hidden')).toBe('true');
    expect(handle?.className).toContain('sm:hidden');
  });

  it('never tops a full-screen side sheet', () => {
    render(
      <SideSheet onOpenChange={ignore} open title="Watch history">
        <p>Season 1</p>
      </SideSheet>,
    );
    expect(handleOf('Watch history')).toBeNull();
  });
});

describe('Dialog variants', () => {
  it('keeps the show page look by default and draws Settings’ plain one on request', () => {
    const { rerender } = render(
      <Dialog onOpenChange={ignore} open title="Tinted">
        <p>Body</p>
      </Dialog>,
    );
    const tinted = screen.getByRole('heading', { name: 'Tinted' });
    expect(tinted.className).toContain('text-title-3');
    expect(tinted.closest('dialog')?.innerHTML).toContain('w-140');

    rerender(
      <Dialog onOpenChange={ignore} open title="Plain" variant="plain">
        <p>Body</p>
      </Dialog>,
    );
    const plain = screen.getByRole('heading', { name: 'Plain' });
    expect(plain.className).toContain('text-body');
    expect(plain.closest('dialog')?.innerHTML).toContain('w-130');
    expect(plain.closest('dialog')?.innerHTML).toContain('bg-[#1b2122]');
  });
});
