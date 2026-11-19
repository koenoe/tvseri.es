// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ExtensionCtaClient from './ExtensionCtaClient';

vi.mock('@/components/ui/toast/showToast', () => ({ showToast: vi.fn() }));

const ZIP = '/tvseries-extension-0.2.0.zip';

/** The extension answers the ping with these services and version */
const installed = (version: string, services: ReadonlyArray<string>) =>
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: (
        _id: string,
        _message: unknown,
        reply: (answer: unknown) => void,
      ) => reply({ installed: true, services, version }),
    },
  });

const show = async (browser: 'supported' | 'unsupported') => {
  render(<ExtensionCtaClient browser={browser} latest="0.2.0" zip={ZIP} />);
  await act(async () => {});
};

describe('/extension’s call-to-action', () => {
  it('installs it (the manual install, no listing yet) when nothing answers', async () => {
    vi.stubGlobal('chrome', undefined);
    await show('supported');
    expect(screen.getByRole('link', { name: 'Install it' })).toBeTruthy();
    expect(screen.getByText('Not installed in this browser')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'How it works' })).toBeTruthy();
  });

  it('sends an installed extension on to Connected apps, with its version', async () => {
    installed('0.2.0', ['netflix', 'bbc', 'prime']);
    await show('supported');
    expect(
      screen
        .getByRole('link', { name: 'Connect a service' })
        .getAttribute('href'),
    ).toBe('/settings/connected-apps');
    expect(screen.getByText('Installed · 0.2.0')).toBeTruthy();
  });

  it('nudges an update when it is too old for a service: the zip, without a listing', async () => {
    installed('0.1.0', ['netflix']);
    await show('supported');
    expect(screen.getByText(/0\.2\.0 is out/)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Update now' }).getAttribute('href'),
    ).toBe(ZIP);
  });

  it('offers Copy link where the extension can’t run', async () => {
    await show('unsupported');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeTruthy();
    expect(
      screen.getByText('Open this on a computer with Chrome or Edge'),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Install it' })).toBeNull();
  });
});
