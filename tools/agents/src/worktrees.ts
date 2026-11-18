export type Worktree = Readonly<{
  branch?: string;
  head: string;
  path: string;
}>;

/** Parses `git worktree list --porcelain`. */
export const parseWorktrees = (output: string): readonly Worktree[] =>
  output.split('\n\n').flatMap((block): Worktree[] => {
    const fields = new Map<string, string>();
    for (const line of block.split('\n')) {
      const space = line.indexOf(' ');
      if (space > 0) fields.set(line.slice(0, space), line.slice(space + 1));
      else if (line) fields.set(line, '');
    }
    const path = fields.get('worktree');
    if (!path || fields.has('prunable') || fields.has('bare')) return [];
    const ref = fields.get('branch');
    return [
      {
        branch: ref?.replace(/^refs\/heads\//, ''),
        head: fields.get('HEAD') ?? '',
        path,
      },
    ];
  });

/** Paths from `git status --porcelain -z` (renames give both names). */
export const parseStatusPaths = (output: string): readonly string[] => {
  const entries = output.split('\0').filter(Boolean);
  const paths: string[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i] ?? '';
    paths.push(entry.slice(3));
    if (entry[0] === 'R' || entry[0] === 'C') {
      i += 1;
      const source = entries[i];
      if (source) paths.push(source);
    }
  }
  return paths;
};

/** Dirty paths that the incoming changes also touch (a path or a folder of it). */
export const overlapping = (
  dirty: readonly string[],
  incoming: readonly string[],
): readonly string[] => {
  const incomingSet = new Set(incoming);
  return dirty.filter(
    (path) =>
      incomingSet.has(path) ||
      (path.endsWith('/') && incoming.some((file) => file.startsWith(path))),
  );
};
