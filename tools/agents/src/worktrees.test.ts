import { describe, expect, it } from 'vitest';
import { parseAheadBehind } from './status.ts';
import { overlapping, parseStatusPaths, parseWorktrees } from './worktrees.ts';

describe('parseWorktrees', () => {
  it('reads path, head and branch; skips prunable ones', () => {
    const output = [
      'worktree /w/repo\nHEAD aaa\nbranch refs/heads/main\n',
      'worktree /w/repo-show\nHEAD bbb\nbranch refs/heads/redesign-show\n',
      'worktree /w/repo-x\nHEAD ccc\ndetached\n',
      'worktree /w/gone\nHEAD ddd\nbranch refs/heads/old\nprunable gitdir file points to non-existent location\n',
    ].join('\n');
    expect(parseWorktrees(output)).toEqual([
      { branch: 'main', head: 'aaa', path: '/w/repo' },
      { branch: 'redesign-show', head: 'bbb', path: '/w/repo-show' },
      { branch: undefined, head: 'ccc', path: '/w/repo-x' },
    ]);
  });
});

describe('parseStatusPaths', () => {
  it('lists changed, untracked and both sides of a rename', () => {
    expect(parseStatusPaths(' M a.ts\0?? new/b.ts\0R  c2.ts\0c1.ts\0')).toEqual(
      ['a.ts', 'new/b.ts', 'c2.ts', 'c1.ts'],
    );
  });
});

describe('overlapping', () => {
  it('finds dirty files the merge would also change', () => {
    expect(
      overlapping(['a.ts', 'b.ts', 'dir/'], ['b.ts', 'dir/x.ts', 'c.ts']),
    ).toEqual(['b.ts', 'dir/']);
    expect(overlapping(['a.ts'], ['c.ts'])).toEqual([]);
  });
});

describe('parseAheadBehind', () => {
  it('reads "behind ahead" from rev-list --left-right base...HEAD', () => {
    expect(parseAheadBehind('4\t15\n')).toEqual({ ahead: 15, behind: 4 });
    expect(parseAheadBehind('')).toEqual({ ahead: 0, behind: 0 });
  });
});
