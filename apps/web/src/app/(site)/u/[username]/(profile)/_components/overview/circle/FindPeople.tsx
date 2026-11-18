'use client';

import type { MouseEvent } from 'react';

import Button from '@/components/ui/button/Button';
import { openSearch } from '@/lib/search/openSearch';

/**
 * From your circle's one action when you follow nobody: opens search with
 * `@` typed, since search finds a member only by their exact handle.
 */
export default function FindPeople() {
  const open = (event: MouseEvent<HTMLButtonElement>) =>
    openSearch(event.currentTarget, '@');
  return (
    <Button className="text-body-sm" onClick={open} size="xs" variant="outline">
      Find people
    </Button>
  );
}
