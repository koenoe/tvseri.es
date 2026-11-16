import { describe, expect, it, vi } from 'vitest';

import { createLoader } from './createLoader';

describe('createLoader: load a chunk once, retry after a failure', () => {
  it('imports once and shares the promise', async () => {
    const importer = vi.fn(async () => 'overlay');
    const chunk = createLoader(importer);

    await Promise.all([chunk.load(), chunk.load()]);

    expect(importer).toHaveBeenCalledOnce();
  });

  it('gives the loaded value synchronously once it is in, nothing before', async () => {
    const chunk = createLoader(async () => 'panel');
    expect(chunk.get()).toBeNull();

    await chunk.load();

    expect(chunk.get()).toBe('panel');
  });

  it('forgets a failed import, so the next call tries again', async () => {
    const importer = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('ChunkLoadError'))
      .mockResolvedValueOnce('remote');
    const chunk = createLoader(importer);

    await expect(chunk.load()).rejects.toThrow('ChunkLoadError');
    expect(chunk.get()).toBeNull();
    await expect(chunk.load()).resolves.toBe('remote');
    expect(chunk.get()).toBe('remote');
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('preloads without leaving a failure unhandled', async () => {
    const importer = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('ChunkLoadError'))
      .mockResolvedValueOnce('tray');
    const chunk = createLoader(importer);

    chunk.preload();
    // an unhandled rejection would fail this run
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(chunk.load()).resolves.toBe('tray');
  });
});
