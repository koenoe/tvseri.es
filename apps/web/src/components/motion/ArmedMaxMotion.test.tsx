// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { domMax } from 'motion/react';
import * as m from 'motion/react-m';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loader = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('./MotionProvider', () => ({ loadMaxFeatures: loader.load }));

/** Module state (the loaded bundle, the request) is per page: start each test fresh */
async function fresh() {
  vi.resetModules();
  const motion = await import('./ArmedMaxMotion');
  const features = await import('./useMaxFeatures');
  return { ...motion, loadMax: features.loadMax };
}

/** Like History's episodes: enters from hidden only when Motion is live */
function makeProbe(useMotionLive: () => boolean) {
  return function Probe() {
    const live = useMotionLive();
    const [initial] = useState(() => (live ? { opacity: 0 } : false));
    return (
      <m.div animate={{ opacity: 1 }} data-testid="probe" initial={initial}>
        Episodes
      </m.div>
    );
  };
}

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, reject, resolve };
};

beforeEach(() => {
  loader.load.mockReset();
});

describe('loadMax', () => {
  it('a failed chunk resolves null, and the next call tries again', async () => {
    const { loadMax } = await fresh();
    loader.load.mockRejectedValueOnce(new Error('ChunkLoadError'));
    loader.load.mockResolvedValueOnce(domMax);
    await expect(loadMax()).resolves.toBeNull();
    await expect(loadMax()).resolves.toBe(domMax);
    expect(loader.load).toHaveBeenCalledTimes(2);
    // loaded: no third request
    await loadMax();
    expect(loader.load).toHaveBeenCalledTimes(2);
  });
});

describe('ArmedMaxMotion', () => {
  it('while domMax is slow to load, an entering element is visible, and stays so when it lands', async () => {
    const { default: ArmedMaxMotion, useMotionLive } = await fresh();
    const slow = deferred<typeof domMax>();
    loader.load.mockReturnValue(slow.promise);
    const Probe = makeProbe(useMotionLive);
    render(
      <ArmedMaxMotion armed>
        <Probe />
      </ArmedMaxMotion>,
    );
    expect(screen.getByTestId('probe').style.opacity).not.toBe('0');
    await act(async () => {
      slow.resolve(domMax);
      await slow.promise;
    });
    expect(screen.getByTestId('probe').style.opacity).not.toBe('0');
  });

  it('after a failed load an entering element is visible, and the next arming retries', async () => {
    const { default: ArmedMaxMotion, loadMax, useMotionLive } = await fresh();
    const failed = deferred<typeof domMax>();
    loader.load.mockReturnValueOnce(failed.promise);
    const Probe = makeProbe(useMotionLive);
    render(
      <ArmedMaxMotion armed>
        <Probe />
      </ArmedMaxMotion>,
    );
    await act(async () => {
      failed.reject(new Error('ChunkLoadError'));
      await failed.promise.catch(() => {});
    });
    expect(screen.getByTestId('probe').style.opacity).not.toBe('0');
    loader.load.mockResolvedValueOnce(domMax);
    await act(async () => {
      await loadMax();
    });
    expect(loader.load).toHaveBeenCalledTimes(2);
  });

  it('relies on Motion drawing an `m` element at its `initial` until the features load, then animating', async () => {
    const { default: ArmedMaxMotion } = await fresh();
    loader.load.mockResolvedValue(domMax);
    const { rerender } = render(
      <ArmedMaxMotion armed={false}>
        <m.div
          animate={{ opacity: 1 }}
          data-testid="raw"
          initial={{ opacity: 0 }}
        />
      </ArmedMaxMotion>,
    );
    await act(async () => {});
    // no renderer yet: the element sits at its `initial`
    expect(screen.getByTestId('raw').style.opacity).toBe('0');
    rerender(
      <ArmedMaxMotion armed>
        <m.div
          animate={{ opacity: 1 }}
          data-testid="raw"
          initial={{ opacity: 0 }}
        />
      </ArmedMaxMotion>,
    );
    await vi.waitFor(() =>
      expect(screen.getByTestId('raw').style.opacity).toBe('1'),
    );
  });

  it('is live only once armed and loaded', async () => {
    const { default: ArmedMaxMotion, useMotionLive } = await fresh();
    loader.load.mockResolvedValue(domMax);
    function Live() {
      return <span data-testid="live">{String(useMotionLive())}</span>;
    }
    const { rerender } = render(
      <ArmedMaxMotion armed={false}>
        <Live />
      </ArmedMaxMotion>,
    );
    await act(async () => {});
    expect(screen.getByTestId('live').textContent).toBe('false');
    rerender(
      <ArmedMaxMotion armed>
        <Live />
      </ArmedMaxMotion>,
    );
    expect(screen.getByTestId('live').textContent).toBe('true');
  });
});
