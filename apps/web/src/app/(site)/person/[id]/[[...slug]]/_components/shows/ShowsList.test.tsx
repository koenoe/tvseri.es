// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const fetchJson = vi.fn();
vi.mock('@/lib/series/useCachedJson', () => ({ fetchJson }));

vi.mock('./ShowRow', () => ({
  default: ({ row }: { row: { href: string; name: string } }) => (
    <a href={row.href}>{row.name}</a>
  ),
}));

const { default: ShowsList } = await import('./ShowsList');

const listOf = (all: number) => {
  const { container } = render(
    <ShowsList
      counts={{ all, crew: 0, guest: 0, series: all }}
      personId={1}
      self={{ count: 0, label: '' }}
      titleId="t"
    >
      <ul />
    </ShowsList>,
  );
  return {
    button: screen.queryByRole('button', { name: /^Show all/ }),
    root: container.querySelector('[data-filter]'),
  };
};

describe('the Shows list’s fold (lib/fold)', () => {
  it('names what it shows: “Show all N series”', () => {
    const { button } = listOf(20);
    expect(button?.textContent).toMatch(/^Show all 20 series/);
  });

  it('shows up to three more rows whole on desktop, with no button there', () => {
    const { button, root } = listOf(9);
    // three hidden: a phone folds (more than two), a desktop does not
    expect(root?.getAttribute('data-fold')).toBe('phone');
    expect(button?.className).toContain('lg:hidden');
  });

  it('folds everywhere past three hidden rows', () => {
    const { button, root } = listOf(10);
    expect(root?.getAttribute('data-fold')).toBe('all');
    expect(button?.className).not.toContain('lg:hidden');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows two more rows whole everywhere', () => {
    const { button, root } = listOf(8);
    expect(root?.getAttribute('data-fold')).toBe('none');
    expect(button).toBeNull();
  });
});

describe('the Shows heading’s one count', () => {
  const renderList = () =>
    render(
      <ShowsList
        counts={{ all: 69, crew: 4, guest: 42, series: 27 }}
        personId={2}
        self={{ count: 0, label: '' }}
        titleId="person-shows-title"
      >
        <ul />
      </ShowsList>,
    );

  const headingCount = () =>
    screen.getByRole('heading', { name: 'Series' }).nextElementSibling
      ?.textContent;

  it('counts what the active filter lists, and the pills carry no number', () => {
    renderList();
    expect(headingCount()).toBe('69');
    const pills = screen
      .getAllByRole('button', { pressed: false })
      .concat(screen.getAllByRole('button', { pressed: true }));
    for (const pill of pills) {
      expect(pill.textContent).not.toMatch(/\d/);
    }
  });

  it('follows the filter', () => {
    renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Series' }));
    expect(headingCount()).toBe('27');
    fireEvent.click(screen.getByRole('button', { name: 'Guest roles' }));
    expect(headingCount()).toBe('42');
  });
});

describe('the self credits fold', () => {
  it('stays closed and keeps the list when its read fails', async () => {
    fetchJson.mockRejectedValueOnce(new Error('down'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ShowsList
        counts={{ all: 20, crew: 0, guest: 0, series: 20 }}
        personId={3}
        self={{ count: 4, label: 'As himself' }}
        titleId="t"
      >
        <ul data-testid="rows" />
      </ShowsList>,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Show all/ }));
    const fold = screen.getByRole('button', { name: /As himself/ });
    await act(async () => {
      fireEvent.click(fold);
    });
    expect(fetchJson).toHaveBeenCalledWith('/api/person/3/self-credits');
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByTestId('rows')).toBeTruthy();
    errors.mockRestore();
  });

  it('points its toggle at the list once the list is drawn', async () => {
    let land: (rows: unknown) => void = () => {};
    fetchJson.mockReturnValueOnce(
      new Promise((resolve) => {
        land = resolve;
      }),
    );
    render(
      <ShowsList
        counts={{ all: 20, crew: 0, guest: 0, series: 20 }}
        personId={4}
        self={{ count: 1, label: 'As himself' }}
        titleId="t"
      >
        <ul />
      </ShowsList>,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Show all/ }));
    const fold = screen.getByRole('button', { name: /As himself/ });
    await act(async () => {
      fireEvent.click(fold);
    });
    // open, still loading: nothing to point at yet
    expect(fold.getAttribute('aria-expanded')).toBe('true');
    expect(fold.hasAttribute('aria-controls')).toBe(false);
    await act(async () => {
      land([
        { href: '/tv/1-the-tonight-show', id: 1, name: 'The Tonight Show' },
      ]);
    });
    const list = document.getElementById(
      fold.getAttribute('aria-controls') ?? '',
    );
    expect(list?.textContent).toContain('The Tonight Show');
  });
});
