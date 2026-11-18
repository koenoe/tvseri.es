// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { domMax, MotionConfigContext } from 'motion/react';
import { type ComponentProps, use } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loader = vi.hoisted(() => ({ load: vi.fn() }));
/** What each `LazyMotion` render was given: the bundle, or a loader */
const given = vi.hoisted(() => ({ features: [] as string[] }));

vi.mock('./MotionProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./MotionProvider')>()),
  loadMaxFeatures: loader.load,
}));
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  function LazyMotion(props: ComponentProps<typeof actual.LazyMotion>) {
    given.features.push(typeof props.features);
    return <actual.LazyMotion {...props} />;
  }
  return { ...actual, LazyMotion };
});

/** Module state (the loaded bundle) is per page: start each test fresh */
async function fresh() {
  vi.resetModules();
  const { default: MotionProvider } = await import('./MotionProvider');
  const { default: MaxMotion } = await import('./MaxMotion');
  const { loadMax } = await import('./useMaxFeatures');
  return { loadMax, MaxMotion, MotionProvider };
}

beforeEach(() => {
  loader.load.mockReset();
  given.features.length = 0;
});

describe('MaxMotion', () => {
  it('waits for domMax, then hands it over as a bundle', async () => {
    const { MaxMotion } = await fresh();
    loader.load.mockResolvedValue(domMax);
    await act(async () => {
      render(<MaxMotion>Spotlight</MaxMotion>);
    });
    expect(given.features[0]).toBe('function');
    expect(given.features.at(-1)).toBe('object');
  });

  it('mounted after domMax has loaded, has it from its first render', async () => {
    const { MaxMotion, loadMax } = await fresh();
    loader.load.mockResolvedValue(domMax);
    await loadMax();
    render(<MaxMotion>Accordion</MaxMotion>);
    expect(given.features[0]).toBe('object');
    expect(loader.load).toHaveBeenCalledTimes(1);
  });

  it('stays plain after a failed load, and the next one to mount tries again', async () => {
    const { MaxMotion } = await fresh();
    loader.load.mockRejectedValueOnce(new Error('ChunkLoadError'));
    let view: ReturnType<typeof render> | undefined;
    await act(async () => {
      view = render(<MaxMotion>Pile</MaxMotion>);
    });
    expect(given.features.every((kind) => kind === 'function')).toBe(true);
    view?.unmount();

    loader.load.mockResolvedValueOnce(domMax);
    await act(async () => {
      render(<MaxMotion>Pile</MaxMotion>);
    });
    expect(loader.load).toHaveBeenCalledTimes(2);
    expect(given.features.at(-1)).toBe('object');
  });
});

describe('MotionProvider', () => {
  it('follows the reader’s reduced-motion setting', async () => {
    const { MotionProvider } = await fresh();
    function Probe() {
      return (
        <span data-testid="probe">
          {use(MotionConfigContext).reducedMotion}
        </span>
      );
    }
    render(
      <MotionProvider>
        <Probe />
      </MotionProvider>,
    );
    expect(screen.getByTestId('probe').textContent).toBe('user');
  });
});
