// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChannelRow } from './ChannelList';
import WhatsOnRemote from './WhatsOnRemote';

const ROWS: ReadonlyArray<ChannelRow> = ['Netflix', 'HBO', 'Apple TV+'].map(
  (network, index) => ({
    label: `Channel 0${index + 1}, ${network}`,
    mark: null,
    network,
    number: `0${index + 1}`,
    show: `Show ${index + 1}`,
  }),
);

const BACKDROPS = ROWS.map((row) => <i key={row.number}>{row.network}</i>);
const CAPTIONS = ROWS.map((row) => <b key={row.number}>{row.show}</b>);

const animate = vi.fn();

/** Each channel's top in the list: 54px apart (jsdom lays nothing out) */
const topOf = (element: HTMLElement) => {
  const label = element.getAttribute('aria-label') ?? '';
  const index = ROWS.findIndex((row) => row.label === label);
  return index < 0 ? 0 : index * 54;
};

function reducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches,
      removeEventListener: () => undefined,
    })),
  );
}

beforeEach(() => {
  reducedMotion(false);
  animate.mockImplementation(() => ({
    cancel: () => undefined,
    effect: null,
    playState: 'finished',
  }));
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      return topOf(this);
    },
  });
  HTMLElement.prototype.animate = animate as unknown as HTMLElement['animate'];
});

/** The animations on the on-channel's highlight, by their start */
const glides = () =>
  animate.mock.calls
    .filter((_, call) => {
      const element = animate.mock.contexts[call] as HTMLElement;
      return element.hasAttribute('data-pill');
    })
    .map(([frames]) => (frames as Keyframe[])[0]?.transform);

/** The screen's zaps */
const zaps = () => animate.mock.calls.length - glides().length;

afterEach(() => {
  cleanup();
  animate.mockReset();
  vi.unstubAllGlobals();
});

const renderRemote = () =>
  render(
    <WhatsOnRemote
      backdrops={BACKDROPS}
      captions={CAPTIONS}
      rows={ROWS}
      title="What's on"
    />,
  );

const channel = (name: string) => screen.getByRole('radio', { name });

describe('WhatsOnRemote', () => {
  it('tunes to a pressed channel with one zap; pressing the channel on does nothing', () => {
    renderRemote();
    expect(channel('Channel 01, Netflix').getAttribute('aria-checked')).toBe(
      'true',
    );

    fireEvent.click(channel('Channel 03, Apple TV+'));
    expect(channel('Channel 03, Apple TV+').getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(channel('Channel 01, Netflix').getAttribute('aria-checked')).toBe(
      'false',
    );
    // the screen shows channel 3's caption
    expect(screen.getByText('Show 3', { selector: 'b' })).toBeTruthy();
    expect(zaps()).toBe(1);

    fireEvent.click(channel('Channel 03, Apple TV+'));
    expect(zaps()).toBe(1);
  });

  it('wraps around with up and down', () => {
    renderRemote();
    fireEvent.click(screen.getByRole('button', { name: 'Channel up' }));
    expect(channel('Channel 03, Apple TV+').getAttribute('aria-checked')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Channel down' }));
    expect(channel('Channel 01, Netflix').getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(zaps()).toBe(2);
  });

  it('draws the highlight on the channel on, in place', () => {
    renderRemote();
    const on = channel('Channel 01, Netflix');
    expect(on.querySelector('[data-pill]')).not.toBeNull();
    expect(glides()).toEqual([]);
  });

  it('glides the highlight from the old channel to the new one', () => {
    renderRemote();
    fireEvent.click(channel('Channel 03, Apple TV+'));
    // from 01 (0) to 03 (108)
    expect(glides()).toEqual(['translateY(-108px)']);
    fireEvent.click(screen.getByRole('button', { name: 'Channel up' }));
    expect(glides()).toEqual(['translateY(-108px)', 'translateY(54px)']);
  });

  it('glides with the list’s arrow keys', () => {
    renderRemote();
    fireEvent.keyDown(channel('Channel 01, Netflix'), { key: 'ArrowDown' });
    expect(glides()).toEqual(['translateY(-54px)']);
  });

  it('jumps with reduced motion', () => {
    reducedMotion(true);
    renderRemote();
    fireEvent.click(channel('Channel 03, Apple TV+'));
    expect(glides()).toEqual([]);
  });

  it('keeps the channels next to the one on warm', () => {
    renderRemote();
    // 0, 1 and the last are warm from the start: all three here
    expect(screen.getByText('Apple TV+', { selector: 'i' })).toBeTruthy();
    expect(screen.getByText('HBO', { selector: 'i' })).toBeTruthy();
  });
});
