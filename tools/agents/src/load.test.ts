import { describe, expect, it } from 'vitest';
import { groupByWorktree, parseCpuPs, parseMemoryFree } from './load.ts';

describe('parseMemoryFree', () => {
  it('reads the free percentage from memory_pressure -Q', () => {
    expect(
      parseMemoryFree(
        'The system has 17179869184.\nSystem-wide memory free percentage: 23%\n',
      ),
    ).toBe(23);
    expect(parseMemoryFree('')).toBeUndefined();
  });
});

describe('groupByWorktree', () => {
  const procs = parseCpuPs(
    [
      '  10     1  90.5  204800 next-server (v16.4.5)',
      '  11    10  30.0  102400 /usr/bin/helper',
      '  20     1  50.0   10240 node /w/repo-home/node_modules/.bin/playwright test',
      '  21    20 120.0  512000 /cache/chromium --headless',
      '  30     1   5.0    1024 /usr/sbin/something',
    ].join('\n'),
  );

  it('parses ps rows', () => {
    expect(procs[0]).toEqual({
      command: 'next-server (v16.4.5)',
      cpu: 90.5,
      pid: 10,
      ppid: 1,
      rssKb: 204800,
    });
  });

  it('attributes processes by cwd, command line or ancestor', () => {
    const cwds = new Map([[10, '/w/repo-show/apps/web']]);
    const groups = groupByWorktree(procs, cwds, [
      '/w/repo',
      '/w/repo-show',
      '/w/repo-home',
    ]);
    expect(groups.map((g) => [g.name, g.cpu, g.procs])).toEqual([
      ['repo-home', 170, 2],
      ['repo-show', 121, 2],
      ['(not a worktree)', 5, 1],
    ]);
  });
});
