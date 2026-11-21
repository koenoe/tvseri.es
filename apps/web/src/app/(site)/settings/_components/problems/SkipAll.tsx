import type { MouseEvent, Ref } from 'react';

import Button from '@/components/ui/button/Button';

import { SMALL_BUTTON } from './styles';

/**
 * "Skip all" beside a group's header (`KindGroups`' `action`): one look and
 * one name for the import's and a sync's review
 */
export default function SkipAll({
  groupName,
  onClick,
  ref,
}: Readonly<{
  groupName: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  ref?: Ref<HTMLButtonElement>;
}>) {
  const label = `Skip all in ${groupName}`;
  return (
    <Button
      aria-label={label}
      className={SMALL_BUTTON}
      onClick={onClick}
      ref={ref}
      size="xs"
      variant="tonal"
    >
      <span className="text-body-sm">Skip all</span>
    </Button>
  );
}
