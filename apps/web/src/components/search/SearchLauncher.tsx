'use client';

import { MarkingStoreBridge } from '@/lib/marking/MarkingProvider';

import useSearchLauncher from './useSearchLauncher';

/**
 * Search, everywhere (root layout): the only part on every page. It listens
 * for `openSearch()` (the header button, the floating pill, the 404 field)
 * and ⌘K/⌘F (Ctrl elsewhere), which opens and closes it. The overlay itself
 * loads on idle, or on the first open.
 */
export default function SearchLauncher() {
  const { opening, Overlay, setOpening } = useSearchLauncher();

  if (!opening || !Overlay) {
    return null;
  }
  const { id } = opening;
  const close = () =>
    setOpening((current) =>
      current?.id === id ? { ...current, open: false } : current,
    );
  const closed = () =>
    setOpening((current) => (current?.id === id ? null : current));
  return (
    <MarkingStoreBridge>
      <Overlay
        initialQuery={opening.query}
        key={id}
        onClose={close}
        onClosed={closed}
        open={opening.open}
        trigger={opening.trigger}
      />
    </MarkingStoreBridge>
  );
}
