import { useState } from 'react';

/**
 * Whether `open` has been true at least once: an overlay whose code loads on
 * its first opening mounts then and stays mounted, so closing can play its
 * exit.
 */
export default function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) {
    setOpened(true);
  }
  return opened;
}
