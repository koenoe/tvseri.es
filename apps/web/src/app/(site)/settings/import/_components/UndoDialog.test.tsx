// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import UndoDialog from './UndoDialog';

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

describe('UndoDialog', () => {
  it('says what goes and what stays', () => {
    render(
      <UndoDialog
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
        open
        written={1834}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: 'Undo this import?' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Removes the 1,834 episodes this import added. Episodes you had marked before stay as they were.',
      ),
    ).toBeTruthy();
  });

  it('undoes only on Undo import', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <UndoDialog
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open
        written={3}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Undo import' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
