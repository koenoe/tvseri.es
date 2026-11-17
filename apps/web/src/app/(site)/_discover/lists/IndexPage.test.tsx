// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { NETWORKS } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import IndexPage, { indexMetadata } from './IndexPage';

describe('IndexPage', () => {
  it.each([
    ['country', 'Countries'],
    ['language', 'Languages'],
    ['network', 'Networks'],
  ] as const)('%s: its metadata', (kind, title) => {
    expect(indexMetadata(kind).title).toBe(title);
  });

  // Countries and languages render their cached list in the page (async
  // server components, not unit-tested): their title and end line are
  // e2e's (`discover-netcountry.spec.ts`, index pages)
  it('network: its title and end line', () => {
    render(<IndexPage kind="network" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Networks',
    );
    expect(document.body.textContent).toContain(
      'There are more ways to browse.',
    );
  });

  it('network: every network as a chip and the count, with no API read', () => {
    render(<IndexPage kind="network" />);
    expect(
      screen.getAllByRole('link', { name: /./ }).length,
    ).toBeGreaterThanOrEqual(NETWORKS.length);
    expect(document.body.textContent).toContain(`${NETWORKS.length} networks`);
  });
});
