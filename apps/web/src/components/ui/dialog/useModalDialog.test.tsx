// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode, useRef } from 'react';
import { beforeAll, expect, it, vi } from 'vitest';

import useModalDialog from './useModalDialog';

// jsdom 31 has HTMLDialogElement but no showModal/close.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

function Modal({
  children,
  label,
  onDismiss,
}: Readonly<{ children?: ReactNode; label: string; onDismiss: () => void }>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { attach, onCancel, onClick } = useModalDialog({
    onDismiss,
    panelRef,
  });
  return (
    <dialog
      aria-label={label}
      onCancel={onCancel}
      onClick={onClick}
      ref={attach}
    >
      <div data-dialog-backdrop="" data-testid={`${label} dim`} />
      <div ref={panelRef}>{children}</div>
    </dialog>
  );
}

it('opens the dialog as it mounts and closes it as it unmounts', () => {
  const { unmount } = render(<Modal label="Search" onDismiss={vi.fn()} />);
  const dialog = screen.getByRole('dialog', { name: 'Search' });
  expect(dialog.hasAttribute('open')).toBe(true);
  unmount();
  expect(dialog.hasAttribute('open')).toBe(false);
});

it('dismisses only the dialog Escape or the dim belongs to, not one it sits in', () => {
  const outer = vi.fn();
  const inner = vi.fn();
  render(
    <Modal label="Search" onDismiss={outer}>
      <Modal label="Picker" onDismiss={inner} />
    </Modal>,
  );
  const picker = screen.getByRole('dialog', { name: 'Picker' });

  fireEvent(picker, new Event('cancel', { cancelable: true }));
  expect(inner).toHaveBeenCalledTimes(1);
  expect(outer).not.toHaveBeenCalled();

  fireEvent.click(screen.getByTestId('Picker dim'));
  expect(inner).toHaveBeenCalledTimes(2);
  expect(outer).not.toHaveBeenCalled();

  fireEvent.click(screen.getByTestId('Search dim'));
  expect(outer).toHaveBeenCalledTimes(1);
});
