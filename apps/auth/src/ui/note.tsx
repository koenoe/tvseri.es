/** @jsxImportSource hono/jsx */
import type { JSX } from 'hono/jsx/jsx-runtime';

export type NoteCopy = Readonly<{
  /** What to do */
  body: string;
  icon: () => JSX.Element;
  /** What happened, in bold */
  title: string;
  tone: 'info' | 'ok' | 'warn';
}>;

/**
 * The quiet note under a title: what happened in bold,
 * then what to do, with the other way in named when one is blocked.
 */
export function Note({ copy }: Readonly<{ copy: NoteCopy }>) {
  const Icon = copy.icon;
  const toneClass = copy.tone === 'info' ? 'a-note' : `a-note ${copy.tone}`;
  return (
    <div class={toneClass} role="status">
      <Icon />
      <div>
        <b>{copy.title}</b> {copy.body}
      </div>
    </div>
  );
}
