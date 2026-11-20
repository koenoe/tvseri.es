'use client';

import type { MouseEvent } from 'react';

import Button from '@/components/ui/button/Button';
import { openSearch } from '@/lib/search/openSearch';

/**
 * The one action when you follow nobody (From your circle, your Circle
 * page): opens search with `@` typed, since search finds a member only by
 * their exact handle.
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
