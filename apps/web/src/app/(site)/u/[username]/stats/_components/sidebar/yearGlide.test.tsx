// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import YearLink from './YearLink';
import YearPills from './YearPills';
import YearsList from './YearsList';
import type { YearRow } from './years';

const params = { year: '2026' };

vi.mock('next/navigation', () => ({
  useParams: () => params,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    transitionTypes: _types,
    ...rest
  }: Readonly<{
    children: ReactNode;
    href: string;
    transitionTypes?: ReadonlyArray<string>;
  }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const YEARS = [2026, 2025, 2024];

const ROWS: ReadonlyArray<YearRow> = YEARS.map((year) => ({
  episodes: 10,
  label: String(year),
  values: [1, 2, 3],
  year,
}));

/** Each year's place in its list: rows 44px apart, pills 90px apart */
const index = (element: HTMLElement) => {
  const year = Number(element.getAttribute('href')?.split('/').at(-1));
  return YEARS.indexOf(year);
};

/** A row of the list (the pills are side by side) */
const isRow = (element: HTMLElement) =>
  element.tagName === 'A' && !element.classList.contains('pill');

const animate = vi.fn();

beforeEach(() => {
  params.year = '2026';
  animate.mockReset();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches: false,
      removeEventListener: () => undefined,
    })),
  );
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      return isRow(this) ? index(this) * 44 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      return isRow(this) ? 0 : index(this) * 90;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 84,
  });
  HTMLElement.prototype.animate = animate;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const link = (year: number) =>
  screen.getByRole('link', { name: new RegExp(String(year)) });

/** The URL moves to `year` (the link's navigation) */
function navigate(rerender: () => void, year: number) {
  params.year = String(year);
  rerender();
}

describe('the Years list', () => {
  const list = () => <YearsList rows={ROWS} username="koen" />;

  it('draws the highlight on the URL’s year without moving it', () => {
    render(list());
    expect(link(2026).getAttribute('aria-current')).toBe('page');
    expect(link(2026).querySelector('[data-pill]')).not.toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });

  it('glides the highlight from the old year to the pressed one', () => {
    const { rerender } = render(list());
    fireEvent.click(link(2024));
    navigate(() => rerender(list()), 2024);
    const [frames] = animate.mock.calls[0] ?? [];
    expect((frames as Keyframe[])[0]?.transform).toBe('translateY(-88px)');
  });

  it('puts the highlight on its year after Back or Forward', () => {
    const { rerender } = render(list());
    navigate(() => rerender(list()), 2024);
    expect(animate).not.toHaveBeenCalled();
  });
});

describe('the phone’s year pills', () => {
  const pills = () => (
    <nav>
      <YearPills
        more={null}
        pills={YEARS.map((year) => ({
          pill: (
            <YearLink
              className="pill"
              href={`/u/koen/stats/${year}`}
              selectedClassName="pill on"
              year={year}
            >
              {year}
            </YearLink>
          ),
          year,
        }))}
      />
    </nav>
  );

  it('glides the fill from the old pill to the pressed one', () => {
    const { rerender } = render(pills());
    expect(animate).not.toHaveBeenCalled();
    fireEvent.click(link(2025));
    navigate(() => rerender(pills()), 2025);
    const [frames, options] = animate.mock.calls[0] ?? [];
    expect((frames as Keyframe[])[0]?.transform).toBe(
      'translateX(-90px) scaleX(1)',
    );
    expect(options).toMatchObject({ pseudoElement: '::before' });
  });

  it('puts the fill on its pill after Back or Forward', () => {
    const { rerender } = render(pills());
    fireEvent.click(link(2025));
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    navigate(() => rerender(pills()), 2024);
    expect(animate).not.toHaveBeenCalled();
  });
});
