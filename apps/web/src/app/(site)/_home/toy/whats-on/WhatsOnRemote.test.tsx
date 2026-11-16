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

beforeEach(() => {
  HTMLElement.prototype.animate = animate as unknown as HTMLElement['animate'];
});

afterEach(() => {
  cleanup();
  animate.mockReset();
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
    expect(animate).toHaveBeenCalledTimes(1);

    fireEvent.click(channel('Channel 03, Apple TV+'));
    expect(animate).toHaveBeenCalledTimes(1);
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
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it('keeps the channels next to the one on warm', () => {
    renderRemote();
    // 0, 1 and the last are warm from the start: all three here
    expect(screen.getByText('Apple TV+', { selector: 'i' })).toBeTruthy();
    expect(screen.getByText('HBO', { selector: 'i' })).toBeTruthy();
  });
});
