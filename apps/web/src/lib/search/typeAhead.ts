/**
 * Keys typed after search was asked to open but before its field has focus
 * (the overlay's code still loading on a cold page): the launcher keeps them
 * and the overlay opens with them, so no character is lost. Returns the
 * query with the key applied, or `null` for a key that isn't typing (a
 * shortcut, an arrow, Escape, an IME composition).
 */
export function typeAhead(
  query: string,
  event: Pick<
    KeyboardEvent,
    'altKey' | 'ctrlKey' | 'isComposing' | 'key' | 'metaKey'
  >,
): string | null {
  if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) {
    return null;
  }
  if (event.key === 'Backspace') {
    return query.slice(0, -1);
  }
  // one printable character (`key` names the others: "Enter", "Tab"…)
  return [...event.key].length === 1 ? `${query}${event.key}` : null;
}
