import { describe, expect, it } from 'vitest';
import { parseLsofCwds, parseLsofListeners, parsePsLine } from './proc.ts';

describe('parsePsLine', () => {
  it('reads pid, pgid, the five-word start time and the command', () => {
    expect(
      parsePsLine(
        '  4321  4300 Thu Nov 12 17:31:02 2026     node server.js --port 3112',
      ),
    ).toEqual({
      command: 'node server.js --port 3112',
      lstart: 'Thu Nov 12 17:31:02 2026',
      pgid: 4300,
      pid: 4321,
    });
  });

  it('normalises the padding of single-digit days', () => {
    expect(parsePsLine('1 1 Mon Nov  2 09:01:02 2026 launchd')?.lstart).toBe(
      'Mon Nov 2 09:01:02 2026',
    );
  });

  it('ignores lines it cannot read', () => {
    expect(parsePsLine('')).toBeUndefined();
    expect(parsePsLine('PID PGID STARTED COMMAND')).toBeUndefined();
  });
});

describe('parseLsofListeners', () => {
  it('pairs each port with its process, IPv4 and IPv6 once', () => {
    const output = [
      'p100',
      'f20',
      'n*:3112',
      'f21',
      'n[::1]:3112',
      'p200',
      'f5',
      'n127.0.0.1:4112',
      '',
    ].join('\n');
    expect(parseLsofListeners(output)).toEqual([
      { pid: 100, port: 3112 },
      { pid: 200, port: 4112 },
    ]);
  });
});

describe('parseLsofCwds', () => {
  it('maps pid to cwd', () => {
    expect([...parseLsofCwds('p1\nfcwd\nn/a/b\np2\nfcwd\nn/c\n')]).toEqual([
      [1, '/a/b'],
      [2, '/c'],
    ]);
  });
});
