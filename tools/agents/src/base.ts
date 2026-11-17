/**
 * The branch every stream starts from and merges back into: what `checks
 * --quick` compares against, what `status` counts ahead/behind and what
 * `sync` merges. `AGENTS_BASE` overrides it.
 */
export const BASE = process.env.AGENTS_BASE ?? 'main';
