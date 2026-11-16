import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import GlobalError from './global-error';

vi.mock('@/components/search/SearchLauncher', () => ({
  default: () => <div data-testid="search-launcher" />,
}));
vi.mock('./fonts', () => ({ fontVariables: '' }));
vi.mock('@/components/header/Header', () => ({
  default: () => <header />,
}));

const noop = () => {};

describe('global-error', () => {
  it('brings search along: it replaces the root layout that mounts it', () => {
    const html = renderToStaticMarkup(
      <GlobalError error={new Error('boom')} reset={noop} retry={noop} />,
    );

    expect(html).toContain('data-testid="search-launcher"');
  });
});
