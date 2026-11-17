// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { LastImportState } from '../_lib/lastImport';
import LastImportUndo from './LastImportUndo';

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

afterEach(cleanup);

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const state = (extra: Partial<LastImportState> = {}): LastImportState => ({
  ask: false,
  last: { createdAt: Date.now(), importId: 'imp-0', written: 1834 },
  phase: 'idle',
  ...extra,
});

describe('LastImportUndo', () => {
  it('says what the last import added and when, and asks before undoing', async () => {
    const onAsk = vi.fn();
    render(
      <LastImportUndo onAsk={onAsk} onConfirm={vi.fn()} state={state()} />,
    );
    expect(screen.getByText('Your last import')).toBeTruthy();
    expect(screen.getByText('1,834 episodes added')).toBeTruthy();
    expect(screen.getByText(/^Imported today at \d\d:\d\d$/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Undo import' }));
    expect(onAsk).toHaveBeenCalledWith(true);
  });

  it('opens the same confirm dialog, and undoes only on Undo import', async () => {
    const onConfirm = vi.fn();
    render(
      <LastImportUndo
        onAsk={vi.fn()}
        onConfirm={onConfirm}
        state={state({ ask: true })}
      />,
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Undo this import?',
    });
    const confirm = [
      ...dialog.querySelectorAll<HTMLButtonElement>('button'),
    ].find((button) => button.textContent === 'Undo import');
    await userEvent.click(confirm!);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('shows Undoing… while the API works', () => {
    render(
      <LastImportUndo
        onAsk={vi.fn()}
        onConfirm={vi.fn()}
        state={state({ phase: 'undoing' })}
      />,
    );
    const button = screen.getByRole('button', { name: 'Undoing…' });
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('turns into “Import undone” without a Start again button', () => {
    render(
      <LastImportUndo
        onAsk={vi.fn()}
        onConfirm={vi.fn()}
        state={state({ phase: 'undone' })}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Import undone');
    expect(screen.queryByText('Your last import')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows nothing without an import to undo', () => {
    const { container } = render(
      <LastImportUndo
        onAsk={vi.fn()}
        onConfirm={vi.fn()}
        state={state({ last: null })}
      />,
    );
    expect(container.textContent).toBe('');
  });
});
