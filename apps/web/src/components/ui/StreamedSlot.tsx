import { type ReactNode, Suspense } from 'react';

/**
 * A part of a page that streams in on its own: its Suspense hole with the
 * page's `fallback`, wrapped in the error boundary the page picked for it
 * (`guard`). It only composes: what loads, the placeholder and the failure's
 * look stay the page's.
 *
 * `name` marks the placeholder and the content each with a plain block
 * (`data-placeholder` / `data-slot`, adding no box of their own) for the
 * parity specs, which measure one against the other; `className` is then
 * the content's own layout.
 *
 * @example
 * <StreamedSlot
 *   fallback={<WeekendSkeleton />}
 *   guard={(slot) => <RowErrorBoundary id="weekend" title="Weekend">{slot}</RowErrorBoundary>}
 * >
 *   <Weekend />
 * </StreamedSlot>
 */
export default function StreamedSlot({
  children,
  className,
  fallback,
  guard,
  name,
}: Readonly<{
  children: ReactNode;
  className?: string;
  fallback: ReactNode;
  /**
   * The slot's error boundary around the hole, given the (marked)
   * placeholder so a failure can keep its size. None: a failure goes to
   * the nearest boundary above.
   */
  guard?: (slot: ReactNode, placeholder: ReactNode) => ReactNode;
  name?: string;
}>) {
  const placeholder =
    name === undefined ? (
      fallback
    ) : (
      <div data-placeholder={name}>{fallback}</div>
    );
  const content =
    name === undefined ? (
      children
    ) : (
      <div className={className} data-slot={name}>
        {children}
      </div>
    );
  const slot = <Suspense fallback={placeholder}>{content}</Suspense>;
  return guard ? guard(slot, placeholder) : slot;
}
