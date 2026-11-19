// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useCallback } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfirmRow from './ConfirmRow';
import useConfirm from './useConfirm';

afterEach(cleanup);

/** A trigger that hides while asking, as Skip all's does */
function Asker({ pending = false }: Readonly<{ pending?: boolean }>) {
  const { ask, asking, cancel, trigger } = useConfirm<'drop'>();
  const askDrop = useCallback(() => ask('drop'), [ask]);
  const dropTrigger = trigger('drop');
  if (asking !== 'drop') {
    return (
      <button onClick={askDrop} ref={dropTrigger} type="button">
        Drop
      </button>
    );
  }
  return (
    <ConfirmRow
      confirm="Drop it"
      onCancel={cancel}
      onConfirm={vi.fn()}
      pending={pending}
    >
      Drop everything?
    </ConfirmRow>
  );
}

describe('ConfirmRow', () => {
  it('opens with focus on Cancel, in a group named by its question', () => {
    render(<Asker />);
    fireEvent.click(screen.getByRole('button', { name: 'Drop' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Cancel' }),
    );
    expect(
      screen.getByRole('group', { name: 'Drop everything?' }),
    ).toBeTruthy();
  });

  it('hands focus back to the trigger on Cancel', () => {
    render(<Asker />);
    fireEvent.click(screen.getByRole('button', { name: 'Drop' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Drop' }),
    );
  });

  it('keeps Cancel inert while the confirm is pending', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmRow
        confirm="Drop it"
        onCancel={onCancel}
        onConfirm={vi.fn()}
        pending
      >
        Drop everything?
      </ConfirmRow>,
    );
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(cancel);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
