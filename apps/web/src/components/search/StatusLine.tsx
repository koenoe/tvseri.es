import type { SessionView } from '@/lib/search/session';

type Props = Readonly<{
  mode: SessionView['mode'];
  onRetry: () => void;
  query: string;
}>;

/**
 * The one line under the field when there is nothing to list: no results
 * (“Nothing found”) or a failed request, with Try again. It
 * starts on the field's edge (the list's gutter, no inset of its own), and
 * Try again's 10px hover pad sits outside its word, so a wrapped "Try again"
 * starts where the sentence does.
 */
export default function StatusLine({ mode, onRetry, query }: Props) {
  if (mode === 'none') {
    return (
      <p className="py-6 text-body-sm text-rk-w64">Nothing for “{query}”</p>
    );
  }
  if (mode !== 'error') {
    return null;
  }
  return (
    <p className="flex flex-wrap items-center gap-x-4.5 py-6 text-body-sm text-rk-w64">
      Search didn’t load for “{query}”.
      <button
        className="-mx-2.5 -my-1 h-8 cursor-pointer rounded-8 px-2.5 font-medium text-rk-text underline underline-offset-3 hover:bg-black/5 focus-visible:shadow-[0_0_0_2px_var(--rk-mark)] focus-visible:outline-none"
        onClick={onRetry}
        type="button"
      >
        Try again
      </button>
    </p>
  );
}
