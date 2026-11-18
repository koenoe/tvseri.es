/**
 * A busy button's click: ignored while `pending`, so the button stays
 * focusable (`aria-disabled`, not `disabled`, which drops focus) without
 * running its action twice. No handler without `onClick` (a Server Component
 * can't pass a function).
 */
export default function pendingClick<E extends { preventDefault(): void }>(
  pending: boolean | undefined,
  onClick: ((event: E) => void) | undefined,
): ((event: E) => void) | undefined {
  if (!onClick) {
    return undefined;
  }
  return (event) => {
    if (pending) {
      event.preventDefault();
      return;
    }
    onClick(event);
  };
}
