import type { ReactNode } from 'react';

import cn from '@/lib/cn';

const HINT_TONE = {
  bad: 'text-white',
  neutral: 'text-white/60',
  ok: 'text-white/80',
} as const;

/**
 * One labelled field: label, the input shell, a hint line. The caller's input takes `id` and `aria-describedby={hintId}`,
 * so the visible label names it and the hint describes it. Only a verdict
 * (`bad`, `ok`) is announced, not every "Checking…" while typing.
 */
export default function Field({
  children,
  hint,
  hintId,
  id,
  label,
  tone = 'neutral',
}: Readonly<{
  children: ReactNode;
  hint: string;
  hintId: string;
  /** The input's id */
  id: string;
  label: string;
  tone?: keyof typeof HINT_TONE;
}>) {
  const hintClasses = cn('text-caption', HINT_TONE[tone]);
  const announced = tone === 'neutral' ? '' : hint;
  return (
    <div className="flex flex-col gap-2">
      <label className="text-body-sm font-semibold text-white" htmlFor={id}>
        {label}
      </label>
      {children}
      <span className={hintClasses} id={hintId}>
        {hint}
      </span>
      <span aria-live="polite" className="sr-only">
        {announced}
      </span>
    </div>
  );
}
