// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { NETWORKS } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import IndexPage, { indexMetadata } from './IndexPage';

describe('IndexPage', () => {
  it.each([
    ['country', 'Countries', 'There are more ways to browse.'],
    ['language', 'Languages', 'There are more ways to browse.'],
    ['network', 'Networks', 'There are more ways to browse.'],
  ] as const)('%s: its title, metadata and end line', (kind, title, line) => {
    expect(indexMetadata(kind).title).toBe(title);
    render(<IndexPage kind={kind} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
    expect(document.body.textContent).toContain(line);
  });

  it('network: every network as a chip and the count, with no API read', () => {
    render(<IndexPage kind="network" />);
    expect(
      screen.getAllByRole('link', { name: /./ }).length,
    ).toBeGreaterThanOrEqual(NETWORKS.length);
    expect(document.body.textContent).toContain(`${NETWORKS.length} networks`);
  });
});
