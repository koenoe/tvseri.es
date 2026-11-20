// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import { useCallback, useState } from 'react';
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

/** The Upload step's undo, with the importer's state and a finished poll */
function Harness() {
  const [current, setCurrent] = useState(state);
  const ask = useCallback(
    (open: boolean) => setCurrent((was) => ({ ...was, ask: open })),
    [],
  );
  const confirm = useCallback(
    () => setCurrent((was) => ({ ...was, ask: false, phase: 'undoing' })),
    [],
  );
  const finish = useCallback(
    () => setCurrent((was) => ({ ...was, phase: 'undone' })),
    [],
  );
  return (
    <>
      <LastImportUndo onAsk={ask} onConfirm={confirm} state={current} />
      <button onClick={finish} tabIndex={-1} type="button">
        Poll answers
      </button>
    </>
  );
}

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
    expect(screen.getByText('Import undone', { exact: true })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(
      'Import undone. Everything it added is gone.',
    );
    expect(screen.queryByText('Your last import')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says “Import undone” through a region that was there before it', () => {
    const props = { onAsk: vi.fn(), onConfirm: vi.fn() };
    const { rerender } = render(
      <LastImportUndo {...props} state={state({ phase: 'undoing' })} />,
    );
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');

    rerender(<LastImportUndo {...props} state={state({ phase: 'undone' })} />);
    expect(screen.getByRole('status')).toBe(region);
    expect(region.textContent).toContain('Import undone.');
  });

  it('keeps the focus through Undo import: on Undoing…, then “Import undone”', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Undo import' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Undo this import?',
    });
    const confirm = [
      ...dialog.querySelectorAll<HTMLButtonElement>('button'),
    ].find((button) => button.textContent === 'Undo import');
    await userEvent.click(confirm!);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Undoing…' }),
      ),
    );

    // The poll answers: a click elsewhere would move the focus, so no click
    screen.getByRole('button', { name: 'Poll answers' }).click();
    const card = (await screen.findByText('Import undone', { exact: true }))
      .parentElement as HTMLElement;
    expect(document.activeElement).toBe(card);
  });

  it('takes the focus to “Import undone” when its Undoing… button goes', () => {
    const props = { onAsk: vi.fn(), onConfirm: vi.fn() };
    const { rerender } = render(
      <LastImportUndo {...props} state={state({ phase: 'undoing' })} />,
    );
    screen.getByRole('button', { name: 'Undoing…' }).focus();

    rerender(<LastImportUndo {...props} state={state({ phase: 'undone' })} />);
    const card = screen.getByText('Import undone', { exact: true })
      .parentElement as HTMLElement;
    expect(document.activeElement).toBe(card);
  });

  it('leaves the focus where it is when it was elsewhere', () => {
    const props = { onAsk: vi.fn(), onConfirm: vi.fn() };
    const page = (phase: LastImportState['phase']) => (
      <>
        <button type="button">Elsewhere</button>
        <LastImportUndo {...props} state={state({ phase })} />
      </>
    );
    const { rerender } = render(page('undoing'));
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
    elsewhere.focus();

    rerender(page('undone'));
    expect(document.activeElement).toBe(elsewhere);
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
