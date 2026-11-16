'use client';

import type { MouseEvent } from 'react';

import Button from '@/components/ui/button/Button';
import { openSearch } from '@/lib/search/openSearch';

/**
 * From your circle's one quiet action when you follow nobody (`btn-o`
 * at 32px, 14px label): opens search with `@` typed, ready for someone's
 * handle (search finds a member by their exact handle).
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
