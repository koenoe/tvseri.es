// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InfiniteScroll from './InfiniteScroll';

const inView = vi.fn((..._args: unknown[]) => () => {});

vi.mock('motion/react', () => ({
  inView: (...args: unknown[]) => inView(...args),
}));

const loadMore = () => Promise.resolve();

beforeEach(() => {
  inView.mockClear();
});

describe('InfiniteScroll', () => {
  it('reads 2,000px ahead by default', () => {
    render(
      <InfiniteScroll hasMore loadMore={loadMore}>
        <p>rows</p>
      </InfiniteScroll>,
    );
    expect(inView.mock.calls[0]?.[2]).toEqual({ margin: '0px 0px 2000px 0px' });
  });

  it('reads as far ahead as it is told (the Library: two rows)', () => {
    render(
      <InfiniteScroll hasMore loadMore={loadMore} margin="0px 0px 600px 0px">
        <p>tiles</p>
      </InfiniteScroll>,
    );
    expect(inView.mock.calls[0]?.[2]).toEqual({ margin: '0px 0px 600px 0px' });
  });

  it('has no sentinel at the end', () => {
    render(
      <InfiniteScroll hasMore={false} loadMore={loadMore}>
        <p>rows</p>
      </InfiniteScroll>,
    );
    expect(inView).not.toHaveBeenCalled();
  });
});
