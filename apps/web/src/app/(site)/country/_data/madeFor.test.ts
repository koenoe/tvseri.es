import { describe, expect, it } from 'vitest';

import { secondRow } from './madeFor';

const network = (id: number, slug: string, name: string) => ({
  count: 40,
  id,
  name,
  slug,
});

describe('secondRow', () => {
  it('shows Made for with one tab per network, in the facts order (GB)', () => {
    expect(
      secondRow([
        network(4, 'bbc-one', 'BBC One'),
        network(9, 'itv1', 'ITV1'),
        network(26, 'channel-4', 'Channel 4'),
      ]),
    ).toEqual({
      kind: 'made-for',
      tabs: [
        { key: 'bbc-one', label: 'BBC One', networkId: 4 },
        { key: 'itv1', label: 'ITV1', networkId: 9 },
        { key: 'channel-4', label: 'Channel 4', networkId: 26 },
      ],
    });
  });

  it('hides the switch and shows Best from when fewer than 3 qualify (DK)', () => {
    expect(secondRow([])).toEqual({ kind: 'best' });
    expect(
      secondRow([network(391, 'dr1', 'DR1'), network(125, 'tv-2', 'TV 2')]),
    ).toEqual({ kind: 'best' });
  });
});
