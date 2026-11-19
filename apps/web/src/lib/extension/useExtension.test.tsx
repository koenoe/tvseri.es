// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pingExtension } from './extension';
import { useExtensionPing } from './useExtension';

vi.mock('./extension', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./extension')>();
  return { ...actual, pingExtension: vi.fn(actual.pingExtension) };
});

const sendMessage = vi.fn();

/** One card's view of the ping */
function Probe({ name }: Readonly<{ name: string }>) {
  const ping = useExtensionPing(true, 'supported');
  const text =
    ping.state === 'answered'
      ? `${name}: ${ping.found?.version ?? 'missing'}`
      : `${name}: ${ping.state}`;
  return <p>{text}</p>;
}

const pings = () =>
  sendMessage.mock.calls.filter(([, message]) => message?.type === 'ping')
    .length;

beforeEach(() => {
  sendMessage.mockReset();
  sendMessage.mockImplementation((_id, _message, reply) =>
    queueMicrotask(() =>
      reply({ installed: true, services: ['netflix'], version: '0.2.0' }),
    ),
  );
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
});

afterEach(() => {
  cleanup();
});

describe('useExtensionPing', () => {
  it('pings once for the whole page, however many cards ask', async () => {
    await act(async () => {
      render(
        <>
          <Probe name="netflix" />
          <Probe name="bbc" />
          <Probe name="line" />
        </>,
      );
    });
    expect(screen.getByText('netflix: 0.2.0')).toBeTruthy();
    expect(screen.getByText('bbc: 0.2.0')).toBeTruthy();
    expect(screen.getByText('line: 0.2.0')).toBeTruthy();
    expect(pings()).toBe(1);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(pings()).toBe(2);
  });

  it('reads a ping that throws as nothing installed', async () => {
    vi.mocked(pingExtension).mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      render(<Probe name="netflix" />);
    });
    expect(screen.getByText('netflix: missing')).toBeTruthy();
  });

  it('starts from checking again once nothing on the page asks', async () => {
    let view: ReturnType<typeof render> | undefined;
    await act(async () => {
      view = render(<Probe name="netflix" />);
    });
    view?.unmount();
    sendMessage.mockImplementation(() => undefined);
    render(<Probe name="netflix" />);
    expect(screen.getByText('netflix: checking')).toBeTruthy();
  });
});
