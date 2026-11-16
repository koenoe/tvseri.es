// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createLoader } from './createLoader';
import { useLoader } from './useLoader';

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve)));

describe('useLoader', () => {
  it('loads when wanted, renders the value, and retries a failed chunk on the next key', async () => {
    const importer = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('chunk'))
      .mockResolvedValue('chunk');
    const loader = createLoader(importer);
    let seen: string | null = 'unset';
    function Probe({ wanted }: Readonly<{ wanted: string | null }>) {
      [seen] = useLoader(loader, wanted);
      return null;
    }
    const { rerender } = render(<Probe wanted={null} />);
    expect(importer).not.toHaveBeenCalled();
    rerender(<Probe wanted="1" />);
    await settle();
    expect(importer).toHaveBeenCalledTimes(1);
    expect(seen).toBeNull();
    rerender(<Probe wanted="2" />);
    await settle();
    expect(importer).toHaveBeenCalledTimes(2);
    expect(seen).toBe('chunk');
  });

  it('load() fetches on demand and renders again', async () => {
    const loader = createLoader(() => Promise.resolve('chunk'));
    let seen: string | null = null;
    let load = () => {};
    function Probe() {
      [seen, load] = useLoader(loader);
      return null;
    }
    render(<Probe />);
    expect(seen).toBeNull();
    act(() => load());
    await settle();
    expect(seen).toBe('chunk');
  });
});
