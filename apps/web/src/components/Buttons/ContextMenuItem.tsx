import Link from 'next/link';
import type { ComponentProps } from 'react';

// Every item but the last gets a divider.
const itemClassName =
  'flex w-full flex-nowrap items-center gap-x-2 text-nowrap border-neutral-200 text-sm font-medium hover:text-neutral-800 [&:not(:last-child)]:border-b-2 [&:not(:last-child)]:pb-3';

export function ContextMenuItem(
  props: Readonly<Omit<ComponentProps<'button'>, 'className'>>,
) {
  return <button className={itemClassName} type="button" {...props} />;
}

export function ContextMenuLink(
  props: Readonly<Omit<ComponentProps<typeof Link>, 'className'>>,
) {
  return <Link className={itemClassName} {...props} />;
}
